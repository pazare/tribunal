import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { analyzeObservations } from "./analysis.js";
import { CLINICAL_CODEBOOK_VERSION, PROMPT_TEMPLATE_VERSION } from "./codebooks.js";
import { loadSyntheticFixtures } from "./fixtures.js";
import { gitState, hashFile } from "./provenance.js";
import {
  buildRunReceipt,
  providerReceiptSummary,
  verifyRunDirectory,
} from "./receipt.js";
import {
  EXPERIMENT_CONDITIONS,
  type AgentObservation,
  type ExperimentAssignment,
} from "./types.js";
import { assertExactObjectKeys } from "./validate.js";

export interface ExternalObservationRunMetadata {
  schemaVersion: 1;
  runId: string;
  protocolVersion: string;
  experimentId: string;
  hypothesis: string;
  designMode: "FULL_E2" | "REDUCED_DESIGN";
  analysis: {
    bootstrapReplicates: number;
    bootstrapSeed: number;
  };
  dataset: {
    id: string;
    version: string;
    class: string;
    source: string;
    licenseStatus: string;
    duaStatus: string;
    deidentificationStatus: string;
    inclusionCriteria: string[];
    exclusionCriteria: string[];
  };
  providerBoundary: string;
  usage: {
    plannedCalls: number;
    transportRetries: number;
    pricingSource: string | null;
    estimatedCostUsd: number | null;
  };
  rawProviderErrorsStored: false;
  ledgerHead: string | null;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
}

function nonNegativeInteger(value: unknown, label: string, positive = false): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < (positive ? 1 : 0)) {
    throw new Error(`${label} must be a ${positive ? "positive" : "non-negative"} integer`);
  }
}

function stringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.length > 0)) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
}

export function validateExternalRunMetadata(value: unknown): asserts value is ExternalObservationRunMetadata {
  const metadata = asRecord(value, "metadata");
  assertExactObjectKeys(metadata, [
    "schemaVersion", "runId", "protocolVersion", "experimentId", "hypothesis", "designMode", "analysis",
    "dataset", "providerBoundary", "usage", "rawProviderErrorsStored", "ledgerHead",
  ], "metadata");
  if (metadata.schemaVersion !== 1) throw new Error("metadata.schemaVersion must be 1");
  for (const key of ["runId", "protocolVersion", "experimentId", "hypothesis", "providerBoundary"] as const) {
    nonEmptyString(metadata[key], `metadata.${key}`);
  }
  if (metadata.designMode !== "FULL_E2" && metadata.designMode !== "REDUCED_DESIGN") {
    throw new Error("metadata.designMode is invalid");
  }
  if (metadata.rawProviderErrorsStored !== false) throw new Error("metadata.rawProviderErrorsStored must be false");
  if (metadata.ledgerHead !== null && (typeof metadata.ledgerHead !== "string" || !/^[a-f0-9]{64}$/u.test(metadata.ledgerHead))) {
    throw new Error("metadata.ledgerHead must be null or a lowercase SHA-256 hash");
  }
  const analysis = asRecord(metadata.analysis, "metadata.analysis");
  assertExactObjectKeys(analysis, ["bootstrapReplicates", "bootstrapSeed"], "metadata.analysis");
  nonNegativeInteger(analysis.bootstrapReplicates, "metadata.analysis.bootstrapReplicates", true);
  nonNegativeInteger(analysis.bootstrapSeed, "metadata.analysis.bootstrapSeed");
  if ((analysis.bootstrapSeed as number) > 0xffffffff) throw new Error("metadata.analysis.bootstrapSeed must be uint32");

  const dataset = asRecord(metadata.dataset, "metadata.dataset");
  assertExactObjectKeys(dataset, [
    "id", "version", "class", "source", "licenseStatus", "duaStatus", "deidentificationStatus",
    "inclusionCriteria", "exclusionCriteria",
  ], "metadata.dataset");
  for (const key of ["id", "version", "class", "source", "licenseStatus", "duaStatus", "deidentificationStatus"] as const) {
    nonEmptyString(dataset[key], `metadata.dataset.${key}`);
  }
  stringArray(dataset.inclusionCriteria, "metadata.dataset.inclusionCriteria");
  stringArray(dataset.exclusionCriteria, "metadata.dataset.exclusionCriteria");

  const usage = asRecord(metadata.usage, "metadata.usage");
  assertExactObjectKeys(usage, ["plannedCalls", "transportRetries", "pricingSource", "estimatedCostUsd"], "metadata.usage");
  nonNegativeInteger(usage.plannedCalls, "metadata.usage.plannedCalls");
  nonNegativeInteger(usage.transportRetries, "metadata.usage.transportRetries");
  if (usage.pricingSource !== null && (typeof usage.pricingSource !== "string" || usage.pricingSource.length === 0)) {
    throw new Error("metadata.usage.pricingSource must be null or a non-empty string");
  }
  if (usage.estimatedCostUsd !== null && (
    typeof usage.estimatedCostUsd !== "number" || !Number.isFinite(usage.estimatedCostUsd) || usage.estimatedCostUsd < 0
  )) {
    throw new Error("metadata.usage.estimatedCostUsd must be null or finite and non-negative");
  }
}

function parseJsonl(path: string): AgentObservation[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as AgentObservation;
      } catch (error) {
        throw new Error(`observation line ${index + 1} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}

function requireRegularInput(path: string, label: string): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} must be a regular file, not a symlink`);
}

export function createReceiptedExternalObservationRun(input: {
  repoRoot: string;
  fixturesPath: string;
  assignmentsPath: string;
  observationsPath: string;
  outputDirectory: string;
  metadata: ExternalObservationRunMetadata;
  allowDirty?: boolean;
}) {
  validateExternalRunMetadata(input.metadata);
  const repoRoot = resolve(input.repoRoot);
  const fixturesPath = resolve(input.fixturesPath);
  const assignmentsInput = resolve(input.assignmentsPath);
  const observationsInput = resolve(input.observationsPath);
  const outputDirectory = resolve(input.outputDirectory);
  for (const [path, label] of [
    [fixturesPath, "fixtures"],
    [assignmentsInput, "assignments"],
    [observationsInput, "observations"],
  ] as const) requireRegularInput(path, label);
  const gitAtStart = gitState(repoRoot);
  if (gitAtStart.dirty && !input.allowDirty) {
    throw new Error("refusing to receipt external observations from a dirty worktree; commit first or pass --allow-dirty for an explicitly exploratory run");
  }
  if (existsSync(outputDirectory)) {
    const stat = lstatSync(outputDirectory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("output directory must be a real directory");
    if (readdirSync(outputDirectory).length > 0) throw new Error(`refusing to overwrite immutable run directory: ${outputDirectory}`);
  }
  const startedAt = new Date().toISOString();
  const cases = loadSyntheticFixtures(fixturesPath);
  const parsedAssignments: unknown = JSON.parse(readFileSync(assignmentsInput, "utf8"));
  if (!Array.isArray(parsedAssignments)) throw new Error("assignments input must be a JSON array");
  const assignments = parsedAssignments as ExperimentAssignment[];
  const observations = parseJsonl(observationsInput);
  const results = analyzeObservations(cases, assignments, observations, {
    designMode: input.metadata.designMode,
    bootstrapReplicates: input.metadata.analysis.bootstrapReplicates,
    bootstrapSeed: input.metadata.analysis.bootstrapSeed,
  });
  mkdirSync(outputDirectory, { recursive: true });
  const assignmentsPath = resolve(outputDirectory, "assignments.json");
  const observationsPath = resolve(outputDirectory, "observations.jsonl");
  const resultsPath = resolve(outputDirectory, "results.json");
  copyFileSync(assignmentsInput, assignmentsPath);
  copyFileSync(observationsInput, observationsPath);
  writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
  const completedAt = new Date().toISOString();
  const votes = observations.filter((row) => row.postExposure.status === "VOTE").length;
  const plannedConditions = EXPERIMENT_CONDITIONS.filter((condition) =>
    assignments.some((assignment) => assignment.condition === condition),
  );
  const agentIds = [...new Set(assignments.map((assignment) => assignment.agentId))].sort();
  const replicates = new Set(assignments.map((assignment) => assignment.replicate)).size;
  const receipt = buildRunReceipt({
    cwd: repoRoot,
    gitAtStart,
    runId: input.metadata.runId,
    startedAt,
    completedAt,
    protocolVersion: input.metadata.protocolVersion,
    experimentId: input.metadata.experimentId,
    hypothesis: input.metadata.hypothesis,
    dataset: {
      ...input.metadata.dataset,
      sha256: hashFile(fixturesPath),
      rowCount: cases.length,
    },
    artifactFiles: {
      assignments: "assignments.json",
      observations: "observations.jsonl",
      results: "results.json",
    },
    assignmentHash: hashFile(assignmentsPath),
    observationHash: hashFile(observationsPath),
    resultHash: hashFile(resultsPath),
    codebookVersion: CLINICAL_CODEBOOK_VERSION,
    promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
    randomSeed: assignments[0]?.seed ?? input.metadata.analysis.bootstrapSeed,
    design: {
      mode: input.metadata.designMode,
      plannedConditions,
      agentIds,
      replicates,
      assignmentCount: assignments.length,
    },
    analysis: {
      resultSchemaVersion: 2,
      bootstrapReplicates: input.metadata.analysis.bootstrapReplicates,
      bootstrapSeed: input.metadata.analysis.bootstrapSeed,
    },
    provider: providerReceiptSummary(observations, input.metadata.providerBoundary),
    usage: {
      plannedCalls: input.metadata.usage.plannedCalls,
      completedVotes: votes,
      nonVotes: observations.length - votes,
      transportRetries: input.metadata.usage.transportRetries,
      inputTokens: observations.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0),
      outputTokens: observations.reduce((sum, row) => sum + (row.outputTokens ?? 0), 0),
      totalLatencyMs: observations.reduce((sum, row) => sum + row.latencyMs, 0),
      pricingSource: input.metadata.usage.pricingSource,
      estimatedCostUsd: input.metadata.usage.estimatedCostUsd,
    },
    rawProviderErrorsStored: false,
    ledgerHead: input.metadata.ledgerHead,
  });
  writeFileSync(resolve(outputDirectory, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  const verification = verifyRunDirectory(outputDirectory, fixturesPath);
  if (!verification.valid) throw new Error(`external observation receipt verification failed: ${verification.errors.join("; ")}`);
  return {
    runId: input.metadata.runId,
    outputDirectory,
    gitAtStart,
    cases: cases.length,
    assignments: assignments.length,
    observations: observations.length,
    receiptSha256: receipt.receiptSha256,
    localSemanticReplayVerified: true,
    externalAnchorVerified: false,
  };
}
