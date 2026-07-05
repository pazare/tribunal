/**
 * Tribunal kernel — FROZEN public contract.
 *
 * This module is the coordination substrate for the whole monorepo: the web UI,
 * the API/SSE server, the scorecard, and the domain packs all depend on these
 * types. Treat additions as append-only; do not repurpose existing fields.
 *
 * Design invariants encoded here (and enforced by the kernel + tests):
 *  1. Every phase of a decision emits a typed, hash-chained ledger event.
 *  2. No field anywhere carries private chain-of-thought. Every rationale field
 *     is a PUBLIC warrant meant to be contradictable on the record. (The
 *     faithfulness literature is explicit that post-hoc CoT is not a reliable
 *     audit surface; Tribunal records external, cross-examined rationale instead.)
 *  3. STOP / abstain is a first-class candidate, never a magic string.
 *  4. Blind isolation is structural: a panelist's round-1 input contains no peer
 *     material by construction.
 *  5. Anonymized feedback carries NO panelist identity, provider, or seat — the
 *     type has no such field (field-level anonymization by the type system).
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type UncertaintyKind =
  | "factual"
  | "legal"
  | "policy"
  | "fairness"
  | "user_impact"
  | "cost";

export type RiskBand = "low" | "medium" | "high";

/** The six chartered societies (seats) on the panel. Each has real powers. */
export type Society =
  | "evidence" // grounds claims in the case documents
  | "adversary" // attacks the strongest candidate; looks for the trap
  | "law_policy" // maps the decision to statute / regulation / policy
  | "affected_party" // represents the person the decision lands on
  | "safety" // the only seat that may VETO
  | "concision"; // fights bloat; guards the STOP decision

/** Named constitutional ratification rules. The fired rule is public record. */
export type RatificationMethod =
  | "epistemic_dominance"
  | "safety_gate"
  | "affected_party_priority"
  | "dissent_preserving_supermajority"
  | "cost_sensitive_sufficiency"
  | "escalate_for_evidence";

export type Provider =
  | "openai"
  | "anthropic"
  | "xai"
  | "google"
  | "microsoft"
  | "nvidia"
  | "meta"
  | "deepseek"
  | "mistral"
  | "cursor"
  | "offline"; // deterministic scripted panel — CI/tests only, never in a live demo

export type TurnStatus = "ok" | "refusal" | "incomplete" | "error";

export type DissentStatus = "preserved" | "resolved" | "escalated";

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

/** A candidate continuation for the current decision span. STOP is first-class. */
export interface Candidate {
  /** Surface text of the span. Empty iff isStop. */
  text: string;
  /** True for the "stop / abstain / decline" candidate. */
  isStop: boolean;
}

/** Stable grouping key used everywhere candidates are compared. */
export function candidateKey(c: Candidate): string {
  return c.isStop ? "<STOP>" : c.text.trim();
}

/** A candidate carrying the proposer's PUBLIC estimates + warrant. */
export interface ScoredCandidate {
  candidate: Candidate;
  confidence: number; // 0..1
  factualityRisk: number; // 0..1
  legalRisk: number; // 0..1
  fairnessRisk: number; // 0..1
  affectedPartyImpact: number; // 0..1 — magnitude of harm/benefit to the person
  /** A public, contradictable reason for this candidate. Never private CoT. */
  warrant: string;
  /** Optional pointers into the case documents (evidence ids). */
  evidenceRefs?: string[];
}

export interface RejectedAlternative {
  text: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Objections & dissent
// ---------------------------------------------------------------------------

export interface Objection {
  id: string;
  targetKey: string; // candidateKey this objects to
  text: string;
  severity: number; // 0..1
  kind: UncertaintyKind;
  /** Set only in ledger-side records. Stripped (undefined) in anonymized views. */
  raisedBy?: Society;
}

export interface DissentRecord {
  id: string;
  spanIndex: number;
  chosenKey: string;
  objection: Objection;
  status: DissentStatus;
  materiality: number; // 0..1
  /** If this dissent was carried forward from an earlier span. */
  carriedFromSpan?: number;
}

// ---------------------------------------------------------------------------
// Case file (the high-stakes decision being made)
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  id: string;
  source: string; // e.g. "credit_report", "claim_form", "policy_doc"
  citation: string; // human-locatable pointer (page/section/line)
  summary: string;
  quality: number; // 0..1 confidence in the source
  /** ids of other evidence items this one contradicts. */
  contradicts?: string[];
}

export interface Constraint {
  id: string;
  kind: "statute" | "regulation" | "policy" | "user" | "system";
  text: string;
  cite?: string; // e.g. "ECOA 15 U.S.C. §1691; Reg B 12 CFR §1002.9"
}

/** The slot being decided right now — the "question" for this span. */
export interface DecisionSlot {
  index: number;
  /** What span of the verdict is being decided (e.g. "the disposition"). */
  label: string;
  /** Guidance shown to every panelist (shared, not peer material). */
  instruction: string;
  riskBands: Partial<Record<UncertaintyKind, RiskBand>>;
  /**
   * Optional enumeration of the decision space for this slot. Real model panels
   * may propose beyond these; the deterministic offline panel proposes only from
   * this list. Packs use it to define the concrete choice a slot represents.
   */
  candidatesHint?: string[];
}

export interface CaseFile {
  runId: string;
  packId: string;
  /** Human title of the decision, e.g. "Loan #4471 — adverse action review". */
  title: string;
  domain: string; // "lending" | "insurance" | "moderation" | "benefits" | ...
  /** The concrete question the whole run must resolve. */
  question: string;
  constraints: Constraint[];
  evidence: EvidenceItem[];
  /** Free-text documents the panel may cite. */
  documents: { id: string; title: string; body: string }[];
  /** The verdict prefix committed so far (concatenated committed spans). */
  prefix: string;
  slot: DecisionSlot;
  ratifiedCommitments: string[];
  rejectedAlternatives: RejectedAlternative[];
  unresolvedDissent: DissentRecord[];
}

/** Exactly what ONE panelist sees in the blind round — no peer material. */
export interface PanelistCaseView {
  case: CaseFile;
  seatId: string;
  society: Society;
  /** This seat's OWN evidence bundle (independent-evidence path). */
  evidence: EvidenceItem[];
  memory: MemoryExtract[];
}

// ---------------------------------------------------------------------------
// Round 1: blind proposals + sealed commitments
// ---------------------------------------------------------------------------

export interface Proposal {
  seatId: string;
  society: Society;
  provider: Provider;
  spanIndex: number;
  candidates: ScoredCandidate[]; // >= 1
  rejectedAlternatives: RejectedAlternative[];
  publicWarrant: string;
  objections: Objection[]; // objections this seat raises against other options
}

/** Ledgered BEFORE any reveal — binds a seat to its round-1 content. */
export interface BlindCommitment {
  seatId: string;
  society: Society;
  provider: Provider;
  spanIndex: number;
  proposalHash: string; // sha256 of the canonicalized proposal
}

export interface HashCheck {
  seatId: string;
  committed: string;
  recomputed: string;
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Round 2: controlled Delphi feedback (anonymous) + revision
// ---------------------------------------------------------------------------

/** One candidate as peers see it. Contains NO identity/provider/seat field. */
export interface FeedbackCandidateSummary {
  candidate: Candidate;
  supportCount: number;
  meanConfidence: number;
  confidenceDispersion: number;
  strongestArgument: string;
  strongestObjection?: string;
  evidenceConflicts: string[];
}

export interface FeedbackPacket {
  spanIndex: number;
  roundNo: number;
  summaries: FeedbackCandidateSummary[]; // canonical key order
  overallDispersion: number;
  guidance: string;
}

/** Ledger record binding a recipient to the (position-bias-controlled) order. */
export interface FeedbackViewRecord {
  recipientSeatId: string;
  order: number[]; // permutation of summary indices this recipient saw
}

export interface Revision {
  seatId: string;
  society: Society;
  provider: Provider;
  spanIndex: number;
  final: ScoredCandidate;
  changedFromRound1: boolean;
  answerToStrongestObjection: string;
  steelmanOfBestRival: string;
  changeMyMind: string; // what evidence/argument would flip this seat
  maintainedObjections: Objection[];
}

// ---------------------------------------------------------------------------
// Safety review + ratification
// ---------------------------------------------------------------------------

export interface SafetyVerdict {
  candidateKey: string;
  veto: boolean;
  legalRisk: number;
  publicReason: string;
}

export interface OverrideRecord {
  actor: string;
  publicReason: string;
}

export interface VetoRecord {
  candidateKey: string;
  publicReason: string;
  upheld: boolean;
  override?: OverrideRecord;
}

export interface CandidateScoreRow {
  key: string;
  support: number;
  meanConfidence: number;
  dispersion: number;
  maxLegalRisk: number;
  meanFactualityRisk: number;
  meanFairnessRisk: number;
  meanAffectedPartyImpact: number;
  aggregateScore: number;
}

export interface RatificationDecision {
  spanIndex: number;
  method: RatificationMethod;
  metaRule: string; // the ordered meta-constitution rule that fired
  selected: ScoredCandidate;
  publicReason: string;
  candidateTable: CandidateScoreRow[];
  vetoes: VetoRecord[];
  dissents: DissentRecord[];
  escalationRounds: number;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type MemoryLayer = "role" | "evidence" | "deliberation" | "unresolved_objection";

export interface MemoryExtract {
  layer: MemoryLayer;
  key: string;
  content: string;
  spanOrigin?: number;
}

// ---------------------------------------------------------------------------
// Provider provenance
// ---------------------------------------------------------------------------

export interface UsageRecord {
  provider: Provider;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  status: TurnStatus;
  /** transport used: "cli" (spawned local agent), "http" (OpenRouter/API), "offline". */
  transport: "cli" | "http" | "offline";
}

// ---------------------------------------------------------------------------
// Human intervention (the auditor in the loop)
// ---------------------------------------------------------------------------

export interface HumanIntervention {
  spanIndex: number;
  actor: string; // display name / role of the human auditor
  kind: "objection" | "veto" | "question" | "affirm";
  channel: "typed" | "voice";
  text: string;
  /** For veto: the candidate the human blocks. */
  targetKey?: string;
}

// ---------------------------------------------------------------------------
// Hash-chained ledger events (the verdict ledger)
// ---------------------------------------------------------------------------

export type EventKind =
  | "run_started"
  | "decision_opened"
  | "case_presented"
  | "blind_commitment"
  | "proposals_revealed"
  | "feedback_issued"
  | "feedback_view_assigned"
  | "revision_received"
  | "safety_review"
  | "escalation_triggered"
  | "ratification"
  | "dissent_preserved"
  | "span_committed"
  | "human_intervention"
  | "memory_updated"
  | "provider_call"
  | "decision_closed"
  | "run_finished";

export interface EventPayloadMap {
  run_started: {
    packId: string;
    title: string;
    domain: string;
    question: string;
    panel: { seatId: string; society: Society; provider: Provider; model: string }[];
    config: RunConfig;
    note: string;
  };
  decision_opened: { slot: DecisionSlot };
  case_presented: { case: CaseFile };
  blind_commitment: BlindCommitment;
  proposals_revealed: { proposals: Proposal[]; hashChecks: HashCheck[] };
  feedback_issued: { packet: FeedbackPacket; anonymized: boolean };
  feedback_view_assigned: FeedbackViewRecord;
  revision_received: { revision: Revision };
  safety_review: { verdicts: SafetyVerdict[]; vetoEnabled: boolean };
  escalation_triggered: { reason: string; requestedBy: Society; roundNo: number };
  ratification: { decision: RatificationDecision };
  dissent_preserved: { dissent: DissentRecord };
  span_committed: { spanIndex: number; text: string; isStop: boolean; prefixAfter: string };
  human_intervention: HumanIntervention;
  memory_updated: { writes: MemoryExtract[] };
  provider_call: { seatId: string; usage: UsageRecord };
  decision_closed: { spanIndex: number };
  run_finished: {
    finalAnswer: string;
    stoppedBy: "stop_ratified" | "max_spans" | "budget" | "halted";
    spanCount: number;
    totals: Record<string, number>;
  };
}

export interface LedgerEvent<K extends EventKind = EventKind> {
  seq: number;
  runId: string;
  spanIndex: number | null;
  /** Unix ms in live runs; monotonic logical tick in offline/deterministic runs. */
  ts: number;
  kind: K;
  payload: EventPayloadMap[K];
  prevHash: string;
  hash: string;
}

// ---------------------------------------------------------------------------
// Run configuration & result
// ---------------------------------------------------------------------------

/** Each flag toggles a REAL code path — used by the ablation runner + tests. */
export interface ControlFlags {
  blindRound: boolean;
  anonymizeFeedback: boolean;
  randomizeCandidateOrder: boolean;
  debateRounds: number; // 0 disables the revision round
  roleMemory: boolean;
  independentEvidence: boolean;
  safetyVeto: boolean;
}

export const DEFAULT_FLAGS: ControlFlags = {
  blindRound: true,
  anonymizeFeedback: true,
  randomizeCandidateOrder: true,
  debateRounds: 1,
  roleMemory: true,
  independentEvidence: true,
  safetyVeto: true,
};

export interface RunConfig {
  seed: number;
  /** Provider assignment per seat. If omitted, the engine picks a default panel. */
  panel?: { society: Society; provider: Provider; model?: string }[];
  maxSpans: number;
  flags: ControlFlags;
  /** "answer_only" hides deliberation from the *client* view (still ledgered). */
  clientView: "answer_only" | "answer_plus_summary";
}

export interface RunResult {
  runId: string;
  packId: string;
  finalAnswer: string;
  stoppedBy: "stop_ratified" | "max_spans" | "budget" | "halted";
  spanCount: number;
  events: LedgerEvent[];
  usageTotals: Record<string, number>;
  config: RunConfig;
}

// ---------------------------------------------------------------------------
// Auditability checklist (scored over real artifacts by @tribunal/scorecard)
// ---------------------------------------------------------------------------

export interface AuditabilityItem {
  id: string; // A1..A12
  label: string;
  pass: boolean;
  evidence: string; // how it was verified against THIS run's artifacts
}

export interface AuditabilityReport {
  runId: string;
  items: AuditabilityItem[];
  total: number;
  outOf: number;
}
