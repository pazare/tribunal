/**
 * Autonomous demo recorder - "computer use" via Playwright.
 *
 * Boots (or assumes) the API + web dev servers, drives the full judging flow,
 * and saves a WebM video suitable for the 1-minute hackathon submission.
 *
 * Usage:
 *   npm run record:demo              # offline benefits run (fast, deterministic)
 *   npm run record:demo -- --replay  # replay a committed real run from runs/
 *
 * Output: runs/demo-recording/demo.webm and runs/demo-recording/final-frame.png
 */
import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "runs", "demo-recording");
const WEBM_DIR = join(OUT, "webm");
const FINAL_VIDEO = join(OUT, "demo.webm");
const FINAL_FRAME = join(OUT, "final-frame.png");
const WEB = "http://localhost:5173";
const API = "http://localhost:8787";
const args = process.argv.slice(2);
const REPLAY = args.includes("--replay");

mkdirSync(OUT, { recursive: true });
mkdirSync(WEBM_DIR, { recursive: true });

function waitFor(url, ms = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(url);
        if (r.ok) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > ms) return reject(new Error(`timeout waiting for ${url}`));
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function ensureServers() {
  let apiUp = false;
  let webUp = false;
  try {
    await waitFor(`${API}/api/packs`, 2000);
    apiUp = true;
  } catch {
    /* start below */
  }
  try {
    await waitFor(WEB, 2000);
    webUp = true;
  } catch {
    /* start below */
  }
  if (apiUp && webUp) {
    console.log("servers already up");
    return null;
  }
  console.log("starting npm run dev…");
  const dev = spawn("npm", ["run", "dev"], { cwd: ROOT, stdio: "inherit", detached: true });
  await waitFor(`${API}/api/packs`, 90_000);
  await waitFor(WEB, 30_000);
  return dev;
}

async function smoothScroll(page, selector, ms = 900) {
  await page.evaluate(
    (sel) => document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    selector,
  );
  await page.waitForTimeout(ms);
}

async function smoothScrollTop(page, ms = 800) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(ms);
}

/** Plain-language narration bar so a cold viewer always knows what they're seeing. */
async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        bottom: "16px",
        transform: "translateX(-50%)",
        maxWidth: "900px",
        padding: "10px 24px",
        borderRadius: "999px",
        background: "rgba(8,9,12,0.94)",
        color: "#ecd9a3",
        font: "600 17px/1.4 system-ui, -apple-system, sans-serif",
        letterSpacing: "0.01em",
        zIndex: "99999",
        textAlign: "center",
        border: "1px solid rgba(212,180,90,0.4)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
        whiteSpace: "nowrap",
      });
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

async function waitUntilSince(page, startedAt, targetMs) {
  const remaining = targetMs - (Date.now() - startedAt);
  if (remaining > 0) await page.waitForTimeout(remaining);
}

async function clickReplayRun(page) {
  const replaySelector = '[data-testid="replay-run_c49cb4b4453e"], [data-testid^="replay-run_"]';
  await page.waitForSelector(replaySelector, { timeout: 30_000 });

  const flagship = page.locator('[data-testid="replay-run_c49cb4b4453e"]');
  if ((await flagship.count()) > 0) {
    console.log("replay: run_c49cb4b4453e");
    await flagship.first().click();
    return;
  }

  console.log("replay: first recorded run");
  await page.locator('[data-testid^="replay-run_"]').first().click();
}

async function scrollScorecardList(page) {
  await page.waitForFunction(
    () => /single-model baseline/i.test(document.body.innerText) && /0\/12/.test(document.body.innerText),
    null,
    { timeout: 15_000 },
  );
  await page.waitForFunction(
    () => [...document.querySelectorAll("li")].some((li) => /\bA\d+\s*—/.test(li.innerText)),
    null,
    { timeout: 15_000 },
  );
  await page.evaluate(() => {
    const items = [...document.querySelectorAll("li")].filter((li) => /\bA\d+\s*—/.test(li.innerText));
    const target = items[Math.min(items.length - 1, 7)] ?? items[0];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  await page.waitForTimeout(2600);
}

function copyNewestVideo() {
  const entries = readdirSync(WEBM_DIR)
    .filter((name) => name.endsWith(".webm"))
    .map((name) => {
      const file = join(WEBM_DIR, name);
      const stat = statSync(file);
      return { file, size: stat.size, mtimeMs: stat.mtimeMs };
    });

  for (const entry of entries) {
    if (entry.size === 0) unlinkSync(entry.file);
  }

  const newest = entries
    .filter((entry) => entry.size > 0)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];

  if (!newest) {
    throw new Error(`no non-empty .webm files found in ${WEBM_DIR}`);
  }

  copyFileSync(newest.file, FINAL_VIDEO);
  console.log(`final video: ${FINAL_VIDEO}`);
  return newest.file;
}

async function main() {
  const devProc = await ensureServers();

  try {
    let browser;
    let context;
    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        recordVideo: { dir: WEBM_DIR, size: { width: 1280, height: 720 } },
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(REPLAY ? 90_000 : 30_000);

      console.log("docket");
      const docketStartedAt = Date.now();
      await page.goto(`${WEB}/?mode=offline`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="tribunal-app"]');
      await page.waitForSelector('[data-testid="mode-picker"]');
      await page.waitForSelector('[data-testid="pack-benefits"]');
      await caption(page, "AI denied the claim — where's the record? Tribunal decodes every verdict as an election.");
      await page.waitForTimeout(900);
      await smoothScroll(page, '[data-testid="compare-strip"]', 1100);
      await smoothScrollTop(page, 800);
      if (!REPLAY) await waitUntilSince(page, docketStartedAt, 4200);

      if (REPLAY) {
        console.log("start replay");
        await caption(page, "Replaying a REAL recorded run — rival vendor seats, 12/12 audit, anchored in the repo.");
        await clickReplayRun(page);
      } else {
        console.log("start offline benefits run");
        await caption(page, "A real benefits case — with a planted trap the panel must catch.");
        await page.click('[data-testid="pack-benefits"]');
      }

      console.log("chamber");
      const chamberStartedAt = Date.now();
      await page.waitForSelector('[data-testid="ledger-stream"]', { timeout: REPLAY ? 90_000 : 15_000 });
      await page.waitForSelector('[data-testid="bench"]', { timeout: REPLAY ? 90_000 : 20_000 });
      await caption(page, "Six AI seats: secret ballots → reveal → anonymous cross-examination → safety veto.");
      await page.waitForTimeout(REPLAY ? 8000 : 5200);

      await page.waitForSelector('[data-testid="candidate-board"]', { timeout: REPLAY ? 90_000 : 30_000 });
      await caption(page, "Every candidate answer is voted on the record — RATIFIED or VETOED, under a named rule.");
      await smoothScroll(page, '[data-testid="candidate-board"]', 1000);
      await page.waitForTimeout(REPLAY ? 6000 : 5200);

      console.log("wait for ratified verdict");
      await page.waitForFunction(() => /ratified verdict/i.test(document.body.innerText), null, {
        timeout: REPLAY ? 180_000 : 45_000,
      });
      await page.waitForSelector('[data-testid="verify-btn"]:not([disabled])', {
        timeout: REPLAY ? 90_000 : 30_000,
      });

      if (!REPLAY) await waitUntilSince(page, chamberStartedAt, 21_000);
      await caption(page, "The verdict ships span by span — each line elected, then STOP is ratified: it is whole.");
      await smoothScroll(page, '[data-testid="verdict-strip"]', 900);
      await page.waitForTimeout(4500);

      await page.waitForSelector('[data-testid="dissent-register"]', { timeout: REPLAY ? 90_000 : 30_000 });
      await caption(page, "Losing arguments are preserved forever — the minority report.");
      await smoothScroll(page, '[data-testid="dissent-register"]', 900);
      await page.waitForTimeout(3200);

      console.log("verify + scorecard");
      if (!REPLAY) await waitUntilSince(page, chamberStartedAt, 33_000);
      await caption(page, "One click re-verifies the whole ledger: 12/12 auditability. A single model? 0/12.");
      await smoothScroll(page, '[data-testid="verify-btn"]', 700);
      await page.click('[data-testid="verify-btn"]');
      await page.waitForFunction(
        () => [...document.querySelectorAll("button")].some((b) => /scorecard/i.test(b.innerText) && !b.disabled),
        null,
        { timeout: 15_000 },
      );
      await page.getByRole("button", { name: /^scorecard$/i }).click();
      await page.waitForFunction(() => /tribunal ledger/i.test(document.body.innerText), null, { timeout: 15_000 });
      await page.waitForTimeout(2600);
      await scrollScorecardList(page);

      console.log("tamper demo");
      if (!REPLAY) await waitUntilSince(page, chamberStartedAt, 42_500);
      await caption(page, "Now edit one word of the record… verification fails instantly. Tamper-evident by construction.");
      await page.getByRole("button", { name: /^chamber$/i }).click();
      await page.waitForSelector('[data-testid="tamper-btn"]:not([disabled])', { timeout: 15_000 });
      await smoothScroll(page, '[data-testid="tamper-btn"]', 700);
      await page.click('[data-testid="tamper-btn"]');
      await page.waitForFunction(
        () => /verification\s+breaks immediately/i.test(document.body.innerText) || /the chain caught it/i.test(document.body.innerText),
        null,
        { timeout: 15_000 },
      );
      await page.evaluate(() => {
        const marker = [...document.querySelectorAll("p")].find(
          (p) => /verification\s+breaks immediately/i.test(p.innerText) || /the chain caught it/i.test(p.innerText),
        );
        marker?.closest(".glass")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      await page.waitForTimeout(5000);

      await page.screenshot({ path: FINAL_FRAME, fullPage: false });
      console.log(`final frame: ${FINAL_FRAME}`);
    } finally {
      if (context) await context.close().catch((e) => console.warn(`context close failed: ${e.message}`));
      if (browser) await browser.close().catch((e) => console.warn(`browser close failed: ${e.message}`));
    }

    const sourceVideo = copyNewestVideo();

    const manifest = {
      recordedAt: new Date().toISOString(),
      mode: REPLAY ? "replay" : "offline",
      web: WEB,
      api: API,
      videoDir: WEBM_DIR,
      videoFile: FINAL_VIDEO,
      sourceVideo,
      screenshot: FINAL_FRAME,
      submitUrl: "https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit",
      repo: "https://github.com/pazare/tribunal",
      checklist: join(ROOT, "docs", "SUBMISSION.md"),
    };
    writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`manifest: ${join(OUT, "manifest.json")}`);
  } finally {
    if (devProc?.pid) {
      process.kill(-devProc.pid, "SIGINT");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
