import { renderBaselinePrompt, renderRevisionPrompt } from "./design.js";
import { hashJson, sha256 } from "./provenance.js";
import type {
  AgentObservation,
  EscalationAction,
  EscalationTuple,
  ExperimentAssignment,
  SyntheticCaseSpec,
  Vote,
  VoteResult,
} from "./types.js";

export const PROGRAMMED_POLICIES = [
  "ALWAYS_CONFORM",
  "EVIDENCE_FOLLOWER",
  "FROZEN",
  "ALWAYS_REFUSE",
  "MAJORITY_ONLY_REFUSE",
  "SHAM_CHURN",
] as const;

export type ProgrammedPolicy = (typeof PROGRAMMED_POLICIES)[number];

function wrongTuple(action: EscalationAction): EscalationTuple {
  switch (action) {
    case "ESCALATE":
      return {
        action,
        specialties: ["EMERGENCY_MEDICINE"],
        urgency: "U1_WITHIN_HOURS",
        missingEvidence: [],
      };
    case "DO_NOT_ESCALATE":
      return {
        action,
        specialties: [],
        urgency: "UNDETERMINED",
        missingEvidence: [],
      };
    case "INSUFFICIENT_EVIDENCE":
      return {
        action,
        specialties: [],
        urgency: "UNDETERMINED",
        missingEvidence: ["OTHER"],
      };
  }
}

function vote(
  tuple: EscalationTuple,
  evidenceRefs: string[],
  conciseRationale: string,
  confidence = 0.8,
): Vote {
  return {
    status: "VOTE",
    tuple,
    confidence,
    evidenceRefs,
    conciseRationale,
  };
}

function baselineFor(caseSpec: SyntheticCaseSpec, policy: ProgrammedPolicy): VoteResult {
  if (policy === "ALWAYS_REFUSE") {
    return { status: "NON_VOTE", reason: "PROVIDER_REFUSAL", detail: "programmed baseline refusal" };
  }
  if (policy === "EVIDENCE_FOLLOWER") {
    return vote(wrongTuple(caseSpec.falseMajorityAction), ["B1"], "Programmed incorrect sealed action.", 0.6);
  }
  return vote(caseSpec.illustrativeReferenceTuple, ["B1"], "Programmed planted-action sealed vote.");
}

function postFor(
  caseSpec: SyntheticCaseSpec,
  assignment: ExperimentAssignment,
  policy: ProgrammedPolicy,
  baseline: VoteResult,
): VoteResult {
  if (policy === "ALWAYS_REFUSE") {
    return { status: "NON_VOTE", reason: "PROVIDER_REFUSAL", detail: "programmed revision refusal" };
  }
  if (
    policy === "MAJORITY_ONLY_REFUSE" &&
    (assignment.condition === "FALSE_MAJORITY" || assignment.condition === "EVIDENCE_VS_FALSE_MAJORITY")
  ) {
    return {
      status: "NON_VOTE",
      reason: "PROVIDER_REFUSAL",
      detail: "programmed refusal after panel-count cue",
    };
  }
  if (policy === "SHAM_CHURN" && assignment.condition === "IRRELEVANT_EVIDENCE") {
    return vote(
      wrongTuple(caseSpec.falseMajorityAction),
      ["B1", caseSpec.irrelevantEvidence.evidenceId],
      "Programmed action churn after sham evidence.",
      0.8,
    );
  }
  if (policy === "FROZEN") return structuredClone(baseline);
  const hasEvidence =
    assignment.condition === "VALID_EVIDENCE" ||
    assignment.condition === "EVIDENCE_VS_FALSE_MAJORITY";
  const hasMajority =
    assignment.condition === "FALSE_MAJORITY" ||
    assignment.condition === "EVIDENCE_VS_FALSE_MAJORITY";
  if (policy === "ALWAYS_CONFORM" && hasMajority) {
    return vote(wrongTuple(caseSpec.falseMajorityAction), ["B1"], "Programmed adoption of panel action.", 0.9);
  }
  if (policy === "EVIDENCE_FOLLOWER" && hasEvidence) {
    return vote(
      caseSpec.illustrativeReferenceTuple,
      ["B1", caseSpec.validEvidence.evidenceId],
      "Programmed adoption of planted evidence action.",
      0.9,
    );
  }
  return structuredClone(baseline);
}

export function simulateProgrammedObservations(
  cases: SyntheticCaseSpec[],
  assignments: ExperimentAssignment[],
  policies: Record<string, ProgrammedPolicy>,
): AgentObservation[] {
  const caseMap = new Map(cases.map((caseSpec) => [caseSpec.caseId, caseSpec]));
  const baselines = new Map<string, VoteResult>();
  for (const assignment of assignments) {
    const caseSpec = caseMap.get(assignment.caseId);
    if (!caseSpec) throw new Error(`unknown case in assignment: ${assignment.caseId}`);
    const policy = policies[assignment.agentId];
    if (!policy) throw new Error(`missing programmed policy for ${assignment.agentId}`);
    if (!baselines.has(assignment.sealedStateId)) {
      baselines.set(assignment.sealedStateId, baselineFor(caseSpec, policy));
    }
  }
  const systemPromptHash = sha256("");
  const toolConfigurationHash = hashJson([]);
  const startEpochMs = Date.parse("2026-07-16T00:00:00.000Z");
  return assignments.map((assignment, actualCallStartOrder) => {
    const caseSpec = caseMap.get(assignment.caseId) as SyntheticCaseSpec;
    const policy = policies[assignment.agentId];
    const sealedBaseline = baselines.get(assignment.sealedStateId) as VoteResult;
    const baseline = structuredClone(sealedBaseline);
    const postExposure = postFor(caseSpec, assignment, policy, sealedBaseline);
    const callStartedAt = new Date(startEpochMs + actualCallStartOrder).toISOString();
    return {
      assignmentId: assignment.assignmentId,
      sealedStateId: assignment.sealedStateId,
      caseId: assignment.caseId,
      condition: assignment.condition,
      replicate: assignment.replicate,
      agentId: assignment.agentId,
      provider: "SCRIPTED_OFFLINE_PROVIDER",
      model: `programmed-${policy.toLowerCase().replaceAll("_", "-")}`,
      effort: "not_applicable",
      baselineSessionId: `baseline_${assignment.sealedStateId}`,
      revisionSessionId: `revision_${assignment.assignmentId}`,
      promptTemplateVersion: assignment.promptTemplateVersion,
      baselinePromptHash: sha256(renderBaselinePrompt(caseSpec)),
      revisionPromptHash: sha256(renderRevisionPrompt(caseSpec, baseline, assignment.condition)),
      systemPromptHash,
      toolConfigurationHash,
      retrievalCorpusHash: null,
      temperature: 0,
      retrievalMode: "DISABLED",
      baseline,
      postExposure,
      callStartedAt,
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      observedAt: callStartedAt,
    };
  });
}
