/**
 * Regenerates runs/ANCHORS.md — the public anchor table for every recorded run.
 *
 * The ledger is tamper-EVIDENT on its own, but an adversary holding the only
 * copy could re-link the whole chain. Publishing each run's head hash in a
 * public git history is the external anchor that closes that gap: any later
 * rewrite of a committed ledger no longer matches the anchored head (and git
 * itself preserves the original). Run after recording runs; commit the result.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyLedger, type LedgerEvent } from "@tribunal/kernel";
import { computeAuditability } from "@tribunal/scorecard";

const RUNS = resolve(process.cwd(), "runs");
const rows: string[] = [];

for (const dir of readdirSync(RUNS, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const ledgerPath = join(RUNS, dir.name, "ledger.json");
  const metaPath = join(RUNS, dir.name, "meta.json");
  if (!existsSync(ledgerPath)) continue;
  const events: LedgerEvent[] = JSON.parse(readFileSync(ledgerPath, "utf8"));
  const v = verifyLedger(events);
  const a = computeAuditability(events);
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
  const panel = (events[0]?.payload as any)?.panel ?? [];
  const providers = [...new Set(panel.map((p: any) => p.provider))].join("+") || "?";
  rows.push(
    `| \`${dir.name}\` | ${meta.packId ?? "?"} | ${meta.mode ?? "?"} | ${providers} | ${events.length} | ${
      v.ok ? "✓" : "✗ BROKEN"
    } | ${a.total}/${a.outOf} | \`${v.head}\` |`,
  );
  console.log(`${dir.name}: verify=${v.ok} audit=${a.total}/${a.outOf} head=${v.head.slice(0, 16)}…`);
}

const md = `# Ledger anchors

Every recorded run's hash-chain **head** is published here and in git history.
To audit a run: \`POST /api/verify {"runId": "<id>"}\` (or run the offline
verifier) and compare the recomputed head against this table. A ledger whose
chain verifies but whose head does not match its anchored value has been
rewritten wholesale — the exact forgery this table exists to catch.

| run | pack | mode | providers | events | chain | auditability | head (sha256) |
|---|---|---|---|---|---|---|---|
${rows.sort().join("\n")}
`;

writeFileSync(join(RUNS, "ANCHORS.md"), md);
console.log(`\nwrote runs/ANCHORS.md (${rows.length} runs)`);
