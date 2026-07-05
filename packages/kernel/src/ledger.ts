import { canonicalJSON, sha256Hex, hashOf } from "./hash.js";
import type { EventKind, EventPayloadMap, LedgerEvent } from "./types.js";

export const GENESIS_HASH = "0".repeat(64);

/**
 * Append-only, hash-chained ledger. Each event's `hash` covers the whole event
 * body (including `prevHash` and `seq`) minus the `hash` field itself, so any
 * post-hoc mutation of a field, a reordering, or a deletion is detectable.
 */
export class Ledger {
  private events: LedgerEvent[] = [];
  private tick = 0;

  constructor(
    public readonly runId: string,
    private readonly clock: "logical" | "wall" = "wall",
  ) {}

  private now(): number {
    return this.clock === "wall" ? Date.now() : ++this.tick;
  }

  get length(): number {
    return this.events.length;
  }

  get head(): string {
    return this.events.length ? this.events[this.events.length - 1].hash : GENESIS_HASH;
  }

  all(): LedgerEvent[] {
    return this.events.slice();
  }

  append<K extends EventKind>(
    kind: K,
    spanIndex: number | null,
    payload: EventPayloadMap[K],
  ): LedgerEvent<K> {
    const prevHash = this.head;
    const seq = this.events.length;
    const base = {
      seq,
      runId: this.runId,
      spanIndex,
      ts: this.now(),
      kind,
      payload,
      prevHash,
    };
    const hash = sha256Hex(canonicalJSON(base));
    const event = { ...base, hash } as LedgerEvent<K>;
    this.events.push(event);
    return event;
  }
}

export interface VerifyResult {
  ok: boolean;
  events: number;
  /** Recomputed head hash — publish this to anchor the chain externally. */
  head: string;
  problems: {
    seq: number;
    kind: string;
    reason: "bad_hash" | "broken_link" | "bad_seq" | "answer_mismatch" | "truncated";
    detail: string;
  }[];
  /** True iff the concatenation of committed spans equals the run's final answer. */
  answerConsistent: boolean;
}

/**
 * Verify a ledger:
 *  1. every event's hash recomputes exactly (no field was altered);
 *  2. every event links to the prior event's hash (no reorder/insert/delete);
 *  3. sequence numbers are contiguous from 0;
 *  4. the committed spans concatenate to the final answer recorded at run_finished
 *     (defeats a "relink the whole chain then swap the answer" forgery, unless the
 *     forger also re-derives every span — the point of the cross-check).
 *
 * Tamper-evidence is real but *unanchored*: an adversary holding the only copy can
 * recompute a fully self-consistent chain. Anchoring requires publishing the head
 * hash (returned above) or keeping an independent copy — documented, not hidden.
 */
export function verifyLedger(events: LedgerEvent[]): VerifyResult {
  const problems: VerifyResult["problems"] = [];
  let prev = GENESIS_HASH;
  let committed = "";
  let finalAnswer: string | null = null;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.seq !== i) {
      problems.push({ seq: e.seq, kind: e.kind, reason: "bad_seq", detail: `expected seq ${i}` });
    }
    const { hash, ...body } = e;
    const recomputed = sha256Hex(canonicalJSON(body));
    if (recomputed !== hash) {
      problems.push({
        seq: e.seq,
        kind: e.kind,
        reason: "bad_hash",
        detail: `stored ${hash.slice(0, 12)}… != recomputed ${recomputed.slice(0, 12)}…`,
      });
    }
    if (e.prevHash !== prev) {
      problems.push({
        seq: e.seq,
        kind: e.kind,
        reason: "broken_link",
        detail: `prevHash ${e.prevHash.slice(0, 12)}… != actual ${prev.slice(0, 12)}…`,
      });
    }
    prev = e.hash;

    if (e.kind === "span_committed") {
      const p = e.payload as EventPayloadMap["span_committed"];
      if (!p.isStop) committed += p.text;
    }
    if (e.kind === "run_finished") {
      finalAnswer = (e.payload as EventPayloadMap["run_finished"]).finalAnswer;
    }
  }

  // A complete run always ends in run_finished. Without this check, chopping
  // trailing events (including the final-answer binding itself) would still
  // verify — a truncation forgery. An intact chain that just stops early is
  // therefore rejected, not passed vacuously.
  const last = events[events.length - 1];
  if (!last || last.kind !== "run_finished") {
    problems.push({
      seq: last ? last.seq : 0,
      kind: last ? last.kind : "(empty)",
      reason: "truncated",
      detail: last
        ? `ledger ends at "${last.kind}" — a complete run must end with run_finished`
        : "empty ledger",
    });
  }

  let answerConsistent = true;
  if (finalAnswer !== null) {
    answerConsistent = normalize(finalAnswer) === normalize(committed);
    if (!answerConsistent) {
      problems.push({
        seq: events.length - 1,
        kind: "run_finished",
        reason: "answer_mismatch",
        detail: "final answer does not equal the concatenation of committed spans",
      });
    }
  }

  return {
    ok: problems.length === 0,
    events: events.length,
    head: prev,
    problems,
    answerConsistent,
  };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Convenience: recompute the head hash of a serialized ledger (for anchoring). */
export function ledgerHead(events: LedgerEvent[]): string {
  return events.length ? events[events.length - 1].hash : GENESIS_HASH;
}

export { hashOf };
