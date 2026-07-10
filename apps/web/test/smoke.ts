import assert from "node:assert/strict";
import { once } from "node:events";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";

const ROOT = resolve(import.meta.dirname, "../../..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

async function freePort(): Promise<number> {
  const server = createNetServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object", "could not reserve a local port");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForServer(url: string, child: ChildProcess, logs: () => string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`Tribunal server exited ${child.exitCode} before readiness.\n${logs()}`);
    }
    try {
      const response = await fetch(`${url}/api/packs`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out waiting for ${url}.\n${logs()}`);
}

async function waitForRunFinished(baseUrl: string, runId: string): Promise<any> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runId)}`);
    if (response.ok) {
      const details = await response.json();
      if (details.events?.some((event: any) => event.kind === "run_finished")) return details;
      if (details.status === "error") throw new Error(details.error ?? "run failed");
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Run ${runId} did not finish`);
}

async function waitForRunEvent(
  baseUrl: string,
  runId: string,
  predicate: (event: any) => boolean,
): Promise<any> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runId)}`);
    if (response.ok) {
      const details = await response.json();
      if (details.events?.some(predicate)) return details;
      if (details.status === "error") throw new Error(details.error ?? "run failed");
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Run ${runId} did not reach the expected event`);
}

async function startOfflineRun(page: Page): Promise<{ provisionalId: string; ledgerRunId: string }> {
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/run") && response.request().method() === "POST",
  );
  await page.getByTestId("start-run").click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, await response.text());
  const { runId: provisionalId } = await response.json();
  assert.match(provisionalId, /^live_/);

  const details = await waitForRunFinished(new URL(response.url()).origin, provisionalId);
  const finished = details.events.find((event: any) => event.kind === "run_finished");
  assert.ok(finished?.runId, "finished ledger must expose its content-derived run id");
  return { provisionalId, ledgerRunId: finished.runId };
}

async function waitForUiCompletion(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const button = [...document.querySelectorAll("button")].find((item) =>
        item.textContent?.includes("Verify + audit"),
      ) as HTMLButtonElement | undefined;
      return Boolean(button && !button.disabled);
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function main() {
  const testDir = mkdtempSync(join(tmpdir(), "tribunal-web-smoke-"));
  const runsDir = join(testDir, "runs");
  const fakeBinDir = join(testDir, "bin");
  mkdirSync(fakeBinDir, { recursive: true });
  const fakeCodex = join(fakeBinDir, "codex");
  writeFileSync(
    fakeCodex,
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "codex-smoke 1.0"
  exit 0
fi
trap '' TERM
sh -c 'trap "" TERM; while :; do sleep 1; done' &
wait
`,
  );
  chmodSync(fakeCodex, 0o755);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let browser: Browser | null = null;
  let server: ChildProcess | null = null;
  let serverOutput = "";

  try {
    const build = spawnSync(npm, ["run", "build", "--workspace", "@tribunal/web"], {
      cwd: ROOT,
      env: process.env,
      encoding: "utf8",
    });
    if (build.status !== 0) {
      throw new Error(`Web build failed.\n${build.stdout}\n${build.stderr}`);
    }

    server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], {
      cwd: ROOT,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        TRIBUNAL_RUNS_DIR: runsDir,
        PATH: `${fakeBinDir}${delimiter}${process.env.PATH ?? ""}`,
        // The smoke gate must never auto-enable a paid HTTP panel.
        OPENROUTER_API_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const capture = (chunk: Buffer) => {
      serverOutput = `${serverOutput}${chunk.toString()}`.slice(-12_000);
    };
    server.stdout?.on("data", capture);
    server.stderr?.on("data", capture);
    await waitForServer(baseUrl, server, () => serverOutput);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto(`${baseUrl}/?mode=offline`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("pack-lending").waitFor();
    assert.equal(await page.locator('[data-testid^="pack-"]').count(), 4, "all four packs should load");
    const packs = await (await fetch(`${baseUrl}/api/packs`)).json();
    assert.ok(
      packs.every((pack: any) =>
        pack.slots.every(
          (slot: any) =>
            typeof slot.instruction === "string" &&
            slot.riskBands &&
            Array.isArray(slot.candidatesHint),
        ),
      ),
      "pack API must expose the complete decision-slot contract used by the operator UI",
    );
    const passivePanel = await (await fetch(`${baseUrl}/api/panel?probe=1`)).json();
    assert.equal(passivePanel.probes, undefined, "GET /api/panel must never trigger paid model probes");
    const foreignOrigin = await fetch(`${baseUrl}/api/packs`, {
      headers: { Origin: "https://hostile.example" },
    });
    assert.equal(foreignOrigin.status, 403, "foreign browser origins must be rejected, not merely hidden by CORS");
    assert.equal(await page.getByTestId("start-run").isEnabled(), true);
    await page.getByRole("spinbutton", { name: "Span budget" }).fill("1");

    // First run: default memory path. Verify and tamper through the real UI.
    const first = await startOfflineRun(page);
    await waitForUiCompletion(page);
    const verifyResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/verify") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Verify + audit" }).click();
    const verifyResponse = await verifyResponsePromise;
    const verified = await verifyResponse.json();
    assert.equal(verified.verify?.ok, true, JSON.stringify(verified.verify?.problems));
    await page.getByRole("heading", { name: "The record verifies." }).waitFor();

    await page.getByRole("button", { name: "chamber" }).click();
    const tamperResponsePromise = page.waitForResponse((response) =>
      /\/api\/runs\/[^/]+\/tampered\?seq=\d+$/.test(response.url()),
    );
    await page.getByRole("button", { name: /Tamper-test seq/ }).click();
    const tampered = await (await tamperResponsePromise).json();
    assert.equal(tampered.verify?.ok, false, "targeted mutation must fail verification");
    await page.getByText(/Targeted mutation at sequence .* detected/).waitFor();

    // Second run: same pack/seed/providers but a different control flag. The
    // kernel run id is intentionally identical while the ledger bytes differ,
    // forcing collision-safe persistence to expose a unique artifactId.
    await page.getByRole("button", { name: "docket", exact: true }).click();
    await page.getByRole("switch", { name: /Deliberation memory/ }).click();
    const second = await startOfflineRun(page);
    assert.equal(second.ledgerRunId, first.ledgerRunId, "fixture should exercise a run-id collision");
    await waitForUiCompletion(page);

    const runsResponse = await fetch(`${baseUrl}/api/runs`);
    assert.equal(runsResponse.status, 200);
    const runIndex = await runsResponse.json();
    const collisionArtifacts = runIndex.recorded.filter(
      (run: any) => run.runId === first.ledgerRunId,
    );
    assert.equal(collisionArtifacts.length, 2, "both colliding ledgers must remain addressable");
    assert.equal(
      new Set(collisionArtifacts.map((run: any) => run.artifactId)).size,
      2,
      "colliding ledgers need unique artifact ids",
    );
    assert.ok(
      collisionArtifacts.some((run: any) => run.artifactId !== run.runId),
      "one collision artifact should use its storage suffix",
    );
    for (const artifact of collisionArtifacts) {
      const response = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(artifact.artifactId)}`);
      assert.equal(response.status, 200, `artifact ${artifact.artifactId} should be retrievable`);
      const details = await response.json();
      assert.equal(details.artifactId ?? details.runId, artifact.artifactId);
    }

    await page.getByRole("button", { name: "runs" }).click();
    await page.getByText("distinct artifact").waitFor();

    // Third run: a hanging fake CLI exercises live stop, queue nacks, process
    // termination, terminal persistence, and cancellation-aware presentation.
    await page.getByRole("button", { name: "docket", exact: true }).click();
    await page.getByRole("button", { name: "Local CLIs" }).click();
    await page.getByRole("button", { name: "Exact seating" }).click();
    const cliSeatSelects = page.getByLabel("CLI provider");
    assert.equal(await cliSeatSelects.count(), 6, "exact seating must expose all six societies");
    for (const select of await cliSeatSelects.all()) await select.selectOption("openai");
    const liveStartPromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/run") && response.request().method() === "POST",
    );
    await page.getByTestId("start-run").click();
    const liveStart = await liveStartPromise;
    const liveStartBody = await liveStart.json();
    assert.equal(liveStart.status(), 200, JSON.stringify(liveStartBody));
    const liveRequest = liveStart.request().postDataJSON();
    assert.equal(liveRequest.providers, undefined, "exact seating must not also send a provider pool");
    assert.deepEqual(Object.keys(liveRequest.assignment).sort(), [
      "adversary", "affected_party", "concision", "evidence", "law_policy", "safety",
    ]);
    assert.ok(Object.values(liveRequest.assignment).every((seat: any) => seat.provider === "openai" && seat.model === undefined));
    const { runId: liveRunId } = liveStartBody;
    await waitForRunEvent(baseUrl, liveRunId, (event) => event.kind === "case_presented");

    const malformedIntervention = await fetch(`${baseUrl}/api/runs/${liveRunId}/intervene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "silently_rewritten", channel: "typed", text: "invalid" }),
    });
    assert.equal(malformedIntervention.status, 400, "unknown intervention kinds must fail closed");
    const fractionalIntervention = await fetch(`${baseUrl}/api/runs/${liveRunId}/intervene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "objection", channel: "typed", text: "invalid span", spanIndex: 0.5 }),
    });
    assert.equal(fractionalIntervention.status, 400, "fractional intervention spans must be rejected");

    const queuedIds: string[] = [];
    for (const [kind, text] of [
      ["objection", "Pause before relying on the disputed income figure."],
      ["question", "Which document resolves the discrepancy?"],
    ]) {
      const response = await fetch(`${baseUrl}/api/runs/${liveRunId}/intervene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "Smoke auditor", kind, channel: "typed", text, spanIndex: -1 }),
      });
      const body = await response.json();
      assert.equal(response.status, 200, JSON.stringify(body));
      queuedIds.push(body.interventionId);
    }
    const queueBeforeStop = await (await fetch(`${baseUrl}/api/runs/${liveRunId}/interventions`)).json();
    assert.deepEqual(
      queueBeforeStop.pending.map((item: any) => item.interventionId).sort(),
      queuedIds.slice().sort(),
      "the operator queue must expose both pending receipt ids",
    );

    const formStyleCancel = await fetch(`${baseUrl}/api/runs/${liveRunId}/cancel`, { method: "POST" });
    assert.equal(formStyleCancel.status, 415, "safe stop must reject simple-form/CSRF-compatible requests");
    const foreignCancel = await fetch(`${baseUrl}/api/runs/${liveRunId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://hostile.example" },
      body: JSON.stringify({ actor: "Hostile", reason: "cross-site" }),
    });
    assert.equal(foreignCancel.status, 403);

    await page.getByText("Safe stop controls").click();
    await page.getByLabel("Receipt actor").fill("Pablo, operator");
    await page.getByLabel("Public stop reason").fill("Cancellation smoke: preserve the partial record");
    const stopResponsePromise = page.waitForResponse(
      (response) => /\/api\/runs\/[^/]+\/cancel$/.test(response.url()) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Stop safely" }).click();
    const stopResponse = await stopResponsePromise;
    const stopBody = await stopResponse.json();
    assert.equal(stopResponse.status(), 202, JSON.stringify(stopBody));
    const firstReceipt = stopBody.cancellation;
    assert.deepEqual(firstReceipt.unappliedInterventionIds.slice().sort(), queuedIds.slice().sort());

    const retryCancel = await fetch(`${baseUrl}/api/runs/${liveRunId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "Different actor", reason: "must not replace the receipt" }),
    });
    assert.equal(retryCancel.status, 200);
    assert.deepEqual((await retryCancel.json()).cancellation, firstReceipt, "stop retries must be idempotent");

    const cancelled = await waitForRunFinished(baseUrl, liveRunId);
    assert.equal(cancelled.status, "cancelled");
    const terminal = cancelled.events.at(-1);
    assert.equal(terminal.kind, "run_finished");
    assert.equal(terminal.payload.stoppedBy, "cancelled");
    assert.deepEqual(terminal.payload.cancellation, firstReceipt);
    const kernelIdRetry = await fetch(`${baseUrl}/api/runs/${terminal.runId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "Retry", reason: "kernel-id idempotency check" }),
    });
    assert.equal(kernelIdRetry.status, 200);
    assert.deepEqual((await kernelIdRetry.json()).cancellation, firstReceipt);
    const cancelledCalls = cancelled.events.filter((event: any) => event.kind === "provider_call");
    assert.equal(cancelledCalls.length, 6);
    assert.ok(cancelledCalls.every((event: any) => event.payload.usage.status === "cancelled"));

    const cancellationVerify = await fetch(`${baseUrl}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: liveRunId }),
    });
    assert.equal(cancellationVerify.status, 200);
    assert.equal((await cancellationVerify.json()).verify.ok, true);
    const finishedCancel = await fetch(`${baseUrl}/api/runs/${first.provisionalId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "Operator", reason: "too late" }),
    });
    assert.equal(finishedCancel.status, 409, "a normally finished run must reject cancellation");
    await page.getByTestId("cancellation-record").waitFor({ timeout: 15_000 });
    assert.equal(await page.getByTestId("verdict-strip").count(), 0, "a pre-verdict stop must not be labeled a verdict");
    await page.getByRole("button", { name: "Verify cancellation record" }).click();
    await page.getByRole("heading", { name: "The record verifies." }).waitFor();

    assert.deepEqual(browserErrors, [], `browser errors:\n${browserErrors.join("\n")}`);

    console.log(
      `web smoke ok: packs=4 run=${first.ledgerRunId} verify=valid tamper=detected collisionArtifacts=2 cancellation=valid`,
    );
  } finally {
    await browser?.close().catch(() => undefined);
    if (server && server.exitCode == null) {
      server.kill("SIGTERM");
      await Promise.race([
        once(server, "exit"),
        new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000)),
      ]).catch(() => undefined);
      if (server.exitCode == null) server.kill("SIGKILL");
    }
    rmSync(testDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
