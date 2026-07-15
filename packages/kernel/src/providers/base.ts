import type {
  FeedbackCandidateSummary,
  PanelistCaseView,
  Proposal,
  Provider,
  Revision,
  ScoredCandidate,
  Society,
  UsageRecord,
} from "../types.js";

/**
 * The panel/model boundary. A `PanelClient` is one seat's connection to a real
 * model (via a spawned CLI, an HTTP API, or the deterministic offline stub).
 *
 * The two methods correspond to the two live rounds:
 *   propose()  — blind round-1 (no peer material in the request, by construction)
 *   revise()   — round-2 after anonymized Delphi feedback
 *
 * Adapters MUST return structured objects. When a model returns malformed or
 * partial JSON, adapters may coerce/repair — but they MUST report how many fields
 * were repaired via `usage`-adjacent counters (the engine records this, and the
 * scorecard fails the "public warrant" / "revision answers objection" items if a
 * run was kept alive by back-filling empty rationale). Honesty over green checks.
 */
export interface ProposeRequest {
  view: PanelistCaseView;
  seed: number;
  /** Cancels an in-flight provider call when the operator stops the run. */
  signal?: AbortSignal;
}

export interface ReviseRequest {
  view: PanelistCaseView;
  ownRound1: ScoredCandidate[];
  /** Anonymized feedback in this recipient's (position-bias-controlled) order. */
  feedback: FeedbackCandidateSummary[];
  guidance: string;
  seed: number;
  /** Cancels an in-flight provider call when the operator stops the run. */
  signal?: AbortSignal;
}

export interface ProposeResult {
  proposal: Proposal;
  usage: UsageRecord;
  repaired: number; // count of fields the adapter had to synthesize/repair
}

export interface ReviseResult {
  revision: Revision;
  usage: UsageRecord;
  repaired: number;
}

export interface PanelClient {
  readonly provider: Provider;
  readonly model: string;
  readonly modelSource?: UsageRecord["modelSource"];
  readonly transport: "cli" | "http" | "offline";
  readonly seatId: string;
  readonly society: Society;
  propose(req: ProposeRequest): Promise<ProposeResult>;
  revise(req: ReviseRequest): Promise<ReviseResult>;
}

/**
 * Extract a single JSON object from arbitrary model text. Handles ```json fences,
 * leading/trailing prose, and picks the LAST balanced {...} block (models often
 * restate the schema first, then emit the real answer last).
 */
export function extractJSON(text: string): any {
  if (!text) throw new Error("empty model output");
  // Prefer a fenced block if present.
  const fence = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1].trim());
  const candidates: string[] = [];
  for (const f of fence.reverse()) candidates.push(f);
  candidates.push(text);

  for (const c of candidates) {
    const block = lastBalancedObject(c);
    if (!block) continue;
    try {
      return JSON.parse(block);
    } catch {
      try {
        return JSON.parse(repairJSON(block));
      } catch {
        /* try next candidate */
      }
    }
  }
  throw new Error("no parseable JSON object in model output");
}

function lastBalancedObject(s: string): string | null {
  let end = s.lastIndexOf("}");
  while (end !== -1) {
    let depth = 0;
    for (let i = end; i >= 0; i--) {
      const ch = s[i];
      if (ch === "}") depth++;
      else if (ch === "{") {
        depth--;
        if (depth === 0) return s.slice(i, end + 1);
      }
    }
    end = s.lastIndexOf("}", end - 1);
  }
  return null;
}

function repairJSON(s: string): string {
  // Common model slips: trailing commas, smart quotes, unquoted NaN/Infinity.
  return s
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\bNaN\b/g, "0")
    .replace(/\b-?Infinity\b/g, "0");
}

export function clamp01(x: unknown, fallback = 0.5): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function asString(x: unknown): string {
  if (typeof x === "string") return x;
  if (x == null) return "";
  return String(x);
}
