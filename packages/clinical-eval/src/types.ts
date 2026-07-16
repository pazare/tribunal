export const ESCALATION_ACTIONS = [
  "ESCALATE",
  "DO_NOT_ESCALATE",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type EscalationAction = (typeof ESCALATION_ACTIONS)[number];

export const URGENCY_LEVELS = [
  "U0_IMMEDIATE",
  "U1_WITHIN_HOURS",
  "U2_WITHIN_24H",
  "U3_WITHIN_7D",
  "U4_ROUTINE",
  "UNDETERMINED",
] as const;

export type Urgency = (typeof URGENCY_LEVELS)[number];

export const EXPERIMENT_CONDITIONS = [
  "CONTROL",
  "VALID_EVIDENCE",
  "FALSE_MAJORITY",
  "EVIDENCE_VS_FALSE_MAJORITY",
  "IRRELEVANT_EVIDENCE",
] as const;

export type ExperimentCondition = (typeof EXPERIMENT_CONDITIONS)[number];

export const NON_VOTE_REASONS = [
  "PROVIDER_REFUSAL",
  "TIMEOUT",
  "INVALID_SCHEMA",
  "SAFETY_BLOCK",
  "INFRASTRUCTURE_FAILURE",
  "OTHER",
] as const;

export type NonVoteReason = (typeof NON_VOTE_REASONS)[number];

export interface EscalationTuple {
  action: EscalationAction;
  specialties: string[];
  urgency: Urgency;
  missingEvidence: string[];
}

export interface Vote {
  status: "VOTE";
  tuple: EscalationTuple;
  confidence: number;
  evidenceRefs: string[];
  conciseRationale: string;
}

export interface NonVote {
  status: "NON_VOTE";
  reason: NonVoteReason;
  detail?: string;
}

export type VoteResult = Vote | NonVote;

export interface SyntheticCaseSpec {
  caseId: string;
  title: string;
  decisionContext: {
    ownerRole: string;
    originatingSetting: string;
    availableCapabilities: string[];
    decisionHorizon: string;
    escalationMeaning: string;
  };
  baselineFacts: string[];
  scoredReferenceAction: EscalationAction;
  illustrativeReferenceTuple: EscalationTuple;
  falseMajorityAction: EscalationAction;
  validEvidence: {
    evidenceId: string;
    text: string;
    expectedDirection: string;
    sourceClass: "SYNTHETIC_PLANTED_FACT";
  };
  irrelevantEvidence: {
    evidenceId: string;
    text: string;
    expectedDirection: "NO_CHANGE";
    sourceClass: "SYNTHETIC_SHAM_FACT";
  };
  fixtureBoundary: "AUTHOR_DEFINED_MECHANISM_FIXTURE_NOT_CLINICIAN_VALIDATED";
  referenceLabelStatus: "AUTHOR_DEFINED_NOT_CLINICIAN_SIGNED";
  referenceClass: "FIXED_PLANTED_ACTION_UNDER_ALL_E2_ARMS";
}

export interface ExperimentAssignment {
  assignmentId: string;
  sealedStateId: string;
  caseId: string;
  agentId: string;
  condition: ExperimentCondition;
  replicate: number;
  seed: number;
  executionOrder: number;
  promptTemplateVersion: string;
  requiredSessionIsolation: true;
}

export interface AgentObservation {
  assignmentId: string;
  sealedStateId: string;
  caseId: string;
  condition: ExperimentCondition;
  replicate: number;
  agentId: string;
  provider: string;
  model: string;
  effort: string;
  baselineSessionId: string;
  revisionSessionId: string;
  promptTemplateVersion: string;
  baselinePromptHash: string;
  revisionPromptHash: string;
  systemPromptHash: string;
  toolConfigurationHash: string;
  retrievalCorpusHash: string | null;
  temperature: number | null;
  retrievalMode: "DISABLED" | "FROZEN_RECORDED_CORPUS";
  baseline: VoteResult;
  postExposure: VoteResult;
  callStartedAt: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  observedAt: string;
}

export interface ConditionPayload {
  nullUpdate?: true;
  relevantEvidence?: SyntheticCaseSpec["validEvidence"];
  irrelevantEvidence?: SyntheticCaseSpec["irrelevantEvidence"];
  claimedMajority?: {
    action: EscalationAction;
    count: 3;
    panelSize: 4;
    rationaleShown: false;
  };
}

export interface BootstrapInterval {
  lower: number | null;
  upper: number | null;
  confidence: 0.95;
  requestedReplicates: number;
  validReplicates: number;
  skippedReplicates: number;
  seed: number;
  resamplingUnit: "case";
}

export interface EstimandResult {
  name: string;
  estimate: number | null;
  eligibility: {
    eligibleCaseFamilies: { n: number; N: number };
    eligibleSealedStates: { n: number; N: number };
    pairedSealedStates: { n: number; N: number };
  };
  interval?: BootstrapInterval;
  numerator?: number;
  denominator?: number;
  interpretation: string;
  caseDifferences?: Array<{ caseId: string; difference: number; contributingStates: number }>;
  inference?: {
    method:
      | "EXACT_PAIRED_SYMMETRY_SIGN_FLIP"
      | "PAIRED_SYMMETRY_SIGN_FLIP_NOT_COMPUTED_LIMIT";
    assumption: string;
    pValue: number | null;
    cases: number;
    permutations: number;
    notComputedReason?: string;
  };
}
