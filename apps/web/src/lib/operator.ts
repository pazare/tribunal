import type { ControlFlags, LedgerEvent, PanelMode } from "../api";

export interface RunTelemetry {
  ledgerRunId: string | null;
  packId: string | null;
  mode: PanelMode | null;
  config: {
    seed?: number;
    maxSpans?: number;
    flags?: ControlFlags;
    clientView?: "answer_only" | "answer_plus_summary";
  } | null;
  panel: { seatId: string; society: string; provider: string; model: string; modelSource?: string }[];
  servedModels: { seatId: string; model: string; requestedModel?: string; servingProvider?: string }[];
  calls: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  repaired: number;
  failures: number;
  cancelledCalls: number;
  stoppedBy: string | null;
  spanCount: number;
  finalAnswer: string;
}

/**
 * SSE reconnects replay the accumulated ledger. Merge by (runId, seq), not by
 * arrival order, so reconnects cannot double support counts or React keys.
 */
export function mergeLedgerEvent(events: LedgerEvent[], incoming: LedgerEvent): LedgerEvent[] {
  const index = events.findIndex(
    (event) => event.runId === incoming.runId && event.seq === incoming.seq,
  );
  if (index >= 0) {
    if (events[index].hash === incoming.hash) return events;
    const next = events.slice();
    next[index] = incoming;
    return next.sort((a, b) => a.seq - b.seq);
  }
  return [...events, incoming].sort((a, b) => a.seq - b.seq);
}

export function deriveRunTelemetry(events: LedgerEvent[]): RunTelemetry {
  const started = events.find((event) => event.kind === "run_started");
  const finished = [...events].reverse().find((event) => event.kind === "run_finished");
  const providerCalls = events.filter((event) => event.kind === "provider_call");
  const totals = (finished?.payload?.totals ?? {}) as Record<string, number>;
  const inferredMode = (() => {
    const transports = providerCalls.map((event) => String(event.payload?.usage?.transport ?? ""));
    if (transports.includes("http")) return "openrouter";
    if (transports.includes("cli")) return "cli";
    if (transports.includes("offline")) return "offline";
    return null;
  })();

  const servedModels = [...new Map(
    providerCalls.map((event) => {
      const usage = event.payload?.usage ?? {};
      const seatId = String(event.payload?.seatId ?? "");
      return [
        seatId,
        {
          seatId,
          model: String(usage.model ?? ""),
          requestedModel: usage.requestedModel ? String(usage.requestedModel) : undefined,
          servingProvider: usage.servingProvider ? String(usage.servingProvider) : undefined,
        },
      ] as const;
    }),
  ).values()].filter((item) => item.seatId && item.model);

  return {
    ledgerRunId: events[0]?.runId ?? null,
    packId: started ? String(started.payload?.packId ?? "") || null : null,
    mode: inferredMode,
    config: started ? (started.payload?.config as RunTelemetry["config"]) : null,
    panel: Array.isArray(started?.payload?.panel) ? started.payload.panel : [],
    servedModels,
    calls: Number(totals.calls ?? providerCalls.length ?? 0),
    tokensIn: providerCalls.reduce(
      (sum, event) => sum + Number(event.payload?.usage?.tokensIn ?? 0),
      0,
    ),
    tokensOut: Number(
      totals.tokensOut ??
        providerCalls.reduce(
          (sum, event) => sum + Number(event.payload?.usage?.tokensOut ?? 0),
          0,
        ),
    ),
    latencyMs: Number(
      totals.latencyMs ??
        providerCalls.reduce(
          (sum, event) => sum + Number(event.payload?.usage?.latencyMs ?? 0),
          0,
        ),
    ),
    repaired: Number(totals.repaired ?? 0),
    failures: providerCalls.filter(
      (event) => !["ok", "incomplete", "cancelled"].includes(String(event.payload?.usage?.status ?? "")),
    ).length,
    cancelledCalls: providerCalls.filter(
      (event) => String(event.payload?.usage?.status ?? "") === "cancelled",
    ).length,
    stoppedBy: finished ? String(finished.payload?.stoppedBy ?? "") || null : null,
    spanCount: Number(finished?.payload?.spanCount ?? 0),
    finalAnswer: String(finished?.payload?.finalAnswer ?? ""),
  };
}

export function readLedgerFile(input: unknown): LedgerEvent[] {
  const events = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as any).events)
      ? (input as any).events
      : null;
  if (!events) throw new Error("Choose a ledger JSON array or an object containing events[].");
  if (
    events.some(
      (event: any) =>
        !event ||
        typeof event.seq !== "number" ||
        typeof event.runId !== "string" ||
        typeof event.kind !== "string" ||
        typeof event.hash !== "string",
    )
  ) {
    throw new Error("This file does not match the Tribunal ledger event schema.");
  }
  return events as LedgerEvent[];
}

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "0 ms";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} s`;
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function compactRunId(runId: string): string {
  return runId.length > 24 ? `${runId.slice(0, 12)}…${runId.slice(-7)}` : runId;
}
