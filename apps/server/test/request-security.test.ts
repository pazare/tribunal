import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAllowedHosts,
  buildAllowedOrigins,
  exactAllowedOrigin,
  operatorAuthorizationRequired,
  requestHasAllowedHost,
} from "../src/request-security.js";

function request(hostLines: string[]): { rawHeaders: string[]; headers: { host?: string } } {
  return {
    rawHeaders: hostLines.flatMap((host) => ["Host", host]),
    headers: { host: hostLines[0] },
  };
}

test("Host policy is exact and rejects DNS-rebinding, malformed, missing, and duplicate values", () => {
  const allowed = buildAllowedHosts(8787, "tribunal.internal:9443");
  assert.equal(requestHasAllowedHost(request(["127.0.0.1:8787"]), allowed), true);
  assert.equal(requestHasAllowedHost(request(["tribunal.internal:9443"]), allowed), true);
  assert.equal(requestHasAllowedHost(request(["attacker.example:8787"]), allowed), false);
  assert.equal(requestHasAllowedHost(request(["localhost.attacker.example:8787"]), allowed), false);
  assert.equal(requestHasAllowedHost(request(["127.0.0.1:9999"]), allowed), false);
  assert.equal(requestHasAllowedHost(request(["user@127.0.0.1:8787"]), allowed), false);
  assert.equal(requestHasAllowedHost(request([]), allowed), false);
  assert.equal(requestHasAllowedHost(request(["127.0.0.1:8787", "attacker.example"]), allowed), false);
});

test("Origin policy uses exact configured origins without trusting Host-derived same origin", () => {
  const allowed = buildAllowedOrigins(8787, "https://tribunal.example");
  assert.equal(exactAllowedOrigin("http://127.0.0.1:8787", allowed), "http://127.0.0.1:8787");
  assert.equal(exactAllowedOrigin("https://tribunal.example", allowed), "https://tribunal.example");
  assert.equal(exactAllowedOrigin("https://tribunal.example/", allowed), null);
  assert.equal(exactAllowedOrigin("https://hostile.example", allowed), null);
  assert.equal(exactAllowedOrigin("null", allowed), null);
  assert.throws(() => buildAllowedOrigins(8787, "https://tribunal.example/path"), /exact http/);
});

test("quota, mutation, intervention, decoder, and ledger routes require operator authorization", () => {
  for (const [method, path] of [
    ["POST", "/api/panel/probe"],
    ["POST", "/api/run"],
    ["GET", "/api/runs"],
    ["GET", "/api/runs/run_1/events"],
    ["POST", "/api/runs/run_1/intervene"],
    ["POST", "/api/verify"],
    ["POST", "/api/decoder/runs"],
    ["GET", "/api/decoder/runs/decoder_1"],
    ["GET", "/api/panel"],
    ["GET", "/api/decoder/health"],
    ["POST", "/api/future-agent-endpoint"],
  ] as const) {
    assert.equal(operatorAuthorizationRequired(method, path), true, `${method} ${path}`);
  }
  assert.equal(operatorAuthorizationRequired("GET", "/api/packs"), false);
  assert.equal(operatorAuthorizationRequired("GET", "/api/capabilities"), false);
  assert.equal(operatorAuthorizationRequired("GET", "/api/health"), false);
  assert.equal(operatorAuthorizationRequired("GET", "/"), false);
});
