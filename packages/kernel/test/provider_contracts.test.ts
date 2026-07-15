import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { test } from "node:test";
import {
  buildPanel,
  CLI_DEFAULT_ASSIGNMENT,
  DEFAULT_SOCIETIES,
  OPENROUTER_DEFAULT_ASSIGNMENT,
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
  const seats = buildPanel({ mode: "cli", assignment: CLI_ASSIGNMENT });

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
