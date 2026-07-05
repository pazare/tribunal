import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runTribunal,
  verifyLedger,
  DEFAULT_FLAGS,
  buildPanel,
  canonicalJSON,
  hashOf,
  candidateKey,
} from "../src/index.js";
import type { RunConfig, LedgerEvent } from "../src/index.js";
import { LENDING_FIXTURE } from "./fixture.js";

function offlineConfig(over: Partial<RunConfig> = {}): RunConfig {
  return {
    seed: 7,
    maxSpans: 4,
    flags: { ...DEFAULT_FLAGS },
    clientView: "answer_plus_summary",
    ...over,
  };
}

async function run(config: RunConfig) {
  return runTribunal({
    pack: LENDING_FIXTURE,
    config,
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
  });
}

test("canonical JSON is key-order independent", () => {
  assert.equal(canonicalJSON({ b: 1, a: 2 }), canonicalJSON({ a: 2, b: 1 }));
  assert.equal(hashOf({ x: [1, 2], y: 3 }), hashOf({ y: 3, x: [1, 2] }));
});

test("full offline run produces a schema-valid, verifiable ledger", async () => {
  const r = await run(offlineConfig());
  assert.ok(r.events.length > 20);
  const v = verifyLedger(r.events);
  assert.equal(v.ok, true, JSON.stringify(v.problems));
  assert.equal(v.answerConsistent, true);
});

test("determinism: two offline runs are byte-identical (payloads)", async () => {
  const a = await run(offlineConfig());
  const b = await run(offlineConfig());
  // Logical clock + content-derived ids ⇒ identical event bodies and hashes.
  assert.equal(a.runId, b.runId);
  assert.equal(a.events.length, b.events.length);
  for (let i = 0; i < a.events.length; i++) {
    assert.equal(a.events[i].hash, b.events[i].hash, `event ${i} (${a.events[i].kind}) differs`);
  }
});

test("blind commitments are ledgered BEFORE the reveal", async () => {
  const r = await run(offlineConfig());
  const seqReveal = r.events.find((e) => e.kind === "proposals_revealed")!.seq;
  const commitments = r.events.filter((e) => e.kind === "blind_commitment");
  assert.ok(commitments.length >= 6, "expected one commitment per seat");
  for (const c of commitments) {
    if (c.spanIndex === 0) assert.ok(c.seq < seqReveal, "commitment must precede reveal");
  }
});

test("sealed hash matches the revealed proposal (commitment integrity)", async () => {
  const r = await run(offlineConfig());
  const reveal = r.events.find((e) => e.kind === "proposals_revealed")!;
  const proposals = (reveal.payload as any).proposals;
  const commits = r.events.filter((e) => e.kind === "blind_commitment" && e.spanIndex === 0);
  for (const p of proposals) {
    const c = commits.find((x) => (x.payload as any).seatId === p.seatId)!;
    assert.equal((c.payload as any).proposalHash, hashOf(p), "sealed hash must equal revealed proposal hash");
  }
});

test("anonymized feedback carries NO identity/provider/seat fields", async () => {
  const r = await run(offlineConfig());
  const fb = r.events.find((e) => e.kind === "feedback_issued")!;
  const json = canonicalJSON(fb.payload);
  for (const summary of (fb.payload as any).packet.summaries) {
    const keys = Object.keys(summary);
    for (const banned of ["seatId", "society", "provider", "agent", "author"]) {
      assert.ok(!keys.includes(banned), `summary leaked ${banned}`);
    }
  }
  assert.ok(!/seat_\d+_/.test(json), "feedback packet must not embed seat ids");
});

test("per-recipient candidate order is randomized (position-bias control)", async () => {
  const r = await run(offlineConfig());
  const views = r.events.filter((e) => e.kind === "feedback_view_assigned" && e.spanIndex === 0);
  const orders = views.map((v) => (v.payload as any).order.join(","));
  // With >1 candidate, at least two recipients should see different orders.
  const distinct = new Set(orders);
  assert.ok(distinct.size >= 2, "expected different orders across recipients");
});

test("STOP is a first-class ratified decision, not a trailing-off", async () => {
  const r = await run(offlineConfig());
  const stopCommit = r.events.find((e) => e.kind === "span_committed" && (e.payload as any).isStop);
  assert.ok(stopCommit, "expected an explicit STOP commit");
  assert.equal(r.stoppedBy, "stop_ratified");
});

test("safety veto fires as a real code path and changes the outcome", async () => {
  const withVeto = await run(offlineConfig());
  const vetoEvents = withVeto.events
    .filter((e) => e.kind === "safety_review")
    .flatMap((e) => (e.payload as any).verdicts)
    .filter((v: any) => v.veto);
  assert.ok(vetoEvents.length >= 1, "expected at least one veto in the run");

  // Disabling the veto is a real ablation: no veto records appear.
  const noVeto = await run(offlineConfig({ flags: { ...DEFAULT_FLAGS, safetyVeto: false } }));
  const vetoWhenOff = noVeto.events
    .filter((e) => e.kind === "safety_review")
    .flatMap((e) => (e.payload as any).verdicts)
    .filter((v: any) => v.veto);
  assert.equal(vetoWhenOff.length, 0, "veto must not fire when disabled");
});

test("material dissent is preserved on the record", async () => {
  const r = await run(offlineConfig());
  const dissents = r.events.filter((e) => e.kind === "dissent_preserved");
  assert.ok(dissents.length >= 1, "expected preserved dissent");
  for (const d of dissents) {
    const rec = (d.payload as any).dissent;
    assert.equal(rec.status, "preserved");
    assert.ok(rec.objection.text.length > 0);
  }
});

test("ratification names a rule and a public reason on every decision", async () => {
  const r = await run(offlineConfig());
  const rats = r.events.filter((e) => e.kind === "ratification");
  assert.ok(rats.length >= 1);
  for (const e of rats) {
    const d = (e.payload as any).decision;
    assert.ok(d.method && d.metaRule && d.publicReason, "decision must be fully attributed");
    assert.ok(Array.isArray(d.candidateTable) && d.candidateTable.length >= 1);
  }
});

test("offline run performs ZERO field repairs (honest non-triviality)", async () => {
  const r = await run(offlineConfig());
  assert.equal(r.usageTotals.repaired, 0, "offline content must be substantive, never back-filled");
});

test("tamper detection: editing any event breaks the chain at that seq", async () => {
  const r = await run(offlineConfig());
  const tampered: LedgerEvent[] = structuredClone(r.events);
  const idx = tampered.findIndex((e) => e.kind === "span_committed");
  (tampered[idx].payload as any).text += "X";
  const v = verifyLedger(tampered);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.seq === idx && p.reason === "bad_hash"));
});

test("relink forgery is caught by the answer cross-check", async () => {
  const r = await run(offlineConfig());
  const forged: LedgerEvent[] = structuredClone(r.events);
  // Swap the final answer but re-link the whole chain so hashes are self-consistent.
  const finIdx = forged.findIndex((e) => e.kind === "run_finished");
  (forged[finIdx].payload as any).finalAnswer = "APPROVED (forged)";
  // Recompute the chain from scratch so bad_hash/broken_link would NOT trip.
  let prev = "0".repeat(64);
  for (let i = 0; i < forged.length; i++) {
    const { hash, ...body } = forged[i];
    (body as any).prevHash = prev;
    const h = hashOf(body);
    forged[i] = { ...(body as any), hash: h };
    prev = h;
  }
  const v = verifyLedger(forged);
  assert.equal(v.answerConsistent, false, "answer cross-check must catch the swap");
  assert.ok(v.problems.some((p) => p.reason === "answer_mismatch"));
});

test("debate ablation removes revision events (A5 path)", async () => {
  const withDebate = await run(offlineConfig());
  assert.ok(withDebate.events.some((e) => e.kind === "revision_received"));
  const noDebate = await run(offlineConfig({ flags: { ...DEFAULT_FLAGS, debateRounds: 0 } }));
  assert.equal(noDebate.events.some((e) => e.kind === "revision_received"), false);
});

test("blind-round ablation removes sealed commitments (A1 path)", async () => {
  const noBlind = await run(offlineConfig({ flags: { ...DEFAULT_FLAGS, blindRound: false } }));
  assert.equal(noBlind.events.some((e) => e.kind === "blind_commitment"), false);
});

test("human veto is ledgered and forces a non-vetoed outcome", async () => {
  const r = await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig(),
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
    humanInterventions: [
      {
        spanIndex: 0,
        actor: "Auditor (compliance)",
        kind: "veto",
        channel: "typed",
        text: "The 52% DTI does not reconcile with the documented income; do not deny on this ground.",
        targetKey: "Deny for excessive debt-to-income ratio (52%).",
      },
    ],
  });
  const human = r.events.find((e) => e.kind === "human_intervention");
  assert.ok(human, "human intervention must be ledgered");
  const rat0 = r.events.find((e) => e.kind === "ratification" && e.spanIndex === 0)!;
  const chosen = (rat0.payload as any).decision.selected;
  assert.notEqual(candidateKey(chosen.candidate), "Deny for excessive debt-to-income ratio (52%).");
});
