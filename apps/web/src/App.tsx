import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DOMAIN_META,
  EVENT_LABELS,
  type LedgerEvent,
  type PackSummary,
  type PanelHealth,
  fetchPacks,
  fetchPanel,
  fetchRuns,
  startRun,
  subscribeRun,
  verifyRun,
  tamperRun,
  intervene,
} from "./api";
import { deriveDeliberation } from "./lib/deliberation";
import {
  Bench,
  CandidateBoard,
  CompareStrip,
  DissentRegister,
  PhaseTracker,
  VerdictStrip,
  truncate,
} from "./components";

type View = "docket" | "chamber" | "scorecard";

function eventSummary(e: LedgerEvent): string {
  const p = e.payload as any;
  switch (e.kind) {
    case "run_started":
      return `${p.panel?.length ?? 0} seats · ${p.note ?? ""}`;
    case "blind_commitment":
      return `${p.society} · ${p.provider} sealed ${String(p.proposalHash).slice(0, 10)}…`;
    case "proposals_revealed":
      return `${p.proposals?.length ?? 0} proposals · hash checks ${p.hashChecks?.every((h: any) => h.ok) ? "OK" : "FAIL"}`;
    case "ratification":
      return `${p.decision?.method?.replace(/_/g, " ")} → "${truncate(p.decision?.selected?.candidate?.text || "<STOP>", 60)}"`;
    case "dissent_preserved":
      return `${p.dissent?.objection?.raisedBy}: ${truncate(p.dissent?.objection?.text, 50)}`;
    case "span_committed":
      return p.isStop ? "STOP ratified" : `+ "${truncate(p.text, 50)}"`;
    case "human_intervention":
      return `${p.actor} · ${p.kind}: ${truncate(p.text, 40)}`;
    case "provider_call":
      return `${p.seatId} · ${p.usage?.provider} (${p.usage?.status}) ${p.usage?.latencyMs ?? "?"}ms`;
    case "run_finished":
      return truncate(p.finalAnswer, 80);
    default:
      return "";
  }
}

export default function App() {
  const [view, setView] = useState<View>("docket");
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [panel, setPanel] = useState<PanelHealth | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackSummary | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [status, setStatus] = useState<string>("idle");
  const [finalAnswer, setFinalAnswer] = useState("");
  const [mode, setMode] = useState<"offline" | "cli" | "openrouter">("offline");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [tamperResult, setTamperResult] = useState<any>(null);
  const [recordedRuns, setRecordedRuns] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [showRawLedger, setShowRawLedger] = useState(false);
  const [panelChoice, setPanelChoice] = useState<"auto" | "offline" | "cli" | "openrouter">(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    return m === "offline" || m === "cli" || m === "openrouter" ? m : "auto";
  });
  const [vetoNote, setVetoNote] = useState("");
  const ledgerRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<number | null>(null);
  const sseCountRef = useRef(0);

  useEffect(() => {
    fetchPacks().then(setPacks).catch(console.error);
    fetchPanel().then(setPanel).catch(console.error);
    fetchRuns().then((r) => setRecordedRuns(r.recorded)).catch(console.error);
  }, []);

  useEffect(() => {
    if (ledgerRef.current) ledgerRef.current.scrollTop = ledgerRef.current.scrollHeight;
  }, [events.length]);

  /** Everything the theater shows is derived purely from ledger events. */
  const delib = useMemo(() => deriveDeliberation(events), [events]);

  const pickMode = useCallback((): "offline" | "cli" | "openrouter" => {
    if (panelChoice !== "auto") return panelChoice;
    if (panel?.openrouter?.available) return "openrouter";
    const cliLive = panel?.cli && Object.values(panel.cli).some((c) => c.present);
    if (cliLive) return "cli";
    return "offline";
  }, [panel, panelChoice]);

  const beginRun = async (
    pack: PackSummary,
    opts?: { replayId?: string; replayMode?: string; forceMode?: typeof mode },
  ) => {
    setError("");
    setEvents([]);
    setVerifyResult(null);
    setTamperResult(null);
    setFinalAnswer("");
    setVetoNote("");
    setSelectedPack(pack);
    setView("chamber");
    // Kill any previous run's stream + fallback poll before starting a new one.
    unsubRef.current?.();
    unsubRef.current = null;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;

    if (opts?.replayId) {
      setRunId(opts.replayId);
      setStatus("replay");
      // Honest labeling: show the mode the RECORDED run actually used.
      setMode((opts.replayMode as typeof mode) ?? "offline");
      setRunning(true);
      unsubRef.current = subscribeRun(
        opts.replayId,
        (e) => setEvents((prev) => [...prev, e]),
        (s) => {
          if (s.status === "finished") {
            setRunning(false);
            setStatus("replayed");
            if (s.finalAnswer) setFinalAnswer(String(s.finalAnswer));
            unsubRef.current?.();
            unsubRef.current = null;
          }
        },
        180,
      );
      return;
    }

    const m = opts?.forceMode ?? pickMode();
    setMode(m);
    setRunning(true);
    setStatus("starting");
    try {
      const providers =
        m === "cli"
          ? (["openai", "xai", "anthropic"] as const).filter((p) => panel?.cli?.[p]?.present)
          : undefined;
      const { runId: id } = await startRun({
        packId: pack.id,
        mode: m,
        providers: providers?.length ? [...providers] : undefined,
      });
      setRunId(id);
      setStatus("running");
      sseCountRef.current = 0;
      // Offline runs finish in milliseconds; a paced SSE playback lets the
      // theater animate the deliberation instead of receiving one dump.
      const pace = m === "offline" ? 140 : undefined;
      unsubRef.current = subscribeRun(
        id,
        (e) => {
          sseCountRef.current += 1;
          setEvents((prev) => [...prev, e]);
          if (e.kind === "run_finished") {
            setFinalAnswer(String((e.payload as any).finalAnswer ?? ""));
            setRunning(false);
            setStatus("finished");
            setRunId(e.runId);
            unsubRef.current?.();
            unsubRef.current = null;
          }
        },
        (s) => {
          if (s.status === "finished") {
            setRunning(false);
            setStatus("finished");
            if (s.runId) setRunId(String(s.runId));
            if (s.finalAnswer) setFinalAnswer(String(s.finalAnswer));
            unsubRef.current?.();
            unsubRef.current = null;
          }
          if (s.status === "error") {
            setRunning(false);
            setStatus("error");
            setError(String(s.error ?? "run failed"));
            unsubRef.current?.();
            unsubRef.current = null;
          }
        },
        pace,
      );
      // Pure fallback: if the SSE stream delivers nothing, fetch the finished
      // run. Disengages the moment any event arrives over SSE.
      pollRef.current = window.setInterval(async () => {
        if (sseCountRef.current > 0) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          return;
        }
        try {
          const r = await fetch(`/api/runs/${id}`);
          if (!r.ok) return;
          const j = await r.json();
          const fin = j.events?.find((e: LedgerEvent) => e.kind === "run_finished");
          if (fin || j.status === "finished" || j.status === "error") {
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
            if (sseCountRef.current > 0) return;
            if (j.events?.length) setEvents(j.events);
            setRunning(false);
            setStatus(j.status === "error" ? "error" : "finished");
            if (fin) {
              setFinalAnswer(String((fin.payload as any).finalAnswer ?? ""));
              setRunId(fin.runId);
            }
          }
        } catch {
          /* ignore */
        }
      }, 2500);
    } catch (e: any) {
      setRunning(false);
      setError(e.message);
    }
  };

  const doVerify = async () => {
    if (!runId) return;
    setVerifyResult(await verifyRun(runId));
    setView("scorecard");
  };

  const doTamper = async () => {
    if (!runId || !canVerify) return;
    setTamperResult(await tamperRun(runId));
  };

  /** Human veto targets the current leading (non-STOP, non-vetoed) candidate — works on every pack. */
  const doVeto = async () => {
    if (!runId || !running) return;
    const target = delib.candidates.find((c) => !c.isStop && !c.vetoed);
    const res = await intervene(runId, {
      kind: "veto",
      actor: "Compliance auditor",
      text: target
        ? `Blocking "${truncate(target.text || target.key, 80)}" pending human review of the contested evidence.`
        : "Blocking the leading candidate pending human review.",
      targetKey: target?.key,
    });
    setVetoNote(
      res?.queued
        ? `Veto queued — will be ledgered at span ${res.willApplyAtSpan}.`
        : `Veto not accepted: ${res?.error ?? "run is not live"}.`,
    );
  };

  const canVerify = useMemo(
    () => events.some((e) => e.kind === "run_finished") && Boolean(runId),
    [events, runId],
  );

  /** Live chain head — the hash of the newest ledger event (anchor externally). */
  const headHash = useMemo(
    () => (events.length ? events[events.length - 1].hash : null),
    [events],
  );

  const auditScore = verifyResult?.audit?.total ?? null;
  const baselineScore = verifyResult?.baseline?.total ?? 0;

  return (
    <div className="min-h-screen flex flex-col courtroom-bg" data-testid="tribunal-app">
      <header className="border-b border-tribunal-border/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-3xl text-tribunal-gold tracking-tight">Tribunal</h1>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
            due process · cross-provider · hash-chained ledger
          </span>
        </div>
        <nav className="flex gap-2 text-sm">
          {(["docket", "chamber", "scorecard"] as View[]).map((v) => {
            const enabled = v === "docket" || (v === "chamber" ? events.length > 0 : Boolean(verifyResult));
            return (
              <button
                key={v}
                type="button"
                disabled={!enabled}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  view === v
                    ? "bg-tribunal-gold/20 text-tribunal-gold"
                    : enabled
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-700 cursor-not-allowed"
                }`}
              >
                {v}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === "docket" && (
            <motion.div key="docket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <section className="text-center max-w-3xl mx-auto pt-4">
                <p className="font-serif text-2xl md:text-3xl text-zinc-200 leading-snug">
                  When AI denies your loan, claim, or benefits — you deserve a{" "}
                  <em className="text-tribunal-gold">record</em>, not a paragraph.
                </p>
                <p className="mt-4 text-zinc-500 text-sm max-w-2xl mx-auto">
                  Tribunal is an <span className="text-zinc-300">explainable decoder</span>: instead of one model
                  sampling tokens in the dark, the verdict is generated span by span through an election — six seats
                  (rival AI vendors live, scripted stand-ins offline) cast secret ballots, cross-examine anonymously, and a named rule elects each
                  span. Veto, preserved dissent, and a tamper-evident ledger are part of the decoding loop itself.
                </p>
              </section>

              <section className="flex items-center justify-center gap-2 text-[11px]" data-testid="mode-picker">
                <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Panel</span>
                {(
                  [
                    { id: "auto", label: "Auto" },
                    { id: "cli", label: "Live cross-provider" },
                    { id: "openrouter", label: "OpenRouter ×5" },
                    { id: "offline", label: "Instant (scripted)" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setPanelChoice(o.id)}
                    className={`px-2.5 py-1 rounded-full border transition ${
                      panelChoice === o.id
                        ? "border-tribunal-gold/60 text-tribunal-gold bg-tribunal-gold/10"
                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
                <span className="text-zinc-600 hidden md:inline">
                  {panelChoice === "offline"
                    ? "— deterministic scripted panel, no model calls (labeled as such on the record)"
                    : panelChoice === "cli"
                      ? "— live seats via whichever local CLIs are present"
                      : panelChoice === "openrouter"
                        ? "— Microsoft, NVIDIA, Meta, DeepSeek, Mistral via one key"
                        : "— best available: OpenRouter, then CLIs, then scripted"}
                </span>
              </section>

              <section className="grid md:grid-cols-2 gap-4">
                {packs.map((p) => {
                  const meta = DOMAIN_META[p.domain] ?? DOMAIN_META.lending;
                  return (
                    <article
                      key={p.id}
                      className="glass p-5 ledger-glow hover:border-tribunal-gold/40 transition cursor-pointer group flex flex-col"
                      onClick={() => beginRun(p)}
                      data-testid={`pack-${p.domain}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-2xl ${meta.color}`}>{meta.icon}</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/90 bg-emerald-400/10 px-2 py-0.5 rounded">
                          Live demo
                        </span>
                      </div>
                      <h2 className="font-serif text-xl mt-2 group-hover:text-tribunal-gold transition">{p.title}</h2>
                      <p className="text-xs text-zinc-500 mt-1">{meta.statute}</p>
                      <p className="text-sm text-zinc-400 mt-3">{p.tagline}</p>
                      <p className="text-xs text-amber-200/70 mt-2 font-mono">
                        Planted trap: {truncate(p.trapNote ?? "", 150)}
                      </p>
                      <button
                        type="button"
                        className="mt-auto pt-4 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          beginRun(p);
                        }}
                      >
                        <span className="block w-full py-2 rounded-lg bg-tribunal-gold/15 text-tribunal-gold text-sm font-medium hover:bg-tribunal-gold/25 text-center">
                          Convene the panel →
                        </span>
                      </button>
                    </article>
                  );
                })}
              </section>

              <CompareStrip />

              {recordedRuns.length > 0 && (
                <section className="glass p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">Recorded runs (replay the actual ledger)</h3>
                  <p className="text-[11px] text-zinc-600 mb-3">
                    Committed, anchored ledgers replayed event-by-event — not simulated. `cli` runs are real
                    cross-provider panels; `offline` runs are the deterministic scripted panel, labeled as such on the
                    record.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recordedRuns.map((r) => (
                      <button
                        key={r.runId}
                        type="button"
                        data-testid={`replay-${r.runId}`}
                        className={`text-xs font-mono px-3 py-1.5 rounded hover:bg-zinc-700 ${
                          r.mode === "cli" || r.mode === "openrouter"
                            ? "bg-emerald-500/10 text-emerald-200"
                            : "bg-zinc-800"
                        }`}
                        onClick={() => {
                          const pack = packs.find((p) => p.id === r.packId) ?? packs[0];
                          if (pack) beginRun(pack, { replayId: r.runId, replayMode: r.mode });
                        }}
                      >
                        {r.label} · {r.auditability ?? "?"}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {panel && (
                <section className="glass p-4 text-xs font-mono text-zinc-500 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>offline: {panel.offline.available ? "✓" : "✗"}</div>
                  {Object.entries(panel.cli).map(([k, v]) => (
                    <div key={k}>
                      {k}: {v.present ? "✓" : "✗"}
                    </div>
                  ))}
                  <div>openrouter: {panel.openrouter.available ? "✓" : "—"}</div>
                </section>
              )}
            </motion.div>
          )}

          {view === "chamber" && (
            <motion.div key="chamber" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-serif text-2xl leading-tight">{selectedPack?.title ?? "Deliberation chamber"}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedPack?.question ?? ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {delib.liveNote && (
                    <span
                      className={`text-[10px] font-mono px-2 py-1 rounded ${
                        delib.liveNote.startsWith("OFFLINE")
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-emerald-500/10 text-emerald-300"
                      }`}
                      title={delib.liveNote}
                    >
                      {delib.liveNote.startsWith("OFFLINE") ? "scripted panel (CI) — not model output" : "live multi-provider panel"}
                    </span>
                  )}
                  <span className="text-xs font-mono px-2.5 py-1.5 rounded bg-zinc-800">
                    {status} · {mode}
                    {running && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  </span>
                </div>
              </div>

              <PhaseTracker view={delib} />

              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <Bench view={delib} />
                  <CandidateBoard view={delib} />
                  <VerdictStrip view={delib} />
                  {error && <p className="text-rose-400 text-sm">{error}</p>}
                </div>

                <aside className="space-y-4">
                  <div className="glass p-4 space-y-2">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500">Auditor controls</h3>
                    <button
                      type="button"
                      disabled={!running}
                      onClick={doVeto}
                      className="w-full py-2 text-sm rounded bg-rose-500/20 text-rose-300 disabled:opacity-40 hover:bg-rose-500/30"
                      data-testid="human-veto"
                    >
                      Inject human veto
                    </button>
                    <button
                      type="button"
                      disabled={!canVerify}
                      onClick={doVerify}
                      className="w-full py-2 text-sm rounded bg-tribunal-mint/15 text-tribunal-mint disabled:opacity-40 hover:bg-tribunal-mint/25"
                      data-testid="verify-btn"
                    >
                      Verify ledger + scorecard
                    </button>
                    <button
                      type="button"
                      disabled={!canVerify}
                      onClick={doTamper}
                      className="w-full py-2 text-sm rounded bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700"
                      data-testid="tamper-btn"
                    >
                      Tamper demo
                    </button>
                    {vetoNote && <p className="text-[10px] text-sky-300/90 leading-snug">{vetoNote}</p>}
                    <p className="text-[10px] text-zinc-600 leading-snug pt-1">
                      A human veto lands in the ledger like any seat's act — attributed, timestamped, hash-chained.
                    </p>
                  </div>

                  {tamperResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass p-3.5 border border-rose-500/30"
                    >
                      <p className="text-xs text-rose-300 font-medium">
                        Tamper injected at seq {tamperResult.tamperedSeq} ({tamperResult.kind})
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        One rewritten field → verification {tamperResult.verify?.ok ? "still passes (BAD)" : "breaks immediately"}
                        {tamperResult.verify?.problems?.length
                          ? ` — ${tamperResult.verify.problems.length} problem(s), first at seq ${tamperResult.verify.problems[0].seq} (${tamperResult.verify.problems[0].reason}).`
                          : "."}
                      </p>
                      <p className="text-[10px] text-emerald-300/80 mt-1 font-mono">
                        {tamperResult.verify?.ok ? "" : "✓ the chain caught it"}
                      </p>
                    </motion.div>
                  )}

                  <DissentRegister view={delib} />

                  {headHash && (
                    <div className="glass p-3">
                      <p className="text-[10px] text-zinc-500 uppercase">Chain head (anchor externally)</p>
                      <p className="font-mono text-[10px] text-zinc-400 break-all mt-1">{headHash}</p>
                    </div>
                  )}

                  <div className="glass p-3">
                    <button
                      type="button"
                      className="w-full text-left text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
                      onClick={() => setShowRawLedger((v) => !v)}
                    >
                      Raw ledger · {events.length} events {showRawLedger ? "▾" : "▸"}
                    </button>
                    <div
                      ref={ledgerRef}
                      data-testid="ledger-stream"
                      className={`font-mono text-[10px] space-y-0.5 overflow-y-auto transition-all ${
                        showRawLedger ? "max-h-[300px] mt-2" : "max-h-[64px] mt-2 opacity-70"
                      }`}
                    >
                      {events.map((e) => (
                        <div key={e.seq} className="flex gap-1.5 py-0.5 border-b border-zinc-800/40 animate-slide">
                          <span className="text-zinc-600 w-6 shrink-0">{e.seq}</span>
                          <span className="text-zinc-500 w-28 shrink-0 truncate">{EVENT_LABELS[e.kind] ?? e.kind}</span>
                          <span className="text-zinc-400 flex-1 truncate">{eventSummary(e)}</span>
                          <span className="text-zinc-700 w-12 shrink-0 truncate" title={e.hash}>
                            {e.hash.slice(0, 6)}
                          </span>
                        </div>
                      ))}
                      {events.length === 0 && <p className="text-zinc-600 py-2">Waiting for ledger events…</p>}
                    </div>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {view === "scorecard" && (
            <motion.div key="scorecard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-6 text-center ledger-glow border-tribunal-gold/30">
                  <p className="text-xs text-zinc-500 uppercase">Tribunal ledger</p>
                  <p className="text-5xl font-serif text-tribunal-gold mt-2">
                    {auditScore ?? "—"}/12
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">scored from this run's artifacts</p>
                </div>
                <div className="glass p-6 text-center opacity-70">
                  <p className="text-xs text-zinc-500 uppercase">Single-model baseline</p>
                  <p className="text-5xl font-serif text-zinc-500 mt-2">{baselineScore}/12</p>
                  <p className="text-xs text-zinc-600 mt-2">by construction — no ledger exists</p>
                </div>
              </div>

              {verifyResult?.audit?.items && (
                <ul className="glass divide-y divide-zinc-800 text-sm">
                  {verifyResult.audit.items.map((item: any) => (
                    <li key={item.id} className="px-4 py-3 flex gap-3">
                      <span className={item.pass ? "text-emerald-400" : "text-rose-400"}>{item.pass ? "✓" : "✗"}</span>
                      <div>
                        <p className="font-medium">
                          {item.id} — {item.label}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.evidence}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {verifyResult?.verify && (
                <p className="text-center text-sm font-mono text-zinc-400">
                  Hash chain: {verifyResult.verify.ok ? "VALID ✓" : "INVALID ✗"} · answer cross-check:{" "}
                  {verifyResult.verify.answerConsistent ? "pass" : "fail"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-tribunal-border/40 px-6 py-3 text-center text-[10px] text-zinc-600 font-mono">
        RAISE Summit Hackathon 2026 · Cursor track ·{" "}
        <a href="https://github.com/pazare/tribunal" className="text-zinc-500 hover:text-tribunal-gold">
          github.com/pazare/tribunal
        </a>
      </footer>
    </div>
  );
}
