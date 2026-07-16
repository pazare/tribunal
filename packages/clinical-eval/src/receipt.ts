import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve, sep } from "node:path";
import { analyzeObservations } from "./analysis.js";
import { CLINICAL_CODEBOOK_VERSION, PROMPT_TEMPLATE_VERSION } from "./codebooks.js";
import { loadSyntheticFixtures } from "./fixtures.js";
import {
  validateExpectedCallMatrix,
  validateExternalAnchorReceipt,
  validatePreCallManifest,
  validateProviderCallReceipt,
  verifyProviderCallReceipts,
  type ExternalAnchorReceipt,
  type PreCallManifest,
  type ProviderCallReceipt,
} from "./execution-receipts.js";
import {
  canonicalJson,
  gitState,
  hashFile,
  hashJson,
  type GitState,
} from "./provenance.js";
import {
  EXPERIMENT_CONDITIONS,
  type AgentObservation,
  type ExperimentAssignment,
  type ExperimentCondition,
} from "./types.js";
import { assertExactObjectKeys } from "./validate.js";

export { canonicalJson, gitState, hashFile, hashJson, sha256 } from "./provenance.js";
export type { GitState } from "./provenance.js";

export const RUN_RECEIPT_SCHEMA_VERSION = 4;
export const RUN_RECEIPT_CLAIM_BOUNDARY =
  "This receipt records hashed artifacts and replay-verified execution metadata for a mechanism experiment. Independent immutability verification additionally requires an external anchor. It does not establish clinical validity, safety, patient benefit, or cost-effectiveness.";

export interface ProviderReceiptSummary {
  boundary: string;
  providers: string[];
  models: string[];
  efforts: string[];
  configurationSha256: string;
}

export type RecordedExternalEvidenceLevel = "NOT_ESTABLISHED";
export type RecordedAnchorAssertionStatus =
  | "ABSENT"
  | "PRESENT_NOT_INDEPENDENTLY_REVERIFIED";

export interface ExecutionProvenanceReceipt {
  captureStatus: "NOT_CAPTURED" | "CAPTURED";
  preCallManifestFile: string | null;
  preCallManifestSha256: string | null;
  providerCallReceiptsFile: string | null;
  providerCallReceiptsSha256: string | null;
  safetyPacketFile: string | null;
  safetyPacketArtifactSha256: string | null;
  safetyContextFile: string | null;
  preCallAnchorFile: string | null;
  preCallAnchorSha256: string | null;
  completedBundleSha256: string | null;
  completedBundleAnchorFile: string | null;
  completedBundleAnchorSha256: string | null;
  recordedAnchorAssertions: {
    preCall: RecordedAnchorAssertionStatus;
    completedBundle: RecordedAnchorAssertionStatus;
  };
  claims: {
    independentPreregistrationEvidence: RecordedExternalEvidenceLevel;
    independentTimeEvidence: RecordedExternalEvidenceLevel;
    completedBundleTamperEvidence: RecordedExternalEvidenceLevel;
    providerIssuanceEvidence: RecordedExternalEvidenceLevel;
  };
}

export interface RunReceiptInput {
  cwd: string;
  gitAtStart?: GitState;
  runId: string;
  startedAt: string;
  completedAt: string;
  protocolVersion: string;
  experimentId: string;
  hypothesis: string;
  dataset: {
    id: string;
    version: string;
    class: string;
    source: string;
    sha256: string;
    rowCount: number;
    licenseStatus: string;
    duaStatus: string;
    deidentificationStatus: string;
    inclusionCriteria: string[];
    exclusionCriteria: string[];
  };
  artifactFiles: {
    assignments: string;
    observations: string;
    results: string;
  };
  assignmentHash: string;
  observationHash: string;
  resultHash: string;
  codebookVersion: string;
  promptTemplateVersion: string;
  randomSeed: number;
  design: {
    mode: "FULL_E2" | "REDUCED_DESIGN";
    plannedConditions: ExperimentCondition[];
    agentIds: string[];
    replicates: number;
    assignmentCount: number;
  };
  analysis: {
    resultSchemaVersion: 2;
    bootstrapReplicates: number;
    bootstrapSeed: number;
  };
  provider: ProviderReceiptSummary;
  usage: {
    plannedCalls: number;
    completedVotes: number;
    nonVotes: number;
    transportRetries: number;
    inputTokens: number;
    outputTokens: number;
    totalLatencyMs: number;
    pricingSource: string | null;
    estimatedCostUsd: number | null;
  };
  rawProviderErrorsStored: false;
  ledgerHead: string | null;
  executionProvenance?: ExecutionProvenanceReceipt;
}

export function completedExecutionBundleSha256(input: {
  preCallManifestSha256: string;
  providerCallReceiptsSha256: string;
  assignmentSha256: string;
  observationSha256: string;
  resultSha256: string;
  safetyPacketArtifactSha256: string | null;
  safetyContextArtifactSha256: string | null;
}): string {
  return hashJson(input);
}

function uncapturedExecutionProvenance(): ExecutionProvenanceReceipt {
  return {
    captureStatus: "NOT_CAPTURED",
    preCallManifestFile: null,
    preCallManifestSha256: null,
    providerCallReceiptsFile: null,
    providerCallReceiptsSha256: null,
    safetyPacketFile: null,
    safetyPacketArtifactSha256: null,
    safetyContextFile: null,
    preCallAnchorFile: null,
    preCallAnchorSha256: null,
    completedBundleSha256: null,
    completedBundleAnchorFile: null,
    completedBundleAnchorSha256: null,
    recordedAnchorAssertions: {
      preCall: "ABSENT",
      completedBundle: "ABSENT",
    },
    claims: {
      independentPreregistrationEvidence: "NOT_ESTABLISHED",
      independentTimeEvidence: "NOT_ESTABLISHED",
      completedBundleTamperEvidence: "NOT_ESTABLISHED",
      providerIssuanceEvidence: "NOT_ESTABLISHED",
    },
  };
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function providerReceiptSummary(
  observations: AgentObservation[],
  boundary: string,
): ProviderReceiptSummary {
  const configurations = observations
    .map((observation) => ({
      agentId: observation.agentId,
      provider: observation.provider,
      model: observation.model,
      effort: observation.effort,
      systemPromptHash: observation.systemPromptHash,
      toolConfigurationHash: observation.toolConfigurationHash,
      retrievalMode: observation.retrievalMode,
      retrievalCorpusHash: observation.retrievalCorpusHash,
      temperature: observation.temperature,
    }))
    .sort((left, right) => {
      const leftJson = canonicalJson(left);
      const rightJson = canonicalJson(right);
      return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
    });
  return {
    boundary,
    providers: sortedUnique(observations.map((item) => item.provider)),
    models: sortedUnique(observations.map((item) => item.model)),
    efforts: sortedUnique(observations.map((item) => item.effort)),
    configurationSha256: hashJson(configurations),
  };
}

export function buildRunReceipt(input: RunReceiptInput) {
  const receiptBody = {
    schemaVersion: RUN_RECEIPT_SCHEMA_VERSION,
    runId: input.runId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    protocolVersion: input.protocolVersion,
    experimentId: input.experimentId,
    hypothesis: input.hypothesis,
    gitAtStart: input.gitAtStart ?? gitState(input.cwd),
    dataset: input.dataset,
    artifactFiles: input.artifactFiles,
    codebookVersion: input.codebookVersion,
    promptTemplateVersion: input.promptTemplateVersion,
    randomSeed: input.randomSeed,
    assignmentSha256: input.assignmentHash,
    observationSha256: input.observationHash,
    resultSha256: input.resultHash,
    design: input.design,
    analysis: input.analysis,
    provider: input.provider,
    usage: input.usage,
    rawProviderErrorsStored: input.rawProviderErrorsStored,
    ledgerHead: input.ledgerHead,
    executionProvenance: input.executionProvenance ?? uncapturedExecutionProvenance(),
    claimBoundary: RUN_RECEIPT_CLAIM_BOUNDARY,
  };
  return { ...receiptBody, receiptSha256: hashJson(receiptBody) };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string, label: string, allowEmpty = false): string {
  const value = record[key];
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label}.${key} must be ${allowEmpty ? "a" : "a non-empty"} string`);
  }
  return value;
}

function requireSha(record: Record<string, unknown>, key: string, label: string): string {
  const value = requireString(record, key, label);
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label}.${key} must be a lowercase SHA-256 hash`);
  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  key: string,
  label: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const value = record[key];
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${label}.${key} must be an integer in [${minimum}, ${maximum}]`);
  }
  return value as number;
}

function requireStringArray(record: Record<string, unknown>, key: string, label: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.length > 0)) {
    throw new Error(`${label}.${key} must be an array of non-empty strings`);
  }
  return value as string[];
}

function requireUniqueStrings(record: Record<string, unknown>, key: string, label: string): string[] {
  const values = requireStringArray(record, key, label);
  if (new Set(values).size !== values.length) throw new Error(`${label}.${key} must contain unique values`);
  return values;
}

function validateReceiptSchema(receipt: Record<string, unknown>) {
  assertExactObjectKeys(
    receipt,
    [
      "schemaVersion", "runId", "startedAt", "completedAt", "protocolVersion", "experimentId",
      "hypothesis", "gitAtStart", "dataset", "artifactFiles", "codebookVersion",
      "promptTemplateVersion", "randomSeed", "assignmentSha256", "observationSha256",
      "resultSha256", "design", "analysis", "provider", "usage", "rawProviderErrorsStored",
      "ledgerHead", "executionProvenance", "claimBoundary", "receiptSha256",
    ],
    "receipt",
  );
  if (receipt.schemaVersion !== RUN_RECEIPT_SCHEMA_VERSION) throw new Error("receipt.schemaVersion is unsupported");
  for (const key of ["runId", "protocolVersion", "experimentId", "hypothesis"] as const) {
    requireString(receipt, key, "receipt");
  }
  for (const key of ["startedAt", "completedAt"] as const) {
    const value = requireString(receipt, key, "receipt");
    if (Number.isNaN(Date.parse(value))) throw new Error(`receipt.${key} must be a parseable timestamp`);
  }
  if (Date.parse(receipt.completedAt as string) < Date.parse(receipt.startedAt as string)) {
    throw new Error("receipt.completedAt precedes startedAt");
  }
  requireString(receipt, "codebookVersion", "receipt");
  requireString(receipt, "promptTemplateVersion", "receipt");
  requireInteger(receipt, "randomSeed", "receipt", 0, 0xffffffff);
  for (const key of ["assignmentSha256", "observationSha256", "resultSha256", "receiptSha256"] as const) {
    requireSha(receipt, key, "receipt");
  }
  if (receipt.claimBoundary !== RUN_RECEIPT_CLAIM_BOUNDARY) throw new Error("receipt.claimBoundary is altered");
  if (receipt.rawProviderErrorsStored !== false) throw new Error("receipt.rawProviderErrorsStored must be false");
  if (receipt.ledgerHead !== null && (typeof receipt.ledgerHead !== "string" || !/^[a-f0-9]{64}$/u.test(receipt.ledgerHead))) {
    throw new Error("receipt.ledgerHead must be null or a lowercase SHA-256 hash");
  }

  const execution = asRecord(receipt.executionProvenance, "receipt.executionProvenance");
  assertExactObjectKeys(execution, [
    "captureStatus", "preCallManifestFile", "preCallManifestSha256", "providerCallReceiptsFile",
    "providerCallReceiptsSha256", "safetyPacketFile", "safetyPacketArtifactSha256", "safetyContextFile", "preCallAnchorFile",
    "preCallAnchorSha256", "completedBundleSha256", "completedBundleAnchorFile",
    "completedBundleAnchorSha256", "recordedAnchorAssertions", "claims",
  ], "receipt.executionProvenance");
  if (execution.captureStatus !== "NOT_CAPTURED" && execution.captureStatus !== "CAPTURED") {
    throw new Error("receipt.executionProvenance.captureStatus is invalid");
  }
  const filenameKeys = [
    "preCallManifestFile", "providerCallReceiptsFile", "safetyPacketFile", "safetyContextFile",
    "preCallAnchorFile", "completedBundleAnchorFile",
  ] as const;
  const hashKeys = [
    "preCallManifestSha256", "providerCallReceiptsSha256", "preCallAnchorSha256",
    "completedBundleSha256", "completedBundleAnchorSha256", "safetyPacketArtifactSha256",
  ] as const;
  for (const key of filenameKeys) {
    if (execution[key] !== null && (typeof execution[key] !== "string" || execution[key].length === 0)) {
      throw new Error(`receipt.executionProvenance.${key} must be null or a non-empty string`);
    }
  }
  for (const key of hashKeys) {
    if (execution[key] !== null && (typeof execution[key] !== "string" || !/^[a-f0-9]{64}$/u.test(execution[key] as string))) {
      throw new Error(`receipt.executionProvenance.${key} must be null or a lowercase SHA-256 hash`);
    }
  }
  const claims = asRecord(execution.claims, "receipt.executionProvenance.claims");
  assertExactObjectKeys(claims, [
    "independentPreregistrationEvidence", "independentTimeEvidence", "completedBundleTamperEvidence", "providerIssuanceEvidence",
  ], "receipt.executionProvenance.claims");
  for (const key of ["independentPreregistrationEvidence", "independentTimeEvidence", "completedBundleTamperEvidence", "providerIssuanceEvidence"] as const) {
    if (claims[key] !== "NOT_ESTABLISHED") {
      throw new Error(`receipt.executionProvenance.claims.${key} is invalid`);
    }
  }
  const anchorAssertions = asRecord(execution.recordedAnchorAssertions, "receipt.executionProvenance.recordedAnchorAssertions");
  assertExactObjectKeys(anchorAssertions, ["preCall", "completedBundle"], "receipt.executionProvenance.recordedAnchorAssertions");
  for (const key of ["preCall", "completedBundle"] as const) {
    if (anchorAssertions[key] !== "ABSENT" && anchorAssertions[key] !== "PRESENT_NOT_INDEPENDENTLY_REVERIFIED") {
      throw new Error(`receipt.executionProvenance.recordedAnchorAssertions.${key} is invalid`);
    }
  }
  if (execution.captureStatus === "NOT_CAPTURED") {
    for (const key of [...filenameKeys, ...hashKeys] as const) {
      if (execution[key] !== null) throw new Error(`receipt.executionProvenance.${key} must be null when not captured`);
    }
    if (Object.values(claims).some((value) => value !== "NOT_ESTABLISHED")) {
      throw new Error("uncaptured execution provenance cannot establish external evidence claims");
    }
    if (Object.values(anchorAssertions).some((value) => value !== "ABSENT")) {
      throw new Error("uncaptured execution provenance cannot record anchor assertions");
    }
  } else {
    for (const key of ["preCallManifestFile", "providerCallReceiptsFile", "preCallManifestSha256", "providerCallReceiptsSha256", "completedBundleSha256"] as const) {
      if (execution[key] === null) throw new Error(`receipt.executionProvenance.${key} is required when captured`);
    }
    const preCallAnchorFields = [execution.preCallAnchorFile, execution.preCallAnchorSha256];
    if (preCallAnchorFields.some((value) => value === null) !== preCallAnchorFields.every((value) => value === null)) {
      throw new Error("receipt.executionProvenance pre-call anchor file/hash must both be present or absent");
    }
    const bundleAnchorFields = [execution.completedBundleAnchorFile, execution.completedBundleAnchorSha256];
    if (bundleAnchorFields.some((value) => value === null) !== bundleAnchorFields.every((value) => value === null)) {
      throw new Error("receipt.executionProvenance completed-bundle anchor file/hash must both be present or absent");
    }
    const preCallPresent = execution.preCallAnchorFile !== null;
    if ((anchorAssertions.preCall === "PRESENT_NOT_INDEPENDENTLY_REVERIFIED") !== preCallPresent) {
      throw new Error("pre-call recorded anchor assertion status does not match anchor artifact presence");
    }
    const bundlePresent = execution.completedBundleAnchorFile !== null;
    if ((anchorAssertions.completedBundle === "PRESENT_NOT_INDEPENDENTLY_REVERIFIED") !== bundlePresent) {
      throw new Error("completed-bundle recorded anchor assertion status does not match anchor artifact presence");
    }
  }

  const git = asRecord(receipt.gitAtStart, "receipt.gitAtStart");
  assertExactObjectKeys(git, ["commit", "dirty", "branch"], "receipt.gitAtStart");
  if (!/^[a-f0-9]{40,64}$/u.test(requireString(git, "commit", "receipt.gitAtStart"))) {
    throw new Error("receipt.gitAtStart.commit must be a git object id");
  }
  if (typeof git.dirty !== "boolean") throw new Error("receipt.gitAtStart.dirty must be boolean");
  requireString(git, "branch", "receipt.gitAtStart", true);

  const dataset = asRecord(receipt.dataset, "receipt.dataset");
  assertExactObjectKeys(dataset, [
    "id", "version", "class", "source", "sha256", "rowCount", "licenseStatus", "duaStatus",
    "deidentificationStatus", "inclusionCriteria", "exclusionCriteria",
  ], "receipt.dataset");
  for (const key of ["id", "version", "class", "source", "licenseStatus", "duaStatus", "deidentificationStatus"] as const) {
    requireString(dataset, key, "receipt.dataset");
  }
  requireSha(dataset, "sha256", "receipt.dataset");
  requireInteger(dataset, "rowCount", "receipt.dataset");
  requireStringArray(dataset, "inclusionCriteria", "receipt.dataset");
  requireStringArray(dataset, "exclusionCriteria", "receipt.dataset");

  const files = asRecord(receipt.artifactFiles, "receipt.artifactFiles");
  assertExactObjectKeys(files, ["assignments", "observations", "results"], "receipt.artifactFiles");
  for (const key of ["assignments", "observations", "results"] as const) requireString(files, key, "receipt.artifactFiles");

  const design = asRecord(receipt.design, "receipt.design");
  assertExactObjectKeys(design, ["mode", "plannedConditions", "agentIds", "replicates", "assignmentCount"], "receipt.design");
  if (design.mode !== "FULL_E2" && design.mode !== "REDUCED_DESIGN") throw new Error("receipt.design.mode is invalid");
  const conditions = requireUniqueStrings(design, "plannedConditions", "receipt.design");
  if (conditions.length === 0 || conditions.some((item) => !EXPERIMENT_CONDITIONS.includes(item as ExperimentCondition))) {
    throw new Error("receipt.design.plannedConditions contains unsupported or empty arms");
  }
  if (requireUniqueStrings(design, "agentIds", "receipt.design").length === 0) {
    throw new Error("receipt.design.agentIds must not be empty");
  }
  requireInteger(design, "replicates", "receipt.design", 1);
  requireInteger(design, "assignmentCount", "receipt.design", 1);

  const analysis = asRecord(receipt.analysis, "receipt.analysis");
  assertExactObjectKeys(analysis, ["resultSchemaVersion", "bootstrapReplicates", "bootstrapSeed"], "receipt.analysis");
  if (analysis.resultSchemaVersion !== 2) throw new Error("receipt.analysis.resultSchemaVersion is unsupported");
  requireInteger(analysis, "bootstrapReplicates", "receipt.analysis", 1);
  requireInteger(analysis, "bootstrapSeed", "receipt.analysis", 0, 0xffffffff);

  const provider = asRecord(receipt.provider, "receipt.provider");
  assertExactObjectKeys(provider, ["boundary", "providers", "models", "efforts", "configurationSha256"], "receipt.provider");
  requireString(provider, "boundary", "receipt.provider");
  for (const key of ["providers", "models", "efforts"] as const) {
    if (requireUniqueStrings(provider, key, "receipt.provider").length === 0) {
      throw new Error(`receipt.provider.${key} must not be empty`);
    }
  }
  requireSha(provider, "configurationSha256", "receipt.provider");

  const usage = asRecord(receipt.usage, "receipt.usage");
  assertExactObjectKeys(usage, [
    "plannedCalls", "completedVotes", "nonVotes", "transportRetries", "inputTokens", "outputTokens",
    "totalLatencyMs", "pricingSource", "estimatedCostUsd",
  ], "receipt.usage");
  for (const key of ["plannedCalls", "completedVotes", "nonVotes", "transportRetries", "inputTokens", "outputTokens", "totalLatencyMs"] as const) {
    requireInteger(usage, key, "receipt.usage");
  }
  if (usage.pricingSource !== null && (typeof usage.pricingSource !== "string" || usage.pricingSource.length === 0)) {
    throw new Error("receipt.usage.pricingSource must be null or a non-empty string");
  }
  if (usage.estimatedCostUsd !== null && (
    typeof usage.estimatedCostUsd !== "number" || !Number.isFinite(usage.estimatedCostUsd) || usage.estimatedCostUsd < 0
  )) {
    throw new Error("receipt.usage.estimatedCostUsd must be null or finite and non-negative");
  }
}

function parseObservationJsonl(path: string): AgentObservation[] {
  const text = readFileSync(path, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as AgentObservation;
      } catch (error) {
        throw new Error(`observations line ${index + 1} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}

function parseProviderCallReceiptJsonl(path: string): ProviderCallReceipt[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        const receipt: unknown = JSON.parse(line);
        validateProviderCallReceipt(receipt);
        return receipt;
      } catch (error) {
        throw new Error(`provider call receipt line ${index + 1} is invalid: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}

function safeJsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function sameStrings(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function observationRequestedConfiguration(observation: AgentObservation) {
  return {
    provider: observation.provider,
    model: observation.model,
    effort: observation.effort,
    systemPromptSha256: observation.systemPromptHash,
    toolConfigurationSha256: observation.toolConfigurationHash,
    retrievalMode: observation.retrievalMode,
    retrievalCorpusSha256: observation.retrievalCorpusHash,
    temperature: observation.temperature,
  };
}

function validateCallsAgainstObservations(
  manifest: PreCallManifest,
  calls: ProviderCallReceipt[],
  observations: AgentObservation[],
): void {
  const callsById = new Map(calls.map((call) => [call.expectedCallId, call]));
  const observationsByAssignment = new Map(observations.map((row) => [row.assignmentId, row]));
  const observationsByState = new Map<string, AgentObservation>();
  for (const observation of observations) {
    if (!observationsByState.has(observation.sealedStateId)) observationsByState.set(observation.sealedStateId, observation);
  }
  for (const expected of manifest.expectedCalls) {
    const call = callsById.get(expected.expectedCallId) as ProviderCallReceipt;
    const observation = expected.phase === "BASELINE"
      ? observationsByState.get(expected.sealedStateId)
      : observationsByAssignment.get(expected.assignmentId as string);
    if (!observation) throw new Error(`call ${expected.expectedCallId} has no matching observation`);
    const expectedConfig = observationRequestedConfiguration(observation);
    if (canonicalJson(expected.requested) !== canonicalJson(expectedConfig)) {
      throw new Error(`call ${expected.expectedCallId} configuration does not match observation`);
    }
    if (expected.phase === "BASELINE") {
      if (call.providerSessionId !== observation.baselineSessionId) {
        throw new Error(`baseline call ${expected.expectedCallId} session does not match observation`);
      }
      if (call.promptSha256 !== observation.baselinePromptHash) {
        throw new Error(`baseline call ${expected.expectedCallId} prompt does not match observation`);
      }
      if (call.outputSha256 !== hashJson(observation.baseline)) {
        throw new Error(`baseline call ${expected.expectedCallId} output does not match sealed baseline`);
      }
      const revisions = observations
        .filter((row) => row.sealedStateId === expected.sealedStateId)
        .map((row) => callsById.get(`REVISION:${row.assignmentId}`) as ProviderCallReceipt);
      if (revisions.some((revision) => Date.parse(revision.callStartedAt) < Date.parse(call.callCompletedAt))) {
        throw new Error(`baseline call ${expected.expectedCallId} completed after a revision began`);
      }
    } else {
      if (call.providerSessionId !== observation.revisionSessionId) {
        throw new Error(`revision call ${expected.expectedCallId} session does not match observation`);
      }
      if (call.promptSha256 !== observation.revisionPromptHash) {
        throw new Error(`revision call ${expected.expectedCallId} prompt does not match observation`);
      }
      if (call.outputSha256 !== hashJson(observation.postExposure)) {
        throw new Error(`revision call ${expected.expectedCallId} output does not match observation`);
      }
      if (call.callStartedAt !== observation.callStartedAt || call.callCompletedAt !== observation.observedAt) {
        throw new Error(`revision call ${expected.expectedCallId} timestamps do not match observation`);
      }
      if (call.usage.latencyMs !== observation.latencyMs ||
          call.usage.inputTokens !== (observation.inputTokens ?? 0) ||
          call.usage.outputTokens !== (observation.outputTokens ?? 0)) {
        throw new Error(`revision call ${expected.expectedCallId} usage does not match observation`);
      }
    }
  }
}

export function verifyRunDirectory(runDirectory: string, datasetPath: string) {
  const directory = resolve(runDirectory);
  const errors: string[] = [];
  let realDirectory: string;
  try {
    const directoryStat = lstatSync(directory);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) throw new Error("run directory must be a real directory, not a symlink");
    realDirectory = realpathSync(directory);
  } catch (error) {
    return {
      valid: false,
      errors: [`run directory could not be resolved: ${error instanceof Error ? error.message : String(error)}`],
      receiptSha256: null,
      computedReceiptSha256: null,
    };
  }
  const receiptPath = resolve(directory, "receipt.json");
  let parsed: unknown;
  try {
    const receiptStat = lstatSync(receiptPath);
    if (receiptStat.isSymbolicLink() || !receiptStat.isFile()) throw new Error("receipt must be a regular file, not a symlink");
    parsed = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch (error) {
    return {
      valid: false,
      errors: [`receipt could not be read: ${error instanceof Error ? error.message : String(error)}`],
      receiptSha256: null,
      computedReceiptSha256: null,
    };
  }
  let receipt: Record<string, unknown>;
  try {
    receipt = asRecord(parsed, "receipt");
    validateReceiptSchema(receipt);
  } catch (error) {
    return {
      valid: false,
      errors: [`receipt schema invalid: ${error instanceof Error ? error.message : String(error)}`],
      receiptSha256: null,
      computedReceiptSha256: null,
    };
  }
  const recordedReceiptHash = receipt.receiptSha256 as string;
  const { receiptSha256: _ignored, ...body } = receipt;
  let computedReceiptHash: string | null = null;
  try {
    computedReceiptHash = hashJson(body);
  } catch (error) {
    errors.push(`receipt is not canonical JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (recordedReceiptHash !== computedReceiptHash) errors.push("receipt self-hash mismatch");

  const dataset = receipt.dataset as Record<string, unknown>;
  let cases: ReturnType<typeof loadSyntheticFixtures> | null = null;
  try {
    const datasetStat = lstatSync(resolve(datasetPath));
    if (datasetStat.isSymbolicLink() || !datasetStat.isFile()) throw new Error("dataset must be a regular file, not a symlink");
    if (dataset.sha256 !== hashFile(datasetPath)) errors.push("dataset hash mismatch");
    cases = loadSyntheticFixtures(datasetPath);
    if (dataset.rowCount !== cases.length) errors.push("dataset rowCount mismatch");
  } catch (error) {
    errors.push(`dataset could not be validated: ${error instanceof Error ? error.message : String(error)}`);
  }

  const files = receipt.artifactFiles as Record<string, string>;
  const checks: Array<["assignments" | "observations" | "results", string, string]> = [
    ["assignments", "assignmentSha256", "assignment hash mismatch"],
    ["observations", "observationSha256", "observation hash mismatch"],
    ["results", "resultSha256", "result hash mismatch"],
  ];
  if (new Set(Object.values(files)).size !== checks.length) errors.push("artifact filenames must be distinct");
  const safePaths = new Map<string, string>();
  for (const [fileKey, hashKey, message] of checks) {
    const file = files[fileKey];
    if (isAbsolute(file) || basename(file) !== file || dirname(resolve(directory, file)) !== directory) {
      errors.push(`artifact filename escapes run directory: ${fileKey}`);
      continue;
    }
    try {
      const artifactPath = resolve(directory, file);
      const artifactStat = lstatSync(artifactPath);
      if (artifactStat.isSymbolicLink() || !artifactStat.isFile()) {
        errors.push(`artifact must be a regular file, not a symlink: ${fileKey}`);
        continue;
      }
      const realArtifactPath = realpathSync(artifactPath);
      if (!realArtifactPath.startsWith(`${realDirectory}${sep}`)) {
        errors.push(`artifact resolves outside run directory: ${fileKey}`);
        continue;
      }
      safePaths.set(fileKey, realArtifactPath);
      if (receipt[hashKey] !== hashFile(realArtifactPath)) errors.push(message);
    } catch (error) {
      errors.push(`artifact could not be hashed (${fileKey}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const execution = receipt.executionProvenance as unknown as ExecutionProvenanceReceipt;
  const provenanceFilenames = [
    execution.preCallManifestFile,
    execution.providerCallReceiptsFile,
    execution.safetyPacketFile,
    execution.safetyContextFile,
    execution.preCallAnchorFile,
    execution.completedBundleAnchorFile,
  ].filter((value): value is string => value !== null);
  if (new Set([...Object.values(files), ...provenanceFilenames]).size !== Object.values(files).length + provenanceFilenames.length) {
    errors.push("all run and execution provenance artifact filenames must be distinct");
  }
  let preCallManifest: PreCallManifest | null = null;
  let providerCallReceipts: ProviderCallReceipt[] | null = null;
  let preCallAnchor: ExternalAnchorReceipt | null = null;
  let completedBundleAnchor: ExternalAnchorReceipt | null = null;
  const resolveExecutionArtifact = (file: string | null, label: string): string | null => {
    if (file === null) return null;
    if (isAbsolute(file) || basename(file) !== file || dirname(resolve(directory, file)) !== directory) {
      errors.push(`execution provenance artifact filename escapes run directory: ${label}`);
      return null;
    }
    try {
      const path = resolve(directory, file);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("must be a regular file, not a symlink");
      const realPath = realpathSync(path);
      if (!realPath.startsWith(`${realDirectory}${sep}`)) throw new Error("resolves outside run directory");
      return realPath;
    } catch (error) {
      errors.push(`execution provenance artifact invalid (${label}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };
  if (execution.captureStatus === "CAPTURED") {
    const manifestPath = resolveExecutionArtifact(execution.preCallManifestFile, "preCallManifest");
    const callsPath = resolveExecutionArtifact(execution.providerCallReceiptsFile, "providerCallReceipts");
    const safetyPacketPath = resolveExecutionArtifact(execution.safetyPacketFile, "safetyPacket");
    const safetyContextPath = resolveExecutionArtifact(execution.safetyContextFile, "safetyContext");
    const preCallAnchorPath = resolveExecutionArtifact(execution.preCallAnchorFile, "preCallAnchor");
    const bundleAnchorPath = resolveExecutionArtifact(execution.completedBundleAnchorFile, "completedBundleAnchor");
    try {
      if (!manifestPath || !callsPath) throw new Error("captured provenance requires manifest and provider call receipt artifacts");
      const manifestValue: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
      validatePreCallManifest(manifestValue);
      preCallManifest = manifestValue;
      if (execution.preCallManifestSha256 !== preCallManifest.manifestSha256) {
        errors.push("receipt preCallManifestSha256 does not match manifest self-hash");
      }
      providerCallReceipts = parseProviderCallReceiptJsonl(callsPath);
      if (execution.providerCallReceiptsSha256 !== hashJson(providerCallReceipts)) {
        errors.push("receipt providerCallReceiptsSha256 does not match parsed call receipts");
      }
      if (preCallManifest.safetyPacketSchemaVersion === null) {
        if (execution.safetyPacketFile !== null || execution.safetyPacketArtifactSha256 !== null) {
          errors.push("safety packet artifact supplied without a pre-call schema/template commitment");
        }
      } else if (!safetyPacketPath || execution.safetyPacketArtifactSha256 === null ||
          hashFile(safetyPacketPath) !== execution.safetyPacketArtifactSha256) {
        errors.push("pre-call-declared safety packet output is missing or post-run hash-mismatched");
      }
      if (preCallManifest.safetyContextArtifactSha256 === null) {
        if (execution.safetyContextFile !== null) errors.push("safety context file supplied but pre-call manifest did not declare its hash");
      } else if (!safetyContextPath || hashFile(safetyContextPath) !== preCallManifest.safetyContextArtifactSha256) {
        errors.push("declared safety context artifact is missing or hash-mismatched");
      }
      if (preCallAnchorPath) {
        const anchorValue: unknown = JSON.parse(readFileSync(preCallAnchorPath, "utf8"));
        validateExternalAnchorReceipt(anchorValue);
        preCallAnchor = anchorValue;
        if (execution.preCallAnchorSha256 !== preCallAnchor.anchorReceiptSha256) {
          errors.push("receipt preCallAnchorSha256 does not match anchor self-hash");
        }
      }
      if (bundleAnchorPath) {
        const anchorValue: unknown = JSON.parse(readFileSync(bundleAnchorPath, "utf8"));
        validateExternalAnchorReceipt(anchorValue);
        completedBundleAnchor = anchorValue;
        if (execution.completedBundleAnchorSha256 !== completedBundleAnchor.anchorReceiptSha256) {
          errors.push("receipt completedBundleAnchorSha256 does not match anchor self-hash");
        }
      }
    } catch (error) {
      errors.push(`execution provenance validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const assignmentsPath = safePaths.get("assignments");
    const observationsPath = safePaths.get("observations");
    const resultsPath = safePaths.get("results");
    if (!assignmentsPath || !observationsPath || !resultsPath || !cases) {
      throw new Error("semantic replay requires all validated artifacts and dataset");
    }
    const assignmentsValue: unknown = JSON.parse(readFileSync(assignmentsPath, "utf8"));
    if (!Array.isArray(assignmentsValue)) throw new Error("assignments artifact must be an array");
    const assignments = assignmentsValue as ExperimentAssignment[];
    const observations = parseObservationJsonl(observationsPath);
    const results = JSON.parse(readFileSync(resultsPath, "utf8")) as unknown;
    const design = receipt.design as Record<string, unknown>;
    const analysis = receipt.analysis as Record<string, unknown>;
    const recomputed = analyzeObservations(cases, assignments, observations, {
      designMode: design.mode as "FULL_E2" | "REDUCED_DESIGN",
      bootstrapReplicates: analysis.bootstrapReplicates as number,
      bootstrapSeed: analysis.bootstrapSeed as number,
    });
    if (canonicalJson(results) !== canonicalJson(safeJsonValue(recomputed))) {
      errors.push("results artifact does not match semantic replay");
    }

    const manifestConditions = sortedUnique(assignments.map((item) => item.condition));
    const declaredConditions = design.plannedConditions as string[];
    if (!sameStrings(manifestConditions, declaredConditions)) errors.push("receipt plannedConditions do not match assignment manifest");
    const manifestAgents = sortedUnique(assignments.map((item) => item.agentId));
    if (!sameStrings(manifestAgents, design.agentIds as string[])) errors.push("receipt agentIds do not match assignment manifest");
    if (design.assignmentCount !== assignments.length) errors.push("receipt assignmentCount mismatch");
    const replicates = [...new Set(assignments.map((item) => item.replicate))].sort((left, right) => left - right);
    if (replicates.some((value, index) => value !== index) || design.replicates !== replicates.length) {
      errors.push("receipt replicates do not match contiguous manifest replicates");
    }
    if (assignments.some((item) => item.seed !== receipt.randomSeed)) errors.push("receipt randomSeed does not match every assignment");
    if (assignments.some((item) => item.promptTemplateVersion !== receipt.promptTemplateVersion)) {
      errors.push("receipt promptTemplateVersion does not match assignments");
    }
    if (receipt.promptTemplateVersion !== PROMPT_TEMPLATE_VERSION) errors.push("receipt promptTemplateVersion is not supported by this analyzer");
    if (receipt.codebookVersion !== CLINICAL_CODEBOOK_VERSION) errors.push("receipt codebookVersion is not supported by this analyzer");

    if (execution.captureStatus === "CAPTURED") {
      if (!preCallManifest || !providerCallReceipts) throw new Error("captured execution provenance could not be parsed");
      if (preCallManifest.runId !== receipt.runId) errors.push("pre-call manifest runId mismatch");
      if (preCallManifest.protocolVersion !== receipt.protocolVersion) errors.push("pre-call manifest protocolVersion mismatch");
      if (preCallManifest.codebookVersion !== receipt.codebookVersion) errors.push("pre-call manifest codebookVersion mismatch");
      if (preCallManifest.promptTemplateVersion !== receipt.promptTemplateVersion) errors.push("pre-call manifest promptTemplateVersion mismatch");
      if (preCallManifest.datasetSha256 !== dataset.sha256) errors.push("pre-call manifest datasetSha256 mismatch");
      if (preCallManifest.assignmentSha256 !== receipt.assignmentSha256) errors.push("pre-call manifest assignmentSha256 mismatch");
      validateExpectedCallMatrix(preCallManifest, assignments);
      verifyProviderCallReceipts(preCallManifest, providerCallReceipts);
      validateCallsAgainstObservations(preCallManifest, providerCallReceipts, observations);
      const expectedBundleSha256 = completedExecutionBundleSha256({
        preCallManifestSha256: preCallManifest.manifestSha256,
        providerCallReceiptsSha256: hashJson(providerCallReceipts),
        assignmentSha256: receipt.assignmentSha256 as string,
        observationSha256: receipt.observationSha256 as string,
        resultSha256: receipt.resultSha256 as string,
        safetyPacketArtifactSha256: execution.safetyPacketArtifactSha256,
        safetyContextArtifactSha256: preCallManifest.safetyContextArtifactSha256,
      });
      if (execution.completedBundleSha256 !== expectedBundleSha256) errors.push("receipt completedBundleSha256 mismatch");
      const earliestCallStart = Math.min(...providerCallReceipts.map((call) => Date.parse(call.callStartedAt)));
      const latestBundleTime = Math.max(...providerCallReceipts.map((call) => Date.parse(call.bundledAt)));
      if (Date.parse(preCallManifest.createdAt) > earliestCallStart) {
        errors.push("pre-call manifest createdAt is after calls began; local timestamp is internally inconsistent");
      }
      if (Date.parse(receipt.startedAt as string) > earliestCallStart) errors.push("receipt startedAt is after calls began");
      if (Date.parse(receipt.completedAt as string) < latestBundleTime) errors.push("receipt completedAt precedes call bundling");

      if (preCallAnchor) {
        if (preCallAnchor.targetSha256 !== preCallManifest.manifestSha256) errors.push("pre-call anchor does not target the pre-call manifest hash");
        if (Date.parse(preCallAnchor.anchoredAt) > earliestCallStart) errors.push("pre-call anchor timestamp is after calls began");
      }
      if (completedBundleAnchor) {
        if (completedBundleAnchor.targetSha256 !== expectedBundleSha256) errors.push("completed-bundle anchor does not target the completed bundle hash");
        if (Date.parse(completedBundleAnchor.anchoredAt) < latestBundleTime) errors.push("completed-bundle anchor timestamp precedes bundle completion");
      }
    }

    const provider = receipt.provider as unknown as ProviderReceiptSummary;
    const observedProvider = providerReceiptSummary(observations, provider.boundary);
    if (canonicalJson(provider) !== canonicalJson(observedProvider)) errors.push("receipt provider summary does not match observations");

    const usage = receipt.usage as Record<string, unknown>;
    const votes = observations.filter((item) => item.postExposure.status === "VOTE").length;
    if (usage.completedVotes !== votes) errors.push("receipt completedVotes mismatch");
    if (usage.nonVotes !== observations.length - votes) errors.push("receipt nonVotes mismatch");
    if (execution.captureStatus === "CAPTURED" && providerCallReceipts) {
      if (usage.plannedCalls !== providerCallReceipts.length) errors.push("receipt plannedCalls does not match exact expected call matrix");
      if (usage.inputTokens !== providerCallReceipts.reduce((sum, item) => sum + item.usage.inputTokens, 0)) errors.push("receipt inputTokens mismatch");
      if (usage.outputTokens !== providerCallReceipts.reduce((sum, item) => sum + item.usage.outputTokens, 0)) errors.push("receipt outputTokens mismatch");
      if (usage.totalLatencyMs !== providerCallReceipts.reduce((sum, item) => sum + item.usage.latencyMs, 0)) errors.push("receipt totalLatencyMs mismatch");
      if (usage.transportRetries !== providerCallReceipts.reduce((sum, item) => sum + item.usage.transportRetries, 0)) errors.push("receipt transportRetries mismatch");
      const costs = providerCallReceipts.map((item) => item.usage.estimatedCostUsd);
      const expectedCost = costs.some((cost) => cost === null)
        ? null
        : costs.reduce<number>((sum, cost) => sum + (cost as number), 0);
      if (usage.estimatedCostUsd !== expectedCost) errors.push("receipt estimatedCostUsd mismatch");
    } else {
      if ((usage.plannedCalls as number) < observations.length) errors.push("receipt plannedCalls is below observed calls");
      if (usage.inputTokens !== observations.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0)) errors.push("receipt inputTokens mismatch");
      if (usage.outputTokens !== observations.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0)) errors.push("receipt outputTokens mismatch");
      if (usage.totalLatencyMs !== observations.reduce((sum, item) => sum + item.latencyMs, 0)) errors.push("receipt totalLatencyMs mismatch");
    }
  } catch (error) {
    errors.push(`semantic receipt verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    valid: errors.length === 0,
    errors,
    receiptSha256: recordedReceiptHash,
    computedReceiptSha256: computedReceiptHash,
  };
}
