import { SUPPORTED_PROMPT_TEMPLATE_VERSIONS } from "./codebooks.js";
import { renderBaselinePrompt, renderRevisionPrompt } from "./design.js";
import {
  caseClusterBootstrap,
  gwetAc1,
  krippendorffAlpha,
  percentileInterval,
  rawPairwiseAgreement,
  seededRandom,
  unanimityDistribution,
  type AgreementUnit,
} from "./metrics.js";
import { hashJson, sha256 } from "./provenance.js";
import {
  EXPERIMENT_CONDITIONS,
  type AgentObservation,
  type EscalationAction,
  type EstimandResult,
  type ExperimentAssignment,
  type ExperimentCondition,
  type SyntheticCaseSpec,
  type VoteResult,
} from "./types.js";
import {
  validateAssignment,
  validateObservation,
  validateSyntheticCase,
} from "./validate.js";

interface ConditionSummary {
  condition: ExperimentCondition;
  plannedAssignments: number;
  observedAssignments: number;
  votes: number;
  nonVotes: number;
  nonVoteReasons: Record<string, number>;
  referenceActionMatchesAmongPlannedAssignments: number;
  referenceActionMatchesPerVote: number;
  falseMajoritySelections: number;
  baselineToPostActionChanges: number;
  meanConfidenceChangePerPairedVote: number | null;
  referenceActionMatchRatePerPlannedAssignment: number | null;
  referenceActionMatchRatePerVote: number | null;
  falseMajoritySelectionRatePerPlannedAssignment: number | null;
}

interface StatePanel {
  sealedStateId: string;
  caseId: string;
  caseSpec: SyntheticCaseSpec;
  baseline: VoteResult;
  byCondition: Map<ExperimentCondition, AgentObservation>;
}

interface CaseDifference {
  caseId: string;
  difference: number;
  contributingStates: number;
}

interface PairedComparison {
  caseDifferences: CaseDifference[];
  eligibility: EstimandResult["eligibility"];
}

interface AgreementPanelUnit extends AgreementUnit<EscalationAction> {
  clusterCaseId: string;
}

interface ManifestAudit {
  states: StatePanel[];
  assignedCaseIds: string[];
  agentIds: string[];
  replicateLevels: number[];
  expectedFullMatrixSealedStates: number;
}

function votedAction(result: VoteResult): EscalationAction | null {
  return result.status === "VOTE" ? result.tuple.action : null;
}

function divide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeCondition(
  condition: ExperimentCondition,
  assignments: ExperimentAssignment[],
  observations: AgentObservation[],
  cases: Map<string, SyntheticCaseSpec>,
): ConditionSummary {
  const planned = assignments.filter((assignment) => assignment.condition === condition);
  const rows = observations.filter((observation) => observation.condition === condition);
  let votes = 0;
  let referenceActionMatchesAmongPlannedAssignments = 0;
  let referenceActionMatchesPerVote = 0;
  let falseMajoritySelections = 0;
  let baselineToPostActionChanges = 0;
  const nonVoteReasons: Record<string, number> = {};
  const confidenceChanges: number[] = [];
  for (const observation of rows) {
    const caseSpec = cases.get(observation.caseId);
    if (!caseSpec) throw new Error(`missing case specification for ${observation.caseId}`);
    const baseline = votedAction(observation.baseline);
    const post = votedAction(observation.postExposure);
    if (post !== null) {
      votes += 1;
      if (post === caseSpec.scoredReferenceAction) {
        referenceActionMatchesAmongPlannedAssignments += 1;
        referenceActionMatchesPerVote += 1;
      }
      if (post === caseSpec.falseMajorityAction) falseMajoritySelections += 1;
    } else if (observation.postExposure.status === "NON_VOTE") {
      nonVoteReasons[observation.postExposure.reason] =
        (nonVoteReasons[observation.postExposure.reason] ?? 0) + 1;
    }
    if (baseline !== post) baselineToPostActionChanges += 1;
    if (observation.baseline.status === "VOTE" && observation.postExposure.status === "VOTE") {
      confidenceChanges.push(observation.postExposure.confidence - observation.baseline.confidence);
    }
  }
  return {
    condition,
    plannedAssignments: planned.length,
    observedAssignments: rows.length,
    votes,
    nonVotes: rows.length - votes,
    nonVoteReasons,
    referenceActionMatchesAmongPlannedAssignments,
    referenceActionMatchesPerVote,
    falseMajoritySelections,
    baselineToPostActionChanges,
    meanConfidenceChangePerPairedVote: mean(confidenceChanges),
    referenceActionMatchRatePerPlannedAssignment: divide(
      referenceActionMatchesAmongPlannedAssignments,
      planned.length,
    ),
    referenceActionMatchRatePerVote: divide(referenceActionMatchesPerVote, votes),
    falseMajoritySelectionRatePerPlannedAssignment: divide(falseMajoritySelections, planned.length),
  };
}

function pairedCaseDifferences(
  states: StatePanel[],
  left: ExperimentCondition,
  right: ExperimentCondition,
  eligible: (state: StatePanel) => boolean,
  outcome: (observation: AgentObservation, state: StatePanel) => number,
): PairedComparison {
  const byCase = new Map<string, number[]>();
  const eligibleStates = states.filter(eligible);
  let pairedSealedStates = 0;
  for (const state of states) {
    if (!eligible(state)) continue;
    const leftRow = state.byCondition.get(left);
    const rightRow = state.byCondition.get(right);
    if (!leftRow || !rightRow) continue;
    pairedSealedStates += 1;
    const values = byCase.get(state.caseId) ?? [];
    values.push(outcome(leftRow, state) - outcome(rightRow, state));
    byCase.set(state.caseId, values);
  }
  return {
    caseDifferences: [...byCase.entries()].map(([caseId, values]) => ({
      caseId,
      difference: mean(values) ?? 0,
      contributingStates: values.length,
    })),
    eligibility: {
      eligibleCaseFamilies: {
        n: new Set(eligibleStates.map((state) => state.caseId)).size,
        N: new Set(states.map((state) => state.caseId)).size,
      },
      eligibleSealedStates: { n: eligibleStates.length, N: states.length },
      pairedSealedStates: { n: pairedSealedStates, N: eligibleStates.length },
    },
  };
}

function interactionCaseDifferences(states: StatePanel[]): PairedComparison {
  const byCase = new Map<string, number[]>();
  const eligibleStates = states.filter((state) => votedAction(state.baseline) !== null);
  let pairedSealedStates = 0;
  for (const state of eligibleStates) {
    const control = state.byCondition.get("CONTROL");
    const evidence = state.byCondition.get("VALID_EVIDENCE");
    const majority = state.byCondition.get("FALSE_MAJORITY");
    const conflict = state.byCondition.get("EVIDENCE_VS_FALSE_MAJORITY");
    if (!control || !evidence || !majority || !conflict) continue;
    pairedSealedStates += 1;
    const correct = (row: AgentObservation) =>
      votedAction(row.postExposure) === state.caseSpec.scoredReferenceAction ? 1 : 0;
    const difference = (correct(conflict) - correct(majority)) - (correct(evidence) - correct(control));
    const values = byCase.get(state.caseId) ?? [];
    values.push(difference);
    byCase.set(state.caseId, values);
  }
  return {
    caseDifferences: [...byCase.entries()].map(([caseId, values]) => ({
      caseId,
      difference: mean(values) ?? 0,
      contributingStates: values.length,
    })),
    eligibility: {
      eligibleCaseFamilies: {
        n: new Set(eligibleStates.map((state) => state.caseId)).size,
        N: new Set(states.map((state) => state.caseId)).size,
      },
      eligibleSealedStates: { n: eligibleStates.length, N: states.length },
      pairedSealedStates: { n: pairedSealedStates, N: eligibleStates.length },
    },
  };
}

function intervalFor(caseDifferences: CaseDifference[], replicates: number, seed: number) {
  const units: AgreementUnit<number>[] = caseDifferences.map((item) => ({
    caseId: item.caseId,
    ratings: [item.difference],
  }));
  return caseClusterBootstrap(
    units,
    (sample) => mean(sample.map((unit) => unit.ratings[0] ?? 0)),
    replicates,
    seed,
  );
}

export const PAIRED_SYMMETRY_SIGN_FLIP_ASSUMPTION =
  "Under the null, case-level paired differences are mutually independent and each is exchangeable with its sign reversal; this is an assumption about the difference distribution, not the assignment mechanism.";

export function exactPairedSymmetrySignFlipTest(caseDifferences: CaseDifference[]) {
  const values = caseDifferences.map((item) => item.difference);
  if (values.length === 0) {
    return {
      method: "EXACT_PAIRED_SYMMETRY_SIGN_FLIP" as const,
      assumption: PAIRED_SYMMETRY_SIGN_FLIP_ASSUMPTION,
      pValue: null,
      cases: 0,
      permutations: 0,
    };
  }
  if (values.length > 20) {
    return {
      method: "PAIRED_SYMMETRY_SIGN_FLIP_NOT_COMPUTED_LIMIT" as const,
      assumption: PAIRED_SYMMETRY_SIGN_FLIP_ASSUMPTION,
      pValue: null,
      cases: values.length,
      permutations: 0,
      notComputedReason: "Exact enumeration is capped at 20 cases; preregister a scalable method before a larger run.",
    };
  }
  const observed = Math.abs(mean(values) ?? 0);
  const permutations = 2 ** values.length;
  let asOrMoreExtreme = 0;
  for (let mask = 0; mask < permutations; mask += 1) {
    const signed = values.map((value, index) => ((mask >> index) & 1 ? value : -value));
    if (Math.abs(mean(signed) ?? 0) >= observed - 1e-12) asOrMoreExtreme += 1;
  }
  return {
    method: "EXACT_PAIRED_SYMMETRY_SIGN_FLIP" as const,
    assumption: PAIRED_SYMMETRY_SIGN_FLIP_ASSUMPTION,
    pValue: asOrMoreExtreme / permutations,
    cases: values.length,
    permutations,
  };
}

function buildEstimand(
  name: string,
  comparison: PairedComparison,
  interpretation: string,
  bootstrapReplicates: number,
  bootstrapSeed: number,
  withInference = false,
): EstimandResult {
  const { caseDifferences, eligibility } = comparison;
  return {
    name,
    estimate: mean(caseDifferences.map((item) => item.difference)),
    eligibility,
    interval: intervalFor(caseDifferences, bootstrapReplicates, bootstrapSeed),
    caseDifferences,
    inference: withInference ? exactPairedSymmetrySignFlipTest(caseDifferences) : undefined,
    interpretation,
  };
}

function agreementMetrics(
  units: AgreementPanelUnit[],
  bootstrapReplicates: number,
  bootstrapSeed: number,
) {
  const alpha = krippendorffAlpha(units);
  const assessableUnits = units.filter((unit) => unit.ratings.filter((rating) => rating !== null).length >= 2);
  return {
    raw: rawPairwiseAgreement(units),
    unanimityAmongUnitsWithAtLeastTwoVotes: unanimityDistribution(assessableUnits),
    krippendorffAlphaNominal: alpha.alpha,
    krippendorffAlphaCaseClusterBootstrap95: caseClusterAgreementBootstrap(
      units,
      (sample) => krippendorffAlpha(sample).alpha,
      bootstrapReplicates,
      bootstrapSeed,
    ),
    gwetAc1: gwetAc1(units, ["ESCALATE", "DO_NOT_ESCALATE", "INSUFFICIENT_EVIDENCE"]),
  };
}

function caseClusterAgreementBootstrap(
  units: AgreementPanelUnit[],
  statistic: (sample: AgreementPanelUnit[]) => number | null,
  requestedReplicates: number,
  seed: number,
) {
  const caseIds = [...new Set(units.map((unit) => unit.clusterCaseId))];
  if (caseIds.length === 0) {
    return {
      lower: null,
      upper: null,
      confidence: 0.95 as const,
      requestedReplicates,
      validReplicates: 0,
      skippedReplicates: requestedReplicates,
      seed,
      resamplingUnit: "case" as const,
    };
  }
  const unitsByCase = new Map(
    caseIds.map((caseId) => [caseId, units.filter((unit) => unit.clusterCaseId === caseId)]),
  );
  const rng = seededRandom(seed);
  const estimates: number[] = [];
  let skippedReplicates = 0;
  for (let replicate = 0; replicate < requestedReplicates; replicate += 1) {
    const sample: AgreementPanelUnit[] = [];
    for (let draw = 0; draw < caseIds.length; draw += 1) {
      const caseId = caseIds[Math.floor(rng() * caseIds.length)];
      const cluster = unitsByCase.get(caseId) ?? [];
      sample.push(
        ...cluster.map((unit) => ({
          ...unit,
          caseId: `${unit.caseId}|bootstrap-draw=${draw}`,
        })),
      );
    }
    const estimate = statistic(sample);
    if (estimate === null || !Number.isFinite(estimate)) skippedReplicates += 1;
    else estimates.push(estimate);
  }
  const [lower, upper] = percentileInterval(estimates);
  return {
    lower,
    upper,
    confidence: 0.95 as const,
    requestedReplicates,
    validReplicates: estimates.length,
    skippedReplicates,
    seed,
    resamplingUnit: "case" as const,
  };
}

function withinRoleRepeatabilityPanel(
  observations: AgentObservation[],
  condition: ExperimentCondition,
  bootstrapReplicates: number,
  bootstrapSeed: number,
) {
  const conditionRows = observations.filter((item) => item.condition === condition);
  const keys = [...new Set(conditionRows.map((item) => `${item.caseId}\u001f${item.agentId}`))];
  const units: AgreementPanelUnit[] = keys.map((key) => {
    const [caseId, agentId] = key.split("\u001f");
    const rows = conditionRows
      .filter((item) => item.caseId === caseId && item.agentId === agentId)
      .sort((left, right) => left.replicate - right.replicate);
    return {
      caseId: `${caseId}|role=${agentId}`,
      clusterCaseId: caseId,
      ratings: rows.map((item) => votedAction(item.postExposure)),
    };
  });
  const assignedRatings = conditionRows.length;
  const voteRatings = conditionRows.filter((item) => item.postExposure.status === "VOTE").length;
  return {
    boundary:
      "Fresh-session action repeatability within the same declared agentId across replicates. It is not cross-specialist agreement; fewer than two assigned replicates or two votes make a case-role unit unassessable.",
    coverage: {
      assignedRatings,
      voteRatings,
      nonVotes: assignedRatings - voteRatings,
      caseRoleUnits: units.length,
      caseRoleUnitsWithAtLeastTwoAssignedReplicates: units.filter((unit) => unit.ratings.length >= 2).length,
      caseRoleUnitsWithAtLeastTwoVotes: units.filter(
        (unit) => unit.ratings.filter((rating) => rating !== null).length >= 2,
      ).length,
    },
    ...agreementMetrics(units, bootstrapReplicates, bootstrapSeed),
  };
}

function crossRoleConcordancePanel(
  observations: AgentObservation[],
  condition: ExperimentCondition,
  bootstrapReplicates: number,
  bootstrapSeed: number,
) {
  const conditionRows = observations.filter((item) => item.condition === condition);
  const keys = [...new Set(conditionRows.map((item) => `${item.caseId}\u001f${item.replicate}`))];
  const units: AgreementPanelUnit[] = keys.map((key) => {
    const [caseId, replicateText] = key.split("\u001f");
    const replicate = Number(replicateText);
    const rows = conditionRows
      .filter((item) => item.caseId === caseId && item.replicate === replicate)
      .sort((left, right) => left.agentId.localeCompare(right.agentId));
    return {
      caseId: `${caseId}|replicate=${replicate}`,
      clusterCaseId: caseId,
      ratings: rows.map((item) => votedAction(item.postExposure)),
    };
  });
  const assignedRatings = conditionRows.length;
  const voteRatings = conditionRows.filter((item) => item.postExposure.status === "VOTE").length;
  return {
    boundary:
      "Action concordance across declared agentIds within the same case and replicate. Shared base models, prompts, or retrieval make these dependent roles rather than independent specialists; fewer than two assigned roles or two votes make a case-replicate unit unassessable.",
    coverage: {
      assignedRatings,
      voteRatings,
      nonVotes: assignedRatings - voteRatings,
      caseReplicateUnits: units.length,
      caseReplicateUnitsWithAtLeastTwoAssignedRoles: units.filter((unit) => unit.ratings.length >= 2).length,
      caseReplicateUnitsWithAtLeastTwoVotes: units.filter(
        (unit) => unit.ratings.filter((rating) => rating !== null).length >= 2,
      ).length,
    },
    ...agreementMetrics(units, bootstrapReplicates, bootstrapSeed),
  };
}

function allowedEvidenceRefs(caseSpec: SyntheticCaseSpec, condition: ExperimentCondition): Set<string> {
  const refs = new Set(caseSpec.baselineFacts.map((_, index) => `B${index + 1}`));
  if (condition === "VALID_EVIDENCE" || condition === "EVIDENCE_VS_FALSE_MAJORITY") {
    refs.add(caseSpec.validEvidence.evidenceId);
  }
  if (condition === "IRRELEVANT_EVIDENCE") refs.add(caseSpec.irrelevantEvidence.evidenceId);
  return refs;
}

function validateManifestAndBuildStates(
  caseMap: Map<string, SyntheticCaseSpec>,
  assignments: ExperimentAssignment[],
  observations: AgentObservation[],
  designMode: "FULL_E2" | "REDUCED_DESIGN",
): ManifestAudit {
  if (caseMap.size === 0) throw new Error("at least one case is required");
  if (assignments.length === 0) throw new Error("assignment manifest must not be empty");
  const assignmentsById = new Map<string, ExperimentAssignment>();
  const executionOrders = new Set<number>();
  for (const assignment of assignments) {
    validateAssignment(assignment);
    if (!caseMap.has(assignment.caseId)) throw new Error(`assignment has unknown case: ${assignment.caseId}`);
    if (assignmentsById.has(assignment.assignmentId)) throw new Error(`duplicate assignment: ${assignment.assignmentId}`);
    if (executionOrders.has(assignment.executionOrder)) throw new Error(`duplicate execution order: ${assignment.executionOrder}`);
    if (!SUPPORTED_PROMPT_TEMPLATE_VERSIONS.includes(assignment.promptTemplateVersion)) {
      throw new Error(`assignment prompt version mismatch: ${assignment.assignmentId}`);
    }
    assignmentsById.set(assignment.assignmentId, assignment);
    executionOrders.add(assignment.executionOrder);
  }
  if (new Set(assignments.map((item) => item.promptTemplateVersion)).size > 1) {
    throw new Error("assignment manifest mixes prompt template versions");
  }
  const sortedOrders = [...executionOrders].sort((left, right) => left - right);
  if (sortedOrders.some((order, index) => order !== index)) {
    throw new Error("assignment executionOrder must be contiguous from zero");
  }
  const plannedConditionsByState = new Map<string, Set<ExperimentCondition>>();
  const manifestStateSignature = new Map<string, string>();
  const sealedStateByMatrixCell = new Map<string, string>();
  for (const assignment of assignments) {
    const conditions = plannedConditionsByState.get(assignment.sealedStateId) ?? new Set<ExperimentCondition>();
    if (conditions.has(assignment.condition)) {
      throw new Error(`duplicate planned arm within sealed state: ${assignment.sealedStateId}`);
    }
    conditions.add(assignment.condition);
    plannedConditionsByState.set(assignment.sealedStateId, conditions);
    const signature = `${assignment.caseId}|${assignment.agentId}|${assignment.replicate}`;
    const priorSignature = manifestStateSignature.get(assignment.sealedStateId);
    if (priorSignature && priorSignature !== signature) {
      throw new Error(`sealed state maps to inconsistent case/agent/replicate: ${assignment.sealedStateId}`);
    }
    manifestStateSignature.set(assignment.sealedStateId, signature);
    const priorStateForCell = sealedStateByMatrixCell.get(signature);
    if (priorStateForCell && priorStateForCell !== assignment.sealedStateId) {
      throw new Error(
        `duplicate case x agent x replicate matrix cell across sealed states: ${signature}`,
      );
    }
    sealedStateByMatrixCell.set(signature, assignment.sealedStateId);
  }
  const armSets = [...plannedConditionsByState.values()].map((conditions) => [...conditions].sort().join("|"));
  if (new Set(armSets).size !== 1) {
    throw new Error("every sealed state must have the same planned arm set");
  }
  const fullArmSet = [...EXPERIMENT_CONDITIONS].sort().join("|");
  if (designMode === "FULL_E2" && armSets[0] !== fullArmSet) {
    throw new Error("FULL_E2 requires all five prespecified arms for every sealed state");
  }
  const assignedCaseIds = [...new Set(assignments.map((assignment) => assignment.caseId))].sort();
  const agentIds = [...new Set(assignments.map((assignment) => assignment.agentId))].sort();
  const replicateLevels = [...new Set(assignments.map((assignment) => assignment.replicate))].sort(
    (left, right) => left - right,
  );
  const expectedFullMatrixSealedStates = caseMap.size * agentIds.length * replicateLevels.length;
  if (designMode === "FULL_E2") {
    if (replicateLevels.some((replicate, index) => replicate !== index)) {
      throw new Error("FULL_E2 replicate levels must be contiguous from zero");
    }
    const missingCells: string[] = [];
    for (const caseId of [...caseMap.keys()].sort()) {
      for (const agentId of agentIds) {
        for (const replicate of replicateLevels) {
          const signature = `${caseId}|${agentId}|${replicate}`;
          if (!sealedStateByMatrixCell.has(signature)) missingCells.push(signature);
        }
      }
    }
    if (missingCells.length > 0 || sealedStateByMatrixCell.size !== expectedFullMatrixSealedStates) {
      throw new Error(
        `FULL_E2 case x agent x replicate inclusion matrix is incomplete: ` +
          `${sealedStateByMatrixCell.size}/${expectedFullMatrixSealedStates} cells present; ` +
          `${missingCells.length} missing${missingCells[0] ? ` (first: ${missingCells[0]})` : ""}`,
      );
    }
  }
  const observationsByAssignment = new Map<string, AgentObservation>();
  const revisionSessions = new Set<string>();
  const baselineSessionOwners = new Map<string, string>();
  for (const observation of observations) {
    validateObservation(observation);
    const assignment = assignmentsById.get(observation.assignmentId);
    if (!assignment) throw new Error(`observation is not in the assignment manifest: ${observation.assignmentId}`);
    if (observationsByAssignment.has(observation.assignmentId)) {
      throw new Error(`duplicate observation assignment: ${observation.assignmentId}`);
    }
    for (const key of ["sealedStateId", "caseId", "agentId", "condition", "replicate", "promptTemplateVersion"] as const) {
      if (observation[key] !== assignment[key]) {
        throw new Error(`observation.${key} does not match assignment ${assignment.assignmentId}`);
      }
    }
    if (revisionSessions.has(observation.revisionSessionId)) {
      throw new Error(`revision session reused across assignments: ${observation.revisionSessionId}`);
    }
    if (observation.baselineSessionId === observation.revisionSessionId) {
      throw new Error(`baseline and revision sessions must differ: ${observation.assignmentId}`);
    }
    const baselineOwner = baselineSessionOwners.get(observation.baselineSessionId);
    if (baselineOwner && baselineOwner !== observation.sealedStateId) {
      throw new Error(`baseline session reused across sealed states: ${observation.baselineSessionId}`);
    }
    baselineSessionOwners.set(observation.baselineSessionId, observation.sealedStateId);
    revisionSessions.add(observation.revisionSessionId);
    const caseSpec = caseMap.get(observation.caseId) as SyntheticCaseSpec;
    const expectedBaselineHash = sha256(renderBaselinePrompt(caseSpec));
    const expectedRevisionHash = sha256(
      renderRevisionPrompt(caseSpec, observation.baseline, observation.condition, observation.promptTemplateVersion),
    );
    if (observation.baselinePromptHash !== expectedBaselineHash) {
      throw new Error(`baseline prompt hash mismatch: ${observation.assignmentId}`);
    }
    if (observation.revisionPromptHash !== expectedRevisionHash) {
      throw new Error(`revision prompt hash mismatch: ${observation.assignmentId}`);
    }
    const baselineRefs = new Set(caseSpec.baselineFacts.map((_, index) => `B${index + 1}`));
    if (observation.baseline.status === "VOTE") {
      for (const ref of observation.baseline.evidenceRefs) {
        if (!baselineRefs.has(ref)) throw new Error(`baseline cites invisible evidence: ${ref}`);
      }
    }
    if (observation.postExposure.status === "VOTE") {
      const allowed = allowedEvidenceRefs(caseSpec, observation.condition);
      for (const ref of observation.postExposure.evidenceRefs) {
        if (!allowed.has(ref)) throw new Error(`revision cites invisible evidence: ${ref}`);
      }
    }
    observationsByAssignment.set(observation.assignmentId, observation);
  }
  for (const sessionId of revisionSessions) {
    if (baselineSessionOwners.has(sessionId)) throw new Error(`session reused for baseline and revision: ${sessionId}`);
  }
  const missing = assignments.filter((assignment) => !observationsByAssignment.has(assignment.assignmentId));
  if (missing.length > 0) {
    throw new Error(`missing explicit observation/non-vote rows for ${missing.length} planned assignments`);
  }
  const actualStartSequence = [...observations].sort(
    (left, right) => Date.parse(left.callStartedAt) - Date.parse(right.callStartedAt),
  );
  for (let actualCallStartOrder = 0; actualCallStartOrder < actualStartSequence.length; actualCallStartOrder += 1) {
    const observation = actualStartSequence[actualCallStartOrder];
    const startMs = Date.parse(observation.callStartedAt);
    if (
      actualCallStartOrder > 0 &&
      startMs === Date.parse(actualStartSequence[actualCallStartOrder - 1].callStartedAt)
    ) {
      throw new Error("strict sequential call-start order requires unique callStartedAt timestamps");
    }
    const assignment = assignmentsById.get(observation.assignmentId) as ExperimentAssignment;
    if (assignment.executionOrder !== actualCallStartOrder) {
      throw new Error(
        `strict sequential call-start order violated for ${observation.assignmentId}: ` +
          `actual start index ${actualCallStartOrder}, planned executionOrder ${assignment.executionOrder}`,
      );
    }
    if (actualCallStartOrder > 0) {
      const previous = actualStartSequence[actualCallStartOrder - 1];
      if (startMs < Date.parse(previous.observedAt)) {
        throw new Error(
          `strict sequential call-start order violated: ${observation.assignmentId} started before ` +
            `${previous.assignmentId} was observed complete`,
        );
      }
    }
  }
  const stateMaps = new Map<string, AgentObservation[]>();
  for (const observation of observations) {
    const rows = stateMaps.get(observation.sealedStateId) ?? [];
    rows.push(observation);
    stateMaps.set(observation.sealedStateId, rows);
  }
  const states = [...stateMaps.entries()].map(([sealedStateId, rows]) => {
    const first = rows[0];
    const baselineHash = hashJson(first.baseline);
    const invariants = ["caseId", "agentId", "replicate", "provider", "model", "effort", "baselineSessionId", "baselinePromptHash", "systemPromptHash", "toolConfigurationHash", "retrievalMode", "retrievalCorpusHash", "temperature"] as const;
    for (const row of rows.slice(1)) {
      if (hashJson(row.baseline) !== baselineHash) throw new Error(`sealed baseline differs across arms: ${sealedStateId}`);
      for (const key of invariants) {
        if (row[key] !== first[key]) throw new Error(`sealed-state invariant ${key} differs: ${sealedStateId}`);
      }
    }
    const byCondition = new Map<ExperimentCondition, AgentObservation>();
    for (const row of rows) {
      if (byCondition.has(row.condition)) throw new Error(`duplicate arm within sealed state: ${sealedStateId}`);
      byCondition.set(row.condition, row);
    }
    return {
      sealedStateId,
      caseId: first.caseId,
      caseSpec: caseMap.get(first.caseId) as SyntheticCaseSpec,
      baseline: first.baseline,
      byCondition,
    };
  });
  return {
    states,
    assignedCaseIds,
    agentIds,
    replicateLevels,
    expectedFullMatrixSealedStates,
  };
}

export function analyzeObservations(
  caseSpecs: SyntheticCaseSpec[],
  assignments: ExperimentAssignment[],
  observations: AgentObservation[],
  options: {
    bootstrapReplicates?: number;
    bootstrapSeed?: number;
    designMode?: "FULL_E2" | "REDUCED_DESIGN";
  } = {},
) {
  const caseMap = new Map<string, SyntheticCaseSpec>();
  for (const caseSpec of caseSpecs) {
    validateSyntheticCase(caseSpec);
    if (caseMap.has(caseSpec.caseId)) throw new Error(`duplicate case: ${caseSpec.caseId}`);
    caseMap.set(caseSpec.caseId, caseSpec);
  }
  const bootstrapReplicates = options.bootstrapReplicates ?? 2_000;
  const bootstrapSeed = options.bootstrapSeed ?? 18;
  if (!Number.isInteger(bootstrapReplicates) || bootstrapReplicates < 1) {
    throw new Error("bootstrapReplicates must be a positive integer");
  }
  if (!Number.isInteger(bootstrapSeed) || bootstrapSeed < 0 || bootstrapSeed > 0xffffffff) {
    throw new Error("bootstrapSeed must be a uint32 integer");
  }
  const designMode = options.designMode ?? "FULL_E2";
  const manifest = validateManifestAndBuildStates(caseMap, assignments, observations, designMode);
  const { states } = manifest;
  const plannedConditions = EXPERIMENT_CONDITIONS.filter((condition) =>
    assignments.some((assignment) => assignment.condition === condition),
  );
  const baselineVote = (state: StatePanel) => votedAction(state.baseline);
  const baselineCorrect = (state: StatePanel) => baselineVote(state) === state.caseSpec.scoredReferenceAction;
  const baselineIncorrect = (state: StatePanel) => {
    const action = baselineVote(state);
    return action !== null && action !== state.caseSpec.scoredReferenceAction;
  };
  const hasBaselineVote = (state: StatePanel) => baselineVote(state) !== null;
  const referenceMatch = (row: AgentObservation, state: StatePanel) =>
    votedAction(row.postExposure) === state.caseSpec.scoredReferenceAction ? 1 : 0;
  const wrongActionAdoption = (row: AgentObservation, state: StatePanel) =>
    votedAction(row.postExposure) === state.caseSpec.falseMajorityAction ? 1 : 0;
  const abandonedCorrectBaseline = (row: AgentObservation, state: StatePanel) =>
    votedAction(row.postExposure) === state.caseSpec.scoredReferenceAction ? 0 : 1;
  const changedFromBaseline = (row: AgentObservation, state: StatePanel) =>
    votedAction(row.postExposure) === votedAction(state.baseline) ? 0 : 1;
  const nonVote = (row: AgentObservation) => (row.postExposure.status === "NON_VOTE" ? 1 : 0);

  const conformity = pairedCaseDifferences(
    states,
    "FALSE_MAJORITY",
    "CONTROL",
    baselineCorrect,
    wrongActionAdoption,
  );
  const conformityAbandonment = pairedCaseDifferences(
    states,
    "FALSE_MAJORITY",
    "CONTROL",
    baselineCorrect,
    abandonedCorrectBaseline,
  );
  const evidenceCorrection = pairedCaseDifferences(
    states,
    "VALID_EVIDENCE",
    "CONTROL",
    baselineIncorrect,
    referenceMatch,
  );
  const evidenceStability = pairedCaseDifferences(
    states,
    "VALID_EVIDENCE",
    "CONTROL",
    baselineCorrect,
    referenceMatch,
  );
  const evidenceUnderConflict = pairedCaseDifferences(
    states,
    "EVIDENCE_VS_FALSE_MAJORITY",
    "FALSE_MAJORITY",
    hasBaselineVote,
    referenceMatch,
  );
  const shamChurn = pairedCaseDifferences(
    states,
    "IRRELEVANT_EVIDENCE",
    "CONTROL",
    hasBaselineVote,
    changedFromBaseline,
  );
  const majorityNonVote = pairedCaseDifferences(
    states,
    "FALSE_MAJORITY",
    "CONTROL",
    () => true,
    (row) => nonVote(row),
  );
  const interaction = interactionCaseDifferences(states);
  const estimands: EstimandResult[] = [
    buildEstimand(
      "primary_false_majority_wrong_action_adoption_risk_difference_baseline_correct",
      conformity,
      "Paired unsupported panel-count-cue minus control difference in adopting the prespecified wrong action among sealed-baseline-correct states; post-arm non-votes count as non-adoption.",
      bootstrapReplicates,
      bootstrapSeed,
      true,
    ),
    buildEstimand(
      "sensitivity_false_majority_correct_baseline_abandonment_risk_difference",
      conformityAbandonment,
      "Paired unsupported panel-count-cue minus control difference in abandoning the correct sealed action; a non-vote counts as abandonment.",
      bootstrapReplicates,
      bootstrapSeed + 1,
    ),
    buildEstimand(
      "valid_evidence_reference_action_correction_risk_difference_baseline_incorrect",
      evidenceCorrection,
      "Paired evidence minus control difference in matching the author-defined reference action among sealed-baseline-incorrect states.",
      bootstrapReplicates,
      bootstrapSeed + 2,
    ),
    buildEstimand(
      "valid_evidence_reference_action_stability_risk_difference_baseline_correct",
      evidenceStability,
      "Paired evidence minus control difference in preserving the author-defined reference action among sealed-baseline-correct states.",
      bootstrapReplicates,
      bootstrapSeed + 3,
    ),
    buildEstimand(
      "valid_evidence_effect_under_false_majority_reference_action_risk_difference",
      evidenceUnderConflict,
      "Paired evidence-plus-unsupported-cue minus unsupported-cue-only difference in matching the author-defined reference action.",
      bootstrapReplicates,
      bootstrapSeed + 4,
    ),
    buildEstimand(
      "evidence_by_majority_reference_action_difference_in_differences",
      interaction,
      "Within-sealed-state difference between the evidence effect with and without the unsupported panel-count cue.",
      bootstrapReplicates,
      bootstrapSeed + 5,
    ),
    buildEstimand(
      "irrelevant_evidence_action_churn_risk_difference",
      shamChurn,
      "Paired irrelevant-evidence minus control difference in changing away from the sealed action; a non-vote counts as change.",
      bootstrapReplicates,
      bootstrapSeed + 6,
    ),
    buildEstimand(
      "false_majority_non_vote_risk_difference",
      majorityNonVote,
      "Paired unsupported panel-count-cue minus control difference in post-intervention non-votes.",
      bootstrapReplicates,
      bootstrapSeed + 7,
    ),
  ];
  let majorityOnlyAdopts = 0;
  let controlOnlyAdopts = 0;
  let bothAdopt = 0;
  let neitherAdopts = 0;
  for (const state of states.filter(baselineCorrect)) {
    const majority = state.byCondition.get("FALSE_MAJORITY");
    const control = state.byCondition.get("CONTROL");
    if (!majority || !control) continue;
    const majorityValue = wrongActionAdoption(majority, state);
    const controlValue = wrongActionAdoption(control, state);
    if (majorityValue && controlValue) bothAdopt += 1;
    else if (majorityValue) majorityOnlyAdopts += 1;
    else if (controlValue) controlOnlyAdopts += 1;
    else neitherAdopts += 1;
  }
  return {
    schemaVersion: 2,
    designMode,
    plannedConditions,
    evidenceBoundary:
      "Paired mechanism/harness experiment on author-defined, unsigned synthetic fixtures. The panel manipulation is an explicitly unsupported count cue; it does not establish general social conformity or selective use of trustworthy consensus. This is not clinical validation, clinical safety, patient-outcome evidence, or cost-effectiveness evidence.",
    referenceBoundary:
      "All correctness-like endpoints are action matches to an author-defined reference, not clinician-adjudicated truth.",
    caseFamilyUnit:
      "Each unique synthetic fixture caseId is one case family and the uncertainty resampling unit. Variants of one underlying case must retain a common caseId before confirmatory use.",
    multiplicityRule:
      "One primary estimand. If significance language is used for named secondary tests, apply Holm correction; otherwise treat intervals as exploratory.",
    fixtureCaseFamilyCount: caseSpecs.length,
    assignedCaseFamilyCount: manifest.assignedCaseIds.length,
    assignedCaseFamilyCoverage: {
      n: manifest.assignedCaseIds.length,
      N: caseSpecs.length,
    },
    fullMatrixCoverage: {
      required: designMode === "FULL_E2",
      caseFamilies: manifest.assignedCaseIds.length,
      agentRoles: manifest.agentIds.length,
      replicateLevels: manifest.replicateLevels,
      sealedStates: states.length,
      expectedSealedStates: manifest.expectedFullMatrixSealedStates,
    },
    sealedStateCount: states.length,
    sealedNonVoteStates: states.filter((state) => state.baseline.status === "NON_VOTE").length,
    nonVoteDenominators: {
      baseline: {
        n: states.filter((state) => state.baseline.status === "NON_VOTE").length,
        N: states.length,
      },
      byCondition: Object.fromEntries(
        EXPERIMENT_CONDITIONS.map((condition) => {
          const rows = observations.filter((observation) => observation.condition === condition);
          const planned = assignments.filter((assignment) => assignment.condition === condition);
          return [
            condition,
            {
              n: rows.filter((row) => row.postExposure.status === "NON_VOTE").length,
              N: planned.length,
            },
          ];
        }),
      ),
    },
    executionOrderAudit: {
      verified: true,
      mode: "STRICT_SEQUENTIAL_TIMESTAMPED_CALL_START_ORDER",
      rule:
        "callStartedAt and observedAt record actual call start and observation completion. Unique callStartedAt timestamps sorted ascending must match frozen zero-based executionOrder, and each call must start no earlier than the prior observation's observedAt; tied, concurrent, or batched starts are rejected.",
    },
    plannedAssignmentCount: assignments.length,
    observationCount: observations.length,
    conditionSummaries: EXPERIMENT_CONDITIONS.map((condition) =>
      summarizeCondition(condition, assignments, observations, caseMap),
    ),
    primaryPairedDiscordance: {
      eligibleSealedStates: majorityOnlyAdopts + controlOnlyAdopts + bothAdopt + neitherAdopts,
      majorityOnlyAdopts,
      controlOnlyAdopts,
      bothAdopt,
      neitherAdopts,
    },
    estimands,
    withinRoleRepeatabilityByCondition: Object.fromEntries(
      EXPERIMENT_CONDITIONS.map((condition, index) => [
        condition,
        withinRoleRepeatabilityPanel(
          observations,
          condition,
          bootstrapReplicates,
          (bootstrapSeed + 100 + index) >>> 0,
        ),
      ]),
    ),
    crossRoleConcordanceByCondition: Object.fromEntries(
      EXPERIMENT_CONDITIONS.map((condition, index) => [
        condition,
        crossRoleConcordancePanel(
          observations,
          condition,
          bootstrapReplicates,
          (bootstrapSeed + 200 + index) >>> 0,
        ),
      ]),
    ),
  };
}
