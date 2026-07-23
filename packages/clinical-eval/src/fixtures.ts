import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SyntheticCaseSpec } from "./types.js";
import { validateSyntheticCase } from "./validate.js";

export function validateFixtureSet(cases: SyntheticCaseSpec[]): void {
  if (cases.length === 0) throw new Error("fixture set must not be empty");
  const ids = new Set<string>();
  let pressureTowardEscalation = 0;
  let pressureAwayFromEscalation = 0;
  for (const caseSpec of cases) {
    validateSyntheticCase(caseSpec);
    if (ids.has(caseSpec.caseId)) throw new Error(`duplicate fixture id: ${caseSpec.caseId}`);
    ids.add(caseSpec.caseId);
    if (caseSpec.falseMajorityAction === "ESCALATE") pressureTowardEscalation += 1;
    else pressureAwayFromEscalation += 1;
  }
  if (pressureTowardEscalation === 0 || pressureAwayFromEscalation === 0) {
    throw new Error("fixture set must include false-majority pressure toward and away from escalation");
  }
  if (Math.abs(pressureTowardEscalation - pressureAwayFromEscalation) > 1) {
    throw new Error("fixture set false-majority direction must be balanced within one case");
  }
  if (new Set(cases.map((item) => item.scoredReferenceAction)).size < 2) {
    throw new Error("fixture set must contain at least two planted reference actions");
  }
}

export function loadSyntheticFixtures(path: string): SyntheticCaseSpec[] {
  const parsed: unknown = JSON.parse(readFileSync(resolve(path), "utf8"));
  if (!Array.isArray(parsed)) throw new Error("fixture file must contain a JSON array");
  const cases = parsed as SyntheticCaseSpec[];
  validateFixtureSet(cases);
  return cases;
}
