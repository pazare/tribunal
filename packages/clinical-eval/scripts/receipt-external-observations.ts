import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createReceiptedExternalObservationRun,
  validateExternalRunMetadata,
} from "../src/index.js";

const invocationRoot = process.env.INIT_CWD ?? process.cwd();

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing required argument ${name}`);
  return resolve(invocationRoot, value);
}

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const metadataValue: unknown = JSON.parse(readFileSync(argument("--metadata"), "utf8"));
validateExternalRunMetadata(metadataValue);
const result = createReceiptedExternalObservationRun({
  repoRoot,
  fixturesPath: argument("--fixtures"),
  assignmentsPath: argument("--assignments"),
  observationsPath: argument("--observations"),
  outputDirectory: argument("--output"),
  metadata: metadataValue,
  allowDirty: process.argv.includes("--allow-dirty"),
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
