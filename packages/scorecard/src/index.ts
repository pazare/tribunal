import {
  verifyLedger,
  hashOf,
  candidateKey,
  type AuditabilityItem,
  type AuditabilityReport,
  type LedgerEvent,
} from "@tribunal/kernel";

/**
 * The A1–A12 auditability checklist, scored ONLY against a run's own artifacts
 * (its hash-chained ledger). Every item states the evidence for its pass/fail.
 *
 * Honesty rules baked in:
 *  - Repair markers (fields an adapter back-filled because a model returned
 *    nothing) FAIL the relevant item. A run kept alive by placeholder rationale
 *    does not get credit for rationale.
 *  - Trivial/degenerate content (e.g. one-word warrants) FAILS the non-triviality
 *    guard — structure without substance scores zero.
 *  - A single-model baseline output has no ledger, so it scores 0/12 *by
 *    construction*; that asymmetry is the honest point of the comparison, and the
 *    UI labels it as such.
 */

const REPAIR_MARKERS = [
  "(no warrant returned",
  "(no public warrant",
  "not returned by model)",
  "(revision round disabled",
];

const MIN_SUBSTANTIVE = 20; // chars — non-triviality guard for rationale fields

export function computeAuditability(events: LedgerEvent[]): AuditabilityReport {
  const runId = events[0]?.runId ?? "unknown";
  const items: AuditabilityItem[] = [];
  const byKind = groupByKind(events);

  // ---- A1: blind commitments precede reveal, and seal what was revealed ----
  {
    const reveals = byKind("proposals_revealed");
    const commits = byKind("blind_commitment");
    let ok = reveals.length > 0 && commits.length > 0;
    let evidence = "";
    if (!ok) {
      evidence = commits.length === 0 ? "no sealed commitments in this run" : "no reveal events";
    } else {
      outer: for (const rev of reveals) {
        const revealSeq = rev.seq;
        const proposals = (rev.payload as any).proposals as any[];
        for (const p of proposals) {
          const c = commits.find(
            (x) => x.spanIndex === rev.spanIndex && (x.payload as any).seatId === p.seatId,
          );
          if (!c) {
            ok = false;
            evidence = `seat ${p.seatId} revealed without a sealed commitment (span ${rev.spanIndex})`;
            break outer;
          }
          if (c.seq >= revealSeq) {
            ok = false;
            evidence = `commitment seq ${c.seq} does not precede reveal seq ${revealSeq}`;
            break outer;
          }
          if ((c.payload as any).proposalHash !== hashOf(p)) {
            ok = false;
            evidence = `sealed hash mismatch for ${p.seatId} at span ${rev.spanIndex}`;
            break outer;
          }
        }
      }
      if (ok)
        evidence = `${commits.length} commitments sealed before ${reveals.length} reveal(s); all hashes recompute`;
    }
    items.push(item("A1", "Blind commitments sealed before reveal", ok, evidence));
  }

  // ---- A2: public warrant on every candidate (non-trivial, never repaired) --
  {
    const reveals = byKind("proposals_revealed");
    let total = 0;
    let bad = 0;
    let repairHit = false;
    for (const rev of reveals) {
      for (const p of (rev.payload as any).proposals as any[]) {
        for (const sc of p.candidates) {
          total++;
          const w = String(sc.warrant ?? "");
          if (w.length < MIN_SUBSTANTIVE) bad++;
          if (REPAIR_MARKERS.some((m) => w.includes(m))) repairHit = true;
        }
        const pw = String(p.publicWarrant ?? "");
        if (REPAIR_MARKERS.some((m) => pw.includes(m))) repairHit = true;
      }
    }
    const ok = total > 0 && bad === 0 && !repairHit;
    items.push(
      item(
        "A2",
        "Public warrant on every candidate",
        ok,
        ok
          ? `${total} candidate warrants, all substantive (≥${MIN_SUBSTANTIVE} chars, no repair markers)`
          : repairHit
            ? "adapter had to back-fill missing warrants — credit refused"
            : `${bad}/${total} warrants trivial or missing`,
      ),
    );
  }

  // ---- A3: anonymized feedback (flag + structural key check) ----------------
  {
    const fbs = byKind("feedback_issued");
    let ok = fbs.length > 0;
    let evidence = ok ? "" : "no feedback packets";
    for (const fb of fbs) {
      const anonymized = (fb.payload as any).anonymized === true;
      if (!anonymized) {
        ok = false;
        evidence = "run recorded anonymized=false (ablated or disabled)";
        break;
      }
      for (const s of (fb.payload as any).packet.summaries as any[]) {
        const keys = Object.keys(s);
        const leak = ["seatId", "society", "provider", "agent", "author"].find((k) => keys.includes(k));
        if (leak) {
          ok = false;
          evidence = `summary leaks identity field "${leak}"`;
          break;
        }
      }
    }
    if (ok) evidence = `${fbs.length} packet(s), no identity fields in any summary (type-level anonymization)`;
    items.push(item("A3", "Cross-seat feedback anonymized", ok, evidence));
  }

  // ---- A4: per-recipient candidate order randomized -------------------------
  {
    const views = byKind("feedback_view_assigned");
    const bySpan = new Map<number, string[]>();
    for (const v of views) {
      const arr = bySpan.get(v.spanIndex as number) ?? [];
      arr.push(((v.payload as any).order as number[]).join(","));
      bySpan.set(v.spanIndex as number, arr);
    }
    let shuffled = 0;
    let comparable = 0;
    for (const [, orders] of bySpan) {
      if (orders.length >= 2 && orders[0].includes(",")) {
        comparable++;
        if (new Set(orders).size >= 2) shuffled++;
      }
    }
    const ok = comparable > 0 && shuffled === comparable;
    items.push(
      item(
        "A4",
        "Per-recipient order randomized (position-bias control)",
        ok,
        comparable === 0
          ? "no multi-candidate spans to compare"
          : `${shuffled}/${comparable} spans show genuinely differing per-recipient orders`,
      ),
    );
  }

  // ---- A5: revisions answer the strongest objection + steelman the rival ----
  {
    const revs = byKind("revision_received");
    let ok = revs.length > 0;
    let why = ok ? "" : "no revision round in this run";
    for (const r of revs) {
      const rev = (r.payload as any).revision;
      for (const f of ["answerToStrongestObjection", "steelmanOfBestRival", "changeMyMind"] as const) {
        const v = String(rev[f] ?? "");
        if (v.length < MIN_SUBSTANTIVE || REPAIR_MARKERS.some((m) => v.includes(m))) {
          ok = false;
          why = `${rev.seatId}.${f} is missing, trivial, or was back-filled`;
          break;
        }
      }
      if (!ok) break;
    }
    if (ok) why = `${revs.length} revisions; every one answers the strongest objection, steelmans the rival, and names what would change its mind`;
    items.push(item("A5", "Revisions answer objections + steelman rivals", ok, why));
  }

  // ---- A6: safety review with real veto power -------------------------------
  {
    const srs = byKind("safety_review");
    const ok = srs.length > 0 && srs.every((s) => (s.payload as any).vetoEnabled === true);
    const vetoes = srs.flatMap((s) => ((s.payload as any).verdicts as any[]).filter((v) => v.veto));
    items.push(
      item(
        "A6",
        "Safety review with real veto power",
        ok,
        ok
          ? `${srs.length} review(s) with veto enabled; ${vetoes.length} veto(es) actually fired with public reasons`
          : srs.length === 0
            ? "no safety review events"
            : "veto power was disabled for this run",
      ),
    );
  }

  // ---- A7: named ratification rule + public reason per decision -------------
  {
    const rats = byKind("ratification");
    let ok = rats.length > 0;
    let why = ok ? "" : "no ratification events";
    for (const r of rats) {
      const d = (r.payload as any).decision;
      if (!d.method || !d.metaRule || String(d.publicReason ?? "").length < MIN_SUBSTANTIVE) {
        ok = false;
        why = `span ${r.spanIndex}: rule or public reason missing/trivial`;
        break;
      }
    }
    if (ok) why = `${rats.length} decisions, each names the fired rule and a substantive public reason`;
    items.push(item("A7", "Named ratification rule + public reason", ok, why));
  }

  // ---- A8: EVERY material maintained objection is preserved as dissent ------
  {
    const revs = byKind("revision_received");
    const dissents = byKind("dissent_preserved").map((d) => (d.payload as any).dissent);
    const material: { key: string; text: string }[] = [];
    for (const r of revs) {
      for (const o of ((r.payload as any).revision.maintainedObjections as any[]) ?? []) {
        if (o.severity >= 0.4) material.push({ key: o.targetKey, text: o.text });
      }
    }
    let missing = 0;
    for (const m of material) {
      const found = dissents.some(
        (d) => d.objection.targetKey === m.key && d.objection.text === m.text,
      );
      if (!found) missing++;
    }
    const ok = material.length > 0 ? missing === 0 : dissents.length >= 0 && revs.length > 0;
    items.push(
      item(
        "A8",
        "Material dissent preserved (winner or loser targets alike)",
        ok && revs.length > 0,
        revs.length === 0
          ? "no revision round — dissent capture not exercised"
          : material.length === 0
            ? "no material objections were maintained (vacuous pass)"
            : missing === 0
              ? `${material.length}/${material.length} material objections preserved on the record`
              : `${missing}/${material.length} material objections were DROPPED`,
      ),
    );
  }

  // ---- A9: memory updates recorded ------------------------------------------
  {
    const mems = byKind("memory_updated");
    const writes = mems.reduce((n, m) => n + ((m.payload as any).writes?.length ?? 0), 0);
    items.push(
      item(
        "A9",
        "Deliberation memory persisted",
        mems.length > 0 && writes > 0,
        mems.length ? `${writes} memory writes across ${mems.length} update(s)` : "no memory events",
      ),
    );
  }

  // ---- A10: hash chain + protocol state machine verify -----------------------
  {
    const v = verifyLedger(events);
    items.push(
      item(
        "A10",
        "Ledger verifies (hash chain + protocol state machine)",
        v.ok && v.answerConsistent,
        v.ok
          ? `${v.events} events verify; head ${v.head.slice(0, 12)}…; answer cross-check ${v.answerConsistent ? "passes" : "FAILS"}. Caveat: tamper-evident WITHOUT an external anchor — publish the head hash to anchor it.`
          : `verification failed: ${v.problems[0]?.reason} at seq ${v.problems[0]?.seq}`,
      ),
    );
  }

  // ---- A11: STOP is an explicit ratified decision ----------------------------
  {
    const fin = byKind("run_finished")[0];
    const stoppedBy = fin ? (fin.payload as any).stoppedBy : "unknown";
    const stopCommit = byKind("span_committed").some((e) => (e.payload as any).isStop);
    const ok = stoppedBy === "stop_ratified" && stopCommit;
    items.push(
      item(
        "A11",
        "STOP ratified explicitly (no silent trailing-off)",
        ok,
        ok
          ? "the run ended because the panel RATIFIED stop"
          : stoppedBy === "cancelled"
            ? "the operator cancelled the run before STOP was ratified"
            : `run ended by "${stoppedBy}"`,
      ),
    );
  }

  // ---- A12: typed, machine-validatable event log -----------------------------
  {
    const known = new Set([
      "run_started", "decision_opened", "case_presented", "blind_commitment",
      "proposals_revealed", "feedback_issued", "feedback_view_assigned",
      "revision_received", "safety_review", "escalation_triggered", "ratification",
      "dissent_preserved", "span_committed", "human_intervention", "memory_updated",
      "provider_call", "decision_closed", "run_finished",
    ]);
    const unknown = events.filter((e) => !known.has(e.kind));
    const malformed = events.filter((e) => !validatePayload(e));
    const ok = events.length > 0 && unknown.length === 0 && malformed.length === 0;
    items.push(
      item(
        "A12",
        "Typed, schema-validatable event log",
        ok,
        ok
          ? `${events.length} events, all of known kinds with required fields present`
          : `${unknown.length} unknown kinds, ${malformed.length} malformed payloads`,
      ),
    );
  }

  const total = items.filter((i) => i.pass).length;
  return { runId, items, total, outOf: items.length };
}

/** The honest by-construction baseline row: a plain single-model answer. */
export function baselineReport(label = "single-model baseline"): AuditabilityReport {
  const why = (what: string) =>
    `${what} — a plain completion emits no during-generation record, so this fails BY CONSTRUCTION (that asymmetry is the point).`;
  const items: AuditabilityItem[] = [
    item("A1", "Blind commitments sealed before reveal", false, why("no commitments exist")),
    item("A2", "Public warrant on every candidate", false, why("no per-candidate warrants exist")),
    item("A3", "Cross-seat feedback anonymized", false, why("no feedback round exists")),
    item("A4", "Per-recipient order randomized (position-bias control)", false, why("no feedback views exist")),
    item("A5", "Revisions answer objections + steelman rivals", false, why("no revision round exists")),
    item("A6", "Safety review with real veto power", false, why("no reviewer can veto")),
    item("A7", "Named ratification rule + public reason", false, why("no named decision rule exists")),
    item("A8", "Material dissent preserved", false, why("there is no second voice to dissent")),
    item("A9", "Deliberation memory persisted", false, why("no memory of the decision exists")),
    item("A10", "Ledger verifies (hash chain + protocol state machine)", false, why("there is no chain to verify")),
    item("A11", "STOP ratified explicitly", false, why("generation just ends")),
    item("A12", "Typed, schema-validatable event log", false, why("there is no event log")),
  ];
  return { runId: label, items, total: 0, outOf: 12 };
}

// --- internals ---------------------------------------------------------------

function item(id: string, label: string, pass: boolean, evidence: string): AuditabilityItem {
  return { id, label, pass, evidence };
}

function groupByKind(events: LedgerEvent[]) {
  return (kind: LedgerEvent["kind"]) => events.filter((e) => e.kind === kind);
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  run_started: ["packId", "title", "panel", "config"],
  decision_opened: ["slot"],
  case_presented: ["case"],
  blind_commitment: ["seatId", "proposalHash", "spanIndex"],
  proposals_revealed: ["proposals", "hashChecks"],
  feedback_issued: ["packet", "anonymized"],
  feedback_view_assigned: ["recipientSeatId", "order"],
  revision_received: ["revision"],
  safety_review: ["verdicts", "vetoEnabled"],
  escalation_triggered: ["reason", "requestedBy"],
  ratification: ["decision"],
  dissent_preserved: ["dissent"],
  span_committed: ["spanIndex", "text", "isStop", "prefixAfter"],
  human_intervention: ["actor", "kind", "channel", "text"],
  memory_updated: ["writes"],
  provider_call: ["seatId", "usage"],
  decision_closed: ["spanIndex"],
  run_finished: ["finalAnswer", "stoppedBy", "spanCount"],
};

function validatePayload(e: LedgerEvent): boolean {
  const req = REQUIRED_FIELDS[e.kind];
  if (!req) return false;
  const p = e.payload as Record<string, unknown>;
  if (p == null || typeof p !== "object" || Array.isArray(p)) return false;
  if (!req.every((k) => k in p)) return false;
  if (e.kind === "run_finished") return validateRunFinishedPayload(p);
  return true;
}

function validateRunFinishedPayload(payload: Record<string, unknown>): boolean {
  const hasCancellation = Object.prototype.hasOwnProperty.call(payload, "cancellation");
  const disposition = payload.unappliedInterventionIds;
  if (
    disposition !== undefined &&
    (!Array.isArray(disposition) ||
      disposition.some((id) => typeof id !== "string" || !id.trim()) ||
      new Set(disposition).size !== disposition.length)
  ) {
    return false;
  }
  if (payload.stoppedBy !== "cancelled") {
    // A cancellation receipt is terminal provenance, not generic run metadata.
    // Its presence on any other stop path would misstate how the run ended.
    return !hasCancellation;
  }
  if (!hasCancellation || !validateCancellationReceipt(payload.cancellation)) return false;
  if (disposition === undefined) return true;
  const receiptIds = (payload.cancellation as Record<string, unknown>).unappliedInterventionIds as string[];
  return disposition.length === receiptIds.length && disposition.every((id) => receiptIds.includes(id));
}

function validateCancellationReceipt(value: unknown): boolean {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const receipt = value as Record<string, unknown>;
  const ids = receipt.unappliedInterventionIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id.trim())) return false;
  const count = receipt.unappliedInterventions;
  return (
    typeof receipt.actor === "string" &&
    receipt.actor.trim().length > 0 &&
    typeof receipt.reason === "string" &&
    receipt.reason.trim().length > 0 &&
    typeof receipt.requestedAt === "number" &&
    Number.isFinite(receipt.requestedAt) &&
    receipt.requestedAt > 0 &&
    typeof count === "number" &&
    Number.isInteger(count) &&
    count >= 0 &&
    count === ids.length &&
    new Set(ids).size === ids.length
  );
}

export { candidateKey };
