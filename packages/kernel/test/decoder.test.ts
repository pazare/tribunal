import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJSON,
  decoderUnitKey,
  parseDecoderTurn,
  runDecoder,
  validateDecoderUnit,
  verifyDecoderLedger,
  sha256Hex,
  type DecoderClient,
  type DecoderClientRequest,
  type DecoderTransportResult,
} from "../src/index.js";

function rehashDecoderEvents(events: any[]): any[] {
  let previous = "0".repeat(64);
  return events.map((event, seq) => {
    const body = { ...event, seq, prevHash: previous };
    delete body.hash;
    const sealed = { ...body, hash: sha256Hex(canonicalJSON(body)) };
    previous = sealed.hash;
    return sealed;
  });
}

function receipt(responseText: string, status: DecoderTransportResult["status"] = "ok"): DecoderTransportResult {
  return {
    responseText,
    stdout: responseText,
    stderr: "",
    command: { bin: "fake", args: ["--test"], promptTransport: "stdin" },
    startedAt: 1,
    finishedAt: 2,
    durationMs: 1,
    exitCode: status === "ok" ? 0 : 1,
    signal: null,
    status,
    error: status === "ok" ? undefined : "fake failure",
    cliVersion: "fake 1.0",
  };
}

function unit(kind: "span" | "space" | "enter" | "stop", text: string) {
  return { kind, text };
}

function proposal(value: ReturnType<typeof unit>, warrant = "public warrant") {
  return JSON.stringify({ unit: value, publicWarrant: warrant });
}

function revision(value: ReturnType<typeof unit>, warrant = "public warrant") {
  return JSON.stringify({ unit: value, publicWarrant: warrant, critiqueOfPeer: "public critique" });
}

class FakeClient implements DecoderClient {
  readonly provider: "openai" | "anthropic";
  readonly requestedModel: string;
  readonly requestedEffort = "medium" as const;
  readonly modelSource = "requested" as const;
  readonly transport = "test" as const;
  readonly requests: DecoderClientRequest[] = [];

  constructor(
    readonly clientId: "codex" | "claude",
    private readonly answer: (request: DecoderClientRequest) => DecoderTransportResult | string,
  ) {
    this.provider = clientId === "codex" ? "openai" : "anthropic";
    this.requestedModel = clientId === "codex" ? "gpt-5.6-sol" : "claude-opus-4-8";
  }

  async invoke(request: DecoderClientRequest): Promise<DecoderTransportResult> {
    this.requests.push(request);
    const value = this.answer(request);
    return typeof value === "string" ? receipt(value) : value;
  }
}

function consensusRun(runId: string) {
  const answer = (request: DecoderClientRequest) =>
    request.phase === "propose"
      ? proposal(unit("span", "A"))
      : request.phase === "revise"
        ? revision(unit("span", "A"))
        : JSON.stringify({ pick: 0, publicWarrant: "judge" });
  return runDecoder({
    userPrompt: "Answer exactly.",
    clients: [new FakeClient("codex", answer), new FakeClient("claude", answer)],
    maxRounds: 1,
    runId,
    clock: "logical",
    sampleTieBreak: () => ({ bit: 0, nonce: "n" }),
  });
}

test("strict decoder units preserve controls without magic strings or repair", () => {
  assert.equal(validateDecoderUnit(unit("space", " ")).ok, true);
  assert.equal(validateDecoderUnit(unit("enter", "\n")).ok, true);
  assert.equal(validateDecoderUnit(unit("stop", "")).ok, true);
  assert.equal(validateDecoderUnit(unit("span", "<STOP>")).ok, true);
  assert.notEqual(
    decoderUnitKey(validateDecoderUnit(unit("span", "<STOP>")).unit!),
    decoderUnitKey(validateDecoderUnit(unit("stop", "")).unit!),
  );
  for (const invalid of [
    unit("span", ""),
    unit("span", "two words"),
    unit("span", "tab\there"),
    unit("span", "nbsp\u00a0here"),
    unit("span", "nul\u0000here"),
    unit("span", "zero\u200bwidth"),
    unit("span", "bidi\u202econtrol"),
    unit("span", "lone\ud800surrogate"),
    unit("space", "  "),
    unit("enter", "\r\n"),
    unit("stop", "STOP"),
  ]) {
    assert.equal(validateDecoderUnit(invalid).ok, false, JSON.stringify(invalid));
  }
});

test("decoder response parser rejects duplicate keys and empty public warrants", () => {
  const duplicate = parseDecoderTurn(
    "propose",
    '{"unit":{"kind":"span","text":"A"},"unit":{"kind":"span","text":"B"},"publicWarrant":"reason"}',
  );
  assert.equal(Boolean(duplicate.parsed), false);
  assert.match(duplicate.errors.join(" "), /duplicate JSON key/);
  const emptyWarrant = parseDecoderTurn(
    "revise",
    JSON.stringify({
      unit: { kind: "span", text: "A" },
      publicWarrant: "  ",
      critiqueOfPeer: "\n",
    }),
  );
  assert.equal(Boolean(emptyWarrant.parsed), false);
  assert.match(emptyWarrant.errors.join(" "), /non-whitespace/);
});

test("fresh consensus rounds reproduce exact SPAN SPACE ENTER STOP bytes", async () => {
  const sequence = [
    unit("span", "Hi"),
    unit("space", " "),
    unit("span", "there"),
    unit("enter", "\n"),
    unit("span", "x"),
    unit("stop", ""),
  ];
  const answer = (request: DecoderClientRequest) =>
    request.phase === "propose"
      ? proposal(sequence[request.roundIndex])
      : request.phase === "revise"
        ? revision(sequence[request.roundIndex])
        : JSON.stringify({ pick: 0, publicWarrant: "judge warrant" });
  const codex = new FakeClient("codex", answer);
  const claude = new FakeClient("claude", answer);
  const result = await runDecoder({
    userPrompt: "Greet me.",
    clients: [codex, claude],
    maxRounds: 10,
    runId: "decoder_exact",
    clock: "logical",
    sampleTieBreak: () => ({ bit: 0, nonce: "n" }),
  });
  assert.equal(result.status, "stopped");
  assert.equal(result.finalOutput, "Hi there\nx");
  assert.equal(result.committedUnits.length, 6);
  assert.equal(verifyDecoderLedger(result.events).ok, true);
  assert.equal(codex.requests.filter((request) => request.phase === "propose").length, 6);
  assert.equal(claude.requests.filter((request) => request.phase === "revise").length, 6);
  const stopSeq = result.events.find((event) =>
    event.kind === "unit_committed" && (event.payload.unit as any)?.kind === "stop",
  )!.seq;
  assert.equal(
    result.events.slice(stopSeq + 1).every((event) => event.kind === "decoder_finished"),
    true,
  );
});

test("persistent non-STOP split uses the precommitted bit and preserves dissent", async () => {
  const client = (id: "codex" | "claude") => new FakeClient(id, (request) => {
    const own = id === "codex" ? unit("span", "A") : unit("span", "B");
    if (request.phase === "propose") return proposal(own);
    if (request.phase === "revise") return revision(own);
    return JSON.stringify({ pick: id === "codex" ? 0 : 1, publicWarrant: "split judge" });
  });
  const result = await runDecoder({
    userPrompt: "Choose.",
    clients: [client("codex"), client("claude")],
    maxRounds: 1,
    runId: "decoder_tie",
    clock: "logical",
    sampleTieBreak: () => ({ bit: 1, nonce: "precommitted" }),
  });
  assert.equal(result.status, "budget_exhausted");
  assert.equal(result.finalOutput, "B");
  const selection = result.events.find((event) => event.kind === "unit_selected")!;
  assert.equal(selection.payload.method, "precommitted_tie_break");
  assert.deepEqual((selection.payload.tieReveal as any).bit, 1);
  assert.equal(result.events.some((event) => event.kind === "dissent_preserved"), true);
  assert.equal(verifyDecoderLedger(result.events).ok, true);
});

test("a split ballot cannot make STOP unilateral", async () => {
  const client = (id: "codex" | "claude") => new FakeClient(id, (request) => {
    const own = id === "codex" ? unit("stop", "") : unit("span", "continue");
    if (request.phase === "propose") return proposal(own);
    if (request.phase === "revise") return revision(own);
    return JSON.stringify({ pick: id === "codex" ? 0 : 1, publicWarrant: "split judge" });
  });
  const result = await runDecoder({
    userPrompt: "Answer.",
    clients: [client("codex"), client("claude")],
    maxRounds: 1,
    runId: "decoder_stop_split",
    clock: "logical",
    sampleTieBreak: () => ({ bit: 0, nonce: "n" }),
  });
  assert.equal(result.status, "budget_exhausted");
  assert.equal(result.finalOutput, "continue");
  assert.equal(
    result.events.find((event) => event.kind === "unit_selected")!.payload.method,
    "unilateral_stop_overruled",
  );
});

test("one provider cannot satisfy quorum after transparent retries", async () => {
  const codex = new FakeClient("codex", () => "not-json");
  const claude = new FakeClient("claude", (request) =>
    request.phase === "propose" ? proposal(unit("span", "ok")) : revision(unit("span", "ok")),
  );
  const result = await runDecoder({
    userPrompt: "Answer.",
    clients: [codex, claude],
    maxRounds: 1,
    runId: "decoder_quorum",
    clock: "logical",
  });
  assert.equal(result.status, "failed");
  assert.equal(result.finalOutput, "");
  assert.equal(result.committedUnits.length, 0);
  assert.equal(codex.requests.length, 2);
  assert.equal(result.events.filter((event) => event.kind === "provider_attempt").length, 3);
  assert.equal(verifyDecoderLedger(result.events).ok, true);
});

test("pre-aborted run seals cancellation and tampering fails exact verification", async () => {
  const abort = new AbortController();
  abort.abort(new Error("operator cancel"));
  const never = new FakeClient("codex", () => { throw new Error("must not call"); });
  const other = new FakeClient("claude", () => { throw new Error("must not call"); });
  const result = await runDecoder({
    userPrompt: "Answer.",
    clients: [never, other],
    maxRounds: 2,
    runId: "decoder_cancel",
    clock: "logical",
    signal: abort.signal,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(verifyDecoderLedger(result.events).ok, true);
  const tampered = structuredClone(result.events);
  (tampered.at(-1)!.payload as any).finalOutput = "changed";
  assert.equal(verifyDecoderLedger(tampered).ok, false);
});

test("verifier rejects a rehashed commit that bypasses the deliberation state machine", async () => {
  const answer = (request: DecoderClientRequest) =>
    request.phase === "propose"
      ? proposal(unit("span", "A"))
      : revision(unit("span", "A"));
  const valid = await runDecoder({
    userPrompt: "Answer.",
    clients: [new FakeClient("codex", answer), new FakeClient("claude", answer)],
    maxRounds: 1,
    runId: "decoder_forge_source",
    clock: "logical",
  });
  const forged = rehashDecoderEvents([
    valid.events[0],
    {
      ...valid.events.find((event) => event.kind === "unit_committed")!,
      roundIndex: 99,
    },
    valid.events.at(-1)!,
  ]);
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(
    verified.problems.some((problem) =>
      ["commit_without_selection", "bad_round_index", "round_count_mismatch"].includes(problem.reason),
    ),
  );
});

test("cancellation accepted as the final revision resolves cannot commit a unit", async () => {
  const abort = new AbortController();
  const answer = (id: "codex" | "claude") => (request: DecoderClientRequest) => {
    if (request.phase === "propose") return proposal(unit("span", "A"));
    if (request.phase === "revise") {
      if (id === "claude") abort.abort(new Error("operator cancelled at phase boundary"));
      return revision(unit("span", "A"));
    }
    return JSON.stringify({ pick: 0, publicWarrant: "judge" });
  };
  const result = await runDecoder({
    userPrompt: "Answer.",
    clients: [new FakeClient("codex", answer("codex")), new FakeClient("claude", answer("claude"))],
    maxRounds: 1,
    runId: "decoder_cancel_race",
    clock: "logical",
    signal: abort.signal,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.events.some((event) => event.kind === "unit_committed"), false);
  assert.equal(verifyDecoderLedger(result.events).ok, true);
});

test("invalid tie sampling fails with a sealed terminal event", async () => {
  const never = (request: DecoderClientRequest) =>
    request.phase === "propose" ? proposal(unit("span", "A")) : revision(unit("span", "A"));
  const result = await runDecoder({
    userPrompt: "Answer.",
    clients: [new FakeClient("codex", never), new FakeClient("claude", never)],
    maxRounds: 1,
    runId: "decoder_bad_tie",
    clock: "logical",
    sampleTieBreak: () => ({ bit: 2 as 0, nonce: "bad" }),
  });
  assert.equal(result.status, "failed");
  assert.equal(result.events.at(-1)?.kind, "decoder_finished");
  assert.equal(verifyDecoderLedger(result.events).ok, true);
});

test("provider-reported model drift cannot enter quorum", async () => {
  const codex = new FakeClient("codex", (request) => ({
    ...receipt(request.phase === "propose"
      ? proposal(unit("span", "A"))
      : revision(unit("span", "A"))),
    reportedModels: ["unexpected-model"],
  }));
  const claude = new FakeClient("claude", (request) =>
    request.phase === "propose" ? proposal(unit("span", "A")) : revision(unit("span", "A")),
  );
  const result = await runDecoder({
    userPrompt: "Answer.",
    clients: [codex, claude],
    maxRounds: 1,
    runId: "decoder_model_drift",
    clock: "logical",
  });
  assert.equal(result.status, "failed");
  assert.equal(result.events.some((event) => event.kind === "unit_committed"), false);
  assert.equal(verifyDecoderLedger(result.events).ok, true);
});

test("verifier binds every provider prompt to the exact decoder state", async () => {
  const valid = await consensusRun("decoder_prompt_binding");
  const forged = rehashDecoderEvents(valid.events.map((event) =>
    event.kind === "provider_call_started" || event.kind === "provider_attempt"
      ? { ...event, payload: { ...event.payload, prompt: "MALICIOUS DIFFERENT PROMPT" } }
      : event
  ));
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(verified.problems.some((problem) => problem.reason === "protocol_prompt_mismatch"));
});

test("verifier binds parsed response text to exact observed provider stdout", async () => {
  const valid = await consensusRun("decoder_stdout_binding");
  const forged = rehashDecoderEvents(valid.events.map((event) =>
    event.kind === "provider_attempt" && event.payload.principalId === "codex"
      ? { ...event, payload: { ...event.payload, stdout: "RAW PROVIDER SAID SOMETHING ELSE" } }
      : event
  ));
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(verified.problems.some((problem) => problem.reason === "raw_response_mismatch"));
});

test("verifier recomputes invalid receipts so a valid response cannot be retried", async () => {
  let codexProposalAttempts = 0;
  const answer = (id: "codex" | "claude") => (request: DecoderClientRequest) => {
    if (request.phase === "propose") {
      if (id === "codex" && ++codexProposalAttempts === 1) return "not-json";
      return proposal(unit("span", "A"));
    }
    return revision(unit("span", "A"));
  };
  const valid = await runDecoder({
    userPrompt: "Answer.",
    clients: [new FakeClient("codex", answer("codex")), new FakeClient("claude", answer("claude"))],
    maxRounds: 1,
    runId: "decoder_false_invalid_receipt",
    clock: "logical",
    sampleTieBreak: () => ({ bit: 0, nonce: "n" }),
  });
  const validFirstResponse = proposal(unit("span", "A"));
  const forged = rehashDecoderEvents(valid.events.map((event) =>
    event.kind === "provider_attempt" &&
    event.payload.principalId === "codex" &&
    event.payload.phase === "propose" &&
    event.payload.attempt === 1
      ? {
          ...event,
          payload: {
            ...event.payload,
            stdout: validFirstResponse,
            responseText: validFirstResponse,
          },
        }
      : event
  ));
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(verified.problems.some((problem) => problem.reason === "false_validation"));
});

test("verifier rejects fabricated selection reasons", async () => {
  const valid = await consensusRun("decoder_reason_binding");
  const forged = rehashDecoderEvents(valid.events.map((event) =>
    event.kind === "unit_selected"
      ? { ...event, payload: { ...event.payload, publicReason: "fabricated public reason" } }
      : event
  ));
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(verified.problems.some((problem) => problem.reason === "public_reason_mismatch"));
});

test("verifier rejects fabricated losing dissent and ballots", async () => {
  const client = (id: "codex" | "claude") => new FakeClient(id, (request) => {
    const own = id === "codex" ? unit("span", "A") : unit("span", "B");
    if (request.phase === "propose") return proposal(own);
    if (request.phase === "revise") return revision(own);
    return JSON.stringify({ pick: id === "codex" ? 0 : 1, publicWarrant: "split" });
  });
  const valid = await runDecoder({
    userPrompt: "Choose.",
    clients: [client("codex"), client("claude")],
    maxRounds: 1,
    runId: "decoder_dissent_binding",
    clock: "logical",
    sampleTieBreak: () => ({ bit: 0, nonce: "n" }),
  });
  const forged = rehashDecoderEvents(valid.events.map((event) =>
    event.kind === "dissent_preserved"
      ? {
          ...event,
          payload: {
            ...event.payload,
            losingPrincipal: "codex",
            losingRevision: {
              unit: { kind: "span", text: "FAKE" },
              publicWarrant: "fake",
              critiqueOfPeer: "fake",
            },
            judgeVotes: [],
          },
        }
      : event
  ));
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(verified.problems.some((problem) => problem.reason === "dissent_mismatch"));
});

test("verifier rejects an opened failed round with no tie or provider phase", async () => {
  const valid = await consensusRun("decoder_open_round_source");
  const forged = rehashDecoderEvents([
    valid.events[0],
    valid.events.find((event) => event.kind === "round_started")!,
    {
      ...valid.events.at(-1)!,
      payload: {
        status: "failed",
        finalOutput: "",
        rounds: 1,
        committedUnits: [],
        partial: true,
        error: "synthetic failure",
      },
    },
  ]);
  const verified = verifyDecoderLedger(forged);
  assert.equal(verified.ok, false);
  assert.ok(verified.problems.some((problem) =>
    ["missing_tie_commitment", "incomplete_round", "ungrounded_failure"].includes(problem.reason)
  ));
});

test("runtime rejects a reversed provider tuple before creating a ledger", async () => {
  const answer = (request: DecoderClientRequest) =>
    request.phase === "propose"
      ? proposal(unit("span", "A"))
      : revision(unit("span", "A"));
  await assert.rejects(
    runDecoder({
      userPrompt: "Answer.",
      clients: [new FakeClient("claude", answer), new FakeClient("codex", answer)],
      maxRounds: 1,
    }),
    /ordered \[codex, claude\]/,
  );
});
