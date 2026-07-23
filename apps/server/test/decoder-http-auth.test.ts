import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "../../..");
const TOKEN = "0123456789abcdef".repeat(4);

async function freePort(): Promise<number> {
  const reservation = createNetServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  assert.ok(address && typeof address === "object");
  reservation.close();
  await once(reservation, "close");
  return address.port;
}

async function waitForServer(baseUrl: string, child: ChildProcess, logs: () => string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`server exited ${child.exitCode} before readiness\n${logs()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/packs`);
      await response.arrayBuffer();
      if (response.ok) return;
    } catch {
      // Still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`timed out waiting for ${baseUrl}\n${logs()}`);
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000)),
  ]).catch(() => undefined);
  if (child.exitCode == null) child.kill("SIGKILL");
}

test("decoder HTTP auth fails closed and rotates an opaque browser session", async (t) => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const origin = baseUrl;
  const runsDir = mkdtempSync(join(tmpdir(), "tribunal-decoder-auth-"));
  let output = "";
  const child = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      TRIBUNAL_RUNS_DIR: runsDir,
      TRIBUNAL_DECODER_OPERATOR_TOKEN: TOKEN,
      TRIBUNAL_ALLOWED_HOSTS: `tribunal.internal:${port}`,
      TRIBUNAL_DECODER_ALLOWED_ORIGINS: "https://tribunal.example",
      TRIBUNAL_DECODER_TRUST_PROXY: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-8_000);
  };
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);
  t.after(async () => {
    await stopServer(child);
    rmSync(runsDir, { recursive: true, force: true });
  });

  await waitForServer(baseUrl, child, () => output);

  const unauthorized = await fetch(`${baseUrl}/api/decoder/runs`);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "no-store");
  assert.match(unauthorized.headers.get("set-cookie") ?? "", /Max-Age=0/);

  const safePacks = await fetch(`${baseUrl}/api/packs`);
  assert.equal(safePacks.status, 200);

  const safeHealth = await fetch(`${baseUrl}/api/health`);
  assert.equal(safeHealth.status, 200);
  assert.deepEqual(await safeHealth.json(), { ok: true, service: "tribunal-api" });

  const protectedRuns = await fetch(`${baseUrl}/api/runs`);
  assert.equal(protectedRuns.status, 401);
  assert.deepEqual(await protectedRuns.json(), { error: "Tribunal operator authorization required" });

  // Provider health starts version subprocesses, so it is not the passive
  // health surface and must stop before any probe when unauthenticated.
  const protectedProviderHealth = await fetch(`${baseUrl}/api/panel`);
  assert.equal(protectedProviderHealth.status, 401);

  const protectedMutation = await fetch(`${baseUrl}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId: "irrelevant", mode: "offline" }),
  });
  assert.equal(protectedMutation.status, 401);

  const bearerAuthorizedGeneral = await fetch(`${baseUrl}/api/runs`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(bearerAuthorizedGeneral.status, 200);

  const reboundStatus = await new Promise<number | undefined>((resolveStatus, rejectRequest) => {
    const rebound = httpRequest(`${baseUrl}/api/packs`, {
      headers: { Host: `attacker.example:${port}` },
    }, (response) => {
      response.resume();
      response.once("end", () => resolveStatus(response.statusCode));
    });
    rebound.once("error", rejectRequest);
    rebound.end();
  });
  assert.equal(reboundStatus, 421);

  const hostDerivedOriginStatus = await new Promise<number | undefined>((resolveStatus, rejectRequest) => {
    const request = httpRequest(`${baseUrl}/api/packs`, {
      headers: {
        Host: `tribunal.internal:${port}`,
        Origin: `http://tribunal.internal:${port}`,
      },
    }, (response) => {
      response.resume();
      response.once("end", () => resolveStatus(response.statusCode));
    });
    request.once("error", rejectRequest);
    request.end();
  });
  assert.equal(hostDerivedOriginStatus, 403);

  const hostile = await fetch(`${baseUrl}/api/packs`, {
    headers: { Origin: "https://hostile.example" },
  });
  assert.equal(hostile.status, 403);

  const spoofedHttps = await fetch(`${baseUrl}/api/decoder/session`, {
    method: "POST",
    headers: {
      Origin: "https://tribunal.example",
      Authorization: `Bearer ${TOKEN}`,
      "X-Forwarded-Proto": "https",
    },
  });
  assert.equal(spoofedHttps.status, 403);

  const wrong = await fetch(`${baseUrl}/api/decoder/session`, {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer wrong" },
  });
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), { error: "decoder operator authorization required" });

  const unlocked = await fetch(`${baseUrl}/api/decoder/session`, {
    method: "POST",
    headers: { Origin: origin, Authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(unlocked.status, 200);
  const setCookie = unlocked.headers.get("set-cookie") ?? "";
  assert.match(
    setCookie,
    /^tribunal_decoder_session=[A-Za-z0-9_-]{43}; Path=\/api; HttpOnly; SameSite=Strict; Max-Age=28800$/,
  );
  assert.equal(setCookie.includes(TOKEN), false);
  const sessionCookie = setCookie.split(";", 1)[0];

  const authorized = await fetch(`${baseUrl}/api/decoder/runs`, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(authorized.status, 200);

  const authorizedGeneral = await fetch(`${baseUrl}/api/runs`, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(authorizedGeneral.status, 200);

  const duplicate = await fetch(`${baseUrl}/api/decoder/runs`, {
    headers: { Cookie: `${sessionCookie}; ${sessionCookie}` },
  });
  assert.equal(duplicate.status, 401);

  const disallowedOrigin = await fetch(`${baseUrl}/api/decoder/runs`, {
    headers: { Origin: "http://127.0.0.1:1", Cookie: sessionCookie },
  });
  assert.equal(disallowedOrigin.status, 403);

  const locked = await fetch(`${baseUrl}/api/decoder/session`, {
    method: "DELETE",
    headers: { Origin: origin, Cookie: sessionCookie },
  });
  assert.equal(locked.status, 200);
  assert.match(locked.headers.get("set-cookie") ?? "", /Max-Age=0/);

  const stale = await fetch(`${baseUrl}/api/decoder/runs`, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(stale.status, 401);
});
