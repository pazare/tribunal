/**
 * CI gate: every committed run must verify AND match its published anchor.
 *
 * Catches the two failure modes external auditors care about:
 *   1. a committed ledger that no longer verifies (tamper/corruption),
 *   2. a committed ledger whose recomputed head differs from runs/ANCHORS.md
 *      (wholesale rewrite, or someone re-ran and forgot to re-anchor —
 *      indistinguishable from forgery to an auditor, so both fail).
 * Exits non-zero on any mismatch. Run `npx tsx scripts/anchor_runs.ts` after
 * intentionally recording new runs, and commit the regenerated table.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyLedger, type LedgerEvent } from "@tribunal/kernel";

const RUNS = resolve(process.cwd(), "runs");
const anchorsPath = join(RUNS, "ANCHORS.md");

if (!existsSync(anchorsPath)) {
  console.error("FAIL: runs/ANCHORS.md missing — nothing anchors the committed ledgers.");
  process.exit(1);
}

// Parse the anchor table: | `run_id` | ... | `head` |
const anchored = new Map<string, string>();
for (const line of readFileSync(anchorsPath, "utf8").split("\n")) {
  const m = line.match(/^\| `([^`]+)` \|.*\| `([0-9a-f]{64})` \|$/);
  if (m) anchored.set(m[1], m[2]);
}

let failures = 0;
let checked = 0;

for (const dir of readdirSync(RUNS, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const ledgerPath = join(RUNS, dir.name, "ledger.json");
  if (!existsSync(ledgerPath)) continue;
  checked++;

  const events: LedgerEvent[] = JSON.parse(readFileSync(ledgerPath, "utf8"));
  const v = verifyLedger(events);
  if (!v.ok || !v.answerConsistent) {
    console.error(`FAIL ${dir.name}: ledger does not verify (${v.problems.length} problem(s))`);
    for (const p of v.problems.slice(0, 3)) console.error(`     seq ${p.seq} ${p.reason}: ${p.detail}`);
    failures++;
    continue;
  }

  const expect = anchored.get(dir.name);
  if (!expect) {
    console.error(`FAIL ${dir.name}: verifies but has NO anchor — run scripts/anchor_runs.ts and commit.`);
    failures++;
    continue;
  }
  if (expect !== v.head) {
    console.error(`FAIL ${dir.name}: head ${v.head.slice(0, 16)}… != anchored ${expect.slice(0, 16)}…`);
    console.error(`     The committed ledger differs from its published anchor (rewrite or stale anchor).`);
    failures++;
    continue;
  }
  console.log(`ok   ${dir.name}: ${events.length} events, head ${v.head.slice(0, 16)}… matches anchor`);
}

// Anchors that point at nothing are also drift.
for (const id of anchored.keys()) {
  if (!existsSync(join(RUNS, id, "ledger.json"))) {
    console.error(`FAIL ${id}: anchored but the run directory is gone.`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} anchor failure(s) across ${checked} committed run(s).`);
  process.exit(1);
}
console.log(`\nall ${checked} committed run(s) verify and match their anchors.`);
