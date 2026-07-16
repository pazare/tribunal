import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyRunDirectory } from "../src/index.js";

const invocationRoot = process.env.INIT_CWD ?? process.cwd();

const runDirectory = process.argv[2];
const datasetPath = process.argv[3];
const anchorPath = process.argv[4];
if (!runDirectory || !datasetPath) {
  throw new Error("usage: verify-run.ts <run-directory> <dataset-path> [anchor-json]");
}
const verification = verifyRunDirectory(
  resolve(invocationRoot, runDirectory),
  resolve(invocationRoot, datasetPath),
);
if (anchorPath) {
  const anchors = JSON.parse(readFileSync(resolve(invocationRoot, anchorPath), "utf8")) as Record<string, string>;
  const receipt = JSON.parse(readFileSync(resolve(invocationRoot, runDirectory, "receipt.json"), "utf8")) as {
    runId: string;
    receiptSha256: string;
  };
  if (anchors[receipt.runId] !== receipt.receiptSha256) {
    verification.valid = false;
    verification.errors.push("external anchor mismatch or missing run id");
  }
}
process.stdout.write(`${JSON.stringify(verification, null, 2)}\n`);
if (!verification.valid) process.exitCode = 1;
