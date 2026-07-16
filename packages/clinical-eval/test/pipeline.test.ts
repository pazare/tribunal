import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import {
  analyzeObservations,
  buildFullFactorialAssignments,
  loadSyntheticFixtures,
  simulateProgrammedObservations,
  type AgentObservation,
  type ExperimentAssignment,
  type ProgrammedPolicy,
  validateVoteResult,
} from "../src/index.js";

const fixtures = loadSyntheticFixtures(resolve("fixtures/mechanism-fixtures-v0.1.json"));

function runPolicy(policy: ProgrammedPolicy) {
  const agentId = policy.toLowerCase();
  const assignments = buildFullFactorialAssignments(fixtures, [agentId], 1, 18);
  const observations = simulateProgrammedObservations(fixtures, assignments, { [agentId]: policy });
  return { assignments, observations, results: analyzeObservations(fixtures, assignments, observations, { bootstrapReplicates: 200 }) };
}

function estimate(results: ReturnType<typeof analyzeObservations>, name: string): number | null {
  const result = results.estimands.find((item) => item.name === name);
  assert.ok(result, `missing estimand ${name}`);
  return result.estimate;
}

test("always-conform programmed provider yields exact primary conformity effect", () => {
  const { results } = runPolicy("ALWAYS_CONFORM");
  assert.equal(
    estimate(results, "primary_false_majority_wrong_action_adoption_risk_difference_baseline_correct"),
    1,
  );
  assert.equal(results.estimands[0].inference?.pValue, 2 / 256);
  assert.equal(results.estimands[0].inference?.method, "EXACT_PAIRED_SYMMETRY_SIGN_FLIP");
  assert.match(results.estimands[0].inference?.assumption ?? "", /exchangeable.*sign reversal.*assignment mechanism/u);
  assert.deepEqual(results.primaryPairedDiscordance, {
    eligibleSealedStates: 8,
    majorityOnlyAdopts: 8,
    controlOnlyAdopts: 0,
    bothAdopt: 0,
    neitherAdopts: 0,
  });
});

test("evidence-follower, frozen, and refusing programmed providers recover distinct effects", () => {
  const evidence = runPolicy("EVIDENCE_FOLLOWER").results;
  assert.equal(
    estimate(evidence, "valid_evidence_reference_action_correction_risk_difference_baseline_incorrect"),
    1,
  );
  assert.equal(
    estimate(evidence, "primary_false_majority_wrong_action_adoption_risk_difference_baseline_correct"),
    null,
  );
  const frozen = runPolicy("FROZEN").results;
  assert.equal(
    estimate(frozen, "primary_false_majority_wrong_action_adoption_risk_difference_baseline_correct"),
    0,
  );
  assert.equal(estimate(frozen, "irrelevant_evidence_action_churn_risk_difference"), 0);
  const refused = runPolicy("ALWAYS_REFUSE").results;
  assert.equal(refused.sealedNonVoteStates, 8);
  assert.ok(refused.conditionSummaries.every((condition) => condition.nonVotes === 8));
  assert.equal(estimate(refused, "false_majority_non_vote_risk_difference"), 0);
});

test("arm-specific refusal and sham-churn providers recover non-vote sensitivity paths", () => {
  const refusal = runPolicy("MAJORITY_ONLY_REFUSE").results;
  assert.equal(
    estimate(refusal, "primary_false_majority_wrong_action_adoption_risk_difference_baseline_correct"),
    0,
  );
  assert.equal(
    estimate(refusal, "sensitivity_false_majority_correct_baseline_abandonment_risk_difference"),
    1,
  );
  assert.equal(estimate(refusal, "false_majority_non_vote_risk_difference"), 1);
  const majoritySummary = refusal.conditionSummaries.find((item) => item.condition === "FALSE_MAJORITY");
  assert.deepEqual(majoritySummary?.nonVoteReasons, { PROVIDER_REFUSAL: 8 });
  const sham = runPolicy("SHAM_CHURN").results;
  assert.equal(estimate(sham, "irrelevant_evidence_action_churn_risk_difference"), 1);
});

test("mixed programmed panel preserves case-level independence", () => {
  const agents: Record<string, ProgrammedPolicy> = {
    conform: "ALWAYS_CONFORM",
    evidence: "EVIDENCE_FOLLOWER",
    frozen: "FROZEN",
    refuse: "ALWAYS_REFUSE",
  };
  const assignments = buildFullFactorialAssignments(fixtures, Object.keys(agents), 1, 18);
  const observations = simulateProgrammedObservations(fixtures, assignments, agents);
  const results = analyzeObservations(fixtures, assignments, observations, { bootstrapReplicates: 200 });
  assert.equal(results.sealedStateCount, 32);
  assert.equal(results.plannedAssignmentCount, 160);
  assert.equal(results.fixtureCaseFamilyCount, 8);
  assert.equal(results.assignedCaseFamilyCount, 8);
  assert.deepEqual(results.assignedCaseFamilyCoverage, { n: 8, N: 8 });
  assert.deepEqual(results.fullMatrixCoverage, {
    required: true,
    caseFamilies: 8,
    agentRoles: 4,
    replicateLevels: [0],
    sealedStates: 32,
    expectedSealedStates: 32,
  });
  assert.equal(
    estimate(results, "primary_false_majority_wrong_action_adoption_risk_difference_baseline_correct"),
    0.5,
  );
  assert.equal(
    estimate(results, "valid_evidence_reference_action_correction_risk_difference_baseline_incorrect"),
    1,
  );
});

test("FULL_E2 rejects a five-arm one-case run against the full preregistered fixture set", () => {
  const assignments = buildFullFactorialAssignments(fixtures.slice(0, 1), ["frozen"], 1, 18);
  const observations = simulateProgrammedObservations(fixtures, assignments, { frozen: "FROZEN" });
  assert.throws(
    () => analyzeObservations(fixtures, assignments, observations, { bootstrapReplicates: 20 }),
    /FULL_E2 case x agent x replicate inclusion matrix is incomplete: 1\/8 cells present; 7 missing/u,
  );
});

test("analyzer binds timestamped actual call-start order to frozen executionOrder", () => {
  const { assignments, observations } = runPolicy("FROZEN");
  const outOfOrder = structuredClone(observations);
  [outOfOrder[0].callStartedAt, outOfOrder[1].callStartedAt] = [
    outOfOrder[1].callStartedAt,
    outOfOrder[0].callStartedAt,
  ];
  outOfOrder[0].observedAt = outOfOrder[0].callStartedAt;
  outOfOrder[1].observedAt = outOfOrder[1].callStartedAt;
  assert.throws(
    () => analyzeObservations(fixtures, assignments, outOfOrder, { bootstrapReplicates: 20 }),
    /strict sequential call-start order violated.*actual start index 0, planned executionOrder 1/u,
  );
  const result = analyzeObservations(fixtures, assignments, observations, { bootstrapReplicates: 20 });
  assert.deepEqual(result.executionOrderAudit, {
    verified: true,
    mode: "STRICT_SEQUENTIAL_TIMESTAMPED_CALL_START_ORDER",
    rule: result.executionOrderAudit.rule,
  });
  assert.match(result.executionOrderAudit.rule, /callStartedAt.*executionOrder.*concurrent, or batched/u);

  const overlapping = structuredClone(observations);
  overlapping[0].observedAt = overlapping[2].callStartedAt;
  assert.throws(
    () => analyzeObservations(fixtures, assignments, overlapping, { bootstrapReplicates: 20 }),
    /started before .* was observed complete/u,
  );
});

test("analysis emits explicit eligibility and non-vote n/N denominators without trial labels", () => {
  const refused = runPolicy("ALWAYS_REFUSE").results;
  assert.deepEqual(refused.nonVoteDenominators.baseline, { n: 8, N: 8 });
  assert.deepEqual(refused.nonVoteDenominators.byCondition.FALSE_MAJORITY, { n: 8, N: 8 });
  assert.deepEqual(refused.estimands[0].eligibility, {
    eligibleCaseFamilies: { n: 0, N: 8 },
    eligibleSealedStates: { n: 0, N: 8 },
    pairedSealedStates: { n: 0, N: 0 },
  });

  const frozen = runPolicy("FROZEN").results;
  assert.deepEqual(frozen.nonVoteDenominators.baseline, { n: 0, N: 8 });
  assert.deepEqual(frozen.nonVoteDenominators.byCondition.FALSE_MAJORITY, { n: 0, N: 8 });
  assert.deepEqual(frozen.estimands[0].eligibility, {
    eligibleCaseFamilies: { n: 8, N: 8 },
    eligibleSealedStates: { n: 8, N: 8 },
    pairedSealedStates: { n: 8, N: 8 },
  });
  const summary = frozen.conditionSummaries.find((item) => item.condition === "CONTROL");
  assert.ok(summary);
  assert.equal("referenceActionMatchRateItt" in summary, false);
  assert.equal("referenceActionMatchesItt" in summary, false);
  assert.equal("falseMajoritySelectionRateItt" in summary, false);
  assert.equal(summary.referenceActionMatchRatePerPlannedAssignment, 1);
});

test("within-role repeatability is not conflated with cross-role concordance", () => {
  const oneRoleAssignments = buildFullFactorialAssignments(fixtures, ["frozen"], 2, 18);
  const oneRoleObservations = simulateProgrammedObservations(fixtures, oneRoleAssignments, {
    frozen: "FROZEN",
  });
  const oneRole = analyzeObservations(fixtures, oneRoleAssignments, oneRoleObservations, {
    bootstrapReplicates: 20,
  });
  assert.equal(
    oneRole.withinRoleRepeatabilityByCondition.CONTROL.coverage.caseRoleUnitsWithAtLeastTwoVotes,
    8,
  );
  assert.equal(
    oneRole.crossRoleConcordanceByCondition.CONTROL.coverage.caseReplicateUnitsWithAtLeastTwoVotes,
    0,
  );

  const twoRoleAssignments = buildFullFactorialAssignments(fixtures, ["frozen-a", "frozen-b"], 1, 18);
  const twoRoleObservations = simulateProgrammedObservations(fixtures, twoRoleAssignments, {
    "frozen-a": "FROZEN",
    "frozen-b": "FROZEN",
  });
  const twoRole = analyzeObservations(fixtures, twoRoleAssignments, twoRoleObservations, {
    bootstrapReplicates: 20,
  });
  assert.equal(
    twoRole.withinRoleRepeatabilityByCondition.CONTROL.coverage.caseRoleUnitsWithAtLeastTwoVotes,
    0,
  );
  assert.equal(
    twoRole.crossRoleConcordanceByCondition.CONTROL.coverage.caseReplicateUnitsWithAtLeastTwoVotes,
    8,
  );
});

test("analyzer fails closed on attrition, prompt tampering, and reused sessions", () => {
  const { assignments, observations } = runPolicy("FROZEN");
  assert.throws(
    () => analyzeObservations(fixtures, assignments, observations.slice(1)),
    /missing explicit observation/u,
  );
  const badHash = structuredClone(observations);
  badHash[0].revisionPromptHash = "0".repeat(64);
  assert.throws(() => analyzeObservations(fixtures, assignments, badHash), /revision prompt hash mismatch/u);
  const reused = structuredClone(observations);
  reused[0].revisionSessionId = reused[0].baselineSessionId;
  assert.throws(() => analyzeObservations(fixtures, assignments, reused), /must differ/u);
  const invisible = structuredClone(observations);
  assert.equal(invisible[0].postExposure.status, "VOTE");
  if (invisible[0].postExposure.status === "VOTE") invisible[0].postExposure.evidenceRefs = ["HIDDEN_ANSWER"];
  assert.throws(() => analyzeObservations(fixtures, assignments, invisible), /invisible evidence/u);
});

test("runtime schemas reject unknown top-level and nested provider fields", () => {
  const { assignments, observations } = runPolicy("FROZEN");
  const missingCallStart = structuredClone(observations) as Array<Partial<AgentObservation>>;
  delete missingCallStart[0].callStartedAt;
  assert.throws(
    () => analyzeObservations(fixtures, assignments, missingCallStart as AgentObservation[]),
    /observation\.callStartedAt must be a non-empty string/u,
  );

  const impossibleTiming = structuredClone(observations);
  impossibleTiming[0].observedAt = "2026-07-15T23:59:59.999Z";
  assert.throws(
    () => analyzeObservations(fixtures, assignments, impossibleTiming),
    /observedAt must not precede callStartedAt/u,
  );

  const topLevel = structuredClone(observations) as Array<AgentObservation & { chainOfThought?: string }>;
  topLevel[0].chainOfThought = "must never be retained";
  assert.throws(() => analyzeObservations(fixtures, assignments, topLevel), /unexpected keys.*chainOfThought/u);

  const nested = structuredClone(observations) as Array<AgentObservation & {
    baseline: AgentObservation["baseline"] & { rawPatientName?: string };
  }>;
  nested[0].baseline.rawPatientName = "must never be retained";
  assert.throws(() => analyzeObservations(fixtures, assignments, nested), /unexpected keys.*rawPatientName/u);

  const nestedTuple = structuredClone(observations);
  assert.equal(nestedTuple[0].baseline.status, "VOTE");
  if (nestedTuple[0].baseline.status === "VOTE") {
    (nestedTuple[0].baseline.tuple as unknown as Record<string, unknown>).rawPatientName =
      "must never be retained";
  }
  assert.throws(() => analyzeObservations(fixtures, assignments, nestedTuple), /unexpected keys.*rawPatientName/u);

  const refused = runPolicy("ALWAYS_REFUSE");
  const nonVoteExtra = structuredClone(refused.observations);
  (nonVoteExtra[0].postExposure as typeof nonVoteExtra[0]["postExposure"] & { chainOfThought?: string })
    .chainOfThought = "must never be retained";
  assert.throws(
    () => analyzeObservations(fixtures, refused.assignments, nonVoteExtra),
    /unexpected keys.*chainOfThought/u,
  );

  const assignmentExtra = structuredClone(assignments) as Array<ExperimentAssignment & { hiddenArm?: string }>;
  assignmentExtra[0].hiddenArm = "FALSE_MAJORITY";
  assert.throws(() => analyzeObservations(fixtures, assignmentExtra, observations), /unexpected keys.*hiddenArm/u);
});

test("tuple schema rejects cross-field-invalid non-escalation dispositions", () => {
  const vote = (action: "DO_NOT_ESCALATE" | "INSUFFICIENT_EVIDENCE") => ({
    status: "VOTE" as const,
    tuple: {
      action,
      specialties: [] as string[],
      urgency: "UNDETERMINED" as const,
      missingEvidence: action === "INSUFFICIENT_EVIDENCE" ? ["LABORATORY"] : [],
    },
    confidence: 0.5,
    evidenceRefs: ["B1"],
    conciseRationale: "Schema regression fixture.",
  });
  assert.doesNotThrow(() => validateVoteResult(vote("DO_NOT_ESCALATE")));
  assert.doesNotThrow(() => validateVoteResult(vote("INSUFFICIENT_EVIDENCE")));

  const doNotSpecialty = vote("DO_NOT_ESCALATE");
  doNotSpecialty.tuple.specialties = ["PRIMARY_CARE"];
  assert.throws(() => validateVoteResult(doNotSpecialty), /empty specialties.*UNDETERMINED/u);
  const doNotUrgency = vote("DO_NOT_ESCALATE");
  (doNotUrgency.tuple as Record<string, unknown>).urgency = "U4_ROUTINE";
  assert.throws(() => validateVoteResult(doNotUrgency), /empty specialties.*UNDETERMINED/u);

  const insufficientSpecialty = vote("INSUFFICIENT_EVIDENCE");
  insufficientSpecialty.tuple.specialties = ["PRIMARY_CARE"];
  assert.throws(() => validateVoteResult(insufficientSpecialty), /empty specialties.*named missing evidence/u);
  const insufficientNoMissing = vote("INSUFFICIENT_EVIDENCE");
  insufficientNoMissing.tuple.missingEvidence = [];
  assert.throws(() => validateVoteResult(insufficientNoMissing), /named missing evidence/u);
});

test("full E2 is the default and reduced designs require an explicit label", () => {
  const agentId = "frozen";
  const assignments = buildFullFactorialAssignments(fixtures, [agentId], 1, 18, ["CONTROL"]);
  const observations = simulateProgrammedObservations(fixtures, assignments, { frozen: "FROZEN" });
  assert.throws(
    () => analyzeObservations(fixtures, assignments, observations),
    /FULL_E2 requires all five/u,
  );
  const reduced = analyzeObservations(fixtures, assignments, observations, {
    designMode: "REDUCED_DESIGN",
    bootstrapReplicates: 20,
  });
  assert.equal(reduced.designMode, "REDUCED_DESIGN");
  assert.deepEqual(reduced.plannedConditions, ["CONTROL"]);
});

test("bootstrap configuration fails closed", () => {
  const { assignments, observations } = runPolicy("FROZEN");
  assert.throws(
    () => analyzeObservations(fixtures, assignments, observations, { bootstrapReplicates: -5 }),
    /positive integer/u,
  );
  assert.throws(
    () => analyzeObservations(fixtures, assignments, observations, { bootstrapSeed: Number.NaN }),
    /uint32/u,
  );
});
