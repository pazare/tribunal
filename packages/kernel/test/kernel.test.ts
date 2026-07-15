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

interface CapturedPanelView {
  round: "propose" | "revise";
  society: string;
  spanIndex: number;
  evidenceIds: string[];
  memoryKeys: string[];
}

function capturingOfflinePanel(captures: CapturedPanelView[]) {
  const seats = buildPanel({ mode: "offline" });
  for (const { client } of seats) {
    const propose = client.propose.bind(client);
    client.propose = async (request) => {
      captures.push({
        round: "propose",
        society: request.view.society,
        spanIndex: request.view.case.slot.index,
        evidenceIds: request.view.evidence.map((item) => item.id),
        memoryKeys: request.view.memory.map((item) => item.key),
      });
      return propose(request);
    };

    const revise = client.revise.bind(client);
    client.revise = async (request) => {
      captures.push({
        round: "revise",
        society: request.view.society,
        spanIndex: request.view.case.slot.index,
        evidenceIds: request.view.evidence.map((item) => item.id),
        memoryKeys: request.view.memory.map((item) => item.key),
      });
      return revise(request);
    };
  }
  return seats;
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

test("truncation forgery: dropping trailing events fails verification", async () => {
  const r = await run(offlineConfig());
  // Chop run_finished (and with it the final-answer binding): the chain up to
  // that point is untouched, so only the completeness check can catch this.
  const truncated = r.events.slice(0, -1);
  const v = verifyLedger(truncated);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.reason === "truncated"));
});

test("reveal hashChecks attest against the SEALED commitment, not themselves", async () => {
  const r = await run(offlineConfig());
  const reveal = r.events.find((e) => e.kind === "proposals_revealed")!;
  const { proposals, hashChecks } = reveal.payload as any;
  const commits = r.events.filter((e) => e.kind === "blind_commitment" && e.spanIndex === 0);
  assert.equal(hashChecks.length, proposals.length);
  for (const hc of hashChecks) {
    const sealed = commits.find((c) => (c.payload as any).seatId === hc.seatId)!;
    assert.equal(hc.committed, (sealed.payload as any).proposalHash, "committed must be the sealed hash");
    assert.equal(hc.ok, hc.committed === hc.recomputed);
    assert.equal(hc.ok, true);
  }
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

test("roleMemory controls whether later panelist views receive prior-span memory", async () => {
  const enabledViews: CapturedPanelView[] = [];
  await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig({ flags: { ...DEFAULT_FLAGS, roleMemory: true } }),
    seats: capturingOfflinePanel(enabledViews),
    clock: "logical",
  });

  const firstSpan = enabledViews.filter((view) => view.spanIndex === 0);
  const laterSpans = enabledViews.filter((view) => view.spanIndex > 0);
  assert.ok(firstSpan.length > 0, "expected panel views for the first span");
  assert.ok(laterSpans.length > 0, "expected panel views after the first memory update");
  assert.ok(firstSpan.every((view) => view.memoryKeys.length === 0), "the first span has no prior memory");
  assert.ok(
    laterSpans.every((view) => view.memoryKeys.length > 0),
    "every later panel view should receive public memory from an earlier span",
  );

  const disabledViews: CapturedPanelView[] = [];
  await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig({ flags: { ...DEFAULT_FLAGS, roleMemory: false } }),
    seats: capturingOfflinePanel(disabledViews),
    clock: "logical",
  });
  assert.ok(disabledViews.length > 0);
  assert.ok(
    disabledViews.every((view) => view.memoryKeys.length === 0),
    "disabling role memory must keep it out of every panelist view",
  );
});

test("independentEvidence changes panelist views from the full record to seat bundles", async () => {
  const fullEvidenceIds = LENDING_FIXTURE.evidence.map((item) => item.id);
  const bundledViews: CapturedPanelView[] = [];
  await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig({ flags: { ...DEFAULT_FLAGS, independentEvidence: true } }),
    seats: capturingOfflinePanel(bundledViews),
    clock: "logical",
  });

  const firstRoundBundles = bundledViews.filter(
    (view) => view.round === "propose" && view.spanIndex === 0,
  );
  assert.equal(firstRoundBundles.length, 6, "expected one first-round view per seat");
  assert.ok(
    firstRoundBundles.every(
      (view) => view.evidenceIds.length > 0 && view.evidenceIds.length < fullEvidenceIds.length,
    ),
    "independent evidence should give every seat a non-empty subset",
  );
  assert.ok(
    new Set(firstRoundBundles.map((view) => view.evidenceIds.join(","))).size > 1,
    "independent evidence should not give every mandate the same bundle",
  );

  const sharedViews: CapturedPanelView[] = [];
  await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig({ flags: { ...DEFAULT_FLAGS, independentEvidence: false } }),
    seats: capturingOfflinePanel(sharedViews),
    clock: "logical",
  });
  const firstRoundShared = sharedViews.filter(
    (view) => view.round === "propose" && view.spanIndex === 0,
  );
  assert.equal(firstRoundShared.length, 6, "expected one first-round view per seat");
  for (const view of firstRoundShared) {
    assert.deepEqual(view.evidenceIds, fullEvidenceIds, "the ablation should restore the full record");
  }
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

test("a named human veto remains binding when the AI safety-veto ablation is off", async () => {
  const blocked = "Deny for excessive debt-to-income ratio (52%).";
  const r = await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig({ flags: { ...DEFAULT_FLAGS, safetyVeto: false } }),
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
    humanInterventions: [
      {
        interventionId: "human_test_veto",
        spanIndex: 0,
        actor: "Auditor (compliance)",
        kind: "veto",
        channel: "typed",
        text: "This candidate conflicts with the documented record.",
        targetKey: blocked,
      },
    ],
  });
  const ratification = r.events.find((event) => event.kind === "ratification" && event.spanIndex === 0)!;
  const decision = (ratification.payload as any).decision;
  assert.notEqual(candidateKey(decision.selected.candidate), blocked);
  assert.ok(
    decision.vetoes.some((veto: any) => veto.candidateKey === blocked && /Human auditor/.test(veto.publicReason)),
    "the ratification must preserve the attributed human veto",
  );
});

test("a pre-aborted run still seals a typed cancellation as the final ledger event", async () => {
  const controller = new AbortController();
  const receipt = {
    actor: "Operator",
    reason: "Cancelled before the panel began",
    requestedAt: 1_700_000_000_000,
    unappliedInterventions: 1,
    unappliedInterventionIds: ["human_waiting"],
  };
  controller.abort(receipt);
  const r = await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig(),
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
    signal: controller.signal,
  });

  assert.deepEqual(r.events.map((event) => event.kind), ["run_started", "run_finished"]);
  assert.equal(r.stoppedBy, "cancelled");
  assert.deepEqual((r.events.at(-1)!.payload as any).cancellation, receipt);
  assert.equal(verifyLedger(r.events).ok, true);
});

test("cancelling in-flight proposals records cancelled attempts and a verifiable terminal receipt", async () => {
  const controller = new AbortController();
  const receipt = {
    actor: "Operator",
    reason: "Stop during round one",
    requestedAt: 1_700_000_000_001,
    unappliedInterventions: 0,
    unappliedInterventionIds: [],
  };
  const r = await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig(),
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
    signal: controller.signal,
    onEvent: (event) => {
      if (event.kind === "case_presented" && !controller.signal.aborted) controller.abort(receipt);
    },
  });

  const calls = r.events.filter((event) => event.kind === "provider_call");
  assert.equal(calls.length, 6, "every started proposal attempt should remain on the record");
  assert.ok(calls.every((event) => (event.payload as any).usage.status === "cancelled"));
  assert.equal(r.events.at(-1)!.kind, "run_finished");
  assert.equal((r.events.at(-1)!.payload as any).stoppedBy, "cancelled");
  assert.deepEqual((r.events.at(-1)!.payload as any).cancellation, receipt);
  assert.equal(verifyLedger(r.events).ok, true);
});

test("cancelling after a committed span preserves that partial answer without inventing a verdict", async () => {
  const controller = new AbortController();
  const receipt = {
    actor: "Operator",
    reason: "One span is enough for this review",
    requestedAt: 1_700_000_000_002,
    unappliedInterventions: 0,
    unappliedInterventionIds: [],
  };
  const r = await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig(),
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
    signal: controller.signal,
    onEvent: (event) => {
      if (event.kind === "decision_closed" && event.spanIndex === 0) controller.abort(receipt);
    },
  });
  const committed = r.events.filter(
    (event) => event.kind === "span_committed" && !(event.payload as any).isStop,
  );
  assert.equal(committed.length, 1);
  assert.equal(r.spanCount, 1);
  assert.equal(r.finalAnswer, String((committed[0].payload as any).text).trim());
  assert.equal(r.stoppedBy, "cancelled");
  assert.equal(verifyLedger(r.events).ok, true);
});

test("normal completion nacks queued interventions that never reached a checkpoint", async () => {
  let drains = 0;
  const r = await runTribunal({
    pack: LENDING_FIXTURE,
    config: offlineConfig(),
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
    drainHumanInterventions: () => {
      drains++;
      return [
        {
          interventionId: "human_future_checkpoint",
          spanIndex: 99,
          actor: "Auditor",
          kind: "question",
          channel: "typed",
          text: "This future checkpoint never opened.",
        },
      ];
    },
  });
  assert.equal(drains, 1);
  assert.equal(r.stoppedBy, "stop_ratified");
  assert.deepEqual((r.events.at(-1)!.payload as any).unappliedInterventionIds, ["human_future_checkpoint"]);
  assert.equal(verifyLedger(r.events).ok, true);
});
