import {
  ESCALATION_ACTIONS,
  EXPERIMENT_CONDITIONS,
  NON_VOTE_REASONS,
  URGENCY_LEVELS,
  type AgentObservation,
  type ExperimentAssignment,
  type SyntheticCaseSpec,
  type VoteResult,
} from "./types.js";
import { MISSING_EVIDENCE_CODES, SPECIALTY_CODES } from "./codebooks.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertExactObjectKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} contains unexpected keys: ${unexpected.sort().join(", ")}`);
  }
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function assertFiniteUnitInterval(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a finite number in [0, 1]`);
  }
}

export function validateVoteResult(value: unknown, label = "vote"): asserts value is VoteResult {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  if (value.status === "NON_VOTE") {
    assertExactObjectKeys(value, ["status", "reason", "detail"], label);
    if (!NON_VOTE_REASONS.includes(value.reason as never)) {
      throw new Error(`${label}.reason is not a supported non-vote reason`);
    }
    if (value.detail !== undefined && typeof value.detail !== "string") {
      throw new Error(`${label}.detail must be a string when present`);
    }
    return;
  }
  if (value.status !== "VOTE" || !isRecord(value.tuple)) {
    throw new Error(`${label} must be a VOTE or NON_VOTE`);
  }
  assertExactObjectKeys(
    value,
    ["status", "tuple", "confidence", "evidenceRefs", "conciseRationale"],
    label,
  );
  assertExactObjectKeys(
    value.tuple,
    ["action", "specialties", "urgency", "missingEvidence"],
    `${label}.tuple`,
  );
  if (!ESCALATION_ACTIONS.includes(value.tuple.action as never)) {
    throw new Error(`${label}.tuple.action is invalid`);
  }
  if (!URGENCY_LEVELS.includes(value.tuple.urgency as never)) {
    throw new Error(`${label}.tuple.urgency is invalid`);
  }
  if (!isStringArray(value.tuple.specialties) || !isStringArray(value.tuple.missingEvidence)) {
    throw new Error(`${label}.tuple specialties and missingEvidence must be string arrays`);
  }
  if (value.tuple.specialties.some((code) => !SPECIALTY_CODES.includes(code as never))) {
    throw new Error(`${label}.tuple.specialties contains an unsupported code`);
  }
  if (new Set(value.tuple.specialties).size !== value.tuple.specialties.length) {
    throw new Error(`${label}.tuple.specialties must be unique`);
  }
  if (value.tuple.missingEvidence.some((code) => !MISSING_EVIDENCE_CODES.includes(code as never))) {
    throw new Error(`${label}.tuple.missingEvidence contains an unsupported code`);
  }
  if (new Set(value.tuple.missingEvidence).size !== value.tuple.missingEvidence.length) {
    throw new Error(`${label}.tuple.missingEvidence must be unique`);
  }
  if (
    value.tuple.action === "INSUFFICIENT_EVIDENCE" &&
    (
      value.tuple.specialties.length !== 0 ||
      value.tuple.urgency !== "UNDETERMINED" ||
      value.tuple.missingEvidence.length === 0
    )
  ) {
    throw new Error(
      `${label}: insufficient evidence requires empty specialties, UNDETERMINED urgency, and named missing evidence`,
    );
  }
  if (
    value.tuple.action === "DO_NOT_ESCALATE" &&
    (value.tuple.specialties.length !== 0 || value.tuple.urgency !== "UNDETERMINED")
  ) {
    throw new Error(`${label}: do not escalate requires empty specialties and UNDETERMINED urgency`);
  }
  if (
    value.tuple.action === "ESCALATE" &&
    (value.tuple.specialties.length === 0 || value.tuple.urgency === "UNDETERMINED")
  ) {
    throw new Error(`${label}: escalation requires a specialty and determined urgency`);
  }
  assertFiniteUnitInterval(value.confidence, `${label}.confidence`);
  if (!isStringArray(value.evidenceRefs) || typeof value.conciseRationale !== "string") {
    throw new Error(`${label} evidenceRefs/rationale are invalid`);
  }
  if (new Set(value.evidenceRefs).size !== value.evidenceRefs.length) {
    throw new Error(`${label}.evidenceRefs must be unique`);
  }
  if (wordCount(value.conciseRationale) > 60) {
    throw new Error(`${label}.conciseRationale exceeds 60 words`);
  }
}

export function validateObservation(value: unknown): asserts value is AgentObservation {
  if (!isRecord(value)) throw new Error("observation must be an object");
  assertExactObjectKeys(
    value,
    [
      "assignmentId",
      "sealedStateId",
      "caseId",
      "condition",
      "replicate",
      "agentId",
      "provider",
      "model",
      "effort",
      "baselineSessionId",
      "revisionSessionId",
      "promptTemplateVersion",
      "baselinePromptHash",
      "revisionPromptHash",
      "systemPromptHash",
      "toolConfigurationHash",
      "retrievalCorpusHash",
      "temperature",
      "retrievalMode",
      "baseline",
      "postExposure",
      "callStartedAt",
      "latencyMs",
      "inputTokens",
      "outputTokens",
      "observedAt",
    ],
    "observation",
  );
  for (const key of [
    "assignmentId",
    "sealedStateId",
    "caseId",
    "agentId",
    "provider",
    "model",
    "effort",
    "baselineSessionId",
    "revisionSessionId",
    "promptTemplateVersion",
    "baselinePromptHash",
    "revisionPromptHash",
    "systemPromptHash",
    "toolConfigurationHash",
    "callStartedAt",
    "observedAt",
  ]) {
    if (typeof value[key] !== "string" || value[key] === "") {
      throw new Error(`observation.${key} must be a non-empty string`);
    }
  }
  if (!EXPERIMENT_CONDITIONS.includes(value.condition as never)) {
    throw new Error("observation.condition is invalid");
  }
  if (!Number.isInteger(value.replicate) || (value.replicate as number) < 0) {
    throw new Error("observation.replicate must be a non-negative integer");
  }
  if (typeof value.latencyMs !== "number" || !Number.isFinite(value.latencyMs) || value.latencyMs < 0) {
    throw new Error("observation.latencyMs must be finite and non-negative");
  }
  for (const key of ["baselinePromptHash", "revisionPromptHash", "systemPromptHash", "toolConfigurationHash"]) {
    if (!/^[a-f0-9]{64}$/u.test(value[key] as string)) {
      throw new Error(`observation.${key} must be a lowercase SHA-256 hash`);
    }
  }
  if (
    value.temperature !== null &&
    (typeof value.temperature !== "number" || !Number.isFinite(value.temperature))
  ) {
    throw new Error("observation.temperature must be finite or null");
  }
  if (value.retrievalMode !== "DISABLED" && value.retrievalMode !== "FROZEN_RECORDED_CORPUS") {
    throw new Error("observation.retrievalMode is invalid");
  }
  if (value.retrievalMode === "DISABLED" && value.retrievalCorpusHash !== null) {
    throw new Error("disabled retrieval requires a null retrievalCorpusHash");
  }
  if (
    value.retrievalMode === "FROZEN_RECORDED_CORPUS" &&
    (typeof value.retrievalCorpusHash !== "string" || !/^[a-f0-9]{64}$/u.test(value.retrievalCorpusHash))
  ) {
    throw new Error("frozen retrieval requires a SHA-256 retrievalCorpusHash");
  }
  for (const key of ["inputTokens", "outputTokens"] as const) {
    if (value[key] !== undefined && (!Number.isInteger(value[key]) || (value[key] as number) < 0)) {
      throw new Error(`observation.${key} must be a non-negative integer when present`);
    }
  }
  const callStartedAt = Date.parse(value.callStartedAt as string);
  const observedAt = Date.parse(value.observedAt as string);
  if (Number.isNaN(callStartedAt)) {
    throw new Error("observation.callStartedAt must be a parseable timestamp");
  }
  if (Number.isNaN(observedAt)) {
    throw new Error("observation.observedAt must be a parseable timestamp");
  }
  if (observedAt < callStartedAt) {
    throw new Error("observation.observedAt must not precede callStartedAt");
  }
  validateVoteResult(value.baseline, "observation.baseline");
  validateVoteResult(value.postExposure, "observation.postExposure");
}

export function validateAssignment(value: unknown): asserts value is ExperimentAssignment {
  if (!isRecord(value)) throw new Error("assignment must be an object");
  assertExactObjectKeys(
    value,
    [
      "assignmentId",
      "sealedStateId",
      "caseId",
      "agentId",
      "condition",
      "replicate",
      "seed",
      "executionOrder",
      "promptTemplateVersion",
      "requiredSessionIsolation",
    ],
    "assignment",
  );
  for (const key of ["assignmentId", "sealedStateId", "caseId", "agentId", "promptTemplateVersion"]) {
    if (typeof value[key] !== "string" || value[key] === "") {
      throw new Error(`assignment.${key} must be a non-empty string`);
    }
  }
  if (!EXPERIMENT_CONDITIONS.includes(value.condition as never)) {
    throw new Error("assignment.condition is invalid");
  }
  for (const key of ["replicate", "seed", "executionOrder"]) {
    if (!Number.isInteger(value[key]) || (value[key] as number) < 0) {
      throw new Error(`assignment.${key} must be a non-negative integer`);
    }
  }
  if (value.requiredSessionIsolation !== true) {
    throw new Error("assignment.requiredSessionIsolation must be true");
  }
}

export function validateSyntheticCase(value: unknown): asserts value is SyntheticCaseSpec {
  if (!isRecord(value)) throw new Error("case must be an object");
  assertExactObjectKeys(
    value,
    [
      "caseId",
      "title",
      "decisionContext",
      "baselineFacts",
      "scoredReferenceAction",
      "illustrativeReferenceTuple",
      "falseMajorityAction",
      "validEvidence",
      "irrelevantEvidence",
      "fixtureBoundary",
      "referenceLabelStatus",
      "referenceClass",
    ],
    "case",
  );
  if (typeof value.caseId !== "string" || value.caseId === "" || typeof value.title !== "string" || value.title === "") {
    throw new Error("case id/title must be non-empty strings");
  }
  if (!isRecord(value.decisionContext)) throw new Error(`${value.caseId}: decisionContext is required`);
  assertExactObjectKeys(
    value.decisionContext,
    ["ownerRole", "originatingSetting", "availableCapabilities", "decisionHorizon", "escalationMeaning"],
    `${value.caseId}.decisionContext`,
  );
  for (const key of ["ownerRole", "originatingSetting", "decisionHorizon", "escalationMeaning"]) {
    if (typeof value.decisionContext[key] !== "string" || value.decisionContext[key] === "") {
      throw new Error(`${value.caseId}: decisionContext.${key} must be a non-empty string`);
    }
  }
  if (
    !isStringArray(value.decisionContext.availableCapabilities) ||
    value.decisionContext.availableCapabilities.length === 0 ||
    value.decisionContext.availableCapabilities.some((item) => item.trim() === "")
  ) {
    throw new Error(`${value.caseId}: availableCapabilities must contain non-empty entries`);
  }
  if (!isStringArray(value.baselineFacts) || value.baselineFacts.length === 0) {
    throw new Error(`${value.caseId}: baselineFacts must be a non-empty string array`);
  }
  if (value.baselineFacts.some((fact) => fact.trim() === "")) {
    throw new Error(`${value.caseId}: baselineFacts must not contain empty facts`);
  }
  if (!ESCALATION_ACTIONS.includes(value.scoredReferenceAction as never)) {
    throw new Error(`${value.caseId}: scoredReferenceAction is invalid`);
  }
  if (!isRecord(value.illustrativeReferenceTuple)) {
    throw new Error(`${value.caseId}: illustrative reference tuple missing`);
  }
  validateVoteResult(
    {
      status: "VOTE",
      tuple: value.illustrativeReferenceTuple,
      confidence: 0.5,
      evidenceRefs: [],
      conciseRationale: "fixture validation",
    },
    `${value.caseId}.illustrativeReferenceTuple`,
  );
  if ((value.illustrativeReferenceTuple as Record<string, unknown>).action !== value.scoredReferenceAction) {
    throw new Error(`${value.caseId}: illustrative tuple action must match scoredReferenceAction`);
  }
  if (!ESCALATION_ACTIONS.includes(value.falseMajorityAction as never)) {
    throw new Error(`${value.caseId}: invalid falseMajorityAction`);
  }
  if (value.falseMajorityAction === value.scoredReferenceAction) {
    throw new Error(`${value.caseId}: false majority must disagree with expected action`);
  }
  if (!isRecord(value.validEvidence) || !isRecord(value.irrelevantEvidence)) {
    throw new Error(`${value.caseId}: evidence payloads are required`);
  }
  assertExactObjectKeys(
    value.validEvidence,
    ["evidenceId", "text", "expectedDirection", "sourceClass"],
    `${value.caseId}.validEvidence`,
  );
  assertExactObjectKeys(
    value.irrelevantEvidence,
    ["evidenceId", "text", "expectedDirection", "sourceClass"],
    `${value.caseId}.irrelevantEvidence`,
  );
  if (
    typeof value.validEvidence.text !== "string" || value.validEvidence.text === "" ||
    typeof value.validEvidence.evidenceId !== "string" || value.validEvidence.evidenceId === "" ||
    typeof value.irrelevantEvidence.text !== "string" || value.irrelevantEvidence.text === "" ||
    typeof value.irrelevantEvidence.evidenceId !== "string" || value.irrelevantEvidence.evidenceId === ""
  ) {
    throw new Error(`${value.caseId}: evidence payloads are malformed`);
  }
  if (
    value.validEvidence.sourceClass !== "SYNTHETIC_PLANTED_FACT" ||
    typeof value.validEvidence.expectedDirection !== "string" ||
    value.validEvidence.expectedDirection === ""
  ) {
    throw new Error(`${value.caseId}: valid-evidence provenance/direction is malformed`);
  }
  if (value.validEvidence.expectedDirection !== `SUPPORT_${value.scoredReferenceAction}`) {
    throw new Error(`${value.caseId}: valid evidence direction must match the scored reference action`);
  }
  if (
    value.irrelevantEvidence.sourceClass !== "SYNTHETIC_SHAM_FACT" ||
    value.irrelevantEvidence.expectedDirection !== "NO_CHANGE"
  ) {
    throw new Error(`${value.caseId}: irrelevant-evidence provenance/direction is malformed`);
  }
  if (value.validEvidence.evidenceId === value.irrelevantEvidence.evidenceId) {
    throw new Error(`${value.caseId}: evidence ids must differ`);
  }
  if (/^B\d+$/u.test(value.validEvidence.evidenceId as string) || /^B\d+$/u.test(value.irrelevantEvidence.evidenceId as string)) {
    throw new Error(`${value.caseId}: evidence ids must not collide with reserved baseline ids`);
  }
  const relevantWords = wordCount(value.validEvidence.text as string);
  const irrelevantWords = wordCount(value.irrelevantEvidence.text as string);
  if (relevantWords === 0 || Math.abs(relevantWords - irrelevantWords) / relevantWords > 0.1) {
    throw new Error(`${value.caseId}: relevant and irrelevant evidence must match length within 10 percent`);
  }
  if (value.fixtureBoundary !== "AUTHOR_DEFINED_MECHANISM_FIXTURE_NOT_CLINICIAN_VALIDATED") {
    throw new Error(`${value.caseId}: fixture boundary must be explicit`);
  }
  if (value.referenceLabelStatus !== "AUTHOR_DEFINED_NOT_CLINICIAN_SIGNED") {
    throw new Error(`${value.caseId}: unsigned reference-label status must be explicit`);
  }
  if (value.referenceClass !== "FIXED_PLANTED_ACTION_UNDER_ALL_E2_ARMS") {
    throw new Error(`${value.caseId}: E2 fixed-action reference class must be explicit`);
  }
}
