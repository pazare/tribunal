import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runTribunal,
  buildPanel,
  verifyLedger,
  DEFAULT_FLAGS,
  type RunConfig,
} from "@tribunal/kernel";
import { computeAuditability } from "@tribunal/scorecard";
import { PACKS } from "../src/index.js";

function cfg(): RunConfig {
  return { seed: 7, maxSpans: 4, flags: { ...DEFAULT_FLAGS }, clientView: "answer_plus_summary" };
}

test("every pack in the registry is well-formed", () => {
  assert.ok(PACKS.length >= 4, "registry should hold at least the four demo packs");

  const ids = PACKS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, `pack ids must be unique: ${ids.join(", ")}`);

  for (const pack of PACKS) {
    // Slots are indexed 0..n-1 contiguously.
    pack.slots.forEach((slot, i) =>
      assert.equal(slot.index, i, `${pack.id}: slot at position ${i} carries index ${slot.index}`),
    );

    // Every slot enumerates a real decision space for the deterministic panel.
    for (const slot of pack.slots) {
      assert.ok(
        (slot.candidatesHint?.length ?? 0) >= 2,
        `${pack.id} slot ${slot.index}: needs >=2 candidatesHint entries`,
      );
      assert.ok(
        slot.label.trim().length > 0 && slot.instruction.trim().length > 0,
        `${pack.id} slot ${slot.index}: label and instruction must be substantive`,
      );
    }

    // STOP must be a first-class option in the final slot.
    const last = pack.slots[pack.slots.length - 1];
    assert.ok(
      last.candidatesHint!.includes("<STOP>"),
      `${pack.id}: final slot candidatesHint must include "<STOP>"`,
    );

    // Constraints all carry substantive text.
    for (const c of pack.constraints) {
      assert.ok(c.text.trim().length > 0, `${pack.id}: constraint ${c.id} has empty text`);
    }

    // Exactly one planted trap: one evidence item that contradicts the good record.
    const traps = pack.evidence.filter((e) => (e.contradicts?.length ?? 0) > 0);
    assert.equal(
      traps.length,
      1,
      `${pack.id}: exactly one evidence item must carry non-empty contradicts (found ${traps.length})`,
    );

    // Docket copy is present.
    assert.ok((pack.problemStatement ?? "").trim().length > 0, `${pack.id}: problemStatement missing`);
    assert.ok((pack.trapNote ?? "").trim().length > 0, `${pack.id}: trapNote missing`);
  }
});

test("full offline tribunal on every pack: ledger verifies and scores 12/12", async () => {
  for (const pack of PACKS) {
    const r = await runTribunal({
      pack,
      config: cfg(),
      seats: buildPanel({ mode: "offline" }),
      clock: "logical",
    });

    const v = verifyLedger(r.events);
    assert.equal(v.ok, true, `${pack.id}: ledger must verify — ${JSON.stringify(v.problems[0] ?? null)}`);
    assert.equal(v.answerConsistent, true, `${pack.id}: committed spans must reconcile with the final answer`);

    const report = computeAuditability(r.events);
    const failed = report.items.filter((i) => !i.pass).map((i) => `${i.id}: ${i.evidence}`);
    assert.equal(report.total, 12, `${pack.id} scored ${report.total}/12 — ${failed.join(" | ")}`);
  }
});
