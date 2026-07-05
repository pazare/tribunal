import { hashOf, stableId } from "./hash.js";
import { Ledger } from "./ledger.js";
import { candidateKey } from "./types.js";
import { applyOrder, buildFeedbackPacket, orderFor } from "./feedback.js";
import { ratify } from "./ratify.js";
import type { PanelClient } from "./providers/base.js";
import type {
  CaseFile,
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
  /** "logical" gives byte-deterministic timestamps (offline/tests). */
  clock?: "logical" | "wall";
}

const SAFETY_VETO_THRESHOLD = 0.6;

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
    packId: pack.id,
    title: pack.title,
    domain: pack.domain,
    question: pack.question,
    panel: seats.map((s) => ({
      seatId: s.seatId,
      society: s.client.society,
      provider: s.client.provider,
      model: s.client.model,
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
  let stoppedBy: RunResult["stoppedBy"] = "max_spans";
  let spanCount = 0;

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
  const slotQueue: DecisionSlot[] = [...pack.slots, completionSlot];
  let completionRetried = false;
  for (let qi = 0; qi < slotQueue.length; qi++) {
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
          .propose({ view: viewFor(baseCase, s, config), seed: config.seed })
          .then((r) => ({ seat: s, ...r }))
          .catch((err) => ({ seat: s, error: err as Error })),
      ),
    );

    const proposals: Proposal[] = [];
    for (const r of proposeResults) {
      if ("error" in r) {
        append("provider_call", slot.index, {
          seatId: r.seat.seatId,
          usage: errUsage(r.seat.client, r.error),
        });
        continue;
      }
      proposals.push(r.proposal);
      recordUsage(usageTotals, r.usage, r.repaired);
      append("provider_call", slot.index, { seatId: r.seat.seatId, usage: r.usage });
    }
    if (proposals.length === 0) {
      stoppedBy = "halted";
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
              view: viewFor(baseCase, seat, config),
              ownRound1: p.candidates,
              feedback: ordered,
              guidance: packet.guidance,
              seed: config.seed,
            })
            .then((r) => ({ seat, ...r }))
            .catch((err) => ({ seat, error: err as Error }));
        }),
      );
      revisions = [];
      for (const r of reviseResults) {
        if ("error" in r) {
          append("provider_call", slot.index, { seatId: r.seat.seatId, usage: errUsage(r.seat.client, r.error) });
          continue;
        }
        revisions.push(r.revision);
        recordUsage(usageTotals, r.usage, r.repaired);
        append("provider_call", slot.index, { seatId: r.seat.seatId, usage: r.usage });
        append("revision_received", slot.index, { revision: r.revision });
      }
      if (revisions.length === 0) revisions = synthesizeFinals(proposals);
    } else {
      revisions = synthesizeFinals(proposals);
    }

    // ---- Safety review (veto power) ---------------------------------------
    const leadingKey = leadingCandidateKey(revisions);
    const safety = computeSafety(revisions, leadingKey, config.flags.safetyVeto);
    append("safety_review", slot.index, { verdicts: safety, vetoEnabled: config.flags.safetyVeto });

    // ---- Human intervention (auditor in the loop) ------------------------
    const pulled = opts.pullHumanInterventions ? await opts.pullHumanInterventions(slot.index) : [];
    const humans = [...(humanBySpan.get(slot.index) ?? []), ...pulled];
    for (const h of humans) {
      append("human_intervention", slot.index, h);
      if (h.kind === "veto" && h.targetKey) {
        safety.push({
          candidateKey: h.targetKey,
          veto: true,
          legalRisk: 1,
          publicReason: `Human auditor (${h.actor}) veto: ${h.text}`,
        });
      }
    }

    // ---- Constitutional ratification -------------------------------------
    let decision = ratify({
      spanIndex: slot.index,
      revisions,
      safety,
      vetoEnabled: config.flags.safetyVeto,
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
              view: viewFor(baseCase, seat, config),
              ownRound1: [prev.final],
              feedback: applyOrder(packet2.summaries, order),
              guidance: packet2.guidance,
              seed: config.seed + 1,
            })
            .then((r) => ({ seat, ...r }))
            .catch(() => null);
        }),
      );
      const revisions2: Revision[] = [];
      for (const r of revised2) {
        if (!r) continue;
        revisions2.push(r.revision);
        recordUsage(usageTotals, r.usage, r.repaired);
        append("provider_call", slot.index, { seatId: r.seat.seatId, usage: r.usage });
        append("revision_received", slot.index, { revision: r.revision });
      }
      if (revisions2.length > 0) revisions = revisions2;
      const safety2 = computeSafety(revisions, leadingCandidateKey(revisions), config.flags.safetyVeto);
      append("safety_review", slot.index, { verdicts: safety2, vetoEnabled: config.flags.safetyVeto });
      decision = ratify({
        spanIndex: slot.index,
        revisions,
        safety: [...safety2, ...safety.filter((s) => s.veto)],
        vetoEnabled: config.flags.safetyVeto,
        carriedDissent,
        escalationRoundsDone: 1,
      });
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
  append("run_finished", null, {
    finalAnswer,
    stoppedBy,
    spanCount,
    totals: usageTotals,
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

// --- helpers ----------------------------------------------------------------

function viewFor(base: CaseFile, seat: PanelSeat, config: RunConfig) {
  const society = seat.client.society;
  let evidence = base.evidence;
  if (config.flags.independentEvidence) {
    // Each seat gets its own bundle: its assigned ids, else a rotating slice.
    evidence = base.evidence; // full record available; assignment is packs' concern
  }
  return {
    case: base,
    seatId: seat.seatId,
    society,
    evidence,
    memory: [] as MemoryExtract[],
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

function leadingCandidateKey(revisions: Revision[]): string {
  const support = new Map<string, number>();
  for (const r of revisions) {
    const k = candidateKey(r.final.candidate);
    support.set(k, (support.get(k) ?? 0) + r.final.confidence);
  }
  return [...support.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "<STOP>";
}

function computeSafety(revisions: Revision[], leadingKey: string, vetoEnabled: boolean): SafetyVerdict[] {
  const safetyRevs = revisions.filter((r) => r.society === "safety");
  const verdicts: SafetyVerdict[] = [];
  for (const sr of safetyRevs) {
    const legalObjection = sr.maintainedObjections
      .filter((o) => o.targetKey === leadingKey && (o.kind === "legal" || o.kind === "policy"))
      .sort((a, b) => b.severity - a.severity)[0];
    const veto = vetoEnabled && !!legalObjection && legalObjection.severity >= SAFETY_VETO_THRESHOLD;
    verdicts.push({
      candidateKey: leadingKey,
      veto,
      legalRisk: sr.final.legalRisk,
      publicReason: veto
        ? `Safety seat vetoes "${short(leadingKey)}": ${legalObjection!.text}`
        : `Safety seat reviewed "${short(leadingKey)}"; no veto (legal risk ${sr.final.legalRisk.toFixed(2)}).`,
    });
  }
  if (verdicts.length === 0) {
    verdicts.push({
      candidateKey: leadingKey,
      veto: false,
      legalRisk: 0,
      publicReason: "No safety seat on this panel; no veto available.",
    });
  }
  return verdicts;
}

function recordUsage(totals: Record<string, number>, usage: UsageRecord, repaired: number) {
  totals.calls += 1;
  totals.tokensOut += usage.tokensOut ?? 0;
  totals.latencyMs += usage.latencyMs ?? 0;
  totals.repaired += repaired;
}

function errUsage(client: PanelClient, err: Error): UsageRecord {
  return {
    provider: client.provider,
    model: client.model,
    status: /refus/i.test(err.message) ? "refusal" : "error",
    transport: client.transport,
  };
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
function short(key: string): string {
  return key.length > 48 ? key.slice(0, 45) + "…" : key;
}
function spacer(prefix: string, next: string): string {
  if (!prefix) return "";
  if (/[\s(]$/.test(prefix)) return "";
  if (/^[\s.,;:!?)]/.test(next)) return "";
  return " ";
}
