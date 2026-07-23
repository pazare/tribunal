import { canonicalJSON, sha256Hex, hashOf } from "./hash.js";
import { verifyLedgerStructure } from "./ledger-structure.js";
import type { LedgerProblem } from "./ledger-structure.js";
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
  problems: LedgerProblem[];
  /** True iff the concatenation of committed spans equals the run's final answer. */
  answerConsistent: boolean;
}

/**
 * Verify a ledger:
 *  1. every event's hash recomputes exactly (no field was altered);
 *  2. every event links to the prior event's hash (no reorder/insert/delete);
 *  3. sequence numbers are contiguous from 0;
 *  4. exact schemas and the protocol state machine hold, including run/span
 *     binding, quorum, safety/veto/dissent coverage, phase ordering, and one
 *     terminal event; and
 *  5. committed spans concatenate exactly to the answer at run_finished.
 *
 * Tamper-evidence is real but *unanchored*: an adversary holding the only copy can
 * recompute a fully self-consistent chain. Anchoring requires publishing the head
 * hash (returned above) or keeping an independent copy — documented, not hidden.
 */
export function verifyLedger(events: LedgerEvent[]): VerifyResult {
  const problems: VerifyResult["problems"] = [];
  let prev = GENESIS_HASH;

  for (let i = 0; i < events.length; i++) {
    const e = events[i] as LedgerEvent | undefined;
    if (!e || typeof e !== "object") continue;
    const { hash, ...body } = e;
    const recomputed = sha256Hex(canonicalJSON(body));
    if (recomputed !== hash) {
      problems.push({
        seq: Number.isInteger(e.seq) ? e.seq : i,
        kind: typeof e.kind === "string" ? e.kind : "(invalid)",
        reason: "bad_hash",
        detail: `stored ${typeof hash === "string" ? hash.slice(0, 12) : "(invalid)"}… != recomputed ${recomputed.slice(0, 12)}…`,
      });
    }
    if (e.prevHash !== prev) {
      problems.push({
        seq: Number.isInteger(e.seq) ? e.seq : i,
        kind: typeof e.kind === "string" ? e.kind : "(invalid)",
        reason: "broken_link",
        detail: `prevHash ${typeof e.prevHash === "string" ? e.prevHash.slice(0, 12) : "(invalid)"}… != actual ${prev.slice(0, 12)}…`,
      });
    }
    if (e.kind === "proposals_revealed" && e.payload && typeof e.payload === "object") {
      const proposals = Array.isArray((e.payload as any).proposals) ? (e.payload as any).proposals : [];
      const checks = Array.isArray((e.payload as any).hashChecks) ? (e.payload as any).hashChecks : [];
      for (const proposal of proposals) {
        const check = checks.find((item: any) => item?.seatId === proposal?.seatId);
        const actual = hashOf(proposal);
        if (!check || check.recomputed !== actual) {
          problems.push({
            seq: Number.isInteger(e.seq) ? e.seq : i,
            kind: e.kind,
            reason: "invalid_payload",
            detail: `revealed proposal hash does not recompute for ${String(proposal?.seatId ?? "(unknown seat)")}`,
          });
        }
      }
    }
    prev = typeof e.hash === "string" ? e.hash : "";
  }

  const structure = verifyLedgerStructure(events);
  problems.push(...structure.problems);

  return {
    ok: problems.length === 0,
    events: events.length,
    head: prev,
    problems,
    answerConsistent: structure.answerConsistent,
  };
}

/** Convenience: recompute the head hash of a serialized ledger (for anchoring). */
export function ledgerHead(events: LedgerEvent[]): string {
  return events.length ? events[events.length - 1].hash : GENESIS_HASH;
}

export { hashOf };
