import type { EventKind, LedgerEvent } from "./types.js";

/** Pure, runtime-portable protocol verification shared by Node and the edge worker. */
export const GENERAL_EVENT_KINDS = [
  "run_started",
  "decision_opened",
  "case_presented",
  "blind_commitment",
  "proposals_revealed",
  "feedback_issued",
  "feedback_view_assigned",
  "revision_received",
  "safety_review",
  "escalation_triggered",
  "ratification",
  "dissent_preserved",
  "span_committed",
  "human_intervention",
  "memory_updated",
  "provider_call",
  "decision_closed",
  "run_finished",
] as const satisfies readonly EventKind[];

export type LedgerProblemReason =
  | "bad_hash"
  | "broken_link"
  | "bad_seq"
  | "answer_mismatch"
  | "truncated"
  | "invalid_event"
  | "unknown_kind"
  | "run_id_mismatch"
  | "invalid_payload"
  | "illegal_order"
  | "span_mismatch"
  | "terminal_duplicate"
  | "prefix_mismatch"
  | "quorum_violation"
  | "safety_mismatch";

export interface LedgerProblem {
  seq: number;
  kind: string;
  reason: LedgerProblemReason;
  detail: string;
}

export interface LedgerStructureResult {
  problems: LedgerProblem[];
  answerConsistent: boolean;
  committed: string;
  finalAnswer: string | null;
}

interface SpanState {
  index: number;
  casePresented: boolean;
  commitments: Map<string, string>;
  proposals: Record<string, unknown>[];
  feedbackRounds: number;
  feedbackViews: Set<string>;
  feedbackSummaryCount: number;
  revisions: Record<string, unknown>[];
  safetyReviews: number;
  reviewedKeys: Set<string>;
  bindingSafetyVetoKeys: Set<string>;
  humanVetoKeys: Set<string>;
  escalated: boolean;
  ratification: Record<string, unknown> | null;
  expectedDissents: Map<string, Record<string, unknown>>;
  preservedDissents: Set<string>;
  committed: boolean;
  closed: boolean;
}

const KINDS = new Set<string>(GENERAL_EVENT_KINDS);
const SOCIETIES = new Set(["evidence", "adversary", "law_policy", "affected_party", "safety", "concision"]);
const PROVIDERS = new Set([
  "openai", "anthropic", "xai", "google", "microsoft", "nvidia", "meta",
  "deepseek", "mistral", "cursor", "offline",
]);
const TURN_STATUSES = new Set(["ok", "refusal", "incomplete", "cancelled", "error"]);
const TRANSPORTS = new Set(["cli", "http", "offline"]);
const MODEL_SOURCES = new Set(["response", "requested", "cli_config", "scripted"]);
const STOP_REASONS = new Set(["stop_ratified", "max_spans", "budget", "halted", "degraded", "cancelled"]);

/**
 * Validate exact event envelopes, payload schemas, run/span binding, legal phase
 * transitions, quorum, mandatory safety participation, safety coverage of the
 * selected candidate, prefix evolution, terminal uniqueness, and final answer.
 * Hashing is intentionally outside this pure function so both Node crypto and
 * WebCrypto callers can reuse the same protocol state machine.
 */
export function verifyLedgerStructure(events: readonly LedgerEvent[] | readonly unknown[]): LedgerStructureResult {
  const problems: LedgerProblem[] = [];
  let runId: string | null = null;
  let started = false;
  let terminal = false;
  let terminalCount = 0;
  let panel: Record<string, unknown>[] = [];
  let flags: Record<string, unknown> = {};
  let protocolVersion = 1;
  let rosterUsable = false;
  let current: SpanState | null = null;
  let committed = "";
  let finalAnswer: string | null = null;
  let closedSpans = 0;
  let stopCommitted = false;

  const add = (event: unknown, reason: LedgerProblemReason, detail: string, fallbackSeq = 0) => {
    const value = record(event);
    problems.push({
      seq: integer(value?.seq) ? Number(value!.seq) : fallbackSeq,
      kind: typeof value?.kind === "string" ? value.kind : "(invalid)",
      reason,
      detail,
    });
  };

  for (let index = 0; index < events.length; index++) {
    const raw = events[index];
    const event = record(raw);
    if (!event) {
      add(raw, "invalid_event", "event must be an object", index);
      continue;
    }

    const envelopeError = exactKeys(
      event,
      ["seq", "runId", "spanIndex", "ts", "kind", "payload", "prevHash", "hash"],
    );
    if (envelopeError) add(event, "invalid_event", `event envelope ${envelopeError}`, index);
    if (!integer(event.seq) || Number(event.seq) !== index) {
      add(event, "bad_seq", `expected contiguous integer seq ${index}`, index);
    }
    if (!nonblank(event.runId)) add(event, "invalid_event", "runId must be a non-empty string", index);
    if (!(event.spanIndex === null || nonnegativeInteger(event.spanIndex))) {
      add(event, "invalid_event", "spanIndex must be null or a non-negative integer", index);
    }
    if (!finite(event.ts)) add(event, "invalid_event", "ts must be finite", index);
    if (!nonblank(event.prevHash) || !nonblank(event.hash)) {
      add(event, "invalid_event", "prevHash and hash must be non-empty strings", index);
    }
    if (typeof event.kind !== "string" || !KINDS.has(event.kind)) {
      add(event, "unknown_kind", `unsupported event kind ${JSON.stringify(event.kind)}`, index);
      continue;
    }
    const kind = event.kind as EventKind;
    const payload = record(event.payload);
    if (!payload) {
      add(event, "invalid_payload", `${kind} payload must be an object`, index);
      continue;
    }
    const payloadProtocolVersion = kind === "run_started" ? (payload.protocolVersion === 2 ? 2 : 1) : protocolVersion;
    for (const detail of validatePayload(kind, payload, payloadProtocolVersion)) add(event, "invalid_payload", detail, index);

    if (runId === null && nonblank(event.runId)) runId = event.runId;
    else if (event.runId !== runId) add(event, "run_id_mismatch", `expected runId ${runId}`, index);

    if (terminal) {
      add(event, kind === "run_finished" ? "terminal_duplicate" : "illegal_order", "no event may follow run_finished", index);
      if (kind === "run_finished") terminalCount++;
      continue;
    }

    if (!started && kind !== "run_started") {
      add(event, "illegal_order", "run_started must be the first event", index);
    }
    if (kind !== "run_started" && kind !== "run_finished" && kind !== "decision_opened") {
      if (!current) add(event, "illegal_order", `${kind} requires an open decision`, index);
      else if (event.spanIndex !== current.index) {
        add(event, "span_mismatch", `${kind} spanIndex must equal open span ${current.index}`, index);
      }
    }

    switch (kind) {
      case "run_started": {
        if (started || index !== 0) add(event, "illegal_order", "run_started must occur exactly once at seq 0", index);
        if (event.spanIndex !== null) add(event, "span_mismatch", "run_started spanIndex must be null", index);
        started = true;
        panel = arrayRecords(payload.panel);
        flags = record(record(payload.config)?.flags) ?? {};
        protocolVersion = payload.protocolVersion === 2 ? 2 : 1;
        rosterUsable =
          panel.length >= 2 &&
          new Set(panel.map((seat) => String(seat.seatId))).size === panel.length &&
          panel.some((seat) => seat.society === "safety");
        break;
      }
      case "decision_opened": {
        if (protocolVersion >= 2 && !rosterUsable) add(event, "quorum_violation", "an unusable roster may terminate degraded but cannot open a decision", index);
        if (current && !current.closed) add(event, "illegal_order", "a new decision cannot open before decision_closed", index);
        const slot = record(payload.slot);
        const span = Number(slot?.index);
        if (protocolVersion >= 2 && span !== closedSpans) add(event, "span_mismatch", `decision index must advance contiguously from ${closedSpans}`, index);
        if (event.spanIndex !== span) add(event, "span_mismatch", "decision_opened span must equal slot.index", index);
        current = {
          index: span,
          casePresented: false,
          commitments: new Map(),
          proposals: [],
          feedbackRounds: 0,
          feedbackViews: new Set(),
          feedbackSummaryCount: 0,
          revisions: [],
          safetyReviews: 0,
          reviewedKeys: new Set(),
          bindingSafetyVetoKeys: new Set(),
          humanVetoKeys: new Set(),
          escalated: false,
          ratification: null,
          expectedDissents: new Map(),
          preservedDissents: new Set(),
          committed: false,
          closed: false,
        };
        break;
      }
      case "case_presented": {
        if (!current) break;
        if (current.casePresented) add(event, "illegal_order", "case_presented may occur once per decision", index);
        const caseFile = record(payload.case);
        if (caseFile?.runId !== runId) add(event, "run_id_mismatch", "case.runId must match the ledger runId", index);
        if (record(caseFile?.slot)?.index !== current.index) add(event, "span_mismatch", "case.slot.index must match the open span", index);
        if (caseFile?.prefix !== committed) add(event, "prefix_mismatch", "case prefix must equal the exact previously committed prefix", index);
        current.casePresented = true;
        break;
      }
      case "provider_call": {
        if (current && (!current.casePresented || current.ratification || current.committed)) {
          add(event, "illegal_order", "provider_call must occur after case presentation and before ratification", index);
        }
        const roster = panel.find((seat) => seat.seatId === payload.seatId);
        const usage = record(payload.usage);
        if (!roster || usage?.provider !== roster.provider) {
          add(event, "quorum_violation", `provider_call identity does not match roster for ${String(payload.seatId)}`, index);
        }
        break;
      }
      case "blind_commitment": {
        if (!current) break;
        if (!current.casePresented || current.proposals.length || current.feedbackRounds) {
          add(event, "illegal_order", "blind commitments must precede proposal reveal and feedback", index);
        }
        const seatId = String(payload.seatId ?? "");
        const roster = panel.find((seat) => seat.seatId === seatId);
        if (!roster || roster.society !== payload.society || roster.provider !== payload.provider) {
          add(event, "quorum_violation", `blind commitment identity does not match roster for ${seatId}`, index);
        }
        if (current.commitments.has(seatId)) add(event, "illegal_order", `duplicate blind commitment for ${seatId}`, index);
        current.commitments.set(seatId, String(payload.proposalHash ?? ""));
        break;
      }
      case "proposals_revealed": {
        if (!current) break;
        if (!current.casePresented || current.proposals.length) add(event, "illegal_order", "proposals may be revealed once after case presentation", index);
        current.proposals = arrayRecords(payload.proposals);
        if (new Set(current.proposals.map((proposal) => String(proposal.seatId))).size !== current.proposals.length) {
          add(event, "quorum_violation", "a seat may reveal at most one proposal per round", index);
        }
        const required = quorumFor(panel.length);
        if (protocolVersion >= 2 && !quorumWithSafety(current.proposals, required)) {
          add(event, "quorum_violation", `proposal reveal requires ${required} distinct seats including safety`, index);
        }
        const panelBySeat = new Map(panel.map((item) => [String(item.seatId), item]));
        for (const proposal of current.proposals) {
          const roster = panelBySeat.get(String(proposal.seatId));
          if (!roster || roster.society !== proposal.society || roster.provider !== proposal.provider) {
            add(event, "quorum_violation", `proposal identity does not match roster for ${String(proposal.seatId)}`, index);
          }
          if (proposal.spanIndex !== current.index) add(event, "span_mismatch", "proposal spanIndex must match open span", index);
          const candidateKeys = arrayRecords(proposal.candidates).map((candidate) => candidateKey(candidate.candidate));
          if (new Set(candidateKeys).size !== candidateKeys.length) add(event, "invalid_payload", `proposal from ${String(proposal.seatId)} repeats a candidate`, index);
        }
        if (flags.blindRound === true) {
          const openSpan = current;
          if (current.commitments.size !== current.proposals.length) add(event, "quorum_violation", "blind arm requires one sealed commitment per revealed proposal", index);
          if (current.proposals.some((proposal) => !openSpan.commitments.has(String(proposal.seatId)))) {
            add(event, "quorum_violation", "each revealed proposer must own its sealed commitment", index);
          }
          const checks = arrayRecords(payload.hashChecks);
          if (checks.length !== current.proposals.length || new Set(checks.map((check) => String(check.seatId))).size !== checks.length) {
            add(event, "invalid_payload", "blind arm requires one unique hash check per proposal", index);
          }
          for (const check of checks) {
            const sealed = current.commitments.get(String(check.seatId));
            if (sealed !== check.committed || check.ok !== true || check.committed !== check.recomputed) {
              add(event, "invalid_payload", `invalid sealed hash check for ${String(check.seatId)}`, index);
            }
          }
        } else if (current.commitments.size || (Array.isArray(payload.hashChecks) && payload.hashChecks.length)) {
          add(event, "illegal_order", "non-blind arm must not claim blind commitments", index);
        }
        break;
      }
      case "feedback_issued": {
        if (!current) break;
        if (!current.proposals.length) add(event, "illegal_order", "feedback requires revealed proposals", index);
        const round = Number(record(payload.packet)?.roundNo);
        if (round !== current.feedbackRounds + 1 || round < 1 || round > 2) {
          add(event, "illegal_order", `feedback round must advance exactly; expected ${current.feedbackRounds + 1}`, index);
        }
        if (round === 2 && !current.escalated) add(event, "illegal_order", "second feedback round requires escalation_triggered", index);
        if (payload.anonymized !== flags.anonymizeFeedback) add(event, "invalid_payload", "feedback anonymized flag must equal run config", index);
        const summaries = arrayRecords(record(payload.packet)?.summaries);
        const packet = record(payload.packet);
        if (packet?.spanIndex !== current.index) add(event, "span_mismatch", "feedback packet spanIndex must match open span", index);
        const expectedAuthors = new Map<string, Array<{ seatId: string; society: unknown; provider: unknown }>>();
        for (const proposal of current.proposals) {
          for (const scored of arrayRecords(proposal.candidates)) {
            const key = candidateKey(scored.candidate);
            const authors = expectedAuthors.get(key) ?? [];
            authors.push({ seatId: String(proposal.seatId), society: proposal.society, provider: proposal.provider });
            expectedAuthors.set(key, authors);
          }
        }
        const seenSummaryKeys = new Set<string>();
        for (const summary of summaries) {
          const key = candidateKey(summary.candidate);
          if (!key || seenSummaryKeys.has(key)) add(event, "invalid_payload", `feedback contains duplicate or invalid candidate ${key}`, index);
          seenSummaryKeys.add(key);
          const expected = expectedAuthors.get(key) ?? [];
          if (summary.supportCount !== expected.length) add(event, "invalid_payload", `feedback supportCount is false for ${key}`, index);
          if (payload.anonymized === true && Object.prototype.hasOwnProperty.call(summary, "attributions")) {
            add(event, "invalid_payload", "anonymized feedback must omit attributions", index);
          }
          if (payload.anonymized === false && (!Array.isArray(summary.attributions) || summary.attributions.length === 0)) {
            add(event, "invalid_payload", "identity-visible feedback must disclose attributions", index);
          }
          if (payload.anonymized === false) {
            const actual = arrayRecords(summary.attributions);
            const matches = actual.length === expected.length && actual.every((author, authorIndex) =>
              author.seatId === expected[authorIndex].seatId &&
              author.society === expected[authorIndex].society &&
              author.provider === expected[authorIndex].provider,
            );
            if (!matches) add(event, "invalid_payload", `identity-visible attributions do not match proposal authors for ${key}`, index);
          }
        }
        if (seenSummaryKeys.size !== expectedAuthors.size || [...expectedAuthors.keys()].some((key) => !seenSummaryKeys.has(key))) {
          add(event, "invalid_payload", "feedback summaries must cover exactly the revealed candidate set", index);
        }
        current.feedbackRounds = Math.max(current.feedbackRounds, round);
        current.feedbackSummaryCount = summaries.length;
        current.revisions = [];
        current.reviewedKeys = new Set();
        break;
      }
      case "feedback_view_assigned": {
        if (!current) break;
        if (current.feedbackRounds !== 1 || current.safetyReviews) add(event, "illegal_order", "feedback views belong to the initial feedback phase", index);
        const recipient = String(payload.recipientSeatId ?? "");
        if (!current.proposals.some((proposal) => proposal.seatId === recipient)) add(event, "quorum_violation", `feedback recipient ${recipient} did not reveal a valid proposal`, index);
        if (!Array.isArray(payload.order) || payload.order.length !== current.feedbackSummaryCount) add(event, "invalid_payload", "feedback order must permute every summary exactly once", index);
        if (current.feedbackViews.has(recipient)) add(event, "illegal_order", `duplicate feedback view for ${recipient}`, index);
        current.feedbackViews.add(recipient);
        break;
      }
      case "revision_received": {
        if (!current) break;
        if (!current.feedbackRounds || current.ratification || current.committed) add(event, "illegal_order", "revision requires active feedback before ratification", index);
        const revision = record(payload.revision);
        if (revision && current.revisions.some((item) => item.seatId === revision.seatId)) {
          add(event, "quorum_violation", `duplicate revision from ${String(revision.seatId)}`, index);
        }
        const roster = panel.find((seat) => seat.seatId === revision?.seatId);
        if (!roster || roster.society !== revision?.society || roster.provider !== revision?.provider || !current.proposals.some((proposal) => proposal.seatId === revision?.seatId)) {
          add(event, "quorum_violation", `revision identity does not match a valid proposer and roster seat`, index);
        }
        if (protocolVersion >= 2 && current.feedbackRounds === 1 && !current.feedbackViews.has(String(revision?.seatId ?? ""))) {
          add(event, "illegal_order", `revision from ${String(revision?.seatId ?? "(invalid)")} precedes its assigned feedback view`, index);
        }
        if (revision) current.revisions.push(revision);
        if (revision?.spanIndex !== current.index) add(event, "span_mismatch", "revision spanIndex must match open span", index);
        break;
      }
      case "safety_review": {
        if (!current) break;
        if (!current.feedbackRounds || current.ratification || current.committed) add(event, "illegal_order", "safety review requires feedback and must precede ratification", index);
        const expectedReviewCount = current.escalated ? 1 : 0;
        if (protocolVersion >= 2 && current.safetyReviews !== expectedReviewCount) {
          add(event, "illegal_order", `unexpected safety review; expected ${expectedReviewCount} prior completed review(s)`, index);
        }
        if (protocolVersion >= 2 && current.feedbackRounds !== (current.escalated ? 2 : 1)) {
          add(event, "illegal_order", "final safety review must follow the matching feedback/revision round", index);
        }
        if (protocolVersion >= 2 && current.feedbackRounds === 1 && current.feedbackViews.size !== current.proposals.length) {
          add(event, "quorum_violation", "every valid proposer must receive one feedback view before safety review", index);
        }
        if (protocolVersion >= 2 && Number(flags.debateRounds) > 0 && current.revisions.length === 0) {
          add(event, "quorum_violation", "debate-enabled runs require valid revisions before safety review", index);
        }
        const eligible = current.revisions.length
          ? current.revisions
          : current.proposals.map((proposal) => ({
              seatId: proposal.seatId,
              society: proposal.society,
              final: topCandidate(proposal),
            }));
        const required = quorumFor(panel.length);
        if (protocolVersion >= 2 && !quorumWithSafety(eligible, required)) {
          add(event, "quorum_violation", `safety review requires ${required} distinct voting seats including safety`, index);
        }
        const eligibleKeys = new Set(eligible.map((item) => candidateKey(record(item.final)?.candidate)).filter(Boolean));
        const verdicts = arrayRecords(payload.verdicts);
        if (protocolVersion >= 2 && payload.vetoEnabled !== flags.safetyVeto) {
          add(event, "safety_mismatch", "safety veto authority must equal the preregistered run flag", index);
        }
        if (new Set(verdicts.map((item) => String(item.candidateKey))).size !== verdicts.length) {
          add(event, "safety_mismatch", "safety review must contain exactly one aggregate verdict per candidate", index);
        }
        current.reviewedKeys = new Set(verdicts.map((item) => String(item.candidateKey)));
        if (protocolVersion >= 2) {
          for (const key of eligibleKeys) {
            if (!current.reviewedKeys.has(key)) add(event, "safety_mismatch", `eligible candidate ${key} lacks a safety verdict`, index);
          }
          for (const key of current.reviewedKeys) {
            if (!eligibleKeys.has(key)) add(event, "safety_mismatch", `safety verdict references ineligible candidate ${key}`, index);
          }
          if (payload.vetoEnabled === true) {
            for (const verdict of verdicts) {
              if (verdict.veto === true) current.bindingSafetyVetoKeys.add(String(verdict.candidateKey));
            }
          }
        }
        current.safetyReviews++;
        break;
      }
      case "human_intervention": {
        if (current && (!current.safetyReviews || current.ratification)) add(event, "illegal_order", "human intervention checkpoint is after safety review and before ratification", index);
        if (current && protocolVersion >= 2 && payload.kind === "veto") {
          const targetKey = String(payload.targetKey ?? "");
          if (!targetKey || !current.reviewedKeys.has(targetKey)) {
            add(event, "safety_mismatch", "a human veto must name an eligible, safety-reviewed candidate", index);
          } else {
            current.humanVetoKeys.add(targetKey);
          }
        }
        break;
      }
      case "escalation_triggered": {
        if (!current) break;
        if (current.safetyReviews !== 1 || current.escalated || current.ratification || Number(flags.debateRounds) < 1) add(event, "illegal_order", "escalation requires one completed safety review, enabled debate, and may occur once", index);
        current.escalated = true;
        current.revisions = [];
        current.reviewedKeys = new Set();
        break;
      }
      case "ratification": {
        if (!current) break;
        if (!current.safetyReviews || current.ratification || current.committed) add(event, "illegal_order", "ratification requires final safety review and occurs once", index);
        const decision = record(payload.decision);
        const selectedKey = candidateKey(record(record(decision?.selected)?.candidate));
        if (!selectedKey || (protocolVersion >= 2 && !current.reviewedKeys.has(selectedKey))) {
          add(event, "safety_mismatch", `ratified candidate ${selectedKey || "(invalid)"} was not safety-reviewed in the final round`, index);
        }
        if (protocolVersion >= 2) {
          const bindingVetoKeys = new Set([...current.bindingSafetyVetoKeys, ...current.humanVetoKeys]);
          const vetoes = arrayRecords(decision?.vetoes);
          if (selectedKey && bindingVetoKeys.has(selectedKey)) {
            add(event, "safety_mismatch", `ratified candidate ${selectedKey} has a binding veto`, index);
          }
          for (const key of bindingVetoKeys) {
            if (!vetoes.some((veto) => veto.candidateKey === key && veto.upheld === true && veto.override === undefined)) {
              add(event, "safety_mismatch", `binding veto for ${key} is absent or not upheld`, index);
            }
          }
          for (const veto of vetoes) {
            if (!bindingVetoKeys.has(String(veto.candidateKey)) || veto.upheld !== true || veto.override !== undefined) {
              add(event, "safety_mismatch", `ratification contains an ungrounded or overridden veto for ${String(veto.candidateKey)}`, index);
            }
          }
        }
        if (decision?.spanIndex !== current.index) add(event, "span_mismatch", "ratification decision spanIndex must match open span", index);
        current.ratification = decision;
        const dissents = arrayRecords(decision?.dissents);
        current.expectedDissents = new Map(dissents.map((dissent) => [String(dissent.id), dissent]));
        if (current.expectedDissents.size !== dissents.length) add(event, "invalid_payload", "ratification dissent ids must be unique", index);
        break;
      }
      case "dissent_preserved": {
        if (current && (!current.ratification || current.committed)) add(event, "illegal_order", "dissent must follow ratification and precede commit", index);
        if (current) {
          const dissent = record(payload.dissent);
          const id = String(dissent?.id ?? "");
          const expected = current.expectedDissents.get(id);
          if (!expected || !sameValue(expected, dissent)) add(event, "invalid_payload", `dissent ${id || "(invalid)"} does not match the ratification record`, index);
          if (current.preservedDissents.has(id)) add(event, "illegal_order", `dissent ${id} was preserved more than once`, index);
          current.preservedDissents.add(id);
        }
        break;
      }
      case "span_committed": {
        if (!current) break;
        if (!current.ratification || current.committed) add(event, "illegal_order", "span commit requires one prior ratification", index);
        if (current.expectedDissents.size !== current.preservedDissents.size) {
          add(event, "illegal_order", "every ratification dissent must be preserved before span commit", index);
        }
        const selected = record(current.ratification?.selected);
        const candidate = record(selected?.candidate);
        const isStop = candidate?.isStop === true;
        const selectedText = typeof candidate?.text === "string" ? candidate.text : "";
        const expectedText = isStop ? "" : spacer(committed, selectedText) + selectedText;
        if (payload.spanIndex !== current.index || payload.isStop !== isStop || payload.text !== expectedText) {
          add(event, "prefix_mismatch", "span commit must exactly encode the ratified candidate", index);
        }
        const expectedPrefix = committed + expectedText;
        if (payload.prefixAfter !== expectedPrefix) add(event, "prefix_mismatch", "prefixAfter must equal prior prefix plus committed text", index);
        if (!isStop) committed = expectedPrefix;
        else stopCommitted = true;
        current.committed = true;
        break;
      }
      case "memory_updated": {
        if (current && (!current.committed || current.closed)) add(event, "illegal_order", "memory update must follow commit and precede close", index);
        break;
      }
      case "decision_closed": {
        if (!current) break;
        if (!current.committed || current.closed) add(event, "illegal_order", "decision closes exactly once after commit", index);
        if (payload.spanIndex !== current.index) add(event, "span_mismatch", "decision_closed spanIndex must match open span", index);
        current.closed = true;
        closedSpans++;
        break;
      }
      case "run_finished": {
        terminalCount++;
        if (event.spanIndex !== null) add(event, "span_mismatch", "run_finished spanIndex must be null", index);
        if (terminalCount > 1) add(event, "terminal_duplicate", "run_finished may occur once", index);
        terminal = true;
        finalAnswer = typeof payload.finalAnswer === "string" ? payload.finalAnswer : null;
        const exactAnswer = committed.trim();
        if (finalAnswer !== exactAnswer) add(event, "answer_mismatch", "finalAnswer must exactly equal committed text with outer whitespace trimmed", index);
        if (payload.spanCount !== closedSpans) add(event, "invalid_payload", `spanCount must equal ${closedSpans} closed decisions`, index);
        if (payload.stoppedBy === "stop_ratified" && !stopCommitted) add(event, "illegal_order", "stop_ratified requires a committed STOP", index);
        if (payload.stoppedBy !== "stop_ratified" && stopCommitted) add(event, "illegal_order", "a committed STOP requires stop_ratified terminal status", index);
        if (current && !current.closed) {
          if (!["degraded", "cancelled"].includes(String(payload.stoppedBy)) || current.ratification || current.committed) {
            add(event, "illegal_order", "only a pre-ratification degraded/cancelled run may terminate with an open decision", index);
          }
        }
        if (protocolVersion >= 2 && !rosterUsable && payload.stoppedBy !== "degraded") {
          add(event, "quorum_violation", "an unusable roster must terminate explicitly as degraded", index);
        }
        break;
      }
    }
  }

  if (!events.length || !terminal) {
    const last = record(events[events.length - 1]);
    add(last, "truncated", last ? `ledger ends at ${String(last.kind)}; run_finished required` : "empty ledger", events.length ? events.length - 1 : 0);
  }
  if (!started) add(record(events[0]), "illegal_order", "missing run_started", 0);

  return {
    problems,
    answerConsistent: finalAnswer !== null && finalAnswer === committed.trim(),
    committed,
    finalAnswer,
  };
}

function validatePayload(kind: EventKind, payload: Record<string, unknown>, protocolVersion: number): string[] {
  const errors: string[] = [];
  const shape = (required: string[], optional: string[] = []) => {
    const error = exactKeys(payload, required, optional);
    if (error) errors.push(`${kind} payload ${error}`);
  };
  switch (kind) {
    case "run_started": {
      shape(["packId", "title", "domain", "question", "panel", "config", "note"], ["protocolVersion"]);
      if (payload.protocolVersion !== undefined && payload.protocolVersion !== 2) errors.push("run_started protocolVersion must be 2 when present");
      if (![payload.packId, payload.title, payload.domain, payload.question, payload.note].every(nonblank)) errors.push("run_started text fields must be non-empty strings");
      const panel = arrayRecords(payload.panel);
      if (!Array.isArray(payload.panel)) errors.push("run_started panel must be an array");
      for (const seat of panel) {
        const error = exactKeys(seat, ["seatId", "society", "provider", "model"], ["modelSource"]);
        if (error) errors.push(`panel seat ${error}`);
        if (!nonblank(seat.seatId)) errors.push("panel seatId must be non-empty");
        if (!SOCIETIES.has(String(seat.society))) errors.push("panel society is invalid");
        if (!PROVIDERS.has(String(seat.provider)) || !nonblank(seat.model)) errors.push("panel provider/model is invalid");
        if (seat.modelSource !== undefined && !MODEL_SOURCES.has(String(seat.modelSource))) errors.push("panel modelSource is invalid");
      }
      if (validateRunConfig(payload.config).length) errors.push(...validateRunConfig(payload.config));
      break;
    }
    case "decision_opened": shape(["slot"]); if (!validSlot(payload.slot)) errors.push("decision_opened slot is invalid"); break;
    case "case_presented": shape(["case"]); if (!validCase(payload.case)) errors.push("case_presented case is invalid"); break;
    case "blind_commitment":
      shape(["seatId", "society", "provider", "spanIndex", "proposalHash"]);
      if (!nonblank(payload.seatId) || !SOCIETIES.has(String(payload.society)) || !PROVIDERS.has(String(payload.provider)) || !nonnegativeInteger(payload.spanIndex) || !hex64(payload.proposalHash)) errors.push("blind_commitment fields are invalid");
      break;
    case "proposals_revealed":
      shape(["proposals", "hashChecks"]);
      if (!Array.isArray(payload.proposals) || !payload.proposals.every(validProposal)) errors.push("proposals_revealed proposals are invalid");
      if (!Array.isArray(payload.hashChecks) || !payload.hashChecks.every(validHashCheck)) errors.push("proposals_revealed hashChecks are invalid");
      break;
    case "feedback_issued":
      shape(["packet", "anonymized"]);
      if (!validFeedbackPacket(payload.packet) || typeof payload.anonymized !== "boolean") errors.push("feedback_issued fields are invalid");
      break;
    case "feedback_view_assigned":
      shape(["recipientSeatId", "order"]);
      if (!nonblank(payload.recipientSeatId) || !integerPermutation(payload.order)) errors.push("feedback_view_assigned fields are invalid");
      break;
    case "revision_received": shape(["revision"]); if (!validRevision(payload.revision)) errors.push("revision_received revision is invalid"); break;
    case "safety_review":
      shape(["verdicts", "vetoEnabled"]);
      if (!Array.isArray(payload.verdicts) || !payload.verdicts.every(validSafetyVerdict) || typeof payload.vetoEnabled !== "boolean") errors.push("safety_review fields are invalid");
      break;
    case "escalation_triggered":
      shape(["reason", "requestedBy", "roundNo"]);
      if (!nonblank(payload.reason) || !SOCIETIES.has(String(payload.requestedBy)) || !nonnegativeInteger(payload.roundNo)) errors.push("escalation_triggered fields are invalid");
      break;
    case "ratification": shape(["decision"]); if (!validDecision(payload.decision)) errors.push("ratification decision is invalid"); break;
    case "dissent_preserved": shape(["dissent"]); if (!validDissent(payload.dissent)) errors.push("dissent_preserved dissent is invalid"); break;
    case "span_committed":
      shape(["spanIndex", "text", "isStop", "prefixAfter"]);
      if (!nonnegativeInteger(payload.spanIndex) || typeof payload.text !== "string" || typeof payload.isStop !== "boolean" || typeof payload.prefixAfter !== "string") errors.push("span_committed fields are invalid");
      break;
    case "human_intervention":
      shape(["spanIndex", "actor", "kind", "channel", "text"], ["interventionId", "targetKey"]);
      if (!nonnegativeInteger(payload.spanIndex) || !nonblank(payload.actor) || !["objection", "veto", "question", "affirm"].includes(String(payload.kind)) || !["typed", "voice"].includes(String(payload.channel)) || !nonblank(payload.text)) errors.push("human_intervention fields are invalid");
      break;
    case "memory_updated":
      shape(["writes"]);
      if (!Array.isArray(payload.writes) || !payload.writes.every(validMemory)) errors.push("memory_updated writes are invalid");
      break;
    case "provider_call":
      shape(["seatId", "usage"]);
      if (!nonblank(payload.seatId) || !validUsage(payload.usage, protocolVersion)) errors.push("provider_call fields are invalid");
      break;
    case "decision_closed": shape(["spanIndex"]); if (!nonnegativeInteger(payload.spanIndex)) errors.push("decision_closed spanIndex is invalid"); break;
    case "run_finished":
      shape(["finalAnswer", "stoppedBy", "spanCount", "totals"], ["cancellation", "unappliedInterventionIds"]);
      if (typeof payload.finalAnswer !== "string" || !STOP_REASONS.has(String(payload.stoppedBy)) || !nonnegativeInteger(payload.spanCount) || !validTotals(payload.totals, protocolVersion)) errors.push("run_finished fields are invalid");
      if (payload.stoppedBy === "cancelled" ? !validCancellation(payload.cancellation) : payload.cancellation !== undefined) errors.push("cancellation receipt must exist iff stoppedBy is cancelled");
      if (payload.unappliedInterventionIds !== undefined && (!Array.isArray(payload.unappliedInterventionIds) || !payload.unappliedInterventionIds.every(nonblank))) errors.push("unappliedInterventionIds must be strings");
      break;
  }
  return errors;
}

function validateRunConfig(value: unknown): string[] {
  const config = record(value);
  if (!config) return ["run config must be an object"];
  const errors: string[] = [];
  const keyError = exactKeys(config, ["seed", "maxSpans", "flags", "clientView"], ["panel"]);
  if (keyError) errors.push(`run config ${keyError}`);
  if (!finite(config.seed) || !nonnegativeInteger(config.maxSpans) || !["answer_only", "answer_plus_summary"].includes(String(config.clientView))) errors.push("run config scalar fields are invalid");
  const flags = record(config.flags);
  const flagKeys = ["blindRound", "anonymizeFeedback", "randomizeCandidateOrder", "debateRounds", "roleMemory", "independentEvidence", "safetyVeto"];
  if (!flags || exactKeys(flags, flagKeys) || flagKeys.some((key) => key === "debateRounds" ? !nonnegativeInteger(flags?.[key]) : typeof flags?.[key] !== "boolean")) errors.push("run config flags are invalid");
  if (config.panel !== undefined) {
    const panel = Array.isArray(config.panel) ? config.panel : [];
    if (!Array.isArray(config.panel) || !panel.every(validPanelRequest)) errors.push("run config panel is invalid");
  }
  return errors;
}

function validPanelRequest(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["society", "provider"], ["model", "modelSource"]) && SOCIETIES.has(String(item.society)) && PROVIDERS.has(String(item.provider)) && (item.model === undefined || nonblank(item.model)) && (item.modelSource === undefined || MODEL_SOURCES.has(String(item.modelSource))));
}

function validCase(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["runId", "packId", "title", "domain", "question", "constraints", "evidence", "documents", "prefix", "slot", "ratifiedCommitments", "rejectedAlternatives", "unresolvedDissent"])) return false;
  return [item.runId, item.packId, item.title, item.domain, item.question].every(nonblank) &&
    typeof item.prefix === "string" && validSlot(item.slot) &&
    Array.isArray(item.constraints) && item.constraints.every(validConstraint) &&
    Array.isArray(item.evidence) && item.evidence.every(validEvidenceItem) &&
    Array.isArray(item.documents) && item.documents.every(validDocument) &&
    Array.isArray(item.ratifiedCommitments) && item.ratifiedCommitments.every((entry) => typeof entry === "string") &&
    Array.isArray(item.rejectedAlternatives) && item.rejectedAlternatives.every(validRejectedAlternative) &&
    Array.isArray(item.unresolvedDissent) && item.unresolvedDissent.every(validDissent);
}

function validConstraint(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["id", "kind", "text"], ["cite"]) && nonblank(item.id) && ["statute", "regulation", "policy", "user", "system"].includes(String(item.kind)) && nonblank(item.text) && (item.cite === undefined || typeof item.cite === "string"));
}

function validEvidenceItem(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["id", "source", "citation", "summary", "quality"], ["contradicts"]) && nonblank(item.id) && nonblank(item.source) && nonblank(item.citation) && nonblank(item.summary) && unitInterval(item.quality) && (item.contradicts === undefined || (Array.isArray(item.contradicts) && item.contradicts.every(nonblank))));
}

function validDocument(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["id", "title", "body"]) && nonblank(item.id) && nonblank(item.title) && typeof item.body === "string");
}

function validRejectedAlternative(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["text", "reason"]) && typeof item.text === "string" && nonblank(item.reason));
}

function validSlot(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["index", "label", "instruction", "riskBands"], ["candidatesHint"])) return false;
  const riskBands = record(item.riskBands);
  const validRiskBands = Boolean(riskBands && Object.entries(riskBands).every(([key, band]) =>
    ["factual", "legal", "policy", "fairness", "user_impact", "cost"].includes(key) && ["low", "medium", "high"].includes(String(band)),
  ));
  return nonnegativeInteger(item.index) && nonblank(item.label) && nonblank(item.instruction) && validRiskBands &&
    (item.candidatesHint === undefined || (Array.isArray(item.candidatesHint) && item.candidatesHint.every((entry) => typeof entry === "string")));
}

function validCandidate(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["text", "isStop"]) && typeof item.text === "string" && typeof item.isStop === "boolean" && (item.isStop ? item.text === "" : item.text.trim().length > 0));
}

function validScored(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["candidate", "confidence", "factualityRisk", "legalRisk", "fairnessRisk", "affectedPartyImpact", "warrant"], ["evidenceRefs"])) return false;
  return validCandidate(item.candidate) && [item.confidence, item.factualityRisk, item.legalRisk, item.fairnessRisk, item.affectedPartyImpact].every(unitInterval) && nonblank(item.warrant) &&
    (item.evidenceRefs === undefined || (Array.isArray(item.evidenceRefs) && item.evidenceRefs.every((entry) => typeof entry === "string")));
}

function validProposal(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["seatId", "society", "provider", "spanIndex", "candidates", "rejectedAlternatives", "publicWarrant", "objections"])) return false;
  return nonblank(item.seatId) && SOCIETIES.has(String(item.society)) && PROVIDERS.has(String(item.provider)) && nonnegativeInteger(item.spanIndex) && Array.isArray(item.candidates) && item.candidates.length > 0 && item.candidates.every(validScored) && Array.isArray(item.rejectedAlternatives) && item.rejectedAlternatives.every(validRejectedAlternative) && nonblank(item.publicWarrant) && Array.isArray(item.objections) && item.objections.every(validObjection);
}

function validRevision(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["seatId", "society", "provider", "spanIndex", "final", "changedFromRound1", "answerToStrongestObjection", "steelmanOfBestRival", "changeMyMind", "maintainedObjections"])) return false;
  return nonblank(item.seatId) && SOCIETIES.has(String(item.society)) && PROVIDERS.has(String(item.provider)) && nonnegativeInteger(item.spanIndex) && validScored(item.final) && typeof item.changedFromRound1 === "boolean" && [item.answerToStrongestObjection, item.steelmanOfBestRival, item.changeMyMind].every(nonblank) && Array.isArray(item.maintainedObjections) && item.maintainedObjections.every(validObjection);
}

function validObjection(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["id", "targetKey", "text", "severity", "kind"], ["raisedBy"])) return false;
  return nonblank(item.id) && nonblank(item.targetKey) && nonblank(item.text) && unitInterval(item.severity) && ["factual", "legal", "policy", "fairness", "user_impact", "cost"].includes(String(item.kind)) && (item.raisedBy === undefined || SOCIETIES.has(String(item.raisedBy)));
}

function validFeedbackPacket(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["spanIndex", "roundNo", "summaries", "overallDispersion", "guidance"])) return false;
  return nonnegativeInteger(item.spanIndex) && nonnegativeInteger(item.roundNo) && Array.isArray(item.summaries) && item.summaries.every(validFeedbackSummary) && finite(item.overallDispersion) && nonblank(item.guidance);
}

function validFeedbackSummary(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["candidate", "supportCount", "meanConfidence", "confidenceDispersion", "strongestArgument", "evidenceConflicts"], ["strongestObjection", "attributions"])) return false;
  return validCandidate(item.candidate) && nonnegativeInteger(item.supportCount) && unitInterval(item.meanConfidence) && finite(item.confidenceDispersion) && typeof item.strongestArgument === "string" && (item.strongestObjection === undefined || typeof item.strongestObjection === "string") && Array.isArray(item.evidenceConflicts) && item.evidenceConflicts.every((entry) => typeof entry === "string") && (item.attributions === undefined || (Array.isArray(item.attributions) && item.attributions.every(validAttribution)));
}

function validAttribution(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["seatId", "society", "provider"]) && nonblank(item.seatId) && SOCIETIES.has(String(item.society)) && PROVIDERS.has(String(item.provider)));
}

function validHashCheck(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["seatId", "committed", "recomputed", "ok"]) && nonblank(item.seatId) && hex64(item.committed) && hex64(item.recomputed) && typeof item.ok === "boolean");
}

function validSafetyVerdict(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["candidateKey", "veto", "legalRisk", "publicReason"]) && nonblank(item.candidateKey) && typeof item.veto === "boolean" && unitInterval(item.legalRisk) && nonblank(item.publicReason));
}

function validDecision(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["spanIndex", "method", "metaRule", "selected", "publicReason", "candidateTable", "vetoes", "dissents", "escalationRounds"])) return false;
  return nonnegativeInteger(item.spanIndex) && ["epistemic_dominance", "safety_gate", "affected_party_priority", "dissent_preserving_supermajority", "cost_sensitive_sufficiency", "escalate_for_evidence"].includes(String(item.method)) && nonblank(item.metaRule) && validScored(item.selected) && nonblank(item.publicReason) && Array.isArray(item.candidateTable) && item.candidateTable.length > 0 && item.candidateTable.every(validCandidateScoreRow) && Array.isArray(item.vetoes) && item.vetoes.every(validVetoRecord) && Array.isArray(item.dissents) && item.dissents.every(validDissent) && nonnegativeInteger(item.escalationRounds);
}

function validCandidateScoreRow(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["key", "support", "meanConfidence", "dispersion", "maxLegalRisk", "meanFactualityRisk", "meanFairnessRisk", "meanAffectedPartyImpact", "aggregateScore"])) return false;
  return nonblank(item.key) && nonnegativeInteger(item.support) &&
    [item.meanConfidence, item.dispersion, item.maxLegalRisk, item.meanFactualityRisk, item.meanFairnessRisk, item.meanAffectedPartyImpact, item.aggregateScore].every(finite);
}

function validVetoRecord(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["candidateKey", "publicReason", "upheld"], ["override"])) return false;
  const override = item.override === undefined ? null : record(item.override);
  return nonblank(item.candidateKey) && nonblank(item.publicReason) && typeof item.upheld === "boolean" &&
    (item.override === undefined || Boolean(override && !exactKeys(override, ["actor", "publicReason"]) && nonblank(override.actor) && nonblank(override.publicReason)));
}

function validDissent(value: unknown): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["id", "spanIndex", "chosenKey", "objection", "status", "materiality"], ["carriedFromSpan"])) return false;
  return nonblank(item.id) && nonnegativeInteger(item.spanIndex) && nonblank(item.chosenKey) && validObjection(item.objection) && ["preserved", "resolved", "escalated"].includes(String(item.status)) && unitInterval(item.materiality) && (item.carriedFromSpan === undefined || nonnegativeInteger(item.carriedFromSpan));
}

function validMemory(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["layer", "key", "content"], ["spanOrigin"]) && ["role", "evidence", "deliberation", "unresolved_objection"].includes(String(item.layer)) && nonblank(item.key) && nonblank(item.content) && (item.spanOrigin === undefined || nonnegativeInteger(item.spanOrigin)));
}

function validUsage(value: unknown, protocolVersion: number): boolean {
  const item = record(value);
  if (!item || exactKeys(item, ["provider", "model", "status", "transport"], ["modelSource", "requestedModel", "servingProvider", "tokensIn", "tokensOut", "latencyMs"])) return false;
  return PROVIDERS.has(String(item.provider)) && nonblank(item.model) && TURN_STATUSES.has(String(item.status)) && TRANSPORTS.has(String(item.transport)) &&
    (item.modelSource === undefined || MODEL_SOURCES.has(String(item.modelSource))) &&
    (item.requestedModel === undefined || nonblank(item.requestedModel)) &&
    (item.servingProvider === undefined || nonblank(item.servingProvider)) &&
    [item.tokensIn, item.tokensOut].every((entry) => entry === undefined || (finite(entry) && Number(entry) >= 0)) &&
    (item.latencyMs === undefined || (finite(item.latencyMs) && (protocolVersion < 2 || item.latencyMs >= 0)));
}

function validCancellation(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["actor", "reason", "requestedAt", "unappliedInterventions", "unappliedInterventionIds"]) && nonblank(item.actor) && nonblank(item.reason) && finite(item.requestedAt) && nonnegativeInteger(item.unappliedInterventions) && Array.isArray(item.unappliedInterventionIds) && item.unappliedInterventionIds.every(nonblank) && new Set(item.unappliedInterventionIds).size === item.unappliedInterventionIds.length && item.unappliedInterventions === item.unappliedInterventionIds.length);
}

function validTotals(value: unknown, protocolVersion: number): boolean {
  const item = record(value);
  return Boolean(item && !exactKeys(item, ["calls", "tokensOut", "latencyMs", "repaired"]) && Object.entries(item).every(([key, entry]) => finite(entry) && (protocolVersion < 2 && key === "latencyMs" ? true : entry >= 0)));
}

function topCandidate(proposal: Record<string, unknown>): Record<string, unknown> | null {
  return arrayRecords(proposal.candidates).sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0))[0] ?? null;
}

function candidateKey(value: unknown): string {
  const item = record(value);
  if (!item || typeof item.isStop !== "boolean" || typeof item.text !== "string") return "";
  return item.isStop ? "<STOP>" : item.text.trim();
}

function quorumFor(panelSize: number): number {
  return Math.max(2, Math.floor(panelSize / 2) + 1);
}

function quorumWithSafety(items: Record<string, unknown>[], required: number): boolean {
  return new Set(items.map((item) => String(item.seatId))).size >= required && items.some((item) => item.society === "safety");
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
}

function exactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []): string | null {
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const extra = Object.keys(value).filter((key) => !allowed.has(key));
  if (missing.length) return `missing key(s): ${missing.join(", ")}`;
  if (extra.length) return `has unexpected key(s): ${extra.join(", ")}`;
  return null;
}

function nonblank(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function integer(value: unknown): value is number { return finite(value) && Number.isInteger(value); }
function nonnegativeInteger(value: unknown): value is number { return integer(value) && value >= 0; }
function unitInterval(value: unknown): value is number { return finite(value) && value >= 0 && value <= 1; }
function hex64(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{64}$/.test(value); }
function integerPermutation(value: unknown): boolean {
  return Array.isArray(value) && value.every(nonnegativeInteger) && new Set(value).size === value.length && value.slice().sort((a, b) => a - b).every((entry, index) => entry === index);
}
function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => sameValue(item, right[index]));
  }
  const a = record(left);
  const b = record(right);
  if (!a || !b) return false;
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  return aKeys.length === bKeys.length && aKeys.every((key, index) => key === bKeys[index] && sameValue(a[key], b[key]));
}
function spacer(prefix: string, next: string): string {
  if (!prefix || /[\s(]$/.test(prefix) || /^[\s.,;:!?)]/.test(next)) return "";
  return " ";
}
