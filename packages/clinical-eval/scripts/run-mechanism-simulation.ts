import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLINICAL_CODEBOOK_VERSION,
  EXPERIMENT_CONDITIONS,
  PROGRAMMED_POLICIES,
  PROMPT_TEMPLATE_VERSION,
  analyzeObservations,
  buildFullFactorialAssignments,
  buildRunReceipt,
  gitState,
  hashFile,
  loadSyntheticFixtures,
  providerReceiptSummary,
  simulateProgrammedObservations,
  verifyRunDirectory,
  type ProgrammedPolicy,
} from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const fixturePath = resolve(repoRoot, "packages/clinical-eval/fixtures/mechanism-fixtures-v0.1.json");
const seed = 18;
const runId = "mechanism-simulator-v0.1-seed18";
const outputIndex = process.argv.indexOf("--output");
const runDirectory = resolve(
  repoRoot,
  outputIndex >= 0 && process.argv[outputIndex + 1]
    ? process.argv[outputIndex + 1]
    : `runs/clinical-eval/${runId}`,
);
const gitAtStart = gitState(repoRoot);
if (gitAtStart.dirty && !process.argv.includes("--allow-dirty")) {
  throw new Error("refusing to run from a dirty worktree; commit first or pass --allow-dirty for an explicitly exploratory run");
}
if (existsSync(runDirectory) && readdirSync(runDirectory).length > 0) {
  throw new Error(`refusing to overwrite immutable run directory: ${runDirectory}`);
}
const startedAt = new Date().toISOString();
const cases = loadSyntheticFixtures(fixturePath);
const agentIds = PROGRAMMED_POLICIES.map((policy) => policy.toLowerCase());
const policies = Object.fromEntries(
  agentIds.map((agentId, index) => [agentId, PROGRAMMED_POLICIES[index]]),
) as Record<string, ProgrammedPolicy>;
const assignments = buildFullFactorialAssignments(cases, agentIds, 1, seed);
const observations = simulateProgrammedObservations(cases, assignments, policies);
const results = analyzeObservations(cases, assignments, observations, {
  bootstrapReplicates: 2_000,
  bootstrapSeed: seed,
});

mkdirSync(runDirectory, { recursive: true });
const assignmentsPath = resolve(runDirectory, "assignments.json");
const observationsPath = resolve(runDirectory, "observations.jsonl");
const resultsPath = resolve(runDirectory, "results.json");
writeFileSync(assignmentsPath, `${JSON.stringify(assignments, null, 2)}\n`);
writeFileSync(observationsPath, `${observations.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
const completedAt = new Date().toISOString();
const votes = observations.filter((row) => row.postExposure.status === "VOTE").length;
const receipt = buildRunReceipt({
  cwd: repoRoot,
  gitAtStart,
  runId,
  startedAt,
  completedAt,
  protocolVersion: "tribunal-clinical-methods-2026-07-16-v2",
  experimentId: "E2_OFFLINE_FALSIFICATION_GATE",
  hypothesis:
    "The analyzer recovers the qualitative behavior programmed into conforming, evidence-following, frozen, and refusing offline providers.",
  dataset: {
    id: "tribunal-mechanism-fixtures",
    version: "v0.1",
    class: "AUTHOR_DEFINED_SYNTHETIC_MECHANISM_FIXTURES_NOT_CLINICIAN_VALIDATED",
    source: "repository-authored fixture file",
    sha256: hashFile(fixturePath),
    rowCount: cases.length,
    licenseStatus: "REPOSITORY_AUTHORED_SYNTHETIC",
    duaStatus: "NOT_APPLICABLE",
    deidentificationStatus: "NO_REAL_PATIENT_DATA",
    inclusionCriteria: ["schema-valid", "fixed planted action", "balanced majority-pressure direction"],
    exclusionCriteria: ["real patient record", "clinical truth claim", "unsigned fixture interpreted as clinician gold standard"],
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
  randomSeed: seed,
  design: {
    mode: "FULL_E2",
    plannedConditions: [...EXPERIMENT_CONDITIONS],
    agentIds,
    replicates: 1,
    assignmentCount: assignments.length,
  },
  analysis: {
    resultSchemaVersion: 2,
    bootstrapReplicates: 2_000,
    bootstrapSeed: seed,
  },
  provider: providerReceiptSummary(
    observations,
    "Deterministic scripted providers; no LLM and no clinical reasoning.",
  ),
  usage: {
    plannedCalls: assignments.length,
    completedVotes: votes,
    nonVotes: observations.length - votes,
    transportRetries: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalLatencyMs: 0,
    pricingSource: null,
    estimatedCostUsd: 0,
  },
  rawProviderErrorsStored: false,
  ledgerHead: null,
});
writeFileSync(resolve(runDirectory, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
const verification = verifyRunDirectory(runDirectory, fixturePath);
if (!verification.valid) throw new Error(`receipt verification failed: ${verification.errors.join("; ")}`);
process.stdout.write(
  `${JSON.stringify({ runId, runDirectory, gitAtStart, cases: cases.length, assignments: assignments.length, providerBoundary: "Deterministic scripted providers; no LLM and no clinical reasoning.", localSemanticReplayVerified: true, externalAnchorVerified: false, receiptSha256: receipt.receiptSha256 }, null, 2)}\n`,
);
