import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  type CapabilityManifest,
  type LedgerEvent,
  type PanelAssignments,
  type PackSummary,
  type PanelHealth,
  type PanelMode,
  type RunMeta,
  type QueuedIntervention,
  type SeatAssignment,
  type Society,
  SOCIETIES,
  cancelIntervention,
  cancelRun,
  fetchCapabilities,
  fetchPanel,
  fetchInterventions,
  fetchPacks,
  fetchRun,
  fetchRuns,
  intervene,
  startRun,
  subscribeRun,
  tamperRun,
  verifyEvents,
} from "./api";
import { deriveDeliberation } from "./lib/deliberation";
import {
  compactRunId,
  deriveRunTelemetry,
  downloadJson,
  mergeLedgerEvent,
  readLedgerFile,
} from "./lib/operator";
import {
  Bench,
  CandidateBoard,
  CancellationPanel,
  CompareStrip,
  DissentRegister,
  PhaseTracker,
  VerdictStrip,
} from "./components";
import {
  CaseFilePanel,
  InterventionConsole,
  LedgerExplorer,
  RunConfigurator,
  RunLibrary,
  TelemetryPanel,
  type InterventionDraft,
  type OperatorConfig,
  validatePanelConfig,
} from "./operator-components";
import { DecoderLab } from "./decoder-components";

type View = "decoder" | "docket" | "chamber" | "audit" | "runs";
type RunSource = "new" | "live" | "recorded" | "imported" | null;
type InterventionQueueItem = QueuedIntervention & {
  state: "queued" | "processing" | "applied" | "not_applied";
  willApplyAtSpan?: number;
};

const DEFAULT_FLAGS = {
  blindRound: true,
  anonymizeFeedback: true,
  randomizeCandidateOrder: true,
  debateRounds: 1,
  roleMemory: true,
  independentEvidence: true,
  safetyVeto: true,
};

function initialPanelChoice(): OperatorConfig["panelChoice"] {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "offline" || mode === "cli" || mode === "openrouter" ? mode : "auto";
}

function initialView(): View {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view");
  if (["decoder", "docket", "chamber", "audit", "runs"].includes(requested ?? "")) {
    return requested as View;
  }
  // Preserve explicit legacy panel-mode links while making the live decoder
  // the default entry point for an unqualified visit.
  return params.has("mode") ? "docket" : "decoder";
}

function storageKey(run: RunMeta): string {
  return run.artifactId ?? run.runId;
}

function emptyAssignments(): PanelAssignments {
  const empty = () =>
    Object.fromEntries(SOCIETIES.map((society) => [society, { provider: "" }])) as Record<
      Society,
      SeatAssignment
    >;
  return { cli: empty(), openrouter: empty() };
}

function cloneAssignments(assignments: PanelAssignments): PanelAssignments {
  const clone = (source: Record<Society, SeatAssignment>) =>
    Object.fromEntries(
      SOCIETIES.map((society) => [society, { ...source[society] }]),
    ) as Record<Society, SeatAssignment>;
  return { cli: clone(assignments.cli), openrouter: clone(assignments.openrouter) };
}

function assignmentForRequest(
  mode: Exclude<PanelMode, "offline">,
  assignments: PanelAssignments,
): Record<Society, SeatAssignment> {
  return Object.fromEntries(
    SOCIETIES.map((society) => {
      const seat = assignments[mode][society];
      return [
        society,
        mode === "cli"
          ? { provider: seat.provider }
          : { provider: seat.provider, model: seat.model?.trim() ?? "" },
      ];
    }),
  ) as Record<Society, SeatAssignment>;
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [panel, setPanel] = useState<PanelHealth | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityManifest | null>(null);
  const [runs, setRuns] = useState<{ live: RunMeta[]; recorded: RunMeta[] }>({ live: [], recorded: [] });
  const [config, setConfig] = useState<OperatorConfig>({
    panelChoice: initialPanelChoice(),
    seed: 7,
    maxSpans: 4,
    flags: { ...DEFAULT_FLAGS },
    providers: [],
    seatingMode: "pool",
    assignments: emptyAssignments(),
    clientView: "answer_plus_summary",
  });

  const [activeRunKey, setActiveRunKey] = useState<string | null>(null);
  const [source, setSource] = useState<RunSource>(null);
  const [mode, setMode] = useState<PanelMode>("offline");
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [status, setStatus] = useState("idle");
  const [streamActive, setStreamActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState("");
  const [streamNotice, setStreamNotice] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [tamperResult, setTamperResult] = useState<any>(null);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [interventionQueue, setInterventionQueue] = useState<InterventionQueueItem[]>([]);
  const [cancelActor, setCancelActor] = useState("Operator");
  const [cancelReason, setCancelReason] = useState("Stopped from operator console");
  const [actionNotice, setActionNotice] = useState("");
  const [operatorRecordOpen, setOperatorRecordOpen] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const reconcileRef = useRef<number | null>(null);
  // Highest ledger sequence delivered by the active stream. Used so streamed
  // events only advance the inspected event when the user is still "following
  // the head" — a manual selection during a live/replay run is not clobbered.
  const headSeqRef = useRef<number | null>(null);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) ?? null,
    [packs, selectedPackId],
  );
  const deliberation = useMemo(() => deriveDeliberation(events), [events]);
  const telemetry = useMemo(() => deriveRunTelemetry(events), [events]);
  const completed = events.some((event) => event.kind === "run_finished");
  const headHash = events.at(-1)?.hash ?? null;
  const answerOnly =
    telemetry.config?.clientView === "answer_only" &&
    deliberation.stoppedBy !== "cancelled" &&
    !operatorRecordOpen;
  const canIntervene =
    Boolean(activeRunKey) &&
    (source === "new" || source === "live") &&
    mode !== "offline" &&
    status === "running";
  const liveRun = Boolean(activeRunKey) && (source === "new" || source === "live") && mode !== "offline";
  const canCancel = liveRun && status === "running";

  const clearConnection = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    if (reconcileRef.current != null) window.clearInterval(reconcileRef.current);
    reconcileRef.current = null;
  }, []);

  const refreshRuns = useCallback(async () => {
    try {
      setRuns(await fetchRuns());
    } catch (nextError: any) {
      setError(nextError.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let firstPackSlots: number | null = null;
    let maxSpansOffset = 2;
    const fail = (nextError: any) => !cancelled && setError(nextError.message);
    const updateSpanBudget = () => {
      if (firstPackSlots == null || cancelled) return;
      setConfig((current) => ({ ...current, maxSpans: firstPackSlots! + maxSpansOffset }));
    };

    void fetchPacks()
      .then((nextPacks) => {
        if (cancelled) return;
        setPacks(nextPacks);
        const first = nextPacks[0];
        if (first) {
          firstPackSlots = first.slots.length;
          setSelectedPackId((current) => current || first.id);
          updateSpanBudget();
        }
      })
      .catch(fail);

    void fetchCapabilities()
      .then((nextCapabilities) => {
        if (cancelled) return;
        setCapabilities(nextCapabilities);
        maxSpansOffset = nextCapabilities.defaults.maxSpansOffset;
        setConfig((current) => ({
          ...current,
          seed: nextCapabilities.defaults.seed,
          flags: { ...nextCapabilities.defaults.flags },
          clientView: nextCapabilities.defaults.clientView,
          assignments: cloneAssignments(nextCapabilities.defaults.assignments),
        }));
        updateSpanBudget();
      })
      .catch(fail);

    void fetchPanel()
      .then((nextPanel) => {
        if (cancelled) return;
        setPanel(nextPanel);
        setConfig((current) => ({
          ...current,
          providers: Object.entries(nextPanel.cli)
            .filter(([, health]) => health.present)
            .map(([provider]) => provider),
        }));
      })
      .catch(fail);

    void fetchRuns().then((nextRuns) => !cancelled && setRuns(nextRuns)).catch(fail);
    return () => {
      cancelled = true;
      clearConnection();
    };
  }, [clearConnection]);

  useEffect(() => {
    if (view !== "runs" && view !== "docket") return;
    const timer = window.setInterval(refreshRuns, 8000);
    return () => window.clearInterval(timer);
  }, [view, refreshRuns]);

  useEffect(() => {
    const appliedIds = new Set(
      events
        .filter((event) => event.kind === "human_intervention")
        .map((event) => String(event.payload?.interventionId ?? ""))
        .filter(Boolean),
    );
    const terminalPayload = [...events]
      .reverse()
      .find((event) => event.kind === "run_finished")
      ?.payload;
    const notAppliedIds = new Set<string>(
      [
        ...(Array.isArray(terminalPayload?.unappliedInterventionIds)
          ? terminalPayload.unappliedInterventionIds
          : []),
        ...(Array.isArray(terminalPayload?.cancellation?.unappliedInterventionIds)
          ? terminalPayload.cancellation.unappliedInterventionIds
          : []),
      ].map(String),
    );
    if (!appliedIds.size && !notAppliedIds.size) return;
    setInterventionQueue((current) =>
      current.map((item) =>
        appliedIds.has(item.interventionId)
          ? { ...item, state: "applied" }
          : notAppliedIds.has(item.interventionId)
            ? { ...item, state: "not_applied" }
            : item,
      ),
    );
  }, [events]);

  useEffect(() => {
    if (!activeRunKey || !liveRun || !["running", "cancelling"].includes(status)) return;
    let disposed = false;
    const syncQueue = async () => {
      try {
        const queue = await fetchInterventions(activeRunKey);
        if (disposed) return;
        const serverItems: InterventionQueueItem[] = [
          ...queue.pending.map((item) => ({ ...item, state: "queued" as const })),
          ...queue.processing.map((item) => ({ ...item, state: "processing" as const })),
        ];
        setInterventionQueue((current) => {
          const merged = new Map(current.map((item) => [item.interventionId, item]));
          for (const item of serverItems) {
            const existing = merged.get(item.interventionId);
            // A stale in-flight poll must not revert a client-terminal state
            // (applied via ledger receipt, or not_applied via cancel/stop) back
            // to queued/processing; keep the terminal state and its checkpoint.
            const terminal = existing?.state === "applied" || existing?.state === "not_applied";
            merged.set(item.interventionId, {
              ...existing,
              ...item,
              state: terminal ? existing!.state : item.state,
              willApplyAtSpan: existing?.willApplyAtSpan ?? item.willApplyAtSpan,
            });
          }
          return [...merged.values()];
        });
      } catch {
        // The run stream remains authoritative; a later poll can recover the queue view.
      }
    };
    void syncQueue();
    const timer = window.setInterval(syncQueue, 1500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [activeRunKey, liveRun, status]);

  useEffect(() => {
    if (selectedSeq == null && events.length) setSelectedSeq(events.at(-1)!.seq);
  }, [events, selectedSeq]);

  const selectPack = (pack: PackSummary) => {
    setSelectedPackId(pack.id);
    setConfig((current) => ({
      ...current,
      maxSpans: pack.slots.length + (capabilities?.defaults.maxSpansOffset ?? 2),
    }));
  };

  const resolveMode = (): PanelMode => {
    if (config.panelChoice !== "auto") return config.panelChoice;
    if (panel?.openrouter.available) return "openrouter";
    if (Object.values(panel?.cli ?? {}).some((health) => health.present)) return "cli";
    return "offline";
  };

  const resetRunView = (pack: PackSummary | null) => {
    clearConnection();
    setEvents([]);
    setVerifyResult(null);
    setTamperResult(null);
    setSelectedSeq(null);
    setInterventionQueue([]);
    setActionNotice("");
    setStreamNotice("");
    setError("");
    if (pack) setSelectedPackId(pack.id);
  };

  const connectStream = useCallback(
    (
      key: string,
      options: { source: Exclude<RunSource, null | "imported">; mode: PanelMode; pace?: number },
    ) => {
      clearConnection();
      headSeqRef.current = null;
      setActiveRunKey(key);
      setSource(options.source);
      setMode(options.mode);
      setStreamActive(true);
      setStatus(options.source === "recorded" ? "replay" : "connecting");
      let closed = false;

      const closeWhenDone = () => {
        if (closed) return;
        closed = true;
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        setStreamActive(false);
        if (reconcileRef.current != null) window.clearInterval(reconcileRef.current);
        reconcileRef.current = null;
        void refreshRuns();
      };

      unsubscribeRef.current = subscribeRun(
        key,
        (event) => {
          setStreamNotice("");
          setEvents((current) => mergeLedgerEvent(current, event));
          // Only follow the head for genuinely new events, and only if the user
          // has not clicked an earlier event to inspect it (prev at the old head
          // or unset). Replayed/out-of-order events never move the selection.
          const priorHead = headSeqRef.current;
          if (priorHead == null || event.seq > priorHead) {
            headSeqRef.current = event.seq;
            setSelectedSeq((prev) => (prev == null || prev === priorHead ? event.seq : prev));
          }
          if (event.kind === "run_started") {
            const eventView = event.payload?.config?.clientView;
            if (eventView === "answer_only") setOperatorRecordOpen(false);
          }
          if (event.kind === "run_finished") {
            const wasCancelled = event.payload?.stoppedBy === "cancelled";
            setStatus(
              wasCancelled
                ? options.source === "recorded" ? "cancelled record" : "cancelled"
                : options.source === "recorded" ? "replayed" : "finished",
            );
            closeWhenDone();
          }
        },
        (nextStatus) => {
          const value = String(nextStatus.status ?? "");
          if (value === "running") setStatus("running");
          else if (value === "replay") setStatus("replay");
          else if (value === "cancelling") setStatus("cancelling");
          else if (value === "cancelled") {
            setStatus(options.source === "recorded" ? "cancelled record" : "cancelled");
            closeWhenDone();
          }
          else if (value === "finished") {
            setStatus(options.source === "recorded" ? "replayed" : "finished");
            closeWhenDone();
          } else if (value === "error") {
            setStatus("error");
            setError(String(nextStatus.error ?? "Run failed"));
            closeWhenDone();
          }
        },
        options.pace,
        (message) => {
          if (!closed) setStreamNotice(message);
        },
      );

      // Paced runs (the instant offline panel replayed at 90ms/event) are
      // server-local and stream every event reliably; the run_finished event
      // closes the stream on its own. Skip reconciliation there so a 4s poll
      // cannot flood the whole ledger at once and cut the animation short.
      if (options.source !== "recorded" && !options.pace) {
        reconcileRef.current = window.setInterval(async () => {
          try {
            const details = await fetchRun(key);
            setEvents((current) =>
              details.events.reduce((merged, event) => mergeLedgerEvent(merged, event), current),
            );
            if (details.status === "error") {
              setStatus("error");
              setError(details.error ?? "Run failed");
              closeWhenDone();
            } else if (details.events.some((event) => event.kind === "run_finished")) {
              const finished = [...details.events].reverse().find((event) => event.kind === "run_finished");
              setStatus(finished?.payload?.stoppedBy === "cancelled" ? "cancelled" : "finished");
              closeWhenDone();
            }
          } catch {
            // EventSource remains the primary transport; reconciliation retries.
          }
        }, 4000);
      }
    },
    [clearConnection, refreshRuns],
  );

  const beginRun = async () => {
    if (!selectedPack) return;
    const resolved = resolveMode();
    const validationErrors = validatePanelConfig(config, resolved, panel, capabilities);
    if (validationErrors.length) {
      setError(validationErrors[0]);
      return;
    }
    const exactAssignment =
      resolved === "offline" || config.seatingMode !== "exact"
        ? undefined
        : assignmentForRequest(resolved, config.assignments);
    const exactMode = Boolean(exactAssignment);
    resetRunView(selectedPack);
    setView("chamber");
    setStarting(true);
    setMode(resolved);
    setOperatorRecordOpen(config.clientView !== "answer_only");
    try {
      const response = await startRun({
        packId: selectedPack.id,
        mode: resolved,
        seed: config.seed,
        maxSpans: config.maxSpans,
        flags: config.flags,
        providers: resolved === "cli" && !exactMode ? config.providers : undefined,
        assignment: exactAssignment,
        clientView: config.clientView,
      });
      connectStream(response.runId, {
        source: "new",
        mode: resolved,
        pace: resolved === "offline" ? 90 : undefined,
      });
    } catch (nextError: any) {
      setStatus("error");
      setError(nextError.message);
    } finally {
      setStarting(false);
    }
  };

  const runProbe = async () => {
    setProbing(true);
    setError("");
    try {
      setPanel(await fetchPanel(true));
    } catch (nextError: any) {
      setError(nextError.message);
    } finally {
      setProbing(false);
    }
  };

  const attachRun = (run: RunMeta) => {
    const pack = packs.find((item) => item.id === run.packId) ?? null;
    resetRunView(pack);
    setView("chamber");
    setOperatorRecordOpen(true);
    connectStream(storageKey(run), { source: "live", mode: run.mode });
  };

  const replayRun = (run: RunMeta) => {
    const pack = packs.find((item) => item.id === run.packId) ?? null;
    resetRunView(pack);
    setView("chamber");
    setOperatorRecordOpen(true);
    connectStream(storageKey(run), { source: "recorded", mode: run.mode, pace: 90 });
  };

  const openRun = async (run: RunMeta) => {
    const pack = packs.find((item) => item.id === run.packId) ?? null;
    resetRunView(pack);
    setView("chamber");
    setStatus("loading");
    try {
      const details = await fetchRun(storageKey(run));
      setEvents(details.events);
      setSelectedSeq(details.events.at(-1)?.seq ?? null);
      setActiveRunKey(storageKey(run));
      setSource("recorded");
      setMode(run.mode);
      setStatus(
        details.events.some((event) => event.kind === "run_finished" && event.payload?.stoppedBy === "cancelled")
          ? "cancelled record"
          : "recorded",
      );
      setStreamActive(false);
      setOperatorRecordOpen(true);
    } catch (nextError: any) {
      setStatus("error");
      setError(nextError.message);
    }
  };

  const importLedger = async (file: File) => {
    resetRunView(null);
    setView("chamber");
    setStatus("importing");
    try {
      const imported = readLedgerFile(JSON.parse(await file.text()));
      const importedTelemetry = deriveRunTelemetry(imported);
      const pack = packs.find((item) => item.id === importedTelemetry.packId);
      if (pack) setSelectedPackId(pack.id);
      setEvents(imported);
      setSelectedSeq(imported.at(-1)?.seq ?? null);
      setActiveRunKey(null);
      setSource("imported");
      setMode(importedTelemetry.mode ?? "offline");
      setStatus(
        imported.some((event) => event.kind === "run_finished" && event.payload?.stoppedBy === "cancelled")
          ? "cancelled record"
          : "imported",
      );
      setStreamActive(false);
      setOperatorRecordOpen(true);
      setVerifyResult(await verifyEvents(imported));
      setActionNotice(`Imported and verified ${imported.length} ledger events from ${file.name}.`);
    } catch (nextError: any) {
      setStatus("error");
      setError(nextError.message);
    }
  };

  const verifyCurrent = async (navigate = true) => {
    if (!events.length) return;
    setActionNotice("Verifying the exact ledger currently in view…");
    try {
      const result = await verifyEvents(events);
      setVerifyResult(result);
      setActionNotice(result.verify?.ok ? "Ledger verified." : "Verification found integrity problems.");
      if (navigate) setView("audit");
    } catch (nextError: any) {
      setError(nextError.message);
    }
  };

  const testTamper = async () => {
    if (!activeRunKey || selectedSeq == null) return;
    try {
      const result = await tamperRun(activeRunKey, selectedSeq);
      setTamperResult(result);
      setActionNotice(
        result.verify?.ok
          ? "The targeted mutation still verified. This is a failure condition."
          : `Mutation at sequence ${selectedSeq} was detected by the chain.`,
      );
    } catch (nextError: any) {
      setError(nextError.message);
    }
  };

  const submitIntervention = async (draft: InterventionDraft) => {
    if (!activeRunKey) return;
    try {
      const result = await intervene(activeRunKey, draft);
      setInterventionQueue((current) => [
        ...current,
        {
          ...draft,
          interventionId: result.interventionId,
          state: "queued",
          willApplyAtSpan: result.willApplyAtSpan,
        },
      ]);
      setActionNotice(`Intervention accepted for checkpoint ${result.willApplyAtSpan + 1}; awaiting ledger receipt.`);
    } catch (nextError: any) {
      setError(nextError.message);
    }
  };

  const removeQueuedIntervention = async (interventionId: string) => {
    if (!activeRunKey) return;
    try {
      await cancelIntervention(activeRunKey, interventionId);
      setInterventionQueue((current) =>
        current.map((item) =>
          item.interventionId === interventionId ? { ...item, state: "not_applied" } : item,
        ),
      );
      setActionNotice(`Intervention ${interventionId} removed before application.`);
    } catch (nextError: any) {
      setError(nextError.message);
    }
  };

  const stopCurrentRun = async () => {
    if (!activeRunKey || !canCancel) return;
    const actor = cancelActor.trim();
    const reason = cancelReason.trim();
    if (!actor || !reason) {
      setError("A stop receipt requires both an actor and a reason.");
      return;
    }
    setError("");
    setStatus("cancelling");
    try {
      const response = await cancelRun(activeRunKey, { actor, reason });
      setActionNotice(
        `Safe stop accepted. ${response.cancellation.unappliedInterventions} queued intervention(s) will be recorded as not applied.`,
      );
    } catch (nextError: any) {
      setStatus("running");
      setError(nextError.message);
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setActionNotice(`${label} copied.`);
    } catch {
      setActionNotice(`Could not copy ${label.toLowerCase()}; select it manually.`);
    }
  };

  const exportLedger = () => {
    if (!events.length) return;
    downloadJson(`${telemetry.ledgerRunId ?? "tribunal-import"}.ledger.json`, events);
    setActionNotice("Ledger JSON exported.");
  };

  const exportAudit = () => {
    if (!verifyResult) return;
    downloadJson(`${telemetry.ledgerRunId ?? "tribunal-import"}.audit.json`, verifyResult);
    setActionNotice("Verification and scorecard JSON exported.");
  };

  const pendingMessage = interventionQueue.length
    ? `${interventionQueue.filter((item) => item.state === "applied").length} applied · ${interventionQueue.filter((item) => item.state === "queued" || item.state === "processing").length} pending · ${interventionQueue.filter((item) => item.state === "not_applied").length} not applied.`
    : "";

  return (
    <div className="min-h-screen flex flex-col courtroom-bg" data-testid="tribunal-app">
      <header className="app-header">
        <button type="button" className="text-left min-w-0 shrink" onClick={() => setView("docket")} aria-label="Open Tribunal docket">
          <span className="font-serif text-2xl md:text-3xl text-tribunal-gold tracking-tight">Tribunal</span>
          <span className="hidden md:block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mt-0.5">
            due-process operator console
          </span>
        </button>
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary navigation">
          {(["decoder", "docket", "chamber", "audit", "runs"] as View[]).map((item) => {
            const enabled =
              item === "decoder" ||
              item === "docket" ||
              item === "runs" ||
              (item === "chamber" ? events.length > 0 || streamActive : Boolean(verifyResult));
            return (
              <button
                key={item}
                type="button"
                disabled={!enabled}
                title={!enabled ? "Available after a run is convened" : undefined}
                aria-current={view === item ? "page" : undefined}
                onClick={() => setView(item)}
                className={`nav-button ${view === item ? "nav-button-active" : ""}`}
              >
                {item}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="sr-only" aria-live="polite">
        Run status {status}. {streamNotice} {actionNotice}
      </div>

      {(error || streamNotice || actionNotice) && (
        <div className="max-w-[1480px] w-full mx-auto px-4 md:px-6 pt-3">
          {error && (
            <div className="notice notice-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="text-button">Dismiss</button>
            </div>
          )}
          {!error && streamNotice && <div className="notice notice-warn">{streamNotice}</div>}
          {!error && !streamNotice && actionNotice && (
            <div className="notice notice-neutral">
              <span>{actionNotice}</span>
              <button type="button" onClick={() => setActionNotice("")} className="text-button">Dismiss</button>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 w-full max-w-[1480px] mx-auto p-4 md:p-6">
        <div>
          <div hidden={view !== "decoder"}>
            <DecoderLab />
          </div>
          {view === "docket" && (
            <motion.div key="docket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
                <div className="space-y-5">
                  <div className="max-w-3xl py-3">
                    <p className="eyebrow text-tribunal-gold">Glass-box decision control</p>
                    <h1 className="font-serif text-4xl md:text-5xl leading-[1.02] text-zinc-100 mt-3">
                      Convene, intervene, inspect, and verify the whole proceeding.
                    </h1>
                    <p className="text-sm md:text-base text-zinc-400 leading-relaxed mt-4 max-w-2xl">
                      Every verdict span is elected by a chartered panel. You control the panel, the due-process ablations, the human record, and the final integrity check.
                    </p>
                  </div>

                  <section aria-labelledby="choose-case-title">
                    <div className="flex items-end justify-between gap-3 mb-3">
                      <div>
                        <p className="eyebrow">Case packs</p>
                        <h2 id="choose-case-title" className="font-serif text-2xl mt-1">Choose the docket</h2>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {packs.length ? `${packs.length} governed domains` : "loading…"}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {packs.length === 0 && !error &&
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={`pack-skeleton-${i}`} className="case-card animate-pulse opacity-40" aria-hidden="true" />
                        ))}
                      {packs.map((pack) => {
                        const selected = pack.id === selectedPackId;
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => selectPack(pack)}
                            className={`case-card ${selected ? "case-card-selected" : ""}`}
                            data-testid={`pack-${pack.domain}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="status-chip status-chip-neutral capitalize">{pack.domain}</span>
                              <span className="font-mono text-[10px] text-zinc-400">{pack.slots.length} slots</span>
                            </span>
                            <span className="block font-serif text-xl text-zinc-100 mt-3">{pack.title}</span>
                            <span className="block text-xs text-zinc-500 mt-2 leading-relaxed">{pack.tagline}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {selectedPack && <CaseFilePanel pack={selectedPack} />}
                </div>

                <div className="lg:sticky lg:top-24">
                  <RunConfigurator
                    pack={selectedPack}
                    panel={panel}
                    capabilities={capabilities}
                    config={config}
                    busy={starting}
                    probing={probing}
                    onChange={setConfig}
                    onStart={beginRun}
                    onProbe={runProbe}
                  />
                </div>
              </section>
              <CompareStrip />
            </motion.div>
          )}

          {view === "runs" && (
            <motion.div key="runs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <RunLibrary
                live={runs.live}
                recorded={runs.recorded}
                onAttach={attachRun}
                onReplay={replayRun}
                onOpen={openRun}
                onImport={importLedger}
              />
            </motion.div>
          )}

          {view === "chamber" && (
            <motion.div key="chamber" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <section className="glass p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-chip ${status === "running" ? "status-chip-live" : status === "error" || status === "cancelled" ? "status-chip-error" : "status-chip-neutral"}`}>
                        {status}{streamActive && <span className="live-dot" />}
                      </span>
                      <span className="status-chip status-chip-neutral">{mode}</span>
                      {source && <span className="status-chip status-chip-neutral">{source}</span>}
                    </div>
                    <h1 className="font-serif text-3xl text-zinc-100 mt-3">{selectedPack?.title ?? "Imported proceeding"}</h1>
                    <p className="text-sm text-zinc-500 mt-1">{selectedPack?.question ?? "Inspecting an external Tribunal ledger."}</p>
                    {telemetry.ledgerRunId && (
                      <p className="font-mono text-[10px] text-zinc-400 mt-2" title={telemetry.ledgerRunId}>
                        ledger {compactRunId(telemetry.ledgerRunId)}
                        {activeRunKey && activeRunKey !== telemetry.ledgerRunId ? ` · artifact ${activeRunKey}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button type="button" className="text-button" onClick={exportLedger} disabled={!events.length}>Export ledger</button>
                    <button type="button" className="text-button" onClick={() => headHash && copyText(headHash, "Chain head")} disabled={!headHash}>Copy head</button>
                    <button type="button" className="secondary-button" onClick={() => verifyCurrent()} disabled={!completed}>
                      {deliberation.stoppedBy === "cancelled" ? "Verify cancellation record" : "Verify + audit"}
                    </button>
                  </div>
                </div>
                {liveRun && ["running", "cancelling"].includes(status) && (
                  <details className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/[0.035] p-3">
                    <summary className="cursor-pointer text-xs font-medium text-rose-200">Safe stop controls</summary>
                    <div className="grid md:grid-cols-[180px_minmax(260px,1fr)_auto] gap-2 mt-3 items-end">
                      <label>
                        <span className="field-label">Receipt actor</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100"
                          value={cancelActor}
                          maxLength={120}
                          onChange={(event) => setCancelActor(event.target.value)}
                          disabled={status === "cancelling"}
                        />
                      </label>
                      <label>
                        <span className="field-label">Public stop reason</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100"
                          value={cancelReason}
                          maxLength={1000}
                          onChange={(event) => setCancelReason(event.target.value)}
                          disabled={status === "cancelling"}
                        />
                      </label>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={stopCurrentRun}
                        disabled={!canCancel || !cancelActor.trim() || !cancelReason.trim()}
                      >
                        {status === "cancelling" ? "Stopping safely…" : "Stop safely"}
                      </button>
                    </div>
                  </details>
                )}
              </section>

              <PhaseTracker view={deliberation} />
              <CancellationPanel view={deliberation} />

              {answerOnly && (
                <section className="glass border-tribunal-gold/30 p-6 text-center">
                  <p className="eyebrow text-tribunal-gold">Answer-only client presentation</p>
                  <h2 className="font-serif text-3xl mt-3">The operator still holds the full record.</h2>
                  <p className="text-sm text-zinc-500 mt-2 max-w-xl mx-auto">
                    Deliberation details are hidden in this presentation mode until you explicitly open the operator record. Every event is still being ledgered.
                  </p>
                  <button type="button" className="secondary-button mt-4" onClick={() => setOperatorRecordOpen(true)}>Open operator record</button>
                </section>
              )}

              {!answerOnly && (
                <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
                  <div className="space-y-4 min-w-0">
                    <Bench view={deliberation} />
                    <CandidateBoard view={deliberation} />
                    <VerdictStrip view={deliberation} />
                  </div>
                  <aside className="space-y-4 xl:sticky xl:top-24">
                    <InterventionConsole
                      canIntervene={canIntervene}
                      currentSpan={deliberation.spanIndex}
                      candidates={deliberation.candidates}
                      pendingMessage={pendingMessage}
                      queue={interventionQueue}
                      onSubmit={submitIntervention}
                      onCancel={removeQueuedIntervention}
                    />
                    <TelemetryPanel telemetry={telemetry} />
                    <DissentRegister view={deliberation} />
                    {headHash && (
                      <section className="glass p-3">
                        <p className="eyebrow">Externally anchorable head</p>
                        <p className="font-mono text-[10px] text-zinc-400 break-all mt-2">{headHash}</p>
                      </section>
                    )}
                  </aside>
                </div>
              )}

              {tamperResult && (
                <section className={`notice ${tamperResult.verify?.ok ? "notice-error" : "notice-success"}`}>
                  Targeted mutation at sequence {tamperResult.tamperedSeq}: {tamperResult.verify?.ok ? "verification still passed" : `detected (${tamperResult.verify?.problems?.[0]?.reason ?? "integrity failure"})`}.
                </section>
              )}

              {!answerOnly && events.length > 0 && (
                <>
                  <div className="glass p-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-zinc-400">
                      Select an event below, then mutate that exact sequence against the server's stored copy.
                    </p>
                    <button type="button" className="danger-button" onClick={testTamper} disabled={!activeRunKey || selectedSeq == null || !completed}>
                      Tamper-test seq {selectedSeq ?? "—"}
                    </button>
                  </div>
                  <LedgerExplorer events={events} selectedSeq={selectedSeq} onSelectSeq={setSelectedSeq} />
                </>
              )}
            </motion.div>
          )}

          {view === "audit" && (
            <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-6xl mx-auto">
              <section className="glass p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="eyebrow">Independent verification workbench</p>
                    <h1 className="font-serif text-3xl md:text-4xl mt-2">{verifyResult?.verify?.ok ? "The record verifies." : "The record needs review."}</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                      Hash linkage, sequence continuity, final-answer binding, and A1–A12 are recomputed from the exact events in view.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="text-button" onClick={() => verifyCurrent(false)} disabled={!events.length}>Re-run verification</button>
                    <button type="button" className="secondary-button" onClick={exportAudit} disabled={!verifyResult}>Export report</button>
                  </div>
                </div>
              </section>

              {verifyResult ? (
                <>
                  <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <AuditMetric label="Hash chain" value={verifyResult.verify?.ok ? "VALID" : "INVALID"} pass={Boolean(verifyResult.verify?.ok)} />
                    <AuditMetric label="Answer binding" value={verifyResult.verify?.answerConsistent ? "PASS" : "FAIL"} pass={Boolean(verifyResult.verify?.answerConsistent)} />
                    <AuditMetric label="Tribunal audit" value={`${verifyResult.audit?.total ?? 0}/${verifyResult.audit?.outOf ?? 12}`} pass={(verifyResult.audit?.total ?? 0) === (verifyResult.audit?.outOf ?? 12)} />
                    <AuditMetric label="Plain model baseline" value={`${verifyResult.baseline?.total ?? 0}/12`} pass={false} neutral />
                  </section>

                  {verifyResult.verify?.problems?.length > 0 && (
                    <section className="glass border-rose-400/30 overflow-hidden">
                      <div className="p-4 border-b border-zinc-800">
                        <p className="eyebrow text-rose-300">Integrity problems</p>
                      </div>
                      <ul className="divide-y divide-zinc-800">
                        {verifyResult.verify.problems.map((problem: any, index: number) => (
                          <li key={`${problem.seq}:${problem.reason}:${index}`} className="p-4">
                            <p className="text-sm text-rose-200">Sequence {problem.seq} · {problem.reason}</p>
                            <p className="text-xs text-zinc-500 mt-1">{problem.kind}: {problem.detail}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="glass overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                      <div>
                        <p className="eyebrow">A1–A12</p>
                        <h2 className="font-serif text-2xl mt-1">Artifact-backed auditability</h2>
                      </div>
                      <span className="status-chip status-chip-neutral">not an accuracy score</span>
                    </div>
                    <ul className="divide-y divide-zinc-800">
                      {(verifyResult.audit?.items ?? []).map((item: any) => (
                        <li key={item.id} className="p-4 flex gap-3">
                          <span className={`audit-mark ${item.pass ? "audit-mark-pass" : "audit-mark-fail"}`}>{item.pass ? "PASS" : "FAIL"}</span>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{item.id} · {item.label}</p>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.evidence}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="glass p-4">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Verification proves internal consistency of the supplied bytes. A stored head hash is not an independent anchor; publish or retain it outside the ledger holder to establish an external commitment.
                    </p>
                    {verifyResult.verify?.head && <p className="font-mono text-[10px] text-zinc-400 break-all mt-2">{verifyResult.verify.head}</p>}
                  </section>
                </>
              ) : (
                <section className="glass p-8 text-center">
                  <p className="text-sm text-zinc-500">Complete or import a ledger, then run verification.</p>
                </section>
              )}
            </motion.div>
          )}
        </div>
      </main>

      <footer className="border-t border-tribunal-border/60 px-4 md:px-6 py-4 text-center text-[10px] text-zinc-400 font-mono">
        Tribunal records due process; it does not certify answer quality or legal compliance. ·{" "}
        <a href="https://github.com/pazare/tribunal" className="text-zinc-500 hover:text-tribunal-gold focus-visible:text-tribunal-gold">
          source repository
        </a>
      </footer>
    </div>
  );
}

function AuditMetric({ label, value, pass, neutral = false }: { label: string; value: string; pass: boolean; neutral?: boolean }) {
  return (
    <div className={`glass p-4 ${neutral ? "opacity-70" : pass ? "border-emerald-400/25" : "border-rose-400/25"}`}>
      <p className={`font-serif text-3xl ${neutral ? "text-zinc-400" : pass ? "text-emerald-300" : "text-rose-300"}`}>{value}</p>
      <p className="field-label mt-1">{label}</p>
    </div>
  );
}
