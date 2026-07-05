/**
 * Opens submission resources in the default browser — prep only, no auto-submit.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SUBMIT = "https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit";
const REPO = "https://github.com/pazare/tribunal";

function open(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true });
}

function runNpm(script) {
  const r = spawnSync("npm", ["run", script], { cwd: ROOT, stdio: "inherit", encoding: "utf8" });
  return r.status === 0;
}

console.log("=== Tribunal submission prep ===\n");

if (!runNpm("test")) {
  console.error("\n✗ tests FAILED — fix before submitting\n");
  process.exit(1);
}
console.log("\n✓ tests passed\n");

if (!runNpm("demo")) {
  console.error("\n✗ demo FAILED\n");
  process.exit(1);
}
console.log("\n✓ offline demo passed\n");

const manifestPath = join(ROOT, "runs", "demo-recording", "manifest.json");
if (existsSync(manifestPath)) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log("Demo recording:", m.recordedAt, "mode:", m.mode);
} else {
  console.log("No demo video yet — run: npm run record:demo");
}

const runsDir = join(ROOT, "runs");
if (existsSync(runsDir)) {
  const runs = readdirSync(runsDir).filter((d) => existsSync(join(runsDir, d, "meta.json")));
  console.log(`Recorded runs: ${runs.length}`);
  for (const r of runs) {
    const meta = JSON.parse(readFileSync(join(runsDir, r, "meta.json"), "utf8"));
    console.log(`  · ${r}: ${meta.auditability} verified=${meta.verified}`);
  }
}

console.log("\nOpening submission form + repo…");
open(SUBMIT);
open(REPO);
open(`${REPO}/blob/main/docs/SUBMISSION.md`);

console.log(`
Next steps:
  1. Upload video from runs/demo-recording/webm/ to YouTube/Loom
  2. Paste URL + repo into submission form
  3. Track: Cursor
See docs/SUBMISSION.md for copy-paste fields.
`);
