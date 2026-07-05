import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runTribunal,
  DEFAULT_FLAGS,
  buildPanel,
  type RunConfig,
  type LedgerEvent,
} from "@tribunal/kernel";
import { computeAuditability, baselineReport } from "../src/index.js";
import { LENDING_FIXTURE } from "../../kernel/test/fixture.js";

function cfg(over: Partial<RunConfig> = {}): RunConfig {
  return { seed: 7, maxSpans: 4, flags: { ...DEFAULT_FLAGS }, clientView: "answer_plus_summary", ...over };
}

async function offlineRun(config: RunConfig) {
  return runTribunal({
    pack: LENDING_FIXTURE,
    config,
    seats: buildPanel({ mode: "offline" }),
    clock: "logical",
  });
}

test("full offline run scores 12/12", async () => {
  const r = await offlineRun(cfg());
  const report = computeAuditability(r.events);
  const failed = report.items.filter((i) => !i.pass);
  assert.equal(report.total, 12, JSON.stringify(failed, null, 2));
});

test("baseline single-model report is 0/12 by construction and says so", () => {
  const b = baselineReport();
  assert.equal(b.total, 0);
  assert.ok(b.items.every((i) => /BY CONSTRUCTION/i.test(i.evidence)));
});

test("blind-round ablation fails exactly A1", async () => {
  const r = await offlineRun(cfg({ flags: { ...DEFAULT_FLAGS, blindRound: false } }));
  const rep = computeAuditability(r.events);
  const a1 = rep.items.find((i) => i.id === "A1")!;
  assert.equal(a1.pass, false);
});

test("debate ablation fails A5 (and A8 becomes unexercised)", async () => {
  const r = await offlineRun(cfg({ flags: { ...DEFAULT_FLAGS, debateRounds: 0 } }));
  const rep = computeAuditability(r.events);
  assert.equal(rep.items.find((i) => i.id === "A5")!.pass, false);
  assert.equal(rep.items.find((i) => i.id === "A8")!.pass, false);
});

test("anonymization ablation fails A3", async () => {
  const r = await offlineRun(cfg({ flags: { ...DEFAULT_FLAGS, anonymizeFeedback: false } }));
  const rep = computeAuditability(r.events);
  assert.equal(rep.items.find((i) => i.id === "A3")!.pass, false);
});

test("order-randomization ablation fails A4", async () => {
  const r = await offlineRun(cfg({ flags: { ...DEFAULT_FLAGS, randomizeCandidateOrder: false } }));
  const rep = computeAuditability(r.events);
  assert.equal(rep.items.find((i) => i.id === "A4")!.pass, false);
});

test("veto ablation fails A6", async () => {
  const r = await offlineRun(cfg({ flags: { ...DEFAULT_FLAGS, safetyVeto: false } }));
  const rep = computeAuditability(r.events);
  assert.equal(rep.items.find((i) => i.id === "A6")!.pass, false);
});

test("SPOOF GUARD: back-filled warrants fail A2 even though structure is intact", async () => {
  const r = await offlineRun(cfg());
  const hollow: LedgerEvent[] = structuredClone(r.events);
  for (const e of hollow) {
    if (e.kind === "proposals_revealed") {
      for (const p of (e.payload as any).proposals) {
        for (const c of p.candidates) c.warrant = "(no warrant returned by model)";
      }
    }
  }
  const rep = computeAuditability(hollow);
  assert.equal(rep.items.find((i) => i.id === "A2")!.pass, false);
});

test("SPOOF GUARD: trivial junk rationale fails A5 non-triviality", async () => {
  const r = await offlineRun(cfg());
  const junk: LedgerEvent[] = structuredClone(r.events);
  for (const e of junk) {
    if (e.kind === "revision_received") {
      (e.payload as any).revision.answerToStrongestObjection = "x";
    }
  }
  const rep = computeAuditability(junk);
  assert.equal(rep.items.find((i) => i.id === "A5")!.pass, false);
});

test("A10 fails on a tampered ledger", async () => {
  const r = await offlineRun(cfg());
  const t: LedgerEvent[] = structuredClone(r.events);
  (t.find((e) => e.kind === "ratification")!.payload as any).decision.publicReason = "TAMPERED";
  const rep = computeAuditability(t);
  assert.equal(rep.items.find((i) => i.id === "A10")!.pass, false);
});
