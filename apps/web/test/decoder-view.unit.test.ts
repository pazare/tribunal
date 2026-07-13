import assert from "node:assert/strict";
import test from "node:test";
import {
  assessDecoderEvent,
  decoderAgentsReady,
  decoderStatusTone,
  isDecoderTerminalStatus,
  phaseReceiptStatus,
  strictSurfaceUnit,
  transcriptCompleteness,
} from "../src/decoder-components.js";
import { normalizeAgentHealth, type DecoderEvent, type DecoderHealth } from "../src/decoder-api.js";

function event(seq: number, kind: string, payload: Record<string, unknown> = {}): DecoderEvent {
  return {
    seq,
    runId: "decoder_test",
    roundIndex: kind === "decoder_started" || kind === "decoder_finished" ? null : 0,
    ts: seq,
    kind,
    payload,
    prevHash: "0".repeat(64),
    hash: String(seq).padStart(64, "0"),
  };
}

test("view accepts only exact tagged surface units", () => {
  assert.deepEqual(strictSurfaceUnit({ kind: "space", text: " " }), { kind: "space", text: " " });
  assert.deepEqual(strictSurfaceUnit({ kind: "enter", text: "\n" }), { kind: "enter", text: "\n" });
  assert.deepEqual(strictSurfaceUnit({ kind: "stop", text: "" }), { kind: "stop", text: "" });
  assert.deepEqual(strictSurfaceUnit({ kind: "span", text: "hello" }), { kind: "span", text: "hello" });
  for (const invalid of [
    { kind: "span", text: "two words" },
    { kind: "span", text: "zero\u200bwidth" },
    { kind: "space", text: "  " },
    { kind: "stop", text: "STOP" },
    { kind: "stop", text: "", repaired: true },
  ]) assert.equal(strictSurfaceUnit(invalid), null);
});

test("same-sequence hash conflict is never treated as a replacement", () => {
  const original = event(3, "provider_attempt", { stdout: "A" });
  assert.equal(assessDecoderEvent(undefined, original), "new");
  assert.equal(assessDecoderEvent(original, structuredClone(original)), "identical");
  assert.equal(
    assessDecoderEvent(original, { ...original, hash: "f".repeat(64), payload: { stdout: "B" } }),
    "conflict",
  );
});

test("ledger conflict is a terminal error state", () => {
  assert.equal(isDecoderTerminalStatus("ledger_conflict"), true);
  assert.equal(decoderStatusTone("ledger_conflict"), "error");
});

test("phase receipt reports its actual quorum and validity separately", () => {
  const failedReceipt = event(1, "phase_completed", {
    phase: "propose",
    quorum: 1,
    requiredQuorum: 2,
    valid: false,
  });
  assert.deepEqual(phaseReceiptStatus(failedReceipt), {
    present: true,
    quorum: 1,
    valid: false,
  });
  assert.deepEqual(phaseReceiptStatus(), { present: false, quorum: 0, valid: false });
});

test("health identity is unreported, not inferred, when the API omits its pins", () => {
  const incomplete: DecoderHealth = {
    agents: [
      normalizeAgentHealth("codex", { present: true }),
      normalizeAgentHealth("claude", { present: true }),
    ],
  };
  assert.equal(incomplete.agents[0].provider, "unknown");
  assert.equal(incomplete.agents[0].requestedModel, "unreported");
  assert.equal(decoderAgentsReady(incomplete), false);

  const ready: DecoderHealth = {
    agents: [
      normalizeAgentHealth("codex", {
        provider: "openai",
        present: true,
        requestedModel: "gpt-5.6-sol",
        requestedEffort: "medium",
      }),
      normalizeAgentHealth("claude", {
        provider: "anthropic",
        present: true,
        requestedModel: "claude-opus-4-8",
        requestedEffort: "medium",
      }),
    ],
  };
  assert.equal(decoderAgentsReady(ready), true);
});

test("terminal transcript cannot be full when a round has no provider exchange", () => {
  const missing = [
    event(0, "decoder_started"),
    event(1, "round_started"),
    event(2, "decoder_finished", { status: "failed" }),
  ];
  assert.equal(transcriptCompleteness(missing, true, false, false, 0).state, "partial");
  const preAborted = [
    event(0, "decoder_started"),
    event(1, "decoder_finished", { status: "cancelled" }),
  ];
  assert.equal(transcriptCompleteness(preAborted, true, false, false, 0).state, "full");
});

test("terminal transcript requires one canonical phase completion for each opened phase", () => {
  const prompt = "public prompt";
  const started = (seq: number, principalId: "codex" | "claude") =>
    event(seq, "provider_call_started", { phase: "propose", attempt: 1, principalId, prompt });
  const attempted = (seq: number, principalId: "codex" | "claude") =>
    event(seq, "provider_attempt", {
      phase: "propose",
      attempt: 1,
      principalId,
      prompt,
      stdout: "{}",
      stderr: "",
      responseText: "{}",
      status: "ok",
      exitCode: 0,
      signal: null,
      command: { bin: principalId, args: [] },
      validation: { ok: true, errors: [] },
    });
  const calls = [
    event(0, "decoder_started"),
    event(1, "round_started"),
    started(2, "codex"),
    attempted(3, "codex"),
    started(4, "claude"),
    attempted(5, "claude"),
  ];
  const missingCompletion = [
    ...calls,
    event(6, "decoder_finished", { status: "failed" }),
  ];
  assert.equal(
    transcriptCompleteness(missingCompletion, true, false, false, 0).state,
    "partial",
  );

  const complete = [
    ...calls,
    event(6, "phase_completed", {
      phase: "propose",
      quorum: 2,
      requiredQuorum: 2,
      valid: true,
      principals: ["codex", "claude"],
    }),
    event(7, "decoder_finished", { status: "failed" }),
  ];
  assert.equal(transcriptCompleteness(complete, true, false, false, 0).state, "full");
});
