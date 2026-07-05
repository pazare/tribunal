import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import {
  RUN_PHASES,
  SOCIETY_META,
  PROVIDER_META,
  type CandidateState,
  type DeliberationView,
  type SeatState,
} from "./lib/deliberation";

// ---------------------------------------------------------------------------
// Phase tracker — "where are we in due process" at a glance
// ---------------------------------------------------------------------------

export function PhaseTracker({ view }: { view: DeliberationView }) {
  return (
    <div className="glass px-4 py-3">
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {RUN_PHASES.map((p, i) => {
          const state = i < view.phaseIndex ? "past" : i === view.phaseIndex ? "now" : "next";
          return (
            <div key={p.id} className="flex items-center shrink-0">
              {i > 0 && (
                <div className={`h-px w-4 md:w-7 ${state === "next" ? "bg-zinc-800" : "bg-tribunal-gold/50"}`} />
              )}
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-500 ${
                  state === "now"
                    ? "bg-tribunal-gold/20 text-tribunal-gold ring-1 ring-tribunal-gold/50 shadow-[0_0_18px_rgba(201,169,98,0.25)]"
                    : state === "past"
                      ? "text-tribunal-gold/60"
                      : "text-zinc-600"
                }`}
              >
                {state === "past" ? "✓ " : ""}
                {p.label}
              </div>
            </div>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={view.phaseIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-xs text-zinc-400 mt-1.5"
        >
          {view.narration}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The bench — six seats, their vendor, their mandate, their current position
// ---------------------------------------------------------------------------

const SEAT_PHASE_BADGE: Record<SeatState["phase"], { label: string; cls: string; pulse?: boolean }> = {
  waiting: { label: "waiting", cls: "bg-zinc-800 text-zinc-500" },
  drafting: { label: "drafting in isolation", cls: "bg-sky-500/15 text-sky-300", pulse: true },
  sealed: { label: "sealed 🔒", cls: "bg-amber-500/15 text-amber-300" },
  revealed: { label: "revealed", cls: "bg-zinc-700/60 text-zinc-300" },
  revising: { label: "weighing critique", cls: "bg-violet-500/15 text-violet-300", pulse: true },
  revised: { label: "final position", cls: "bg-emerald-500/15 text-emerald-300" },
  done: { label: "ratified", cls: "bg-tribunal-gold/15 text-tribunal-gold" },
};

export function Bench({ view }: { view: DeliberationView }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5" data-testid="bench">
      {view.seats.map((s) => {
        const meta = SOCIETY_META[s.info.society] ?? SOCIETY_META.evidence;
        const prov = PROVIDER_META[s.info.provider] ?? { label: s.info.provider, dot: "bg-zinc-400" };
        const badge = SEAT_PHASE_BADGE[s.phase];
        return (
          <motion.div
            key={s.info.seatId}
            layout
            className={`glass p-3 border ${meta.accent.split(" ")[1] ?? "border-zinc-700"} relative overflow-hidden`}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-lg leading-none ${meta.accent.split(" ")[0]}`}>{meta.icon}</span>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold leading-tight ${meta.accent.split(" ")[0]}`}>{meta.label}</p>
                  <p className="text-[10px] text-zinc-500 leading-tight truncate">{meta.role}</p>
                </div>
              </div>
              {s.info.society === "safety" && (
                <span className="text-[9px] font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded shrink-0">
                  VETO
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full ${prov.dot}`} />
              <span className="text-[10px] font-mono text-zinc-400 truncate">{prov.label}</span>
              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${badge.cls} ${badge.pulse ? "animate-pulse" : ""}`}>
                {badge.label}
              </span>
            </div>

            <div className="mt-2 min-h-[40px]">
              <AnimatePresence mode="wait">
                {s.phase === "sealed" && (
                  <motion.p
                    key="sealed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-mono text-amber-200/70 break-all"
                  >
                    commitment {s.sealedHash?.slice(0, 18)}… sealed before any reveal
                  </motion.p>
                )}
                {s.position !== null && s.phase !== "sealed" && (
                  <motion.div key={s.position} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className={`text-[11px] leading-snug ${s.isStop ? "text-emerald-300 font-mono" : "text-zinc-200"}`}>
                      {s.isStop ? "▣ STOP — decline to extend the verdict" : `“${truncate(s.position, 90)}”`}
                    </p>
                    {s.confidence !== null && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-zinc-500 to-tribunal-gold"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(s.confidence * 100)}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">{Math.round(s.confidence * 100)}%</span>
                      </div>
                    )}
                  </motion.div>
                )}
                {s.position === null && s.phase === "drafting" && (
                  <motion.div key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5 pt-1">
                    <div className="h-1.5 rounded bg-zinc-800 animate-pulse w-11/12" />
                    <div className="h-1.5 rounded bg-zinc-800 animate-pulse w-7/12" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 mt-1 text-[9px] text-zinc-500">
              {s.changedMind && <span className="text-violet-300">↺ changed mind on the record</span>}
              {s.objectionsRaised > 0 && <span>⚑ {s.objectionsRaised} objection{s.objectionsRaised > 1 ? "s" : ""}</span>}
            </div>
          </motion.div>
        );
      })}
      {view.seats.length === 0 &&
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass p-3 h-[120px] animate-pulse opacity-40" />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate board — the decision space with veto/ratified stamps
// ---------------------------------------------------------------------------

export function CandidateBoard({ view }: { view: DeliberationView }) {
  if (view.candidates.length === 0) return null;
  return (
    <div className="glass p-3.5" data-testid="candidate-board">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500">
          The ballot · {view.currentSpanLabel ?? "current span"}
        </h3>
        {view.escalated && (
          <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
            runoff — an extra evidence round was spent
          </span>
        )}
      </div>
      <div className="mt-2.5 space-y-2">
        <AnimatePresence>
          {view.candidates.map((c) => (
            <CandidateRow key={c.key} c={c} method={view.ratifiedMethod} />
          ))}
        </AnimatePresence>
      </div>
      {view.ratifiedReason && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-zinc-400 mt-3 border-t border-zinc-800 pt-2">
          <span className="text-tribunal-gold font-medium">Public reason:</span> {view.ratifiedReason}
        </motion.p>
      )}
    </div>
  );
}

function CandidateRow({ c, method }: { c: CandidateState; method: string | null }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-lg border px-3 py-2 ${
        c.ratified
          ? "border-tribunal-gold/60 bg-tribunal-gold/[0.07]"
          : c.vetoed
            ? "border-rose-500/40 bg-rose-500/[0.04]"
            : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] leading-snug ${c.isStop ? "font-mono text-emerald-300" : c.vetoed ? "text-zinc-500 line-through decoration-rose-400/60" : "text-zinc-200"}`}>
            {c.isStop ? "▣ STOP — none of the above; end the verdict here" : c.text || c.key}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1">
              {Array.from({ length: Math.min(6, Math.max(0, Math.round(c.support))) }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400/80" />
              ))}
              <span className="text-[9px] text-zinc-500 ml-0.5">{c.support} seat{c.support === 1 ? "" : "s"}</span>
            </span>
            {c.meanConfidence > 0 && (
              <span className="text-[9px] font-mono text-zinc-500">conf {Math.round(c.meanConfidence * 100)}%</span>
            )}
            {c.maxLegalRisk >= 0.5 && (
              <span className="text-[9px] font-mono text-rose-300/90">legal risk {Math.round(c.maxLegalRisk * 100)}%</span>
            )}
          </div>
        </div>
        {c.ratified && (
          <motion.span
            initial={{ scale: 1.6, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 16 }}
            className="stamp stamp-gold"
          >
            RATIFIED
          </motion.span>
        )}
        {c.vetoed && !c.ratified && (
          <motion.span
            initial={{ scale: 1.6, opacity: 0, rotate: 10 }}
            animate={{ scale: 1, opacity: 1, rotate: 6 }}
            transition={{ type: "spring", stiffness: 320, damping: 16 }}
            className={`stamp ${c.humanVetoed ? "stamp-human" : "stamp-rose"}`}
          >
            {c.humanVetoed ? "HUMAN VETO" : "VETOED"}
          </motion.span>
        )}
      </div>
      {c.ratified && method && (
        <p className="text-[9px] font-mono text-tribunal-gold/80 mt-1">rule: {method.replace(/_/g, " ")}</p>
      )}
      {c.vetoed && c.vetoReason && (
        <p className="text-[10px] text-rose-300/80 mt-1 italic">“{truncate(c.vetoReason, 160)}”</p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Verdict strip — committed spans concatenating into the final answer
// ---------------------------------------------------------------------------

export function VerdictStrip({ view }: { view: DeliberationView }) {
  if (view.committedSpans.length === 0 && !view.finalAnswer) return null;
  const decided = view.committedSpans.filter((s) => !s.isStop).length;
  return (
    <motion.div layout className="glass p-4 border-l-2 border-tribunal-gold" data-testid="verdict-strip">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">
        {view.finalAnswer !== null
          ? "Ratified verdict — decoded span by span"
          : `Verdict under construction · ${decided} span${decided === 1 ? "" : "s"} elected so far`}
      </p>
      <p className="font-serif text-lg leading-snug text-zinc-100">
        {view.committedSpans.filter((s) => !s.isStop).map((s, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, backgroundColor: "rgba(201,169,98,0.25)" }}
            animate={{ opacity: 1, backgroundColor: "rgba(201,169,98,0)" }}
            transition={{ duration: 1.2 }}
            className="rounded px-0.5 -mx-0.5"
          >
            {s.text}
          </motion.span>
        ))}
        {view.committedSpans.some((s) => s.isStop) && (
          <span className="font-mono text-sm text-emerald-300 ml-2">▣ STOP ratified</span>
        )}
      </p>
      {view.finalAnswer !== null && (
        <p className="text-[10px] text-zinc-500 mt-2">
          No token of this verdict came from a single model sampling in the dark: every span above was elected under a
          named rule, and every losing argument is preserved below. Nothing off the record.
        </p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Dissent register + human interventions
// ---------------------------------------------------------------------------

export function DissentRegister({ view }: { view: DeliberationView }) {
  if (view.dissents.length === 0 && view.humanInterventions.length === 0) return null;
  return (
    <div className="glass p-3.5 space-y-2" data-testid="dissent-register">
      <h3 className="text-xs uppercase tracking-widest text-zinc-500">Preserved dissent</h3>
      {view.dissents.map((d, i) => {
        const meta = SOCIETY_META[d.society];
        return (
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="border-l-2 border-rose-400/50 pl-2.5 py-0.5"
          >
            <p className="text-[11px] text-rose-200/90 leading-snug italic">“{truncate(d.text, 220)}”</p>
            <p className="text-[9px] text-zinc-500 mt-0.5">
              — {meta?.label ?? d.society} seat · span {d.spanIndex} · severity {Math.round(d.severity * 100)}% · retained on the permanent record
            </p>
          </motion.blockquote>
        );
      })}
      {view.humanInterventions.map((h, i) => (
        <motion.div key={`h${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-l-2 border-sky-400/50 pl-2.5 py-0.5">
          <p className="text-[11px] text-sky-200/90 leading-snug">
            <span className="font-semibold uppercase text-[9px] mr-1">{h.kind}</span>“{truncate(h.text, 180)}”
          </p>
          <p className="text-[9px] text-zinc-500 mt-0.5">— {h.actor} (human, ledgered mid-run)</p>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHAP / LIME comparison — honest, judge-readable
// ---------------------------------------------------------------------------

const COMPARE_ROWS: { q: string; shap: string; tribunal: string }[] = [
  {
    q: "What question does it answer?",
    shap: "Which input features moved this model's score up or down.",
    tribunal: "Whether the decision itself survives adversarial scrutiny — and on what recorded grounds.",
  },
  {
    q: "When does it run?",
    shap: "After the fact, on a decision already made by one model.",
    tribunal: "During decoding. Every span of the output is contested and elected before it ships — the explanation IS the generation procedure.",
  },
  {
    q: "What artifact do you get?",
    shap: "Feature weights (Shapley values / local surrogate coefficients).",
    tribunal: "A hash-chained ledger: sealed drafts, anonymous critique, vetoes, a named decision rule, preserved dissent.",
  },
  {
    q: "Free-text / LLM decisions?",
    shap: "Not designed for them — there is no feature vector to attribute over a generated paragraph.",
    tribunal: "Native. The unit of explanation is an argued, cross-examined span of text.",
  },
  {
    q: "Can it be gamed?",
    shap: "Documented: adversarial models can look fair to attribution audits (Slack et al., AIES 2020).",
    tribunal: "The record is tamper-evident; editing any event breaks the chain, and spoof guards fail trivial rationale.",
  },
  {
    q: "Regulator-ready reasons?",
    shap: "Weights need translation into the 'specific reasons' notices require.",
    tribunal: "The verdict ships with verbatim public reasons and the losing arguments — the notice writes itself.",
  },
];

export function CompareStrip() {
  return (
    <section className="glass p-5" data-testid="compare-strip">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="font-serif text-xl text-zinc-200">
          “Couldn't you just use <span className="text-tribunal-gold">SHAP or LIME</span>?”
      </h3>
        <p className="text-[11px] text-zinc-500">
          No — different question. Attribution explains a score. Tribunal makes the decision contestable.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
              <th className="py-2 pr-3 font-medium w-[22%]"></th>
              <th className="py-2 pr-3 font-medium w-[36%]">Feature attribution (SHAP / LIME)</th>
              <th className="py-2 font-medium text-tribunal-gold w-[42%]">Tribunal (deliberative record)</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {COMPARE_ROWS.map((r) => (
              <tr key={r.q} className="border-t border-zinc-800/70">
                <td className="py-2.5 pr-3 text-zinc-400 font-medium">{r.q}</td>
                <td className="py-2.5 pr-3 text-zinc-500">{r.shap}</td>
                <td className="py-2.5 text-zinc-200">{r.tribunal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-zinc-600 mt-3">
        Honest footnote: SHAP/LIME remain the right tool for debugging feature-based scoring models — Tribunal governs the
        decision procedure and can sit on top of any of them. They are complements, not substitutes.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// small shared bits
// ---------------------------------------------------------------------------

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="glass p-3.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500">{title}</h3>
        {right}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
