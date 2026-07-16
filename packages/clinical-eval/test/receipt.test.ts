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
  PROVIDER_CALL_EVIDENCE_BOUNDARY,
  analyzeObservations,
  buildFullFactorialAssignments,
  buildExternalAnchorReceipt,
  buildPreCallManifest,
  buildProviderCallReceipt,
  buildRunReceipt,
  canonicalJson,
  completedExecutionBundleSha256,
  createReceiptedExternalObservationRun,
  expectedCallMatrixFromAssignments,
  hashFile,
  hashJson,
  loadSyntheticFixtures,
  providerReceiptSummary,
  simulateProgrammedObservations,
  verifyRunDirectory,
  type AgentObservation,
  type PreCallManifestBody,
  type ProviderCallReceipt,
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

function requestedConfiguration(observation: AgentObservation) {
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

function makeCapturedRun() {
  const run = makeValidRun();
  const receiptPath = resolve(run.directory, "receipt.json");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
  const promptInputs = new Map(run.observations.map((observation) => [
    observation.assignmentId,
    {
      baselinePromptSha256: observation.baselinePromptHash,
      baselineInputSha256: observation.baselinePromptHash,
      revisionPromptSha256: observation.revisionPromptHash,
      revisionInputSha256: observation.revisionPromptHash,
      requested: requestedConfiguration(observation),
    },
  ]));
  const expectedCalls = expectedCallMatrixFromAssignments(run.assignments, promptInputs);
  const configurations = expectedCalls
    .map((call) => call.requested)
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  const manifest = buildPreCallManifest({
    schemaVersion: 1,
    runId: receipt.runId as string,
    createdAt: "2026-07-15T23:59:58.000Z",
    protocolVersion: receipt.protocolVersion as string,
    codebookVersion: receipt.codebookVersion as string,
    promptTemplateVersion: receipt.promptTemplateVersion as string,
    datasetSha256: (receipt.dataset as Record<string, string>).sha256,
    assignmentSha256: receipt.assignmentSha256 as string,
    caseIds: [...new Set(run.assignments.map((row) => row.caseId))].sort(),
    agentIds: [...new Set(run.assignments.map((row) => row.agentId))].sort(),
    replicateLevels: [...new Set(run.assignments.map((row) => row.replicate))].sort((a, b) => a - b),
    conditions: EXPERIMENT_CONDITIONS.filter((condition) => run.assignments.some((row) => row.condition === condition)),
    providerConfigurationSha256: hashJson(configurations),
    expectedCalls,
    safetyPacketSchemaVersion: null,
    safetyPacketTemplateSha256: null,
    safetyContextArtifactSha256: null,
    claimBoundary: "This manifest is a locally hash-addressed declaration. Its hash and local timestamps alone do not establish preregistration, independent time, or tamper evidence; those claims require a separately verified external anchor created before calls began.",
  });
  const firstByState = new Map<string, AgentObservation>();
  for (const observation of run.observations) {
    if (!firstByState.has(observation.sealedStateId)) firstByState.set(observation.sealedStateId, observation);
  }
  let baselineIndex = 0;
  const calls = expectedCalls.map((expected) => {
    const observation = expected.phase === "BASELINE"
      ? firstByState.get(expected.sealedStateId) as AgentObservation
      : run.observations.find((row) => row.assignmentId === expected.assignmentId) as AgentObservation;
    const callStartedAt = expected.phase === "BASELINE"
      ? new Date(Date.parse("2026-07-15T23:59:59.000Z") + baselineIndex++).toISOString()
      : observation.callStartedAt;
    return buildProviderCallReceipt({
      schemaVersion: 1,
      runId: manifest.runId,
      expectedCallId: expected.expectedCallId,
      phase: expected.phase,
      assignmentId: expected.assignmentId,
      sealedStateId: expected.sealedStateId,
      requested: expected.requested,
      served: {
        provider: expected.requested.provider,
        model: expected.requested.model,
        effort: expected.requested.effort,
      },
      providerCallId: `provider-call-${expected.executionOrder}`,
      providerSessionId: expected.phase === "BASELINE" ? observation.baselineSessionId : observation.revisionSessionId,
      promptSha256: expected.promptSha256,
      inputSha256: expected.inputSha256,
      outputSha256: hashJson(expected.phase === "BASELINE" ? observation.baseline : observation.postExposure),
      callStartedAt,
      callCompletedAt: callStartedAt,
      bundledAt: callStartedAt,
      providerEvidenceBoundary: PROVIDER_CALL_EVIDENCE_BOUNDARY,
      usage: {
        inputTokens: expected.phase === "REVISION" ? observation.inputTokens ?? 0 : 0,
        outputTokens: expected.phase === "REVISION" ? observation.outputTokens ?? 0 : 0,
        latencyMs: expected.phase === "REVISION" ? observation.latencyMs : 0,
        transportRetries: 0,
        estimatedCostUsd: expected.phase === "BASELINE" ? 0.01 : 0.02,
      },
    });
  });
  const manifestPath = resolve(run.directory, "pre-call-manifest.json");
  const callsPath = resolve(run.directory, "provider-call-receipts.jsonl");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(callsPath, `${calls.map((call) => JSON.stringify(call)).join("\n")}\n`);
  const callReceiptsSha256 = hashJson(calls);
  const execution = {
    captureStatus: "CAPTURED",
    preCallManifestFile: "pre-call-manifest.json",
    preCallManifestSha256: manifest.manifestSha256,
    providerCallReceiptsFile: "provider-call-receipts.jsonl",
    providerCallReceiptsSha256: callReceiptsSha256,
    safetyPacketFile: null,
    safetyPacketArtifactSha256: null,
    safetyContextFile: null,
    preCallAnchorFile: null,
    preCallAnchorSha256: null,
    completedBundleSha256: completedExecutionBundleSha256({
      preCallManifestSha256: manifest.manifestSha256,
      providerCallReceiptsSha256: callReceiptsSha256,
      assignmentSha256: receipt.assignmentSha256 as string,
      observationSha256: receipt.observationSha256 as string,
      resultSha256: receipt.resultSha256 as string,
      safetyPacketArtifactSha256: null,
      safetyContextArtifactSha256: null,
    }),
    completedBundleAnchorFile: null,
    completedBundleAnchorSha256: null,
    recordedAnchorAssertions: { preCall: "ABSENT", completedBundle: "ABSENT" },
    claims: {
      independentPreregistrationEvidence: "NOT_ESTABLISHED",
      independentTimeEvidence: "NOT_ESTABLISHED",
      completedBundleTamperEvidence: "NOT_ESTABLISHED",
      providerIssuanceEvidence: "NOT_ESTABLISHED",
    },
  };
  receipt.startedAt = "2026-07-15T23:59:58.000Z";
  receipt.completedAt = "2026-07-16T00:00:02.000Z";
  receipt.executionProvenance = execution;
  const usage = receipt.usage as Record<string, unknown>;
  usage.plannedCalls = calls.length;
  usage.transportRetries = 0;
  usage.inputTokens = 0;
  usage.outputTokens = 0;
  usage.totalLatencyMs = 0;
  usage.estimatedCostUsd = calls.reduce((sum, call) => sum + (call.usage.estimatedCostUsd as number), 0);
  writeReceipt(run.directory, receipt);
  return { ...run, receiptPath, manifestPath, callsPath, manifest, calls };
}

function refreshCapturedHashes(run: ReturnType<typeof makeCapturedRun>): void {
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  const manifest = JSON.parse(readFileSync(run.manifestPath, "utf8")) as Record<string, unknown>;
  const calls = readFileSync(run.callsPath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) as ProviderCallReceipt[];
  const execution = receipt.executionProvenance as Record<string, unknown>;
  execution.preCallManifestSha256 = manifest.manifestSha256;
  execution.providerCallReceiptsSha256 = hashJson(calls);
  execution.completedBundleSha256 = completedExecutionBundleSha256({
    preCallManifestSha256: manifest.manifestSha256 as string,
    providerCallReceiptsSha256: execution.providerCallReceiptsSha256 as string,
    assignmentSha256: receipt.assignmentSha256 as string,
    observationSha256: receipt.observationSha256 as string,
    resultSha256: receipt.resultSha256 as string,
    safetyPacketArtifactSha256: (execution.safetyPacketArtifactSha256 ?? null) as string | null,
    safetyContextArtifactSha256: (manifest.safetyContextArtifactSha256 ?? null) as string | null,
  });
  writeReceipt(run.directory, receipt);
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

test("captured provenance verifies an exact baseline-plus-revision call matrix without double-counting shared baselines", () => {
  const run = makeCapturedRun();
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.deepEqual(verification.errors, []);
  assert.equal(verification.valid, true);
  const sealedStates = new Set(run.assignments.map((row) => row.sealedStateId)).size;
  assert.equal(run.calls.length, sealedStates + run.assignments.length);
  assert.notEqual(run.calls.length, run.assignments.length * 2);
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  assert.ok(Math.abs(
    ((receipt.usage as Record<string, unknown>).estimatedCostUsd as number) -
      (sealedStates * 0.01 + run.assignments.length * 0.02),
  ) < 1e-12);
});

test("external observation bundler preserves and verifies supplied pre-call and per-call provenance", () => {
  const input = makeCapturedRun();
  const outputDirectory = mkdtempSync(resolve(tmpdir(), "tribunal-clinical-captured-external-"));
  const result = createReceiptedExternalObservationRun({
    repoRoot: resolve("../.."),
    fixturesPath,
    assignmentsPath: resolve(input.directory, "assignments.json"),
    observationsPath: resolve(input.directory, "observations.jsonl"),
    outputDirectory,
    allowDirty: true,
    executionProvenance: {
      preCallManifestPath: input.manifestPath,
      providerCallReceiptsPath: input.callsPath,
    },
    metadata: {
      schemaVersion: 1,
      runId: "receipt-test",
      protocolVersion: "test",
      experimentId: "E2_CAPTURED_EXTERNAL_TEST",
      hypothesis: "captured external observation bundles preserve exact calls",
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
      providerBoundary: "externally collected programmed observations for captured workflow testing",
      usage: {
        plannedCalls: input.calls.length,
        transportRetries: 0,
        pricingSource: null,
        estimatedCostUsd: input.calls.reduce((sum, call) => sum + (call.usage.estimatedCostUsd as number), 0),
      },
      rawProviderErrorsStored: false,
      ledgerHead: null,
    },
  });
  assert.equal(result.localSemanticReplayVerified, true);
  assert.equal(result.externalAnchorVerified, false);
  assert.equal(verifyRunDirectory(outputDirectory, fixturesPath).valid, true);
});

test("captured provenance rejects a whole declared factor level omitted from assignments", () => {
  const run = makeCapturedRun();
  const manifestValue = JSON.parse(readFileSync(run.manifestPath, "utf8")) as PreCallManifestBody & { manifestSha256: string };
  const { manifestSha256: _ignored, ...body } = manifestValue;
  body.agentIds = [...body.agentIds, "declared-but-omitted-agent"];
  const rebuilt = buildPreCallManifest(body);
  writeFileSync(run.manifestPath, `${JSON.stringify(rebuilt, null, 2)}\n`);
  refreshCapturedHashes(run);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /pre-call agentIds do not match assignments|missing cells/u);
});

test("captured provenance rejects missing calls even when all local hashes and usage are refreshed", () => {
  const run = makeCapturedRun();
  const calls = [...run.calls];
  calls.pop();
  writeFileSync(run.callsPath, `${calls.map((call) => JSON.stringify(call)).join("\n")}\n`);
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  (receipt.usage as Record<string, unknown>).plannedCalls = calls.length;
  writeReceipt(run.directory, receipt);
  refreshCapturedHashes(run);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /provider call receipt count mismatch|missing provider call receipt/u);
});

test("captured provenance rejects reused provider calls and sessions", () => {
  const run = makeCapturedRun();
  const calls = [...run.calls];
  const source = calls[0];
  const target = calls[1];
  const { callReceiptSha256: _ignored, ...body } = target;
  calls[1] = buildProviderCallReceipt({
    ...body,
    providerCallId: source.providerCallId,
    providerSessionId: source.providerSessionId,
  });
  writeFileSync(run.callsPath, `${calls.map((call) => JSON.stringify(call)).join("\n")}\n`);
  refreshCapturedHashes(run);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /provider call id reused|provider session id reused/u);
});

test("captured provenance rejects timestamp inversion and served-provider downgrade", () => {
  const timestampRun = makeCapturedRun();
  const timestampCalls = [...timestampRun.calls];
  const { callReceiptSha256: _timestampHash, ...timestampBody } = timestampCalls[0];
  timestampCalls[0] = buildProviderCallReceipt({
    ...timestampBody,
    callCompletedAt: "2026-07-15T23:59:59.100Z",
    bundledAt: "2026-07-15T23:59:59.100Z",
    usage: { ...timestampBody.usage, latencyMs: 100 },
  });
  writeFileSync(timestampRun.callsPath, `${timestampCalls.map((call) => JSON.stringify(call)).join("\n")}\n`);
  refreshCapturedHashes(timestampRun);
  assert.match(verifyRunDirectory(timestampRun.directory, fixturesPath).errors.join(" "), /overlap|completed after a revision began/u);

  const downgradeRun = makeCapturedRun();
  const downgradeCalls = [...downgradeRun.calls];
  const { callReceiptSha256: _downgradeHash, ...downgradeBody } = downgradeCalls[0];
  downgradeCalls[0] = buildProviderCallReceipt({
    ...downgradeBody,
    served: { ...downgradeBody.served, model: "unrequested-downgrade" },
  });
  writeFileSync(downgradeRun.callsPath, `${downgradeCalls.map((call) => JSON.stringify(call)).join("\n")}\n`);
  refreshCapturedHashes(downgradeRun);
  assert.match(verifyRunDirectory(downgradeRun.directory, fixturesPath).errors.join(" "), /served model differs from requested/u);
});

test("captured provenance rejects aggregate usage mismatch", () => {
  const run = makeCapturedRun();
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  (receipt.usage as Record<string, unknown>).inputTokens = 1;
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /inputTokens mismatch/u);
});

test("provider-reported IDs and served model cannot be relabeled as authenticated provider issuance", () => {
  const run = makeCapturedRun();
  const calls = [...run.calls] as Array<ProviderCallReceipt & Record<string, unknown>>;
  const { callReceiptSha256: _ignored, ...body } = calls[0];
  const alteredBody = { ...body, providerEvidenceBoundary: "provider-authenticated issuance" };
  calls[0] = { ...alteredBody, callReceiptSha256: hashJson(alteredBody) } as ProviderCallReceipt & Record<string, unknown>;
  writeFileSync(run.callsPath, `${calls.map((call) => JSON.stringify(call)).join("\n")}\n`);
  refreshCapturedHashes(run);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /providerEvidenceBoundary is altered/u);
});

test("local manifest timestamps cannot be relabeled as externally anchored evidence", () => {
  const run = makeCapturedRun();
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  const execution = receipt.executionProvenance as Record<string, unknown>;
  const claims = execution.claims as Record<string, unknown>;
  claims.independentPreregistrationEvidence = "RECORDED_VERIFIED_EXTERNAL_ANCHOR";
  claims.independentTimeEvidence = "RECORDED_VERIFIED_EXTERNAL_ANCHOR";
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /claims\.independentPreregistrationEvidence is invalid/u);
});

test("a recorded pre-call anchor created after calls began cannot support preregistration or independent time evidence", () => {
  const run = makeCapturedRun();
  const anchor = buildExternalAnchorReceipt({
    schemaVersion: 1,
    service: "test-transparency-log",
    anchorId: "late-anchor",
    targetSha256: run.manifest.manifestSha256,
    anchoredAt: "2026-07-16T00:00:03.000Z",
    verifiedAt: "2026-07-16T00:00:04.000Z",
    verificationMethod: "TRANSPARENCY_LOG_LOOKUP",
    verifier: "test-verifier",
    evidenceBoundary: "This record binds a verifier-reported external anchor lookup or signature validation to a target hash. The local bundle verifier checks this record's schema, hash, target, and timestamp ordering but does not itself contact the external service; retain the service-verifiable proof for independent audit.",
  });
  writeFileSync(resolve(run.directory, "pre-call-anchor.json"), `${JSON.stringify(anchor, null, 2)}\n`);
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  const execution = receipt.executionProvenance as Record<string, unknown>;
  execution.preCallAnchorFile = "pre-call-anchor.json";
  execution.preCallAnchorSha256 = anchor.anchorReceiptSha256;
  execution.recordedAnchorAssertions = {
    preCall: "PRESENT_NOT_INDEPENDENTLY_REVERIFIED",
    completedBundle: "ABSENT",
  };
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /anchor timestamp is after calls began/u);
});

test("recorded anchor assertions remain not independently verified and do not elevate evidence claims", () => {
  const run = makeCapturedRun();
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  const execution = receipt.executionProvenance as Record<string, unknown>;
  const preCallAnchor = buildExternalAnchorReceipt({
    schemaVersion: 1,
    service: "test-transparency-log",
    anchorId: "pre-call-anchor",
    targetSha256: run.manifest.manifestSha256,
    anchoredAt: "2026-07-15T23:59:58.500Z",
    verifiedAt: "2026-07-16T00:00:03.000Z",
    verificationMethod: "TRANSPARENCY_LOG_LOOKUP",
    verifier: "test-verifier",
    evidenceBoundary: "This record binds a verifier-reported external anchor lookup or signature validation to a target hash. The local bundle verifier checks this record's schema, hash, target, and timestamp ordering but does not itself contact the external service; retain the service-verifiable proof for independent audit.",
  });
  const bundleAnchor = buildExternalAnchorReceipt({
    schemaVersion: 1,
    service: "test-transparency-log",
    anchorId: "completed-bundle-anchor",
    targetSha256: execution.completedBundleSha256 as string,
    anchoredAt: "2026-07-16T00:00:01.000Z",
    verifiedAt: "2026-07-16T00:00:03.000Z",
    verificationMethod: "TRANSPARENCY_LOG_LOOKUP",
    verifier: "test-verifier",
    evidenceBoundary: "This record binds a verifier-reported external anchor lookup or signature validation to a target hash. The local bundle verifier checks this record's schema, hash, target, and timestamp ordering but does not itself contact the external service; retain the service-verifiable proof for independent audit.",
  });
  writeFileSync(resolve(run.directory, "pre-call-anchor.json"), `${JSON.stringify(preCallAnchor, null, 2)}\n`);
  writeFileSync(resolve(run.directory, "completed-bundle-anchor.json"), `${JSON.stringify(bundleAnchor, null, 2)}\n`);
  execution.preCallAnchorFile = "pre-call-anchor.json";
  execution.preCallAnchorSha256 = preCallAnchor.anchorReceiptSha256;
  execution.completedBundleAnchorFile = "completed-bundle-anchor.json";
  execution.completedBundleAnchorSha256 = bundleAnchor.anchorReceiptSha256;
  execution.recordedAnchorAssertions = {
    preCall: "PRESENT_NOT_INDEPENDENTLY_REVERIFIED",
    completedBundle: "PRESENT_NOT_INDEPENDENTLY_REVERIFIED",
  };
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.deepEqual(verification.errors, []);
  assert.equal(verification.valid, true);
  const persisted = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  assert.deepEqual((persisted.executionProvenance as Record<string, unknown>).claims, {
    independentPreregistrationEvidence: "NOT_ESTABLISHED",
    independentTimeEvidence: "NOT_ESTABLISHED",
    completedBundleTamperEvidence: "NOT_ESTABLISHED",
    providerIssuanceEvidence: "NOT_ESTABLISHED",
  });
});

test("declared safety artifacts fail closed when the bound artifact is absent", () => {
  const run = makeCapturedRun();
  const manifestValue = JSON.parse(readFileSync(run.manifestPath, "utf8")) as PreCallManifestBody & { manifestSha256: string };
  const { manifestSha256: _ignored, ...body } = manifestValue;
  body.safetyPacketSchemaVersion = "test-safety-packet-v1";
  body.safetyPacketTemplateSha256 = "f".repeat(64);
  const rebuilt = buildPreCallManifest(body);
  writeFileSync(run.manifestPath, `${JSON.stringify(rebuilt, null, 2)}\n`);
  refreshCapturedHashes(run);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.equal(verification.valid, false);
  assert.match(verification.errors.join(" "), /pre-call-declared safety packet output is missing or post-run hash-mismatched/u);
});

test("a pre-call safety schema/template commitment binds the generated safety packet only post-run", () => {
  const run = makeCapturedRun();
  const manifestValue = JSON.parse(readFileSync(run.manifestPath, "utf8")) as PreCallManifestBody & { manifestSha256: string };
  const { manifestSha256: _ignored, ...body } = manifestValue;
  body.safetyPacketSchemaVersion = "test-safety-packet-v1";
  body.safetyPacketTemplateSha256 = "e".repeat(64);
  const rebuilt = buildPreCallManifest(body);
  writeFileSync(run.manifestPath, `${JSON.stringify(rebuilt, null, 2)}\n`);
  const safetyPacketPath = resolve(run.directory, "safety-packet.json");
  writeFileSync(safetyPacketPath, `${JSON.stringify({ schemaVersion: "test-safety-packet-v1", generated: true })}\n`);
  const receipt = JSON.parse(readFileSync(run.receiptPath, "utf8")) as Record<string, unknown>;
  const execution = receipt.executionProvenance as Record<string, unknown>;
  execution.safetyPacketFile = "safety-packet.json";
  execution.safetyPacketArtifactSha256 = hashFile(safetyPacketPath);
  writeReceipt(run.directory, receipt);
  refreshCapturedHashes(run);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.deepEqual(verification.errors, []);
  assert.equal(verification.valid, true);
  assert.equal(body.safetyPacketTemplateSha256, "e".repeat(64));
  assert.notEqual(execution.safetyPacketArtifactSha256, body.safetyPacketTemplateSha256);
});

test("legacy schema-3 receipts without execution provenance stay replay-verifiable", () => {
  const run = makeValidRun();
  const receipt = JSON.parse(readFileSync(resolve(run.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  receipt.schemaVersion = 3;
  delete receipt.executionProvenance;
  writeReceipt(run.directory, receipt);
  const verification = verifyRunDirectory(run.directory, fixturesPath);
  assert.deepEqual(verification.errors, []);
  assert.equal(verification.valid, true);
});

test("the committed pre-event falsification run remains replay-verifiable", () => {
  const committedRun = resolve("..", "..", "runs", "clinical-eval", "mechanism-simulator-v0.1-seed18");
  const verification = verifyRunDirectory(committedRun, fixturesPath);
  assert.deepEqual(verification.errors, []);
  assert.equal(verification.valid, true);
});

test("a schema-3 receipt cannot carry execution provenance and unknown versions fail closed", () => {
  const provenanceRun = makeValidRun();
  const provenanceReceipt = JSON.parse(readFileSync(resolve(provenanceRun.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  provenanceReceipt.schemaVersion = 3;
  writeReceipt(provenanceRun.directory, provenanceReceipt);
  assert.match(
    verifyRunDirectory(provenanceRun.directory, fixturesPath).errors.join(" "),
    /executionProvenance requires schemaVersion 4/u,
  );

  const unknownRun = makeValidRun();
  const unknownReceipt = JSON.parse(readFileSync(resolve(unknownRun.directory, "receipt.json"), "utf8")) as Record<string, unknown>;
  unknownReceipt.schemaVersion = 5;
  writeReceipt(unknownRun.directory, unknownReceipt);
  assert.match(
    verifyRunDirectory(unknownRun.directory, fixturesPath).errors.join(" "),
    /schemaVersion is unsupported/u,
  );
});
