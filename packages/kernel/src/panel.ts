import type { Provider, Society } from "./types.js";
import type { PanelClient } from "./providers/base.js";
import { OfflinePanelClient } from "./providers/offline.js";
import { CliPanelClient } from "./providers/cli.js";
import { OpenRouterPanelClient } from "./providers/openrouter.js";
import type { PanelSeat } from "./engine.js";

/**
 * The six default seats. Each society is a distinct mandate; the *provider* behind
 * each seat is what makes the panel cross-decorrelated.
 */
export const DEFAULT_SOCIETIES: Society[] = [
  "evidence",
  "adversary",
  "law_policy",
  "affected_party",
  "safety",
  "concision",
];

export type PanelMode = "offline" | "cli" | "openrouter";

export interface PanelBuildOptions {
  mode: PanelMode;
  /** Provider assignment per society. Falls back to sensible defaults. */
  assignment?: Partial<Record<Society, { provider: Provider; model?: string }>>;
  cliTimeoutMs?: number;
  /** Defaults true; false is only for public/synthetic CLI probes and tests. */
  protectedData?: boolean;
}

/**
 * CLI assignment: spread the six seats across the three locally-authenticated
 * providers so the panel is genuinely cross-provider (two seats per vendor).
 */
export const CLI_DEFAULT_ASSIGNMENT: Record<Society, Provider> = {
  evidence: "openai",
  adversary: "xai",
  law_policy: "anthropic",
  affected_party: "openai",
  safety: "xai",
  concision: "anthropic",
};

/** OpenRouter assignment: one key, five sponsors' models on the panel. */
export const OPENROUTER_DEFAULT_ASSIGNMENT: Record<Society, { provider: Provider; model: string }> = {
  evidence: { provider: "microsoft", model: "microsoft/phi-4" },
  adversary: { provider: "nvidia", model: "nvidia/nemotron-3-super-120b-a12b" },
  law_policy: { provider: "meta", model: "meta-llama/llama-3.3-70b-instruct" },
  affected_party: { provider: "deepseek", model: "deepseek/deepseek-chat" },
  safety: { provider: "mistral", model: "mistralai/mistral-large" },
  concision: { provider: "microsoft", model: "microsoft/phi-4" },
};

/**
 * Build a panel from an explicit list of LIVE providers: all six societies stay
 * staffed, round-robined across the given providers. This is how a live demo
 * degrades gracefully when a vendor's CLI session expires: the institution keeps
 * every seat (incl. safety) and the ledger records which vendor staffed it.
 */
export function buildPanelFromProviders(
  providers: Provider[],
  opts: {
    mode: Exclude<PanelMode, "offline">;
    cliTimeoutMs?: number;
    models?: Partial<Record<Provider, string>>;
    protectedData?: boolean;
  },
): PanelSeat[] {
  if (!providers.length) throw new Error("buildPanelFromProviders: no providers given");
  return DEFAULT_SOCIETIES.map((society, i) => {
    const seatId = `seat_${i + 1}_${society}`;
    const provider = providers[i % providers.length];
    const client: PanelClient =
      opts.mode === "cli"
        ? new CliPanelClient(seatId, society, provider, {
            timeoutMs: opts.cliTimeoutMs,
            modelLabel: opts.models?.[provider],
            protectedData: opts.protectedData,
          })
        : new OpenRouterPanelClient(seatId, society, provider, {
            model: opts.models?.[provider] ?? OPENROUTER_DEFAULT_ASSIGNMENT[society].model,
          });
    return { seatId, client };
  });
}

export function buildPanel(opts: PanelBuildOptions): PanelSeat[] {
  return DEFAULT_SOCIETIES.map((society, i) => {
    const seatId = `seat_${i + 1}_${society}`;
    let client: PanelClient;
    if (opts.mode === "offline") {
      client = new OfflinePanelClient(seatId, society);
    } else if (opts.mode === "cli") {
      const provider = opts.assignment?.[society]?.provider ?? CLI_DEFAULT_ASSIGNMENT[society];
      client = new CliPanelClient(seatId, society, provider, {
        timeoutMs: opts.cliTimeoutMs,
        modelLabel: opts.assignment?.[society]?.model,
        protectedData: opts.protectedData,
      });
    } else {
      const def = OPENROUTER_DEFAULT_ASSIGNMENT[society];
      const provider = opts.assignment?.[society]?.provider ?? def.provider;
      const model = opts.assignment?.[society]?.model ?? def.model;
      client = new OpenRouterPanelClient(seatId, society, provider, { model });
    }
    return { seatId, client };
  });
}
