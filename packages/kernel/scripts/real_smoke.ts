/**
 * REAL multi-provider smoke test — proves the CLI adapters call live models.
 * Builds a 6-seat panel split across OpenAI (codex) and xAI (grok), runs ONE
 * span of the lending fixture, and prints per-seat provenance + the verdict.
 * No offline/simulated path is used. Usage: tsx scripts/real_smoke.ts
 */
import { runTribunal, verifyLedger, DEFAULT_FLAGS, CliPanelClient } from "../src/index.js";
import type { RunConfig } from "../src/index.js";
import type { PanelSeat } from "../src/engine.js";
import { LENDING_FIXTURE } from "../test/fixture.js";

const providers = ["openai", "xai", "anthropic", "openai", "xai", "anthropic"] as const;
const societies = ["evidence", "adversary", "law_policy", "affected_party", "safety", "concision"] as const;

const only = process.env.TRIBUNAL_PROVIDERS?.split(",");
const seats: PanelSeat[] = societies
  .map((society, i) => ({ society, provider: providers[i], i }))
  .filter((s) => !only || only.includes(s.provider))
  .map((s) => ({
    seatId: `seat_${s.i + 1}_${s.society}`,
    // This smoke uses the committed public synthetic lending fixture. It may
    // exercise legacy probe-only argv transports, so it must never be repurposed
    // for protected or patient data.
    client: new CliPanelClient(`seat_${s.i + 1}_${s.society}`, s.society, s.provider, {
      timeoutMs: 150_000,
      protectedData: false,
    }),
  }));

console.log(`Panel: ${seats.map((s) => `${s.client.society}=${s.client.provider}`).join(", ")}`);

const config: RunConfig = {
  seed: 7,
  maxSpans: 1,
  flags: { ...DEFAULT_FLAGS },
  clientView: "answer_plus_summary",
};

const t0 = Date.now();
const result = await runTribunal({
  pack: LENDING_FIXTURE,
  config,
  seats,
  clock: "wall",
  onEvent: (e) => {
    if (e.kind === "provider_call") {
      const u = (e.payload as any).usage;
      console.log(`  [${u.status}] ${(e.payload as any).seatId} ${u.provider}/${u.model} ${u.latencyMs ?? "?"}ms tok≈${u.tokensOut ?? "?"}`);
    }
    if (e.kind === "proposals_revealed") console.log(`  revealed ${(e.payload as any).proposals.length} proposals`);
    if (e.kind === "ratification") {
      const d = (e.payload as any).decision;
      console.log(`  RATIFIED (${d.method}): "${d.selected.candidate.isStop ? "<STOP>" : d.selected.candidate.text}"`);
    }
  },
});

console.log("=".repeat(72));
console.log("VERDICT:", JSON.stringify(result.finalAnswer));
console.log("elapsed:", ((Date.now() - t0) / 1000).toFixed(1) + "s", "| repaired fields:", result.usageTotals.repaired);
console.log("VERIFY:", verifyLedger(result.events).ok ? "OK ✓" : "FAILED ✗");
