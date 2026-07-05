/**
 * Offline smoke demo: runs the full Tribunal loop over the lending fixture with
 * the deterministic panel (no model calls), prints the verdict, the fired
 * ratification rules, preserved dissent, and verifies the hash chain — including
 * a tamper demo. Run: `npm run demo -w @tribunal/kernel`.
 */
import { runTribunal, verifyLedger, DEFAULT_FLAGS, buildPanel } from "../src/index.js";
import type { RunConfig } from "../src/index.js";
import { LENDING_FIXTURE } from "../test/fixture.js";

const config: RunConfig = {
  seed: 7,
  maxSpans: 4,
  flags: { ...DEFAULT_FLAGS },
  clientView: "answer_plus_summary",
};

const seats = buildPanel({ mode: "offline" });

const result = await runTribunal({
  pack: LENDING_FIXTURE,
  config,
  seats,
  clock: "logical",
});

console.log("=".repeat(72));
console.log("VERDICT:", JSON.stringify(result.finalAnswer));
console.log("stoppedBy:", result.stoppedBy, "| spans:", result.spanCount, "| events:", result.events.length);
console.log("=".repeat(72));

for (const e of result.events) {
  if (e.kind === "ratification") {
    const d = (e.payload as any).decision;
    console.log(`  span ${e.spanIndex}: ${d.method} — ${d.metaRule}`);
    console.log(`      → "${d.selected.candidate.isStop ? "<STOP>" : d.selected.candidate.text}"`);
  }
  if (e.kind === "dissent_preserved") {
    const d = (e.payload as any).dissent;
    console.log(`      dissent [${d.objection.raisedBy}] on "${d.chosenKey.slice(0, 40)}": ${d.objection.text.slice(0, 80)}`);
  }
}

const verify = verifyLedger(result.events);
console.log("=".repeat(72));
console.log("VERIFY:", verify.ok ? "OK ✓" : "FAILED ✗", "| events:", verify.events, "| head:", verify.head.slice(0, 16) + "…");
console.log("answerConsistent:", verify.answerConsistent);

// Tamper demo: flip one character in a committed span → chain must break.
const tampered = structuredClone(result.events);
const target = tampered.find((e) => e.kind === "ratification")!;
(target.payload as any).decision.publicReason = "TAMPERED";
const verify2 = verifyLedger(tampered);
console.log("=".repeat(72));
console.log("TAMPER DEMO (edited one ratification reason):");
console.log("  verify:", verify2.ok ? "OK (BAD — should fail!)" : "FAILED ✓ (tamper detected)");
console.log("  first problem:", verify2.problems[0]);
