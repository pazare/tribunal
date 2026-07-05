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

type View = "docket" | "chamber" | "scorecard";

const SHOWCASE_DOMAINS = [
  {
    domain: "insurance",
    title: "Claim #882 — utilization review denial",
    tagline: "Algorithm flagged 'not medically necessary' with no inspectable path.",
    problem:
      "ProPublica documented Cigna's PxDx system auto-denying claims in seconds with no physician review. California SB 1120 (2024) now requires transparency in utilization-review algorithms.",
    trap: "The denial cites a guideline version superseded 18 months ago — still in the training corpus.",
    live: false,
  },
  {
    domain: "benefits",
    title: "Case #204 — overpayment flag",
    tagline: "A single model matched a name; benefits were cut for 14 months.",
    problem:
      "Australia's Robodebt Royal Commission, the Dutch toeslagenaffaire, and Michigan's MiDAS system all show what happens when fraud flags scale without due process or preserved dissent.",
    trap: "The flag relies on employer name fuzzy-match, not verified income — the applicant's W-2 is in the file.",
    live: false,
  },
  {
    domain: "moderation",
    title: "Post #9912 — platform takedown",
    tagline: "Content removed with a generic reason; no record of what rule fired.",
    problem:
      "EU Digital Services Act Article 17 requires platforms to give users a specific statement of reasons for moderation decisions — not a boilerplate 'community guidelines' paragraph.",
    trap: "The post is news reporting on a public figure; the 'violence' classifier confuses quotation with endorsement.",
    live: false,
  },
];

const SOCIETIES = [
  { id: "evidence", label: "Evidence", power: "citations" },
  { id: "adversary", label: "Adversary", power: "red team" },
  { id: "law_policy", label: "Law", power: "constraints" },
  { id: "affected_party", label: "Affected party", power: "harm" },
  { id: "safety", label: "Safety", power: "VETO", highlight: true },
  { id: "concision", label: "Concision", power: "STOP" },
];

function eventSummary(e: LedgerEvent): string {
  const p = e.payload as any;
  switch (e.kind) {
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

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
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
  const ledgerRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchPacks().then(setPacks).catch(console.error);
    fetchPanel().then(setPanel).catch(console.error);
    fetchRuns().then((r) => setRecordedRuns(r.recorded)).catch(console.error);
  }, []);

  useEffect(() => {
    if (ledgerRef.current) ledgerRef.current.scrollTop = ledgerRef.current.scrollHeight;
  }, [events.length]);

  const pickMode = useCallback((): "offline" | "cli" | "openrouter" => {
    if (panel?.openrouter?.available) return "openrouter";
    const cliLive = panel?.cli && Object.values(panel.cli).some((c) => c.present);
    if (cliLive) return "cli";
    return "offline";
  }, [panel]);

  const beginRun = async (pack: PackSummary, opts?: { replayId?: string; forceMode?: typeof mode }) => {
    setError("");
    setEvents([]);
    setVerifyResult(null);
    setTamperResult(null);
    setFinalAnswer("");
    setSelectedPack(pack);
    setView("chamber");

    if (opts?.replayId) {
      setRunId(opts.replayId);
      setStatus("replay");
      setRunning(true);
      unsubRef.current?.();
      unsubRef.current = subscribeRun(
        opts.replayId,
        (e) => setEvents((prev) => [...prev, e]),
        (s) => {
          if (s.status === "finished" || s.status === "replay") {
            setRunning(false);
            if (s.finalAnswer) setFinalAnswer(String(s.finalAnswer));
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
      const providers = m === "cli" ? ["openai", "xai"] : undefined;
      const { runId: id } = await startRun({ packId: pack.id, mode: m, providers });
      setRunId(id);
      setStatus("running");
      unsubRef.current?.();
      unsubRef.current = subscribeRun(
        id,
        (e) => {
          setEvents((prev) => [...prev, e]);
          if (e.runId && e.kind === "run_started") setRunId(e.runId);
          if (e.kind === "run_finished") {
            setFinalAnswer(String((e.payload as any).finalAnswer ?? ""));
            setRunning(false);
            setStatus("finished");
            setRunId(e.runId);
          }
        },
        (s) => {
          if (s.status === "finished" || s.status === "replay") {
            setRunning(false);
            setStatus(String(s.status));
            if (s.runId) setRunId(String(s.runId));
            if (s.finalAnswer) setFinalAnswer(String(s.finalAnswer));
          }
          if (s.status === "error") {
            setRunning(false);
            setStatus("error");
            setError(String(s.error ?? "run failed"));
          }
        },
      );
      // Fast offline runs can finish before EventSource connects — poll as backup.
      const poll = window.setInterval(async () => {
        try {
          const r = await fetch(`/api/runs/${id}`);
          if (!r.ok) return;
          const j = await r.json();
          if (j.events?.length) setEvents(j.events);
          const fin = j.events?.find((e: LedgerEvent) => e.kind === "run_finished");
          if (fin || j.status === "finished") {
            window.clearInterval(poll);
            setRunning(false);
            setStatus("finished");
            if (fin) {
              setFinalAnswer(String((fin.payload as any).finalAnswer ?? ""));
              setRunId(fin.runId);
            }
          }
        } catch {
          /* ignore */
        }
      }, 400);
      setTimeout(() => window.clearInterval(poll), 120_000);
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
    if (!runId) return;
    setTamperResult(await tamperRun(runId));
  };

  const doVeto = async () => {
    if (!runId || !running) return;
    await intervene(runId, {
      kind: "veto",
      actor: "Compliance auditor",
      text: "The stated DTI does not reconcile with verified income and debt in the record.",
      targetKey: "Deny for excessive debt-to-income ratio (52%).",
    });
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
    <div className="min-h-screen flex flex-col" data-testid="tribunal-app">
      <header className="border-b border-tribunal-border/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-3xl text-tribunal-gold tracking-tight">Tribunal</h1>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
            due process · cross-provider · hash-chained ledger
          </span>
        </div>
        <nav className="flex gap-2 text-sm">
          {(["docket", "chamber", "scorecard"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg capitalize transition ${
                view === v ? "bg-tribunal-gold/20 text-tribunal-gold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {v}
            </button>
          ))}
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
                <p className="mt-4 text-zinc-500 text-sm max-w-xl mx-auto">
                  Six independent seats · sealed commitments · anonymized critique · safety veto · preserved dissent ·
                  tamper-evident ledger anyone can verify.
                </p>
              </section>

              <section className="grid md:grid-cols-2 gap-4">
                {packs.map((p) => {
                  const meta = DOMAIN_META[p.domain] ?? DOMAIN_META.lending;
                  return (
                    <article
                      key={p.id}
                      className="glass p-5 ledger-glow hover:border-tribunal-gold/40 transition cursor-pointer group"
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
                      <p className="text-xs text-amber-200/70 mt-2 font-mono">Trap: {p.trapNote?.slice(0, 120)}…</p>
                      <button
                        type="button"
                        className="mt-4 w-full py-2 rounded-lg bg-tribunal-gold/15 text-tribunal-gold text-sm font-medium hover:bg-tribunal-gold/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          beginRun(p);
                        }}
                      >
                        Convene panel →
                      </button>
                    </article>
                  );
                })}
                {SHOWCASE_DOMAINS.map((d) => {
                  const meta = DOMAIN_META[d.domain];
                  return (
                    <article key={d.domain} className="glass p-5 opacity-90 border-dashed">
                      <div className="flex justify-between">
                        <span className={`text-2xl ${meta.color}`}>{meta.icon}</span>
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">Same mechanism</span>
                      </div>
                      <h2 className="font-serif text-xl mt-2">{d.title}</h2>
                      <p className="text-xs text-zinc-500">{meta.statute}</p>
                      <p className="text-sm text-zinc-400 mt-3">{d.tagline}</p>
                      <p className="text-xs text-zinc-500 mt-2">{d.problem}</p>
                    </article>
                  );
                })}
              </section>

              {recordedRuns.length > 0 && (
                <section className="glass p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Recorded real runs (replay)</h3>
                  <div className="flex flex-wrap gap-2">
                    {recordedRuns.map((r) => (
                      <button
                        key={r.runId}
                        type="button"
                        className="text-xs font-mono px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        onClick={() => {
                          const pack = packs.find((p) => p.id === r.packId) ?? packs[0];
                          if (pack) beginRun(pack, { replayId: r.runId });
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
            <motion.div key="chamber" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="glass p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-serif text-xl">{selectedPack?.title ?? "Deliberation chamber"}</h2>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-zinc-800">
                      {status} · {mode}
                      {running && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {SOCIETIES.map((s) => (
                      <span
                        key={s.id}
                        className={`text-[10px] px-2 py-1 rounded-full border ${
                          s.highlight
                            ? "border-rose-500/50 text-rose-300 bg-rose-500/10"
                            : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {s.label}
                        {s.highlight && " · VETO"}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  ref={ledgerRef}
                  className="glass p-3 h-[420px] overflow-y-auto font-mono text-xs space-y-1 ledger-glow"
                  data-testid="ledger-stream"
                >
                  {events.map((e) => (
                    <div
                      key={e.seq}
                      className={`flex gap-2 py-1 border-b border-zinc-800/50 animate-slide ${
                        e.kind === "ratification" ? "text-tribunal-gold" : ""
                      } ${e.kind === "dissent_preserved" ? "text-rose-300/80" : ""}`}
                    >
                      <span className="text-zinc-600 w-8 shrink-0">{e.seq}</span>
                      <span className="text-zinc-500 w-36 shrink-0 truncate">{EVENT_LABELS[e.kind] ?? e.kind}</span>
                      <span className="text-zinc-300 flex-1">{eventSummary(e)}</span>
                      <span className="text-zinc-600 w-16 shrink-0 truncate" title={e.hash}>
                        {e.hash.slice(0, 8)}
                      </span>
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-zinc-600 p-4">Waiting for ledger events…</p>}
                </div>

                {finalAnswer && (
                  <div className="glass p-4 border-l-2 border-tribunal-gold">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Ratified verdict</p>
                    <p className="font-serif text-lg text-zinc-100">{finalAnswer}</p>
                  </div>
                )}

                {error && <p className="text-rose-400 text-sm">{error}</p>}
              </div>

              <aside className="space-y-4">
                <div className="glass p-4 space-y-2">
                  <h3 className="text-sm text-zinc-400">Auditor controls</h3>
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
                    className="w-full py-2 text-sm rounded bg-tribunal-mint/15 text-tribunal-mint disabled:opacity-40"
                    data-testid="verify-btn"
                  >
                    Verify ledger + scorecard
                  </button>
                  <button
                    type="button"
                    disabled={!runId}
                    onClick={doTamper}
                    className="w-full py-2 text-sm rounded bg-zinc-800 text-zinc-300 disabled:opacity-40"
                    data-testid="tamper-btn"
                  >
                    Tamper demo
                  </button>
                </div>

                {headHash && (
                  <div className="glass p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Chain head (anchor externally)</p>
                    <p className="font-mono text-[10px] text-zinc-400 break-all mt-1">{headHash}</p>
                  </div>
                )}

                {tamperResult && (
                  <div className="glass p-3 border border-rose-500/30">
                    <p className="text-xs text-rose-300">
                      Tamper at seq {tamperResult.tamperedSeq}: verify {tamperResult.verify?.ok ? "OK (bad)" : "FAILED ✓"}
                    </p>
                  </div>
                )}
              </aside>
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
