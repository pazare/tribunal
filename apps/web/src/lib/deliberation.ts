import type { LedgerEvent } from "../api";

/**
 * Pure selectors: derive EVERYTHING the chamber renders from the ledger events
 * alone. Same events → same picture, whether live, replayed, or recorded.
 * (That is the honesty property: the theater cannot show anything that is not
 * on the record.)
 */

export interface SeatInfo {
  seatId: string;
  society: string;
  provider: string;
  model: string;
  modelSource?: "response" | "requested" | "cli_config" | "scripted";
}

export type SeatPhase =
  | "waiting"
  | "drafting"
  | "sealed"
  | "revealed"
  | "revising"
  | "revised"
  | "cancelled"
  | "done";

export interface SeatState {
  info: SeatInfo;
  phase: SeatPhase;
  /** Short text of this seat's current top candidate (after latest round). */
  position: string | null;
  isStop: boolean;
  confidence: number | null;
  objectionsRaised: number;
  changedMind: boolean;
  sealedHash: string | null;
}

export interface CandidateState {
  key: string;
  text: string;
  isStop: boolean;
  support: number;
  meanConfidence: number;
  maxLegalRisk: number;
  vetoed: boolean;
  vetoReason: string | null;
  ratified: boolean;
  humanVetoed: boolean;
}

export interface DissentView {
  society: string;
  text: string;
  severity: number;
  spanIndex: number;
}

export type RunPhaseId =
  | "convene"
  | "blind"
  | "reveal"
  | "critique"
  | "revise"
  | "safety"
  | "ratify"
  | "done";

export const RUN_PHASES: { id: RunPhaseId; label: string; blurb: string }[] = [
  { id: "convene", label: "Convene", blurb: "Six independent seats are empaneled — different vendors, different mandates. The verdict will be decoded one span at a time, each span elected." },
  { id: "blind", label: "Secret ballot", blurb: "Each seat drafts its candidate span in isolation and seals a hash of it — a secret ballot. No seat can see another's draft, so no one anchors on anyone." },
  { id: "reveal", label: "Reveal", blurb: "Sealed ballots open. Every reveal is checked against the hash sealed before it — a seat cannot rewrite its position after seeing the room." },
  { id: "critique", label: "Anonymous critique", blurb: "Candidates circulate stripped of author, vendor and seat, in a different order for every reader (ballot-order rotation) — arguments stand on their own." },
  { id: "revise", label: "Revision", blurb: "Seats answer the strongest objection, steelman their best rival, and may change their vote on the record." },
  { id: "safety", label: "Safety review", blurb: "The safety seat can veto any candidate on the ballot. A veto is binding and its reason is public." },
  { id: "ratify", label: "Election", blurb: "A named constitutional rule elects this span of the verdict. Losing objections are preserved as dissent — a minority report, not a deletion." },
  { id: "done", label: "Verdict", blurb: "Every span of this verdict was elected under due process. The full record ships with it, hash-chained." },
];

export interface DeliberationView {
  seats: SeatState[];
  phase: RunPhaseId;
  phaseIndex: number;
  narration: string;
  candidates: CandidateState[];
  dissents: DissentView[];
  humanInterventions: { actor: string; kind: string; text: string }[];
  ratifiedMethod: string | null;
  ratifiedReason: string | null;
  finalAnswer: string | null;
  currentSpanLabel: string | null;
  spanIndex: number;
  spanCount: number;
  committedSpans: { text: string; isStop: boolean }[];
  liveNote: string | null;
  escalated: boolean;
  stoppedBy: string | null;
  cancellation: {
    actor: string;
    reason: string;
    requestedAt: number;
    unappliedInterventions: number;
    unappliedInterventionIds: string[];
  } | null;
}

const PHASE_OF_KIND: Record<string, RunPhaseId> = {
  run_started: "convene",
  decision_opened: "blind",
  case_presented: "blind",
  provider_call: "blind",
  blind_commitment: "blind",
  proposals_revealed: "reveal",
  feedback_issued: "critique",
  feedback_view_assigned: "critique",
  revision_received: "revise",
  safety_review: "safety",
  escalation_triggered: "critique",
  human_intervention: "safety",
  ratification: "ratify",
  dissent_preserved: "ratify",
  span_committed: "ratify",
  memory_updated: "ratify",
  decision_closed: "ratify",
  run_finished: "done",
};

export function deriveDeliberation(events: LedgerEvent[]): DeliberationView {
  const seatsById = new Map<string, SeatState>();
  let phase: RunPhaseId = "convene";
  let spanIndex = 0;
  let spanCount = 0;
  let currentSpanLabel: string | null = null;
  let ratifiedMethod: string | null = null;
  let ratifiedReason: string | null = null;
  let finalAnswer: string | null = null;
  let liveNote: string | null = null;
  let escalated = false;
  let stoppedBy: string | null = null;
  let cancellation: DeliberationView["cancellation"] = null;
  const committedSpans: { text: string; isStop: boolean }[] = [];
  const dissents: DissentView[] = [];
  const humans: { actor: string; kind: string; text: string }[] = [];

  // Candidate bookkeeping for the CURRENT span only (board resets per span).
  let table = new Map<string, CandidateState>();
  const textOf = new Map<string, { text: string; isStop: boolean }>();

  const ensureCandidate = (key: string): CandidateState => {
    let c = table.get(key);
    if (!c) {
      const t = textOf.get(key);
      c = {
        key,
        text: t?.text ?? (key === "<STOP>" ? "" : key),
        isStop: key === "<STOP>" || Boolean(t?.isStop),
        support: 0,
        meanConfidence: 0,
        maxLegalRisk: 0,
        vetoed: false,
        vetoReason: null,
        ratified: false,
        humanVetoed: false,
      };
      table.set(key, c);
    }
    return c;
  };

  const keyOf = (cand: { text: string; isStop: boolean }) => (cand.isStop ? "<STOP>" : cand.text.trim());

  for (const e of events) {
    const p = e.payload as any;
    const mapped = e.kind === "run_finished" && p.stoppedBy === "cancelled" ? undefined : PHASE_OF_KIND[e.kind];
    if (mapped) phase = mapped;
    if (typeof e.spanIndex === "number" && e.spanIndex !== spanIndex) {
      // A new decision slot opened: reset the candidate board.
      spanIndex = e.spanIndex;
      table = new Map();
      textOf.clear();
      ratifiedMethod = null;
      ratifiedReason = null;
    }

    switch (e.kind) {
      case "run_started": {
        for (const seat of p.panel ?? []) {
          seatsById.set(seat.seatId, {
            info: seat,
            phase: "waiting",
            position: null,
            isStop: false,
            confidence: null,
            objectionsRaised: 0,
            changedMind: false,
            sealedHash: null,
          });
        }
        liveNote = p.note ?? null;
        spanCount = 0;
        break;
      }
      case "decision_opened": {
        currentSpanLabel = p.slot?.label ?? null;
        spanCount = Math.max(spanCount, (p.slot?.index ?? 0) + 1);
        for (const s of seatsById.values()) {
          s.phase = "drafting";
          s.position = null;
          s.isStop = false;
          s.confidence = null;
          s.changedMind = false;
          s.sealedHash = null;
        }
        break;
      }
      case "blind_commitment": {
        const s = seatsById.get(p.seatId);
        if (s) {
          s.phase = "sealed";
          s.sealedHash = p.proposalHash;
        }
        break;
      }
      case "proposals_revealed": {
        for (const prop of p.proposals ?? []) {
          const s = seatsById.get(prop.seatId);
          const top = (prop.candidates ?? [])
            .slice()
            .sort((a: any, b: any) => b.confidence - a.confidence)[0];
          if (s) {
            s.phase = "revealed";
            if (top) {
              s.position = top.candidate.isStop ? "STOP" : top.candidate.text;
              s.isStop = Boolean(top.candidate.isStop);
              s.confidence = top.confidence;
            }
            s.objectionsRaised += (prop.objections ?? []).length;
          }
          for (const sc of prop.candidates ?? []) {
            const key = keyOf(sc.candidate);
            textOf.set(key, { text: sc.candidate.text, isStop: sc.candidate.isStop });
            const c = ensureCandidate(key);
            c.support += 1;
            c.meanConfidence = c.meanConfidence === 0 ? sc.confidence : (c.meanConfidence + sc.confidence) / 2;
            c.maxLegalRisk = Math.max(c.maxLegalRisk, sc.legalRisk ?? 0);
          }
        }
        break;
      }
      case "feedback_issued": {
        for (const s of seatsById.values()) if (s.phase === "revealed") s.phase = "revising";
        break;
      }
      case "revision_received": {
        const rev = p.revision;
        const s = seatsById.get(rev?.seatId);
        if (s && rev?.final) {
          s.phase = "revised";
          s.position = rev.final.candidate.isStop ? "STOP" : rev.final.candidate.text;
          s.isStop = Boolean(rev.final.candidate.isStop);
          s.confidence = rev.final.confidence;
          s.changedMind = Boolean(rev.changedFromRound1);
          s.objectionsRaised += (rev.maintainedObjections ?? []).length;
          const key = keyOf(rev.final.candidate);
          textOf.set(key, { text: rev.final.candidate.text, isStop: rev.final.candidate.isStop });
          ensureCandidate(key);
        }
        break;
      }
      case "safety_review": {
        for (const v of p.verdicts ?? []) {
          if (v.veto) {
            const c = ensureCandidate(v.candidateKey);
            c.vetoed = true;
            c.vetoReason = v.publicReason ?? null;
            c.humanVetoed = /human auditor/i.test(v.publicReason ?? "");
          }
        }
        break;
      }
      case "escalation_triggered": {
        escalated = true;
        break;
      }
      case "human_intervention": {
        humans.push({ actor: p.actor, kind: p.kind, text: p.text });
        break;
      }
      case "ratification": {
        const d = p.decision;
        ratifiedMethod = d?.method ?? null;
        ratifiedReason = d?.publicReason ?? null;
        for (const row of d?.candidateTable ?? []) {
          const c = ensureCandidate(row.key);
          c.support = row.support;
          c.meanConfidence = row.meanConfidence;
          c.maxLegalRisk = row.maxLegalRisk;
        }
        for (const v of d?.vetoes ?? []) {
          const c = ensureCandidate(v.candidateKey);
          c.vetoed = true;
          c.vetoReason = v.publicReason ?? c.vetoReason;
          c.humanVetoed = c.humanVetoed || /human auditor/i.test(v.publicReason ?? "");
        }
        if (d?.selected) {
          const key = keyOf(d.selected.candidate);
          textOf.set(key, { text: d.selected.candidate.text, isStop: d.selected.candidate.isStop });
          ensureCandidate(key).ratified = true;
        }
        for (const s of seatsById.values()) s.phase = "done";
        break;
      }
      case "dissent_preserved": {
        const rec = p.dissent;
        if (rec) {
          dissents.push({
            society: rec.objection?.raisedBy ?? "unknown",
            text: rec.objection?.text ?? "",
            severity: rec.objection?.severity ?? 0,
            spanIndex: rec.spanIndex ?? spanIndex,
          });
        }
        break;
      }
      case "span_committed": {
        committedSpans.push({ text: p.text ?? "", isStop: Boolean(p.isStop) });
        break;
      }
      case "run_finished": {
        finalAnswer = p.finalAnswer ?? "";
        stoppedBy = p.stoppedBy ?? null;
        cancellation = p.cancellation ?? null;
        if (stoppedBy === "cancelled") {
          for (const seat of seatsById.values()) {
            if (seat.phase !== "done") seat.phase = "cancelled";
          }
        } else {
          phase = "done";
        }
        break;
      }
    }
  }

  const phaseIndex = RUN_PHASES.findIndex((x) => x.id === phase);
  const narration = RUN_PHASES[Math.max(0, phaseIndex)].blurb;

  // Carried dissent is re-preserved at every later span (correct on the
  // ledger); the register shows each unique objection once, at its latest span.
  const dissentByKey = new Map<string, DissentView>();
  for (const d of dissents) dissentByKey.set(`${d.society}::${d.text}`, d);
  const uniqueDissents = [...dissentByKey.values()];

  // Candidate ordering: winner first, then by support/confidence, STOP last.
  const candidates = [...table.values()].sort((a, b) => {
    if (a.ratified !== b.ratified) return a.ratified ? -1 : 1;
    if (a.isStop !== b.isStop) return a.isStop ? 1 : -1;
    return b.support - a.support || b.meanConfidence - a.meanConfidence;
  });

  return {
    seats: [...seatsById.values()],
    phase,
    phaseIndex: Math.max(0, phaseIndex),
    narration,
    candidates,
    dissents: uniqueDissents,
    humanInterventions: humans,
    ratifiedMethod,
    ratifiedReason,
    finalAnswer,
    currentSpanLabel,
    spanIndex,
    spanCount,
    committedSpans,
    liveNote,
    escalated,
    stoppedBy,
    cancellation,
  };
}

export const SOCIETY_META: Record<string, { label: string; role: string; icon: string; accent: string }> = {
  evidence: { label: "Evidence", role: "grounds every claim in the record", icon: "◫", accent: "text-sky-300 border-sky-400/40" },
  adversary: { label: "Adversary", role: "attacks the leading answer", icon: "⚔", accent: "text-orange-300 border-orange-400/40" },
  law_policy: { label: "Law & Policy", role: "maps the decision to the rules", icon: "§", accent: "text-tribunal-gold border-tribunal-gold/40" },
  affected_party: { label: "Affected Party", role: "speaks for who this lands on", icon: "◐", accent: "text-violet-300 border-violet-400/40" },
  safety: { label: "Safety", role: "holds the veto", icon: "⛨", accent: "text-rose-300 border-rose-400/50" },
  concision: { label: "Concision", role: "guards the STOP", icon: "▣", accent: "text-emerald-300 border-emerald-400/40" },
};

export const PROVIDER_META: Record<string, { label: string; dot: string }> = {
  openai: { label: "OpenAI", dot: "bg-emerald-400" },
  anthropic: { label: "Anthropic", dot: "bg-amber-400" },
  xai: { label: "xAI", dot: "bg-zinc-200" },
  google: { label: "Google", dot: "bg-blue-400" },
  microsoft: { label: "Microsoft", dot: "bg-sky-400" },
  nvidia: { label: "NVIDIA", dot: "bg-lime-400" },
  meta: { label: "Meta", dot: "bg-indigo-400" },
  deepseek: { label: "DeepSeek", dot: "bg-cyan-400" },
  mistral: { label: "Mistral", dot: "bg-orange-400" },
  cursor: { label: "Cursor", dot: "bg-fuchsia-400" },
  offline: { label: "Scripted (CI)", dot: "bg-zinc-500" },
};
