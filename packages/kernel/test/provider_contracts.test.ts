import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildPanel,
  CliPanelClient,
  CLI_DEFAULT_ASSIGNMENT,
  DEFAULT_SOCIETIES,
  OPENROUTER_DEFAULT_ASSIGNMENT,
  minimalCliEnvironment,
  OpenRouterPanelClient,
} from "../src/index.js";
import type { PanelistCaseView, Provider, Society } from "../src/index.js";
import { LENDING_FIXTURE } from "./fixture.js";

const CLI_ASSIGNMENT: Record<Society, { provider: Provider; model: string }> = {
  evidence: { provider: "anthropic", model: "anthropic/test-evidence" },
  adversary: { provider: "openai", model: "openai/test-adversary" },
  law_policy: { provider: "cursor", model: "cursor/test-law-policy" },
  affected_party: { provider: "xai", model: "xai/test-affected-party" },
  safety: { provider: "anthropic", model: "anthropic/test-safety" },
  concision: { provider: "openai", model: "openai/test-concision" },
};

const OPENROUTER_ASSIGNMENT: Record<Society, { provider: Provider; model: string }> = {
  evidence: { provider: "microsoft", model: "microsoft/test-evidence" },
  adversary: { provider: "nvidia", model: "nvidia/test-adversary" },
  law_policy: { provider: "meta", model: "meta-llama/test-law-policy" },
  affected_party: { provider: "deepseek", model: "deepseek/test-affected-party" },
  safety: { provider: "mistral", model: "mistralai/test-safety" },
  concision: { provider: "microsoft", model: "microsoft/test-concision" },
};

test("exact six-seat CLI assignment is constructed without dropping or duplicating a society", () => {
  const seats = buildPanel({
    mode: "cli",
    assignment: CLI_ASSIGNMENT,
    // This is a construction-only test with no case data or subprocess call.
    protectedData: false,
  });

  assert.equal(seats.length, 6);
  assert.deepEqual(
    seats.map(({ client }) => client.society),
    DEFAULT_SOCIETIES,
  );
  assert.equal(new Set(seats.map(({ client }) => client.society)).size, 6);

  for (const [index, society] of DEFAULT_SOCIETIES.entries()) {
    const client = seats[index].client;
    assert.equal(client.seatId, `seat_${index + 1}_${society}`);
    assert.equal(client.provider, CLI_ASSIGNMENT[society].provider);
    assert.equal(client.model, CLI_ASSIGNMENT[society].model);
    assert.equal(client.transport, "cli");
  }
});

test("protected-data CLI transport uses stdin, strict isolation flags, a minimal environment, and removes its temp dir", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tribunal-panel-cli-security-"));
  const capturePath = join(dir, "capture.json");
  const binary = join(dir, "fake-codex");
  const priorSecret = process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD;
  process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD = "must-not-reach-child";
  writeFileSync(
    binary,
    `#!/usr/bin/env node
const fs = require("node:fs");
let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { prompt += chunk; });
process.stdin.on("end", () => {
  fs.writeFileSync(${JSON.stringify(capturePath)}, JSON.stringify({
    args: process.argv.slice(2),
    prompt,
    cwd: process.cwd(),
    leakedSecret: process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD,
    leakedOpenRouterKey: process.env.OPENROUTER_API_KEY
  }));
  process.stdout.write(JSON.stringify({
    candidates: [{
      text: "Request review.", isStop: false, confidence: 0.8,
      factualityRisk: 0.1, legalRisk: 0.1, fairnessRisk: 0.1,
      affectedPartyImpact: 0.5, warrant: "The evidence needs review.", evidenceRefs: []
    }],
    rejectedAlternatives: [], publicWarrant: "Review is warranted.", objections: []
  }));
});
`,
    { mode: 0o700 },
  );
  chmodSync(binary, 0o700);
  try {
    const client = new CliPanelClient("seat_1_evidence", "evidence", "openai", {
      bin: binary,
      timeoutMs: 5_000,
    });
    const result = await client.propose({ view: panelView(), seed: 17 });
    assert.equal(result.usage.status, "ok");
    const capture = JSON.parse(readFileSync(capturePath, "utf8")) as {
      args: string[];
      prompt: string;
      cwd: string;
      leakedSecret?: string;
      leakedOpenRouterKey?: string;
    };
    assert.ok(capture.prompt.includes("UNTRUSTED_CASE_DOCUMENTS_JSON"));
    assert.equal(capture.args.includes(capture.prompt), false);
    assert.ok(capture.args.includes("--ephemeral"));
    assert.ok(capture.args.includes("--ignore-user-config"));
    assert.ok(capture.args.includes("--ignore-rules"));
    assert.ok(capture.args.includes("read-only"));
    assert.ok(capture.args.includes("mcp_servers={}"));
    assert.equal(capture.leakedSecret, undefined);
    assert.equal(capture.leakedOpenRouterKey, undefined);
    assert.equal(existsSync(capture.cwd), false);
  } finally {
    if (priorSecret === undefined) delete process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD;
    else process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD = priorSecret;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("protected-data Anthropic panel transport also uses stdin with tools and persistence disabled", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tribunal-panel-anthropic-security-"));
  const capturePath = join(dir, "capture.json");
  const binary = join(dir, "fake-provider-cli");
  writeFileSync(
    binary,
    `#!/usr/bin/env node
const fs = require("node:fs");
let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { prompt += chunk; });
process.stdin.on("end", () => {
  fs.writeFileSync(${JSON.stringify(capturePath)}, JSON.stringify({
    args: process.argv.slice(2), prompt,
    smallFastModel: process.env.ANTHROPIC_SMALL_FAST_MODEL,
    nonessentialTraffic: process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
    leakedApiKey: process.env.ANTHROPIC_API_KEY
  }));
  process.stdout.write(JSON.stringify({
    candidates: [{
      text: "Request review.", isStop: false, confidence: 0.8,
      factualityRisk: 0.1, legalRisk: 0.1, fairnessRisk: 0.1,
      affectedPartyImpact: 0.5, warrant: "The evidence needs review.", evidenceRefs: []
    }],
    rejectedAlternatives: [], publicWarrant: "Review is warranted.", objections: []
  }));
});
`,
    { mode: 0o700 },
  );
  chmodSync(binary, 0o700);
  try {
    const client = new CliPanelClient("seat_3_law", "law_policy", "anthropic", {
      bin: binary,
      timeoutMs: 5_000,
    });
    const result = await client.propose({ view: panelView(), seed: 17 });
    assert.equal(result.usage.status, "ok");
    const capture = JSON.parse(readFileSync(capturePath, "utf8")) as {
      args: string[];
      prompt: string;
      smallFastModel?: string;
      nonessentialTraffic?: string;
      leakedApiKey?: string;
    };
    assert.equal(capture.args.includes(capture.prompt), false);
    assert.ok(capture.args.includes("--safe-mode"));
    assert.ok(capture.args.includes("--no-session-persistence"));
    assert.equal(capture.args[capture.args.indexOf("--tools") + 1], "");
    assert.equal(capture.args[capture.args.indexOf("--permission-mode") + 1], "dontAsk");
    assert.equal(capture.nonessentialTraffic, "1");
    assert.ok(capture.smallFastModel);
    assert.equal(capture.leakedApiKey, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("protected-data mode fails closed for CLI adapters without established tool/session isolation", () => {
  assert.throws(
    () => new CliPanelClient("seat_x", "adversary", "xai"),
    /disabled for protected-data runs/,
  );
  assert.throws(
    () => new CliPanelClient("seat_cursor", "safety", "cursor"),
    /disabled for protected-data runs/,
  );
  assert.doesNotThrow(
    () => new CliPanelClient("probe_x", "concision", "xai", { protectedData: false }),
  );
  assert.throws(
    () => minimalCliEnvironment({ OPENROUTER_API_KEY: "must-not-forward" }),
    /unreviewed provider child environment variable/,
  );
});

test("exact six-seat OpenRouter assignment is constructed without dropping or duplicating a society", () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-only-key";
  try {
    const seats = buildPanel({ mode: "openrouter", assignment: OPENROUTER_ASSIGNMENT });

    assert.equal(seats.length, 6);
    assert.deepEqual(
      seats.map(({ client }) => client.society),
      DEFAULT_SOCIETIES,
    );
    assert.equal(new Set(seats.map(({ client }) => client.society)).size, 6);

    for (const [index, society] of DEFAULT_SOCIETIES.entries()) {
      const client = seats[index].client;
      assert.equal(client.seatId, `seat_${index + 1}_${society}`);
      assert.equal(client.provider, OPENROUTER_ASSIGNMENT[society].provider);
      assert.equal(client.model, OPENROUTER_ASSIGNMENT[society].model);
      assert.equal(client.transport, "http");
    }
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("default panel assignments retain the intended CLI roster and current NVIDIA OpenRouter model", () => {
  assert.deepEqual(Object.keys(CLI_DEFAULT_ASSIGNMENT), DEFAULT_SOCIETIES);
  assert.deepEqual(Object.keys(OPENROUTER_DEFAULT_ASSIGNMENT), DEFAULT_SOCIETIES);
  assert.deepEqual(OPENROUTER_DEFAULT_ASSIGNMENT.adversary, {
    provider: "nvidia",
    model: "nvidia/nemotron-3-super-120b-a12b",
  });
});

test("OpenRouter usage distinguishes requested model, response model, and serving provider", async (t) => {
  let requestBody: any;
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    requestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        model: "microsoft/phi-4:served-revision",
        provider: "Azure",
        usage: { prompt_tokens: 123, completion_tokens: 45 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                candidates: [
                  {
                    text: "Request corroborating evidence before deciding.",
                    isStop: false,
                    confidence: 0.86,
                    factualityRisk: 0.12,
                    legalRisk: 0.09,
                    fairnessRisk: 0.08,
                    affectedPartyImpact: 0.72,
                    warrant: "The record contains a material contradiction.",
                    evidenceRefs: ["e_income", "e_dti_draft"],
                  },
                ],
                rejectedAlternatives: [],
                publicWarrant: "The record should be reconciled before an adverse decision.",
                objections: [],
              }),
            },
          },
        ],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const requestedModel = "microsoft/phi-4";
  const client = new OpenRouterPanelClient("seat_1_evidence", "evidence", "microsoft", {
    apiKey: "test-only-key",
    baseUrl: `http://127.0.0.1:${address.port}`,
    model: requestedModel,
  });

  const result = await client.propose({ view: panelView(), seed: 17 });

  assert.equal(requestBody.model, requestedModel);
  assert.equal(result.usage.model, "microsoft/phi-4:served-revision");
  assert.equal(result.usage.requestedModel, requestedModel);
  assert.equal(result.usage.servingProvider, "Azure");
  assert.equal(result.usage.tokensIn, 123);
  assert.equal(result.usage.tokensOut, 45);
});

function panelView(): PanelistCaseView {
  return {
    case: {
      runId: "run_provider_contract",
      packId: LENDING_FIXTURE.id,
      title: LENDING_FIXTURE.title,
      domain: LENDING_FIXTURE.domain,
      question: LENDING_FIXTURE.question,
      constraints: LENDING_FIXTURE.constraints,
      evidence: LENDING_FIXTURE.evidence,
      documents: LENDING_FIXTURE.documents,
      prefix: "",
      slot: LENDING_FIXTURE.slots[0],
      ratifiedCommitments: [],
      rejectedAlternatives: [],
      unresolvedDissent: [],
    },
    seatId: "seat_1_evidence",
    society: "evidence",
    evidence: LENDING_FIXTURE.evidence,
    memory: [],
  };
}
