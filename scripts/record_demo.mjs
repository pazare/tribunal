/**
 * Autonomous demo recorder — "computer use" via Playwright.
 *
 * Boots (or assumes) the API + web dev servers, drives the full judging flow,
 * and saves a WebM video suitable for the 1-minute hackathon submission.
 *
 * Usage:
 *   npm run record:demo              # offline run (fast, deterministic)
 *   npm run record:demo -- --replay  # replay a committed real run from runs/
 *   npm run record:demo -- --live    # attempt cli/openrouter if available
 *
 * Output: runs/demo-recording/webm/*.webm (and a screenshot strip)
 */
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "runs", "demo-recording");
const WEB = "http://localhost:5173";
const API = "http://localhost:8787";
const args = process.argv.slice(2);
const REPLAY = args.includes("--replay");
const LIVE = args.includes("--live");

mkdirSync(OUT, { recursive: true });

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

async function main() {
  const devProc = await ensureServers();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: join(OUT, "webm"), size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  console.log("▶ docket");
  await page.goto(WEB, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="tribunal-app"]');
  await page.waitForTimeout(1500);

  if (REPLAY) {
    const runsDir = join(ROOT, "runs");
    const recorded = readdirSync(runsDir).filter((d) => existsSync(join(runsDir, d, "ledger.json")));
    const pick = recorded.find((d) => d.startsWith("run_")) ?? recorded[0];
    console.log(`▶ replay ${pick}`);
    await page.click(`button:has-text("${pick.slice(0, 12)}")`).catch(async () => {
      // fallback: click first replay button
      await page.locator("button").filter({ hasText: /lending/ }).first().click();
    });
  } else {
    console.log("▶ convene panel (lending)");
    await page.click('[data-testid="pack-lending"]');
  }

  console.log("▶ chamber — waiting for ledger");
  await page.waitForSelector('[data-testid="ledger-stream"]', { timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="ledger-stream"]');
      return el && (el.textContent?.includes("Verdict finalized") || el.textContent?.match(/run_finished/));
    },
    { timeout: REPLAY ? 120_000 : 60_000 },
  ).catch(async () => {
    // fallback: wait for verify button to enable
    await page.waitForSelector('[data-testid="verify-btn"]:not([disabled])', { timeout: 30_000 });
  });
  await page.waitForTimeout(800);

  console.log("▶ verify + scorecard");
  await page.waitForSelector('[data-testid="verify-btn"]:not([disabled])', { timeout: 30_000 });
  await page.click('[data-testid="verify-btn"]');
  await page.waitForTimeout(1500);
  await page.click('button:has-text("scorecard")');
  await page.waitForTimeout(2000);

  console.log("▶ tamper demo");
  await page.click('button:has-text("chamber")');
  await page.click('[data-testid="tamper-btn"]');
  await page.waitForTimeout(1500);
  await page.click('button:has-text("scorecard")');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: join(OUT, "final-frame.png"), fullPage: false });

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const vpath = await video.path();
    console.log(`✓ video: ${vpath}`);
  }
  console.log(`✓ screenshot: ${join(OUT, "final-frame.png")}`);

  // Write a manifest for submission handoff
  const manifest = {
    recordedAt: new Date().toISOString(),
    mode: REPLAY ? "replay" : LIVE ? "live" : "offline",
    web: WEB,
    api: API,
    videoDir: join(OUT, "webm"),
    screenshot: join(OUT, "final-frame.png"),
    submitUrl: "https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit",
    repo: "https://github.com/pazare/tribunal",
    checklist: join(ROOT, "docs", "SUBMISSION.md"),
  };
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`✓ manifest: ${join(OUT, "manifest.json")}`);

  if (devProc) {
    process.kill(-devProc.pid, "SIGINT");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
