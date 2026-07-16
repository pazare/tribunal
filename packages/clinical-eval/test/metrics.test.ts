import assert from "node:assert/strict";
import test from "node:test";
import {
  cohenKappa,
  fleissKappa,
  gwetAc1,
  krippendorffAlpha,
  rawPairwiseAgreement,
  weightedKappa,
  type AgreementUnit,
} from "../src/index.js";

function close(actual: number | null, expected: number, tolerance = 1e-12): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs((actual as number) - expected) <= tolerance, `${actual} != ${expected}`);
}

test("E0 Toy A reproduces exact multi-rater agreement oracles", () => {
  const units: AgreementUnit<string>[] = [
    { caseId: "1", ratings: ["CARD", "CARD", "CARD", "CARD"] },
    { caseId: "2", ratings: ["CARD", "CARD", "GI", "CARD"] },
    { caseId: "3", ratings: ["GI", "GI", "GI", "GI"] },
    { caseId: "4", ratings: ["NONE", "CARD", "NONE", "NONE"] },
    { caseId: "5", ratings: ["NONE", "NONE", "NONE", null] },
  ];
  close(krippendorffAlpha(units).alpha, 41 / 59);
  close(fleissKappa([[4, 0, 0], [3, 1, 0], [0, 4, 0], [1, 0, 3]]), 47 / 79);
  close(gwetAc1(units, ["CARD", "GI", "NONE"]), 189 / 269);
  const raw = rawPairwiseAgreement(units);
  assert.equal(raw.agreeingPairs, 21);
  assert.equal(raw.totalPairs, 27);
});

test("E0 ordinal urgency reproduces Cohen and weighted-kappa oracles", () => {
  const pairs: Array<readonly [number, number]> = [[1, 1], [2, 3], [2, 2], [4, 4], [3, 2]];
  close(cohenKappa(pairs).kappa, 4 / 9);
  close(weightedKappa(pairs, [1, 2, 3, 4], "linear"), 9 / 14);
  close(weightedKappa(pairs, [1, 2, 3, 4], "quadratic"), 21 / 26);
});

test("E0 prevalence paradox keeps raw agreement separate from kappa", () => {
  const pairs: Array<readonly ["Y" | "N", "Y" | "N"]> = [
    ...Array.from({ length: 18 }, () => ["Y", "Y"] as const),
    ["Y", "N"],
    ["N", "Y"],
  ];
  const result = cohenKappa(pairs);
  close(result.observedAgreement, 0.9);
  close(result.kappa, -1 / 19);
  close(
    gwetAc1(
      pairs.map(([left, right], index) => ({ caseId: String(index), ratings: [left, right] })),
      ["Y", "N"],
    ),
    161 / 181,
  );
});

test("metric functions reject malformed category counts and undeclared AC1 ratings", () => {
  assert.throws(() => fleissKappa([[2, -1], [1, 0]]), /same number|requires/u);
  assert.equal(gwetAc1([{ caseId: "x", ratings: ["DECLARED", "OTHER"] }], ["DECLARED"]), null);
  assert.throws(
    () => gwetAc1([{ caseId: "x", ratings: ["A", "C"] }], ["A", "B"]),
    /not found/u,
  );
});
