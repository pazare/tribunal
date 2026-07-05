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
}

/**
 * CLI assignment: spread the six seats across the three locally-authenticated
 * providers so the panel is genuinely cross-provider (two seats per vendor).
 */
const CLI_DEFAULT: Record<Society, Provider> = {
  evidence: "openai",
  adversary: "xai",
  law_policy: "anthropic",
  affected_party: "openai",
  safety: "xai",
  concision: "anthropic",
};

/** OpenRouter assignment: one key, five sponsors' models on the panel. */
const OPENROUTER_DEFAULT: Record<Society, { provider: Provider; model: string }> = {
  evidence: { provider: "microsoft", model: "microsoft/phi-4" },
  adversary: { provider: "nvidia", model: "nvidia/llama-3.1-nemotron-70b-instruct" },
  law_policy: { provider: "meta", model: "meta-llama/llama-3.3-70b-instruct" },
  affected_party: { provider: "deepseek", model: "deepseek/deepseek-chat" },
  safety: { provider: "mistral", model: "mistralai/mistral-large" },
  concision: { provider: "microsoft", model: "microsoft/phi-4" },
};

export function buildPanel(opts: PanelBuildOptions): PanelSeat[] {
  return DEFAULT_SOCIETIES.map((society, i) => {
    const seatId = `seat_${i + 1}_${society}`;
    let client: PanelClient;
    if (opts.mode === "offline") {
      client = new OfflinePanelClient(seatId, society);
    } else if (opts.mode === "cli") {
      const provider = opts.assignment?.[society]?.provider ?? CLI_DEFAULT[society];
      client = new CliPanelClient(seatId, society, provider, {
        timeoutMs: opts.cliTimeoutMs,
        modelLabel: opts.assignment?.[society]?.model,
      });
    } else {
      const def = OPENROUTER_DEFAULT[society];
      const provider = opts.assignment?.[society]?.provider ?? def.provider;
      const model = opts.assignment?.[society]?.model ?? def.model;
      client = new OpenRouterPanelClient(seatId, society, provider, { model });
    }
    return { seatId, client };
  });
}
