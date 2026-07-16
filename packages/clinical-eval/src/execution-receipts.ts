import { canonicalJson, hashJson } from "./provenance.js";
import {
  EXPERIMENT_CONDITIONS,
  type ExperimentAssignment,
  type ExperimentCondition,
} from "./types.js";
import { assertExactObjectKeys } from "./validate.js";

export const PRE_CALL_MANIFEST_SCHEMA_VERSION = 1;
export const PROVIDER_CALL_RECEIPT_SCHEMA_VERSION = 1;
export const EXTERNAL_ANCHOR_RECEIPT_SCHEMA_VERSION = 1;

export type ProviderCallPhase = "BASELINE" | "REVISION";

export interface RequestedProviderConfiguration {
  provider: string;
  model: string;
  effort: string;
  systemPromptSha256: string;
  toolConfigurationSha256: string;
  retrievalMode: "DISABLED" | "FROZEN_RECORDED_CORPUS";
  retrievalCorpusSha256: string | null;
  temperature: number | null;
}

export interface ExpectedProviderCall {
  expectedCallId: string;
  executionOrder: number;
  phase: ProviderCallPhase;
  assignmentId: string | null;
  sealedStateId: string;
  caseId: string;
  agentId: string;
  replicate: number;
  condition: ExperimentCondition | null;
  promptSha256: string;
  inputSha256: string;
  requested: RequestedProviderConfiguration;
}

export interface PreCallManifestBody {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  protocolVersion: string;
  codebookVersion: string;
  promptTemplateVersion: string;
  datasetSha256: string;
  assignmentSha256: string;
  caseIds: string[];
  agentIds: string[];
  replicateLevels: number[];
  conditions: ExperimentCondition[];
  providerConfigurationSha256: string;
  expectedCalls: ExpectedProviderCall[];
  safetyPacketSchemaVersion: string | null;
  safetyPacketTemplateSha256: string | null;
  safetyContextArtifactSha256: string | null;
  claimBoundary: string;
}

export interface PreCallManifest extends PreCallManifestBody {
  manifestSha256: string;
}

export interface ProviderCallReceiptBody {
  schemaVersion: 1;
  runId: string;
  expectedCallId: string;
  phase: ProviderCallPhase;
  assignmentId: string | null;
  sealedStateId: string;
  requested: RequestedProviderConfiguration;
  served: {
    provider: string;
    model: string;
    effort: string;
  };
  providerCallId: string;
  providerSessionId: string;
  promptSha256: string;
  inputSha256: string;
  outputSha256: string;
  callStartedAt: string;
  callCompletedAt: string;
  bundledAt: string;
  providerEvidenceBoundary: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    transportRetries: number;
    estimatedCostUsd: number | null;
  };
}

export interface ProviderCallReceipt extends ProviderCallReceiptBody {
  callReceiptSha256: string;
}

export interface ExternalAnchorReceiptBody {
  schemaVersion: 1;
  service: string;
  anchorId: string;
  targetSha256: string;
  anchoredAt: string;
  verifiedAt: string;
  verificationMethod:
    | "PUBLIC_GIT_REMOTE_LOOKUP"
    | "RFC3161_SIGNATURE_VALIDATION"
    | "TRANSPARENCY_LOG_LOOKUP";
  verifier: string;
  evidenceBoundary: string;
}

export interface ExternalAnchorReceipt extends ExternalAnchorReceiptBody {
  anchorReceiptSha256: string;
}

export const PRE_CALL_MANIFEST_CLAIM_BOUNDARY =
  "This manifest is a locally hash-addressed declaration. Its hash and local timestamps alone do not establish preregistration, independent time, or tamper evidence; those claims require a separately verified external anchor created before calls began.";
export const EXTERNAL_ANCHOR_EVIDENCE_BOUNDARY =
  "This record binds a verifier-reported external anchor lookup or signature validation to a target hash. The local bundle verifier checks this record's schema, hash, target, and timestamp ordering but does not itself contact the external service; retain the service-verifiable proof for independent audit.";
export const PROVIDER_CALL_EVIDENCE_BOUNDARY =
  "Provider, model, effort, call ID, and session ID are recorded provider-reported fields bound for internal consistency. This local receipt does not authenticate provider issuance or model identity; that requires separately verified provider-signed or provider-hosted evidence.";

const SHA256 = /^[a-f0-9]{64}$/u;

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function assertSha(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !SHA256.test(value)) throw new Error(`${label} must be a lowercase SHA-256 hash`);
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
}

function assertTimestamp(value: unknown, label: string): asserts value is string {
  assertNonEmpty(value, label);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a parseable timestamp`);
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative integer`);
}

export function buildPreCallManifest(body: PreCallManifestBody): PreCallManifest {
  validatePreCallManifestBody(body);
  return { ...body, manifestSha256: hashJson(body) };
}

export function buildProviderCallReceipt(body: ProviderCallReceiptBody): ProviderCallReceipt {
  validateProviderCallReceiptBody(body);
  return { ...body, callReceiptSha256: hashJson(body) };
}

export function buildExternalAnchorReceipt(body: ExternalAnchorReceiptBody): ExternalAnchorReceipt {
  validateExternalAnchorReceiptBody(body);
  return { ...body, anchorReceiptSha256: hashJson(body) };
}

export function expectedBaselineCallId(sealedStateId: string): string {
  return `BASELINE:${sealedStateId}`;
}

export function expectedRevisionCallId(assignmentId: string): string {
  return `REVISION:${assignmentId}`;
}

export function expectedCallMatrixFromAssignments(
  assignments: ExperimentAssignment[],
  promptInputs: Map<string, {
    baselinePromptSha256: string;
    baselineInputSha256: string;
    revisionPromptSha256: string;
    revisionInputSha256: string;
    requested: RequestedProviderConfiguration;
  }>,
): ExpectedProviderCall[] {
  const byState = new Map<string, ExperimentAssignment>();
  for (const assignment of assignments) {
    if (!byState.has(assignment.sealedStateId)) byState.set(assignment.sealedStateId, assignment);
  }
  const baseline = [...byState.values()].sort((a, b) => a.sealedStateId.localeCompare(b.sealedStateId)).map((assignment, executionOrder) => {
    const input = promptInputs.get(assignment.assignmentId);
    if (!input) throw new Error(`missing expected prompt/config input for ${assignment.assignmentId}`);
    return {
      expectedCallId: expectedBaselineCallId(assignment.sealedStateId),
      executionOrder,
      phase: "BASELINE" as const,
      assignmentId: null,
      sealedStateId: assignment.sealedStateId,
      caseId: assignment.caseId,
      agentId: assignment.agentId,
      replicate: assignment.replicate,
      condition: null,
      promptSha256: input.baselinePromptSha256,
      inputSha256: input.baselineInputSha256,
      requested: input.requested,
    };
  });
  const revision = [...assignments].sort((a, b) => a.executionOrder - b.executionOrder).map((assignment, index) => {
    const input = promptInputs.get(assignment.assignmentId);
    if (!input) throw new Error(`missing expected prompt/config input for ${assignment.assignmentId}`);
    return {
      expectedCallId: expectedRevisionCallId(assignment.assignmentId),
      executionOrder: baseline.length + index,
      phase: "REVISION" as const,
      assignmentId: assignment.assignmentId,
      sealedStateId: assignment.sealedStateId,
      caseId: assignment.caseId,
      agentId: assignment.agentId,
      replicate: assignment.replicate,
      condition: assignment.condition,
      promptSha256: input.revisionPromptSha256,
      inputSha256: input.revisionInputSha256,
      requested: input.requested,
    };
  });
  return [...baseline, ...revision];
}

function validateRequestedConfiguration(value: unknown, label: string): asserts value is RequestedProviderConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const config = value as Record<string, unknown>;
  assertExactObjectKeys(config, [
    "provider", "model", "effort", "systemPromptSha256", "toolConfigurationSha256",
    "retrievalMode", "retrievalCorpusSha256", "temperature",
  ], label);
  for (const key of ["provider", "model", "effort"] as const) assertNonEmpty(config[key], `${label}.${key}`);
  assertSha(config.systemPromptSha256, `${label}.systemPromptSha256`);
  assertSha(config.toolConfigurationSha256, `${label}.toolConfigurationSha256`);
  if (config.retrievalMode !== "DISABLED" && config.retrievalMode !== "FROZEN_RECORDED_CORPUS") {
    throw new Error(`${label}.retrievalMode is invalid`);
  }
  if (config.retrievalCorpusSha256 !== null) assertSha(config.retrievalCorpusSha256, `${label}.retrievalCorpusSha256`);
  if (config.temperature !== null && (typeof config.temperature !== "number" || !Number.isFinite(config.temperature))) {
    throw new Error(`${label}.temperature must be null or finite`);
  }
}

function validateExpectedCall(value: unknown, label: string): asserts value is ExpectedProviderCall {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const call = value as Record<string, unknown>;
  assertExactObjectKeys(call, [
    "expectedCallId", "executionOrder", "phase", "assignmentId", "sealedStateId", "caseId", "agentId", "replicate",
    "condition", "promptSha256", "inputSha256", "requested",
  ], label);
  for (const key of ["expectedCallId", "sealedStateId", "caseId", "agentId"] as const) assertNonEmpty(call[key], `${label}.${key}`);
  assertNonNegativeInteger(call.executionOrder, `${label}.executionOrder`);
  if (call.phase !== "BASELINE" && call.phase !== "REVISION") throw new Error(`${label}.phase is invalid`);
  if (call.phase === "BASELINE") {
    if (call.assignmentId !== null || call.condition !== null) throw new Error(`${label} baseline must have null assignmentId and condition`);
    if (call.expectedCallId !== expectedBaselineCallId(call.sealedStateId as string)) throw new Error(`${label}.expectedCallId mismatch`);
  } else {
    assertNonEmpty(call.assignmentId, `${label}.assignmentId`);
    if (!EXPERIMENT_CONDITIONS.includes(call.condition as ExperimentCondition)) throw new Error(`${label}.condition is invalid`);
    if (call.expectedCallId !== expectedRevisionCallId(call.assignmentId)) throw new Error(`${label}.expectedCallId mismatch`);
  }
  assertNonNegativeInteger(call.replicate, `${label}.replicate`);
  assertSha(call.promptSha256, `${label}.promptSha256`);
  assertSha(call.inputSha256, `${label}.inputSha256`);
  validateRequestedConfiguration(call.requested, `${label}.requested`);
}

export function validatePreCallManifestBody(value: unknown): asserts value is PreCallManifestBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("preCallManifest body must be an object");
  const manifest = value as Record<string, unknown>;
  assertExactObjectKeys(manifest, [
    "schemaVersion", "runId", "createdAt", "protocolVersion", "codebookVersion", "promptTemplateVersion",
    "datasetSha256", "assignmentSha256", "caseIds", "agentIds", "replicateLevels", "conditions",
    "providerConfigurationSha256", "expectedCalls", "safetyPacketSchemaVersion", "safetyPacketTemplateSha256",
    "safetyContextArtifactSha256",
    "claimBoundary",
  ], "preCallManifest");
  if (manifest.schemaVersion !== PRE_CALL_MANIFEST_SCHEMA_VERSION) throw new Error("preCallManifest.schemaVersion is unsupported");
  for (const key of ["runId", "protocolVersion", "codebookVersion", "promptTemplateVersion"] as const) {
    assertNonEmpty(manifest[key], `preCallManifest.${key}`);
  }
  assertTimestamp(manifest.createdAt, "preCallManifest.createdAt");
  for (const key of ["datasetSha256", "assignmentSha256", "providerConfigurationSha256"] as const) {
    assertSha(manifest[key], `preCallManifest.${key}`);
  }
  if (manifest.safetyPacketSchemaVersion !== null) {
    assertNonEmpty(manifest.safetyPacketSchemaVersion, "preCallManifest.safetyPacketSchemaVersion");
  }
  for (const key of ["safetyPacketTemplateSha256", "safetyContextArtifactSha256"] as const) {
    if (manifest[key] !== null) assertSha(manifest[key], `preCallManifest.${key}`);
  }
  if ((manifest.safetyPacketSchemaVersion === null) !== (manifest.safetyPacketTemplateSha256 === null)) {
    throw new Error("preCallManifest safety packet schema/template commitments must both be present or absent");
  }
  if (manifest.claimBoundary !== PRE_CALL_MANIFEST_CLAIM_BOUNDARY) throw new Error("preCallManifest.claimBoundary is altered");
  for (const key of ["caseIds", "agentIds"] as const) {
    const values = manifest[key];
    if (!Array.isArray(values) || values.length === 0 || !values.every((item) => typeof item === "string" && item.length > 0)) {
      throw new Error(`preCallManifest.${key} must be a non-empty string array`);
    }
    if (new Set(values).size !== values.length) throw new Error(`preCallManifest.${key} contains duplicates`);
  }
  if (!Array.isArray(manifest.replicateLevels) || manifest.replicateLevels.length === 0) {
    throw new Error("preCallManifest.replicateLevels must not be empty");
  }
  manifest.replicateLevels.forEach((value, index) => {
    if (value !== index) throw new Error("preCallManifest.replicateLevels must be contiguous from zero");
  });
  if (!Array.isArray(manifest.conditions) || manifest.conditions.length === 0 ||
      !manifest.conditions.every((item) => EXPERIMENT_CONDITIONS.includes(item as ExperimentCondition))) {
    throw new Error("preCallManifest.conditions contains unsupported or empty arms");
  }
  if (new Set(manifest.conditions).size !== manifest.conditions.length) throw new Error("preCallManifest.conditions contains duplicates");
  if (!Array.isArray(manifest.expectedCalls) || manifest.expectedCalls.length === 0) {
    throw new Error("preCallManifest.expectedCalls must not be empty");
  }
  manifest.expectedCalls.forEach((call, index) => validateExpectedCall(call, `preCallManifest.expectedCalls[${index}]`));
  const expectedCalls = manifest.expectedCalls as ExpectedProviderCall[];
  if (new Set(expectedCalls.map((call) => call.expectedCallId)).size !== expectedCalls.length) {
    throw new Error("preCallManifest.expectedCalls contains duplicate expectedCallId values");
  }
  const executionOrders = expectedCalls.map((call) => call.executionOrder).sort((a, b) => a - b);
  if (executionOrders.some((order, index) => order !== index)) {
    throw new Error("preCallManifest.expectedCalls executionOrder must be unique and contiguous from zero");
  }
  const configs = expectedCalls.map((call) => call.requested).sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b)));
  if (manifest.providerConfigurationSha256 !== hashJson(configs)) {
    throw new Error("preCallManifest.providerConfigurationSha256 mismatch");
  }
}

export function validatePreCallManifest(value: unknown): asserts value is PreCallManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("preCallManifest must be an object");
  const manifest = value as Record<string, unknown>;
  const { manifestSha256, ...body } = manifest;
  assertSha(manifestSha256, "preCallManifest.manifestSha256");
  validatePreCallManifestBody(body);
  if (manifestSha256 !== hashJson(body)) throw new Error("preCallManifest self-hash mismatch");
}

function validateProviderCallReceiptBody(value: unknown): asserts value is ProviderCallReceiptBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("providerCallReceipt body must be an object");
  const receipt = value as Record<string, unknown>;
  assertExactObjectKeys(receipt, [
    "schemaVersion", "runId", "expectedCallId", "phase", "assignmentId", "sealedStateId", "requested", "served",
    "providerCallId", "providerSessionId", "promptSha256", "inputSha256", "outputSha256", "callStartedAt",
    "callCompletedAt", "bundledAt", "providerEvidenceBoundary", "usage",
  ], "providerCallReceipt");
  if (receipt.schemaVersion !== PROVIDER_CALL_RECEIPT_SCHEMA_VERSION) throw new Error("providerCallReceipt.schemaVersion is unsupported");
  for (const key of ["runId", "expectedCallId", "sealedStateId", "providerCallId", "providerSessionId"] as const) {
    assertNonEmpty(receipt[key], `providerCallReceipt.${key}`);
  }
  if (receipt.phase !== "BASELINE" && receipt.phase !== "REVISION") throw new Error("providerCallReceipt.phase is invalid");
  if (receipt.phase === "BASELINE") {
    if (receipt.assignmentId !== null) throw new Error("providerCallReceipt baseline assignmentId must be null");
    if (receipt.expectedCallId !== expectedBaselineCallId(receipt.sealedStateId as string)) throw new Error("providerCallReceipt expectedCallId mismatch");
  } else {
    assertNonEmpty(receipt.assignmentId, "providerCallReceipt.assignmentId");
    if (receipt.expectedCallId !== expectedRevisionCallId(receipt.assignmentId)) throw new Error("providerCallReceipt expectedCallId mismatch");
  }
  validateRequestedConfiguration(receipt.requested, "providerCallReceipt.requested");
  if (!receipt.served || typeof receipt.served !== "object" || Array.isArray(receipt.served)) throw new Error("providerCallReceipt.served must be an object");
  const served = receipt.served as Record<string, unknown>;
  assertExactObjectKeys(served, ["provider", "model", "effort"], "providerCallReceipt.served");
  for (const key of ["provider", "model", "effort"] as const) assertNonEmpty(served[key], `providerCallReceipt.served.${key}`);
  for (const key of ["promptSha256", "inputSha256", "outputSha256"] as const) assertSha(receipt[key], `providerCallReceipt.${key}`);
  for (const key of ["callStartedAt", "callCompletedAt", "bundledAt"] as const) assertTimestamp(receipt[key], `providerCallReceipt.${key}`);
  if (Date.parse(receipt.callCompletedAt as string) < Date.parse(receipt.callStartedAt as string)) {
    throw new Error("providerCallReceipt callCompletedAt precedes callStartedAt");
  }
  if (Date.parse(receipt.bundledAt as string) < Date.parse(receipt.callCompletedAt as string)) {
    throw new Error("providerCallReceipt bundledAt precedes callCompletedAt");
  }
  if (receipt.providerEvidenceBoundary !== PROVIDER_CALL_EVIDENCE_BOUNDARY) {
    throw new Error("providerCallReceipt.providerEvidenceBoundary is altered");
  }
  if (!receipt.usage || typeof receipt.usage !== "object" || Array.isArray(receipt.usage)) throw new Error("providerCallReceipt.usage must be an object");
  const usage = receipt.usage as Record<string, unknown>;
  assertExactObjectKeys(usage, ["inputTokens", "outputTokens", "latencyMs", "transportRetries", "estimatedCostUsd"], "providerCallReceipt.usage");
  for (const key of ["inputTokens", "outputTokens", "latencyMs", "transportRetries"] as const) {
    assertNonNegativeInteger(usage[key], `providerCallReceipt.usage.${key}`);
  }
  if ((usage.latencyMs as number) !== Date.parse(receipt.callCompletedAt as string) - Date.parse(receipt.callStartedAt as string)) {
    throw new Error("providerCallReceipt.usage.latencyMs must equal callCompletedAt minus callStartedAt");
  }
  if (usage.estimatedCostUsd !== null &&
      (typeof usage.estimatedCostUsd !== "number" || !Number.isFinite(usage.estimatedCostUsd) || usage.estimatedCostUsd < 0)) {
    throw new Error("providerCallReceipt.usage.estimatedCostUsd must be null or finite and non-negative");
  }
}

export function validateProviderCallReceipt(value: unknown): asserts value is ProviderCallReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("providerCallReceipt must be an object");
  const receipt = value as Record<string, unknown>;
  const { callReceiptSha256, ...body } = receipt;
  assertSha(callReceiptSha256, "providerCallReceipt.callReceiptSha256");
  validateProviderCallReceiptBody(body);
  if (callReceiptSha256 !== hashJson(body)) throw new Error("providerCallReceipt self-hash mismatch");
}

function validateExternalAnchorReceiptBody(value: unknown): asserts value is ExternalAnchorReceiptBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("externalAnchorReceipt body must be an object");
  const receipt = value as Record<string, unknown>;
  assertExactObjectKeys(receipt, [
    "schemaVersion", "service", "anchorId", "targetSha256", "anchoredAt", "verifiedAt",
    "verificationMethod", "verifier", "evidenceBoundary",
  ], "externalAnchorReceipt");
  if (receipt.schemaVersion !== EXTERNAL_ANCHOR_RECEIPT_SCHEMA_VERSION) throw new Error("externalAnchorReceipt.schemaVersion is unsupported");
  for (const key of ["service", "anchorId", "verifier"] as const) assertNonEmpty(receipt[key], `externalAnchorReceipt.${key}`);
  assertSha(receipt.targetSha256, "externalAnchorReceipt.targetSha256");
  assertTimestamp(receipt.anchoredAt, "externalAnchorReceipt.anchoredAt");
  assertTimestamp(receipt.verifiedAt, "externalAnchorReceipt.verifiedAt");
  if (Date.parse(receipt.verifiedAt as string) < Date.parse(receipt.anchoredAt as string)) {
    throw new Error("externalAnchorReceipt verifiedAt precedes anchoredAt");
  }
  if (!["PUBLIC_GIT_REMOTE_LOOKUP", "RFC3161_SIGNATURE_VALIDATION", "TRANSPARENCY_LOG_LOOKUP"].includes(receipt.verificationMethod as string)) {
    throw new Error("externalAnchorReceipt.verificationMethod is unsupported");
  }
  if (receipt.evidenceBoundary !== EXTERNAL_ANCHOR_EVIDENCE_BOUNDARY) {
    throw new Error("externalAnchorReceipt.evidenceBoundary is altered");
  }
}

export function validateExternalAnchorReceipt(value: unknown): asserts value is ExternalAnchorReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("externalAnchorReceipt must be an object");
  const receipt = value as Record<string, unknown>;
  const { anchorReceiptSha256, ...body } = receipt;
  assertSha(anchorReceiptSha256, "externalAnchorReceipt.anchorReceiptSha256");
  validateExternalAnchorReceiptBody(body);
  if (anchorReceiptSha256 !== hashJson(body)) throw new Error("externalAnchorReceipt self-hash mismatch");
}

export function validateExpectedCallMatrix(
  manifest: PreCallManifest,
  assignments: ExperimentAssignment[],
): void {
  const caseIds = sortedUnique(assignments.map((row) => row.caseId));
  const agentIds = sortedUnique(assignments.map((row) => row.agentId));
  const replicateLevels = [...new Set(assignments.map((row) => row.replicate))].sort((a, b) => a - b);
  const conditions = sortedUnique(assignments.map((row) => row.condition));
  if (canonicalJson(manifest.caseIds) !== canonicalJson(caseIds)) throw new Error("pre-call caseIds do not match assignments");
  if (canonicalJson(manifest.agentIds) !== canonicalJson(agentIds)) throw new Error("pre-call agentIds do not match assignments");
  if (canonicalJson(manifest.replicateLevels) !== canonicalJson(replicateLevels)) throw new Error("pre-call replicate levels do not match assignments");
  if (canonicalJson([...manifest.conditions].sort()) !== canonicalJson(conditions)) throw new Error("pre-call conditions do not match assignments");

  const assignmentsById = new Map(assignments.map((row) => [row.assignmentId, row]));
  const expectedBaselineStates = new Set(assignments.map((row) => row.sealedStateId));
  const baselineCalls = manifest.expectedCalls.filter((call) => call.phase === "BASELINE");
  const revisionCalls = manifest.expectedCalls.filter((call) => call.phase === "REVISION");
  if (baselineCalls.length !== expectedBaselineStates.size) throw new Error("pre-call manifest omitted or duplicated a baseline call");
  if (revisionCalls.length !== assignments.length) throw new Error("pre-call manifest omitted or duplicated a revision call");
  for (const state of expectedBaselineStates) {
    const call = baselineCalls.find((item) => item.sealedStateId === state);
    if (!call) throw new Error(`pre-call manifest omitted baseline state ${state}`);
    const assignment = assignments.find((item) => item.sealedStateId === state) as ExperimentAssignment;
    for (const key of ["caseId", "agentId", "replicate"] as const) {
      if (call[key] !== assignment[key]) throw new Error(`pre-call baseline ${call.expectedCallId} ${key} mismatch`);
    }
  }
  for (const call of revisionCalls) {
    const assignment = assignmentsById.get(call.assignmentId as string);
    if (!assignment) throw new Error(`pre-call revision references unknown assignment ${call.assignmentId}`);
    for (const key of ["sealedStateId", "caseId", "agentId", "replicate", "condition"] as const) {
      if (call[key] !== assignment[key]) throw new Error(`pre-call revision ${call.expectedCallId} ${key} mismatch`);
    }
  }
  const declaredCases = manifest.caseIds;
  const declaredAgents = manifest.agentIds;
  const declaredReplicates = manifest.replicateLevels;
  const cells = new Set(assignments.map((row) => `${row.caseId}|${row.agentId}|${row.replicate}`));
  const missing: string[] = [];
  for (const caseId of declaredCases) for (const agentId of declaredAgents) for (const replicate of declaredReplicates) {
    const cell = `${caseId}|${agentId}|${replicate}`;
    if (!cells.has(cell)) missing.push(cell);
  }
  if (missing.length > 0) throw new Error(`pre-call declared factor matrix has ${missing.length} missing cells; first ${missing[0]}`);
}

export function verifyProviderCallReceipts(
  manifest: PreCallManifest,
  receipts: ProviderCallReceipt[],
): void {
  if (receipts.length !== manifest.expectedCalls.length) {
    throw new Error(`provider call receipt count mismatch: ${receipts.length}/${manifest.expectedCalls.length}`);
  }
  const expected = new Map(manifest.expectedCalls.map((call) => [call.expectedCallId, call]));
  const seenCallIds = new Set<string>();
  const seenProviderCallIds = new Set<string>();
  const seenProviderSessionIds = new Set<string>();
  for (const receipt of receipts) {
    validateProviderCallReceipt(receipt);
    if (seenCallIds.has(receipt.expectedCallId)) throw new Error(`duplicate provider call receipt ${receipt.expectedCallId}`);
    seenCallIds.add(receipt.expectedCallId);
    if (seenProviderCallIds.has(receipt.providerCallId)) throw new Error(`provider call id reused: ${receipt.providerCallId}`);
    seenProviderCallIds.add(receipt.providerCallId);
    if (seenProviderSessionIds.has(receipt.providerSessionId)) throw new Error(`provider session id reused: ${receipt.providerSessionId}`);
    seenProviderSessionIds.add(receipt.providerSessionId);
    const planned = expected.get(receipt.expectedCallId);
    if (!planned) throw new Error(`unexpected provider call receipt ${receipt.expectedCallId}`);
    for (const key of ["phase", "assignmentId", "sealedStateId", "promptSha256", "inputSha256"] as const) {
      if (receipt[key] !== planned[key]) throw new Error(`provider call receipt ${receipt.expectedCallId} ${key} mismatch`);
    }
    if (canonicalJson(receipt.requested) !== canonicalJson(planned.requested)) {
      throw new Error(`provider call receipt ${receipt.expectedCallId} requested configuration mismatch`);
    }
    for (const key of ["provider", "model", "effort"] as const) {
      if (receipt.served[key] !== receipt.requested[key]) {
        throw new Error(`provider call receipt ${receipt.expectedCallId} served ${key} differs from requested ${key}`);
      }
    }
    if (receipt.runId !== manifest.runId) throw new Error(`provider call receipt ${receipt.expectedCallId} runId mismatch`);
  }
  for (const callId of expected.keys()) if (!seenCallIds.has(callId)) throw new Error(`missing provider call receipt ${callId}`);
  const actualOrder = [...receipts].sort((a, b) => Date.parse(a.callStartedAt) - Date.parse(b.callStartedAt));
  for (let index = 0; index < actualOrder.length; index += 1) {
    const current = actualOrder[index];
    const planned = expected.get(current.expectedCallId) as ExpectedProviderCall;
    if (planned.executionOrder !== index) {
      throw new Error(`provider call ${current.expectedCallId} start order ${index} differs from pre-call executionOrder ${planned.executionOrder}`);
    }
    if (index > 0) {
      const previous = actualOrder[index - 1];
      if (current.callStartedAt === previous.callStartedAt) throw new Error("provider call start timestamps must be unique");
      if (Date.parse(current.callStartedAt) < Date.parse(previous.callCompletedAt)) {
        throw new Error(`provider calls overlap: ${previous.expectedCallId} and ${current.expectedCallId}`);
      }
    }
  }
}
