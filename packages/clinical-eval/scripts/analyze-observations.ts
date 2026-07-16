import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeObservations, loadSyntheticFixtures, type AgentObservation, type ExperimentAssignment } from "../src/index.js";

const invocationRoot = process.env.INIT_CWD ?? process.cwd();

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing required argument ${name}`);
  return resolve(invocationRoot, value);
}

const fixturesPath = argument("--fixtures");
const assignmentsPath = argument("--assignments");
const observationsPath = argument("--observations");
const outputPath = argument("--output");
const cases = loadSyntheticFixtures(fixturesPath);
const assignments = JSON.parse(readFileSync(assignmentsPath, "utf8")) as ExperimentAssignment[];
const observations = readFileSync(observationsPath, "utf8")
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((line) => JSON.parse(line) as AgentObservation);
const results = analyzeObservations(cases, assignments, observations);
writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ outputPath, cases: cases.length, assignments: assignments.length, observations: observations.length })}\n`);
