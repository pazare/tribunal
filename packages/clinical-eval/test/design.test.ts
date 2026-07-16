import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import {
  EXPERIMENT_CONDITIONS,
  auditArmPromptIsolation,
  buildFullFactorialAssignments,
  loadSyntheticFixtures,
  renderRevisionPrompt,
  type Vote,
} from "../src/index.js";

const fixturePath = resolve("fixtures/mechanism-fixtures-v0.1.json");
const fixtures = loadSyntheticFixtures(fixturePath);

function sealedVote(caseIndex = 0): Vote {
  const caseSpec = fixtures[caseIndex];
  return {
    status: "VOTE",
    tuple: caseSpec.illustrativeReferenceTuple,
    confidence: 0.8,
    evidenceRefs: ["B1"],
    conciseRationale: "Bounded synthetic fixture vote.",
  };
}

test("fixture set is balanced and explicitly unsigned", () => {
  assert.equal(fixtures.length, 8);
  assert.deepEqual(
    fixtures.reduce<Record<string, number>>((counts, fixture) => {
      counts[fixture.scoredReferenceAction] = (counts[fixture.scoredReferenceAction] ?? 0) + 1;
      return counts;
    }, {}),
    { ESCALATE: 4, DO_NOT_ESCALATE: 2, INSUFFICIENT_EVIDENCE: 2 },
  );
  assert.equal(fixtures.filter((item) => item.falseMajorityAction === "ESCALATE").length, 4);
  assert.ok(fixtures.every((item) => item.referenceLabelStatus === "AUTHOR_DEFINED_NOT_CLINICIAN_SIGNED"));
});

test("assignment manifest forks every sealed state into all arms with contiguous order", () => {
  const assignments = buildFullFactorialAssignments(fixtures, ["a", "b", "c", "d"], 1, 18);
  assert.equal(assignments.length, 8 * 4 * EXPERIMENT_CONDITIONS.length);
  assert.deepEqual(
    assignments.map((item) => item.executionOrder).sort((a, b) => a - b),
    Array.from({ length: assignments.length }, (_, index) => index),
  );
  const states = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const arms = states.get(assignment.sealedStateId) ?? new Set<string>();
    arms.add(assignment.condition);
    states.set(assignment.sealedStateId, arms);
  }
  assert.equal(states.size, 32);
  assert.ok([...states.values()].every((arms) => arms.size === EXPERIMENT_CONDITIONS.length));
});

test("arm prompts are byte-identical outside a single bounded intervention block", () => {
  for (let index = 0; index < fixtures.length; index += 1) {
    const audit = auditArmPromptIsolation(fixtures[index], sealedVote(index));
    assert.deepEqual(audit, {
      passed: true,
      envelopeIdentical: true,
      leakedConditionLabels: [],
      promptTemplateVersion: audit.promptTemplateVersion,
    });
    const prompt = renderRevisionPrompt(fixtures[index], sealedVote(index), "FALSE_MAJORITY");
    assert.match(prompt, /SEALED_ASSESSMENT/u);
    assert.match(prompt, new RegExp(fixtures[index].caseId, "u"));
    assert.match(prompt, /3 of 4 other panelists voted/u);
    assert.doesNotMatch(prompt, /3 of 4 panelists voted/u);
    assert.doesNotMatch(prompt, /conformity|social pressure|expectedDirection|FALSE_MAJORITY/iu);
  }
});

test("assignment builder fails closed on empty cases, duplicate agents, and uint32 overflow", () => {
  assert.throws(() => buildFullFactorialAssignments([], ["a"], 1, 18), /at least one case/u);
  assert.throws(() => buildFullFactorialAssignments(fixtures, ["a", "a"], 1, 18), /unique/u);
  assert.throws(() => buildFullFactorialAssignments(fixtures, ["a"], 1, 2 ** 32), /uint32/u);
});
