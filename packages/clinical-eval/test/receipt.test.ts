import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  CLINICAL_CODEBOOK_VERSION,
  EXPERIMENT_CONDITIONS,
  PROMPT_TEMPLATE_VERSION,
  analyzeObservations,
  buildFullFactorialAssignments,
  buildRunReceipt,
  createReceiptedExternalObservationRun,
  hashFile,
  hashJson,
  loadSyntheticFixtures,
  providerReceiptSummary,
  simulateProgrammedObservations,
  verifyRunDirectory,
  type AgentObservation,
  type ExperimentAssignment,
} from "../src/index.js";

const fixturesPath = resolve("fixtures/mechanism-fixtures-v0.1.json");

function writeReceipt(directory: string, receipt: Record<string, unknown>): void {
  const { receiptSha256: _ignored, ...body } = receipt;
  writeFileSync(
    resolve(directory, "receipt.json"),
    `${JSON.stringify({ ...body, receiptSha256: hashJson(body) }, null, 2)}\n`,
  );
}

function makeValidRun() {
  const directory = mkdtempSync(resolve(tmpdir(), "tribunal-clinical-receipt-"));
  const fixtures = loadSyntheticFixtures(fixturesPath);
  const assignments = buildFullFactorialAssignments(fixtures, ["frozen"], 1, 18);
  const observations = simulateProgrammedObservations(fixtures, assignments, { frozen: "FROZEN" });
  const results = analyzeObservations(fixtures, assignments, observations, {
    bootstrapReplicates: 20,
    bootstrapSeed: 18,
  });
  const assignmentsPath = resolve(directory, "assignments.json");
  const observationsPath = resolve(directory, "observations.jsonl");
  const resultsPath = resolve(directory, "results.json");
  writeFileSync(assignmentsPath, `${JSON.stringify(assignments, null, 2)}\n`);
  writeFileSync(observationsPath, `${observations.map((row) => JSON.stringify(row)).join("\n")}\n`);
  writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
  const receipt = buildRunReceipt({
    cwd: directory,
    gitAtStart: { commit: "a".repeat(40), dirty: false, branch: "test" },
    runId: "receipt-test",
    startedAt: "2026-07-16T00:00:00.000Z",
    completedAt: "2026-07-16T00:00:01.000Z",
    protocolVersion: "test",
    experimentId: "E2_TEST",
    hypothesis: "semantic replay detects tampering",
    dataset: {
      id: "fixture-test",
      version: "1",
      class: "SYNTHETIC",
      source: "test",
      sha256: hashFile(fixturesPath),
      rowCount: fixtures.length,
      licenseStatus: "TEST",
      duaStatus: "NOT_APPLICABLE",
      deidentificationStatus: "NO_REAL_DATA",
      inclusionCriteria: ["schema-valid"],
      exclusionCriteria: ["real patient record"],
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
    randomSeed: 18,
    design: {
      mode: "FULL_E2",
      plannedConditions: [...EXPERIMENT_CONDITIONS],
      agentIds: ["frozen"],
      replicates: 1,
      assignmentCount: assignments.length,
    },
    analysis: {
      resultSchemaVersion: 2,
      bootstrapReplicates: 20,
      bootstrapSeed: 18,
    },
    provider: providerReceiptSummary(observations, "test programmed provider"),
    usage: {
      plannedCalls: assignments.length,
      completedVotes: observations.length,
      nonVotes: 0,
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
  writeFileSync(resolve(directory, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  return { directory, assignments, observations, resultsPath };
}

test("receipt verifier replays a complete run and detects result tampering", () => {
  const run = makeValidRun();
  assert.equal(verifyRunDirectory(run.directory, fixturesPath).valid, true);
  writeFileSync(run.resultsPath, `${readFileSync(run.resultsPath, "utf8")}tamper\n`);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /result hash mismatch|semantic/u);
});

test("canonical receipt hashing rejects non-JSON values", () => {
  assert.throws(() => hashJson({ value: Number.NaN }), /non-finite/u);
  assert.throws(() => hashJson({ value: undefined }), /undefined/u);
  assert.throws(() => hashJson(new Date()), /plain objects/u);
});

test("receipt verifier rejects empty observations even after all local hashes are refreshed", () => {
  const run = makeValidRun();
  const observationsPath = resolve(run.directory, "observations.jsonl");
  writeFileSync(observationsPath, "");
  const receipt = JSON.parse(readFileSync(resolve(run.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  receipt.observationSha256 = hashFile(observationsPath);
  const usage = receipt.usage as Record<string, unknown>;
  usage.completedVotes = 0;
  usage.nonVotes = 0;
  usage.inputTokens = 0;
  usage.outputTokens = 0;
  usage.totalLatencyMs = 0;
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /missing explicit observation|provider summary/u);
});

test("FULL_E2 receipt rejects globally complete but split per-state arm coverage", () => {
  const run = makeValidRun();
  const selectedAssignments: ExperimentAssignment[] = [];
  const usedStates = new Set<string>();
  for (const condition of EXPERIMENT_CONDITIONS) {
    const row = run.assignments.find((item) => item.condition === condition && !usedStates.has(item.sealedStateId));
    assert.ok(row);
    usedStates.add(row.sealedStateId);
    selectedAssignments.push({ ...row, executionOrder: selectedAssignments.length });
  }
  const ids = new Set(selectedAssignments.map((item) => item.assignmentId));
  const selectedObservations = run.observations.filter((item) => ids.has(item.assignmentId));
  const assignmentsPath = resolve(run.directory, "assignments.json");
  const observationsPath = resolve(run.directory, "observations.jsonl");
  writeFileSync(assignmentsPath, `${JSON.stringify(selectedAssignments, null, 2)}\n`);
  writeFileSync(observationsPath, `${selectedObservations.map((row) => JSON.stringify(row)).join("\n")}\n`);
  const receipt = JSON.parse(readFileSync(resolve(run.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  receipt.assignmentSha256 = hashFile(assignmentsPath);
  receipt.observationSha256 = hashFile(observationsPath);
  const design = receipt.design as Record<string, unknown>;
  design.assignmentCount = selectedAssignments.length;
  const usage = receipt.usage as Record<string, unknown>;
  usage.plannedCalls = selectedObservations.length;
  usage.completedVotes = selectedObservations.length;
  const provider = providerReceiptSummary(selectedObservations, "test programmed provider");
  receipt.provider = provider;
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /same planned arm set|FULL_E2 requires/u);
});

test("receipt verifier rejects missing and extra receipt fields before trusting self-hash", () => {
  const extraRun = makeValidRun();
  const extra = JSON.parse(readFileSync(resolve(extraRun.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  extra.unexpectedPrivateField = "must fail closed";
  writeReceipt(extraRun.directory, extra);
  assert.match(verifyRunDirectory(extraRun.directory, fixturesPath).errors.join(" "), /unexpected keys/u);

  const missingRun = makeValidRun();
  const missing = JSON.parse(readFileSync(resolve(missingRun.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  delete missing.runId;
  writeReceipt(missingRun.directory, missing);
  assert.match(verifyRunDirectory(missingRun.directory, fixturesPath).errors.join(" "), /runId/u);
});

test("receipt verifier rejects symlinked artifacts and the receipt itself", () => {
  const artifactRun = makeValidRun();
  const assignmentsPath = resolve(artifactRun.directory, "assignments.json");
  const externalAssignments = resolve(artifactRun.directory, "..", `external-assignments-${Date.now()}.json`);
  copyFileSync(assignmentsPath, externalAssignments);
  unlinkSync(assignmentsPath);
  symlinkSync(externalAssignments, assignmentsPath);
  assert.match(verifyRunDirectory(artifactRun.directory, fixturesPath).errors.join(" "), /not a symlink/u);

  const receiptRun = makeValidRun();
  const receiptPath = resolve(receiptRun.directory, "receipt.json");
  const externalReceipt = resolve(receiptRun.directory, "..", `external-receipt-${Date.now()}.json`);
  renameSync(receiptPath, externalReceipt);
  symlinkSync(externalReceipt, receiptPath);
  assert.match(verifyRunDirectory(receiptRun.directory, fixturesPath).errors.join(" "), /receipt.*symlink/u);
});

test("external model-observation workflow emits a replay-verified immutable bundle", () => {
  const input = makeValidRun();
  const outputDirectory = mkdtempSync(resolve(tmpdir(), "tribunal-clinical-external-"));
  const result = createReceiptedExternalObservationRun({
    repoRoot: resolve("../.."),
    fixturesPath,
    assignmentsPath: resolve(input.directory, "assignments.json"),
    observationsPath: resolve(input.directory, "observations.jsonl"),
    outputDirectory,
    allowDirty: true,
    metadata: {
      schemaVersion: 1,
      runId: "external-observations-test",
      protocolVersion: "test",
      experimentId: "E2_EXTERNAL_TEST",
      hypothesis: "external observation bundles replay exactly",
      designMode: "FULL_E2",
      analysis: { bootstrapReplicates: 20, bootstrapSeed: 18 },
      dataset: {
        id: "fixture-test",
        version: "1",
        class: "SYNTHETIC",
        source: "test",
        licenseStatus: "TEST",
        duaStatus: "NOT_APPLICABLE",
        deidentificationStatus: "NO_REAL_DATA",
        inclusionCriteria: ["schema-valid"],
        exclusionCriteria: ["real patient record"],
      },
      providerBoundary: "externally collected programmed observations for workflow testing",
      usage: {
        plannedCalls: input.observations.length,
        transportRetries: 0,
        pricingSource: null,
        estimatedCostUsd: 0,
      },
      rawProviderErrorsStored: false,
      ledgerHead: null,
    },
  });
  assert.equal(result.localSemanticReplayVerified, true);
  assert.equal(verifyRunDirectory(outputDirectory, fixturesPath).valid, true);
});
