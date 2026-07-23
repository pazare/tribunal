import { hashOf, stableId } from "./hash.js";
import { Ledger } from "./ledger.js";
import { candidateKey } from "./types.js";
import { applyOrder, buildFeedbackPacket, orderFor } from "./feedback.js";
import { ratify } from "./ratify.js";
import type { PanelClient } from "./providers/base.js";
import type {
  CaseFile,
  CancellationReceipt,
  DecisionSlot,
  DissentRecord,
  EvidenceItem,
  HumanIntervention,
  LedgerEvent,
  MemoryExtract,
  Proposal,
  Revision,
  RunConfig,
  RunResult,
  SafetyVerdict,
  ScoredCandidate,
  UsageRecord,
} from "./types.js";

/** A pack is the high-stakes case + the ordered decision slots to resolve. */
export interface Pack {
  id: string;
  title: string;
  domain: string;
  question: string;
  constraints: CaseFile["constraints"];
  evidence: EvidenceItem[];
  documents: CaseFile["documents"];
  slots: DecisionSlot[];
  /** Optional per-seat evidence assignment (independent-evidence path). */
  evidenceBySociety?: Partial<Record<string, string[]>>;
  /** One-line hook for the case picker UI. */
  tagline?: string;
  /**
   * The documented real-world problem this case dramatizes — plain prose with
   * verifiable anchors (statutes, public incidents, transparency databases).
   * Shown on the docket; keep it factual and cited.
   */
  problemStatement?: string;
  /** What the planted trap is and what catching it looks like (shown post-run). */
  trapNote?: string;
}

export interface PanelSeat {
  seatId: string;
  client: PanelClient;
}

export interface RunOptions {
  pack: Pack;
  config: RunConfig;
  seats: PanelSeat[];
  /** Emitted synchronously as each ledger event is appended (for SSE streaming). */
  onEvent?: (e: LedgerEvent) => void;
  /** Human auditor interventions to inject, keyed by span index. */
  humanInterventions?: HumanIntervention[];
  /**
   * Live pull point: called right before ratification of each span so a running
   * UI can inject typed/voice objections and vetoes into THIS run in real time.
   */
  pullHumanInterventions?: (spanIndex: number) => HumanIntervention[] | Promise<HumanIntervention[]>;
  /** Drains queued interventions that never reached a checkpoint so terminal disposition is explicit. */
  drainHumanInterventions?: () => HumanIntervention[] | Promise<HumanIntervention[]>;
  /** Stops new work and aborts in-flight provider calls; run_finished is still ledgered. */
  signal?: AbortSignal;
  /** "logical" gives byte-deterministic timestamps (offline/tests). */
  clock?: "logical" | "wall";
}

/** Strict-majority quorum, with an absolute floor that forbids one-seat ratification. */
function requiredPanelQuorum(panelSize: number): number {
  return Math.max(2, Math.floor(panelSize / 2) + 1);
}

export async function runTribunal(opts: RunOptions): Promise<RunResult> {
  const { pack, config, seats } = opts;
  const clock = opts.clock ?? "wall";
  // Live (wall-clock) runs carry a unique nonce: model output varies run to
  // run, so reusing a config-derived id would overwrite the persisted artifact
  // and silently de-anchor any published head hash. Logical-clock runs stay
  // purely content-addressed — that is what makes offline runs byte-identical.
  const runId = stableId(
    "run",
    pack.id,
    config.seed,
    seats.map((s) => s.client.provider),
    // Spread (not a conditional value) so logical-clock ids hash the exact
    // same parts as always — recorded offline runs stay content-addressed.
    ...(clock === "wall" ? [[Date.now(), Math.random()]] : []),
  );
  const ledger = new Ledger(runId, clock);
  const emit = (e: LedgerEvent) => opts.onEvent?.(e);
  const append: Ledger["append"] = ((kind: any, span: any, payload: any) => {
    const e = ledger.append(kind, span, payload);
    emit(e);
    return e;
  }) as any;

  const usageTotals: Record<string, number> = { calls: 0, tokensOut: 0, latencyMs: 0, repaired: 0 };
  const humanBySpan = new Map<number, HumanIntervention[]>();
  for (const h of opts.humanInterventions ?? []) {
    const arr = humanBySpan.get(h.spanIndex) ?? [];
    arr.push(h);
    humanBySpan.set(h.spanIndex, arr);
  }

  append("run_started", null, {
    protocolVersion: 2,
    packId: pack.id,
    title: pack.title,
    domain: pack.domain,
    question: pack.question,
    panel: seats.map((s) => ({
      seatId: s.seatId,
      society: s.client.society,
      provider: s.client.provider,
      model: s.client.model,
      modelSource: s.client.modelSource,
    })),
    config,
    note:
      seats.every((s) => s.client.transport === "offline")
        ? "OFFLINE deterministic panel (no model calls) — CI/smoke mode."
        : `LIVE multi-provider panel via ${uniq(seats.map((s) => s.client.transport)).join("+")}.`,
  });

  let prefix = "";
  const ratifiedCommitments: string[] = [];
  const rejectedAlternatives: CaseFile["rejectedAlternatives"] = [];
  let carriedDissent: DissentRecord[] = [];
  const memory: MemoryExtract[] = [];
  const cancelled = () => Boolean(opts.signal?.aborted);
  let stoppedBy: RunResult["stoppedBy"] = "max_spans";
  let spanCount = 0;
  const quorum = requiredPanelQuorum(seats.length);
  const rosterUsable =
    seats.length >= 2 &&
    new Set(seats.map((seat) => seat.seatId)).size === seats.length &&
    seats.filter((seat) => seat.client.society === "safety").length >= 1;

  const reviewEveryEligibleCandidate = async (
    baseCase: CaseFile,
    revisions: Revision[],
    seed: number,
  ): Promise<SafetyVerdict[] | null> => {
    const candidates = new Map<string, ScoredCandidate>();
    for (const revision of revisions) {
      const key = candidateKey(revision.final.candidate);
      if (!candidates.has(key)) candidates.set(key, revision.final);
    }
    const reviewers = revisions
      .filter((revision) => revision.society === "safety")
      .map((revision) => ({
        revision,
        seat: seats.find((seat) => seat.seatId === revision.seatId),
      }))
      .filter((item): item is { revision: Revision; seat: PanelSeat } => Boolean(item.seat));
    if (!candidates.size || !reviewers.length) return null;

    const attempts = await Promise.all(
      reviewers.flatMap(({ revision, seat }) =>
        [...candidates.entries()].map(([expectedKey, candidate]) =>
          seat.client
            .reviewSafety({
              view: viewFor(baseCase, seat, config, memory, pack.evidenceBySociety),
              candidate,
              maintainedObjections: revision.maintainedObjections,
              seed,
              signal: opts.signal,
            })
            .then((result) => ({ seat, expectedKey, ...result }))
            .catch((error) => ({ seat, expectedKey, error: error as Error })),
        ),
      ),
    );

    let invalid = false;
    const accepted = new Map<string, Array<{ seatId: string; verdict: SafetyVerdict }>>();
    for (const attempt of attempts) {
      if ("error" in attempt) {
        const usage = errUsage(attempt.seat.client, attempt.error, cancelled());
        recordUsage(usageTotals, usage, 0);
        append("provider_call", baseCase.slot.index, { seatId: attempt.seat.seatId, usage });
        invalid = true;
        continue;
      }
      recordUsage(usageTotals, attempt.usage, attempt.repaired);
      if (attempt.repaired > 0 || !validSafetyVerdictForCandidate(attempt.verdict, attempt.expectedKey)) {
        append("provider_call", baseCase.slot.index, {
          seatId: attempt.seat.seatId,
          usage: { ...attempt.usage, status: "incomplete" },
        });
        invalid = true;
        continue;
      }
      append("provider_call", baseCase.slot.index, { seatId: attempt.seat.seatId, usage: attempt.usage });
      const rows = accepted.get(attempt.expectedKey) ?? [];
      rows.push({ seatId: attempt.seat.seatId, verdict: attempt.verdict });
      accepted.set(attempt.expectedKey, rows);
    }

    const verdicts: SafetyVerdict[] = [];
    for (const key of candidates.keys()) {
      const rows = accepted.get(key) ?? [];
      if (rows.length !== reviewers.length) invalid = true;
      if (!rows.length) continue;
      const rawVeto = rows.some((row) => row.verdict.veto);
      verdicts.push({
        candidateKey: key,
        veto: config.flags.safetyVeto && rawVeto,
        legalRisk: Math.max(...rows.map((row) => row.verdict.legalRisk)),
        publicReason: rows
          .map((row) => `${row.seatId}: ${row.verdict.publicReason}`)
          .join(" | ") + (!config.flags.safetyVeto && rawVeto ? " | veto power disabled by registered ablation" : ""),
      });
    }
    return invalid ? null : verdicts;
  };

  // STOP is a first-class decision, so a complete verdict must END by electing
  // it. If every pack slot commits substantive text, a final completion span
  // gives the panel the explicit "the verdict is whole" vote; runs that ratify
  // STOP inside a pack slot never reach it. (Without this, a fully-answered
  // case would end by slot exhaustion — indistinguishable on the record from
  // being cut off, which is exactly what A11 exists to catch.)
  const completionSlot: DecisionSlot = {
    index: pack.slots.length,
    label: "completion — is the verdict whole?",
    instruction:
      "Review the verdict committed so far against the question and every constraint. " +
      "If it fully resolves the matter, propose STOP — a first-class decision that the verdict is complete. " +
      "Propose additional text ONLY if something legally or materially required is still missing.",
    riskBands: {},
    candidatesHint: ["<STOP>"],
  };

  // Growable queue: if the completion slot itself commits text instead of STOP
  // (observed on run_b51538e11c68, where STOP lost the election 2–1), ONE retry
  // slot is appended so the run can still end by an explicit STOP rather than
  // slot exhaustion. Runs that ratify STOP on the first completion slot — every
  // offline run — never grow the queue, so their ledgers are unchanged.
  // A run with no usable safety seat or no possible multi-seat quorum terminates
  // as explicitly degraded. It never opens a decision or synthesizes a verdict.
  const slotQueue: DecisionSlot[] = rosterUsable ? [...pack.slots, completionSlot] : [];
  if (!rosterUsable) stoppedBy = "degraded";
  let completionRetried = false;
  for (let qi = 0; qi < slotQueue.length; qi++) {
    if (cancelled()) {
      stoppedBy = "cancelled";
      break;
    }
    const slot = slotQueue[qi];
    if (spanCount >= config.maxSpans) {
      stoppedBy = "max_spans";
      break;
    }
    append("decision_opened", slot.index, { slot });

    const baseCase: CaseFile = {
      runId,
      packId: pack.id,
      title: pack.title,
      domain: pack.domain,
      question: pack.question,
      constraints: pack.constraints,
      evidence: pack.evidence,
      documents: pack.documents,
      prefix,
      slot,
      ratifiedCommitments: ratifiedCommitments.slice(),
      rejectedAlternatives: rejectedAlternatives.slice(),
      unresolvedDissent: carriedDissent.slice(),
    };
    append("case_presented", slot.index, { case: baseCase });

    // ---- Round 1: blind proposals ----------------------------------------
    const proposeResults = await Promise.all(
      seats.map((s) =>
        s.client
          .propose({
            view: viewFor(baseCase, s, config, memory, pack.evidenceBySociety),
            seed: config.seed,
            signal: opts.signal,
          })
          .then((r) => ({ seat: s, ...r }))
          .catch((err) => ({ seat: s, error: err as Error })),
      ),
    );

    const proposals: Proposal[] = [];
    for (const r of proposeResults) {
      if ("error" in r) {
        const usage = errUsage(r.seat.client, r.error, cancelled());
        recordUsage(usageTotals, usage, 0);
        append("provider_call", slot.index, {
          seatId: r.seat.seatId,
          usage,
        });
        continue;
      }
      recordUsage(usageTotals, r.usage, r.repaired);
      if (r.repaired > 0 || !validProposalForSeat(r.proposal, r.seat, slot.index)) {
        append("provider_call", slot.index, {
          seatId: r.seat.seatId,
          usage: { ...r.usage, status: "incomplete" },
        });
        continue;
      }
      proposals.push(r.proposal);
      append("provider_call", slot.index, { seatId: r.seat.seatId, usage: r.usage });
    }
    if (cancelled()) {
      stoppedBy = "cancelled";
      break;
    }
    if (!hasQuorumWithSafety(proposals, quorum)) {
      stoppedBy = "degraded";
      break;
    }

    // ---- Seal commitments BEFORE reveal (blind-round control) --------------
    const sealedHashes = new Map<string, string>();
    if (config.flags.blindRound) {
      for (const p of proposals) {
        const sealed = hashOf(p);
        sealedHashes.set(p.seatId, sealed);
        append("blind_commitment", slot.index, {
          seatId: p.seatId,
          society: p.society,
          provider: p.provider,
          spanIndex: slot.index,
          proposalHash: sealed,
        });
      }
    }
    // Reveal + verify: `committed` is the hash SEALED in the blind_commitment
    // event, `recomputed` is the hash of what is being revealed now. Comparing
    // a value to a recomputation of itself would attest nothing; this check is
    // only meaningful against the sealed record, and a mismatch is ledgered
    // as ok:false, never masked. (With no blind round there are no seals, so
    // no checks are claimed.)
    const hashChecks = config.flags.blindRound
      ? proposals.map((p) => {
          const recomputed = hashOf(p);
          const committed = sealedHashes.get(p.seatId) ?? "";
          return { seatId: p.seatId, committed, recomputed, ok: committed === recomputed };
        })
      : [];
    append("proposals_revealed", slot.index, { proposals, hashChecks });

    // ---- Delphi feedback (anonymized) + per-recipient order ---------------
    const packet = buildFeedbackPacket(proposals, slot.index, 1, config.flags.anonymizeFeedback);
    append("feedback_issued", slot.index, { packet, anonymized: config.flags.anonymizeFeedback });

    const orders = new Map<string, number[]>();
    for (const p of proposals) {
      const order = orderFor(
        packet.summaries.length,
        p.seatId,
        config.seed,
        config.flags.randomizeCandidateOrder,
      );
      orders.set(p.seatId, order);
      append("feedback_view_assigned", slot.index, { recipientSeatId: p.seatId, order });
    }

    // ---- Round 2: revision (or synthesized finals if debate disabled) -----
    let revisions: Revision[];
    if (config.flags.debateRounds > 0) {
      const reviseResults = await Promise.all(
        proposals.map((p) => {
          const seat = seats.find((s) => s.seatId === p.seatId)!;
          const order = orders.get(p.seatId)!;
          const ordered = applyOrder(packet.summaries, order);
          return seat.client
            .revise({
              view: viewFor(baseCase, seat, config, memory, pack.evidenceBySociety),
              ownRound1: p.candidates,
              feedback: ordered,
              guidance: packet.guidance,
              feedbackAnonymized: config.flags.anonymizeFeedback,
              seed: config.seed,
              signal: opts.signal,
            })
            .then((r) => ({ seat, ...r }))
            .catch((err) => ({ seat, error: err as Error }));
        }),
      );
      revisions = [];
      for (const r of reviseResults) {
        if ("error" in r) {
          const usage = errUsage(r.seat.client, r.error, cancelled());
          recordUsage(usageTotals, usage, 0);
          append("provider_call", slot.index, { seatId: r.seat.seatId, usage });
          continue;
        }
        recordUsage(usageTotals, r.usage, r.repaired);
        if (r.repaired > 0 || !validRevisionForSeat(r.revision, r.seat, slot.index)) {
          append("provider_call", slot.index, {
            seatId: r.seat.seatId,
            usage: { ...r.usage, status: "incomplete" },
          });
          continue;
        }
        revisions.push(r.revision);
        append("provider_call", slot.index, { seatId: r.seat.seatId, usage: r.usage });
        append("revision_received", slot.index, { revision: r.revision });
      }
      if (cancelled()) {
        stoppedBy = "cancelled";
        break;
      }
      if (!hasQuorumWithSafety(revisions, quorum)) {
        stoppedBy = "degraded";
        break;
      }
    } else {
      revisions = synthesizeFinals(proposals);
    }

    // ---- Safety review (veto power) ---------------------------------------
    const safety = await reviewEveryEligibleCandidate(baseCase, revisions, config.seed);
    if (cancelled()) {
      stoppedBy = "cancelled";
      break;
    }
    if (!safety) {
      stoppedBy = "degraded";
      break;
    }
    append("safety_review", slot.index, { verdicts: safety.slice(), vetoEnabled: config.flags.safetyVeto });

    // ---- Human intervention (auditor in the loop) ------------------------
    const pulled = opts.pullHumanInterventions ? await opts.pullHumanInterventions(slot.index) : [];
    if (cancelled()) {
      stoppedBy = "cancelled";
      break;
    }
    const humans = [...(humanBySpan.get(slot.index) ?? []), ...pulled];
    let humanVetoPresent = false;
    for (const h of humans) {
      append("human_intervention", slot.index, h);
      if (h.kind === "veto" && h.targetKey) {
        humanVetoPresent = true;
        safety.push({
          candidateKey: h.targetKey,
          veto: true,
          legalRisk: 1,
          publicReason: `Human auditor (${h.actor}) veto: ${h.text}`,
        });
      }
    }
    // The safetyVeto flag ablates the AI safety seat, not the named human
    // auditor. A human veto remains binding and attributed under every ablation.
    const effectiveVetoEnabled = config.flags.safetyVeto || humanVetoPresent;

    // ---- Constitutional ratification -------------------------------------
    let ratificationSafety = safety;
    let decision = ratify({
      spanIndex: slot.index,
      revisions,
      safety,
      vetoEnabled: effectiveVetoEnabled,
      carriedDissent,
      escalationRoundsDone: 0,
    });

    // R3 escalation is REAL: one further revision round with the contested table
    // in view, then a final ratification with escalation spent. Never cosmetic.
    if (decision.method === "escalate_for_evidence" && config.flags.debateRounds > 0) {
      append("escalation_triggered", slot.index, {
        reason: decision.publicReason,
        requestedBy: "evidence",
        roundNo: 2,
      });
      const packet2 = buildFeedbackPacket(proposals, slot.index, 2, config.flags.anonymizeFeedback);
      packet2.guidance =
        "ESCALATION ROUND: the leading candidates are within the decision margin at high dispersion. " +
        "Re-examine the primary evidence for the contested spans and commit to a final position.";
      append("feedback_issued", slot.index, { packet: packet2, anonymized: config.flags.anonymizeFeedback });
      const revised2 = await Promise.all(
        revisions.map((prev) => {
          const seat = seats.find((s) => s.seatId === prev.seatId);
          if (!seat) return Promise.resolve(null);
          const order = orders.get(prev.seatId) ?? packet2.summaries.map((_, i) => i);
          return seat.client
            .revise({
              view: viewFor(baseCase, seat, config, memory, pack.evidenceBySociety),
              ownRound1: [prev.final],
              feedback: applyOrder(packet2.summaries, order),
              guidance: packet2.guidance,
              feedbackAnonymized: config.flags.anonymizeFeedback,
              seed: config.seed + 1,
              signal: opts.signal,
            })
            .then((r) => ({ seat, ...r }))
            .catch((error) => ({ seat, error: error as Error }));
        }),
      );
      const revisions2: Revision[] = [];
      for (const r of revised2) {
        if (!r) continue;
        if ("error" in r) {
          const usage = errUsage(r.seat.client, r.error, cancelled());
          recordUsage(usageTotals, usage, 0);
          append("provider_call", slot.index, { seatId: r.seat.seatId, usage });
          continue;
        }
        recordUsage(usageTotals, r.usage, r.repaired);
        if (r.repaired > 0 || !validRevisionForSeat(r.revision, r.seat, slot.index)) {
          append("provider_call", slot.index, {
            seatId: r.seat.seatId,
            usage: { ...r.usage, status: "incomplete" },
          });
          continue;
        }
        revisions2.push(r.revision);
        append("provider_call", slot.index, { seatId: r.seat.seatId, usage: r.usage });
        append("revision_received", slot.index, { revision: r.revision });
      }
      if (cancelled()) {
        stoppedBy = "cancelled";
        break;
      }
      if (!hasQuorumWithSafety(revisions2, quorum)) {
        stoppedBy = "degraded";
        break;
      }
      revisions = revisions2;
      const safety2 = await reviewEveryEligibleCandidate(baseCase, revisions, config.seed + 1);
      if (cancelled()) {
        stoppedBy = "cancelled";
        break;
      }
      if (!safety2) {
        stoppedBy = "degraded";
        break;
      }
      append("safety_review", slot.index, { verdicts: safety2, vetoEnabled: config.flags.safetyVeto });
      ratificationSafety = [...safety2, ...safety.filter((s) => s.veto)];
      decision = ratify({
        spanIndex: slot.index,
        revisions,
        safety: ratificationSafety,
        vetoEnabled: effectiveVetoEnabled,
        carriedDissent,
        escalationRoundsDone: 1,
      });
    }
    // Ratification may move away from the initial leader (for example after a
    // veto). The actually selected candidate must therefore have an explicit
    // safety verdict in the final review round, not merely inherit a review of
    // a different candidate.
    if (!ratificationSafety.some((item) => item.candidateKey === candidateKey(decision.selected.candidate))) {
      stoppedBy = "degraded";
      break;
    }
    append("ratification", slot.index, { decision });
    for (const d of decision.dissents) append("dissent_preserved", slot.index, { dissent: d });

    // ---- Commit the span --------------------------------------------------
    const chosen = decision.selected;
    const isStop = chosen.candidate.isStop;
    let appended = "";
    if (!isStop) {
      appended = spacer(prefix, chosen.candidate.text) + chosen.candidate.text;
      prefix += appended;
      ratifiedCommitments.push(chosen.candidate.text);
    }
    append("span_committed", slot.index, {
      spanIndex: slot.index,
      text: appended,
      isStop,
      prefixAfter: prefix,
    });

    // Record losers as rejected alternatives (carried into later case files).
    for (const row of decision.candidateTable) {
      if (row.key !== candidateKey(chosen.candidate) && row.key !== "<STOP>") {
        rejectedAlternatives.push({ text: row.key, reason: `not ratified at span ${slot.index}` });
      }
    }

    // ---- Memory update ----------------------------------------------------
    const writes: MemoryExtract[] = [];
    if (config.flags.roleMemory) {
      writes.push({
        layer: "deliberation",
        key: `span_${slot.index}_rule`,
        content: `${decision.method}: ${decision.metaRule}`,
        spanOrigin: slot.index,
      });
      for (const d of decision.dissents) {
        writes.push({
          layer: "unresolved_objection",
          key: d.id,
          content: d.objection.text,
          spanOrigin: slot.index,
        });
      }
      memory.push(...writes);
      append("memory_updated", slot.index, { writes });
    }

    carriedDissent = decision.dissents.filter((d) => d.status === "preserved");
    append("decision_closed", slot.index, { spanIndex: slot.index });
    spanCount++;

    if (isStop) {
      stoppedBy = "stop_ratified";
      break;
    }

    if (slot.index >= pack.slots.length && !completionRetried && spanCount < config.maxSpans) {
      completionRetried = true;
      slotQueue.push({
        ...completionSlot,
        index: slot.index + 1,
        label: "completion retry — final STOP call",
        instruction:
          "The panel has now committed text past every pack slot. Ratify STOP — the explicit, " +
          "first-class decision that the verdict is whole. Propose additional text ONLY for a " +
          "legally mandatory omission you can name precisely.",
      });
    }
  }

  const finalAnswer = prefix.trim();
  const cancellation = stoppedBy === "cancelled" ? cancellationReceipt(opts.signal?.reason) : undefined;
  const remainingInterventions = opts.drainHumanInterventions ? await opts.drainHumanInterventions() : [];
  const unappliedInterventionIds = [...new Set([
    ...(cancellation?.unappliedInterventionIds ?? []),
    ...remainingInterventions.map((item) => item.interventionId).filter((id): id is string => Boolean(id)),
  ])];
  append("run_finished", null, {
    finalAnswer,
    stoppedBy,
    spanCount,
    totals: usageTotals,
    ...(cancellation ? { cancellation } : {}),
    ...(unappliedInterventionIds.length ? { unappliedInterventionIds } : {}),
  });

  return {
    runId,
    packId: pack.id,
    finalAnswer,
    stoppedBy,
    spanCount,
    events: ledger.all(),
    usageTotals,
    config,
  };
}

function cancellationReceipt(reason: unknown): CancellationReceipt {
  const value = reason && typeof reason === "object" ? (reason as Partial<CancellationReceipt>) : {};
  const unappliedInterventionIds = Array.isArray(value.unappliedInterventionIds)
    ? [...new Set(value.unappliedInterventionIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  return {
    actor: typeof value.actor === "string" && value.actor.trim() ? value.actor.trim() : "Operator",
    reason: typeof value.reason === "string" && value.reason.trim() ? value.reason.trim() : "Run cancelled",
    requestedAt: Number.isFinite(value.requestedAt) ? Number(value.requestedAt) : 0,
    unappliedInterventions: unappliedInterventionIds.length,
    unappliedInterventionIds,
  };
}

// --- helpers ----------------------------------------------------------------

function viewFor(
  base: CaseFile,
  seat: PanelSeat,
  config: RunConfig,
  memory: MemoryExtract[],
  evidenceBySociety?: Partial<Record<string, string[]>>,
) {
  const society = seat.client.society;
  let evidence = base.evidence;
  if (config.flags.independentEvidence) {
    // Each seat gets its own evidence bundle. Packs may name exact ids; otherwise
    // use a deterministic overlapping rotation so every seat has substantive
    // material while no two mandates receive an identical default bundle.
    const assigned = evidenceBySociety?.[society];
    if (assigned?.length) {
      const ids = new Set(assigned);
      evidence = base.evidence.filter((item) => ids.has(item.id));
    } else if (base.evidence.length > 1) {
      const societies = ["evidence", "adversary", "law_policy", "affected_party", "safety", "concision"];
      const offset = Math.max(0, societies.indexOf(society));
      const width = Math.min(base.evidence.length, Math.max(2, Math.ceil(base.evidence.length * 0.6)));
      evidence = Array.from(
        { length: width },
        (_, index) => base.evidence[(offset + index) % base.evidence.length],
      );
    }
  }
  return {
    case: base,
    seatId: seat.seatId,
    society,
    evidence,
    memory: config.flags.roleMemory ? memory.slice() : [],
  };
}

function synthesizeFinals(proposals: Proposal[]): Revision[] {
  return proposals.map((p) => {
    const top = p.candidates.slice().sort((a, b) => b.confidence - a.confidence)[0];
    return {
      seatId: p.seatId,
      society: p.society,
      provider: p.provider,
      spanIndex: p.spanIndex,
      final: top,
      changedFromRound1: false,
      answerToStrongestObjection: "(revision round disabled for this run)",
      steelmanOfBestRival: "(revision round disabled for this run)",
      changeMyMind: "(revision round disabled for this run)",
      maintainedObjections: p.objections,
    };
  });
}

function hasQuorumWithSafety(items: Array<{ seatId: string; society: string }>, quorum: number): boolean {
  return new Set(items.map((item) => item.seatId)).size >= quorum && items.some((item) => item.society === "safety");
}

function validProposalForSeat(proposal: Proposal, seat: PanelSeat, spanIndex: number): boolean {
  return (
    proposal?.seatId === seat.seatId &&
    proposal?.society === seat.client.society &&
    proposal?.provider === seat.client.provider &&
    proposal?.spanIndex === spanIndex &&
    Array.isArray(proposal.candidates) &&
    proposal.candidates.length > 0 &&
    proposal.candidates.every(validScoredCandidate) &&
    typeof proposal.publicWarrant === "string" &&
    proposal.publicWarrant.trim().length > 0 &&
    Array.isArray(proposal.objections) &&
    Array.isArray(proposal.rejectedAlternatives)
  );
}

function validRevisionForSeat(revision: Revision, seat: PanelSeat, spanIndex: number): boolean {
  return (
    revision?.seatId === seat.seatId &&
    revision?.society === seat.client.society &&
    revision?.provider === seat.client.provider &&
    revision?.spanIndex === spanIndex &&
    validScoredCandidate(revision.final) &&
    typeof revision.changedFromRound1 === "boolean" &&
    nonblank(revision.answerToStrongestObjection) &&
    nonblank(revision.steelmanOfBestRival) &&
    nonblank(revision.changeMyMind) &&
    Array.isArray(revision.maintainedObjections)
  );
}

function validScoredCandidate(candidate: ScoredCandidate): boolean {
  if (!candidate || typeof candidate !== "object" || !candidate.candidate) return false;
  const { text, isStop } = candidate.candidate;
  if (typeof text !== "string" || typeof isStop !== "boolean") return false;
  if (isStop ? text !== "" : text.trim().length === 0) return false;
  if (!nonblank(candidate.warrant)) return false;
  return [
    candidate.confidence,
    candidate.factualityRisk,
    candidate.legalRisk,
    candidate.fairnessRisk,
    candidate.affectedPartyImpact,
  ].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
}

function nonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validSafetyVerdictForCandidate(verdict: SafetyVerdict, expectedKey: string): boolean {
  return Boolean(
    verdict &&
      verdict.candidateKey === expectedKey &&
      typeof verdict.veto === "boolean" &&
      typeof verdict.legalRisk === "number" &&
      Number.isFinite(verdict.legalRisk) &&
      verdict.legalRisk >= 0 &&
      verdict.legalRisk <= 1 &&
      nonblank(verdict.publicReason),
  );
}

function recordUsage(totals: Record<string, number>, usage: UsageRecord, repaired: number) {
  totals.calls += 1;
  totals.tokensOut += usage.tokensOut ?? 0;
  totals.latencyMs += usage.latencyMs ?? 0;
  totals.repaired += repaired;
}

function errUsage(client: PanelClient, err: unknown, signalAborted = false): UsageRecord {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  const wasCancelled = signalAborted || name === "AbortError" || /cancel|abort/i.test(message);
  return {
    provider: client.provider,
    model: client.model,
    modelSource: client.modelSource,
    status: wasCancelled ? "cancelled" : /refus/i.test(message) ? "refusal" : "error",
    transport: client.transport,
  };
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
function spacer(prefix: string, next: string): string {
  if (!prefix) return "";
  if (/[\s(]$/.test(prefix)) return "";
  if (/^[\s.,;:!?)]/.test(next)) return "";
  return " ";
}
