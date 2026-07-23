import type {
  FeedbackCandidateSummary,
  Objection,
  PanelistCaseView,
  Proposal,
  Provider,
  Revision,
  SafetyVerdict,
  ScoredCandidate,
  Society,
  UsageRecord,
} from "../types.js";

/**
 * The panel/model boundary. A `PanelClient` is one seat's connection to a real
 * model (via a spawned CLI, an HTTP API, or the deterministic offline stub).
 *
 * The methods correspond to two deliberation rounds plus a dedicated safety gate:
 *   propose()  — blind round-1 (no peer material in the request, by construction)
 *   revise()   — round-2 after controlled feedback
 *   reviewSafety() — candidate-level safety verdict for every eligible finalist
 *
 * Adapters MUST return structured objects. A parser may construct a diagnostic
 * repaired object, but any nonzero repair count is a typed `incomplete` non-vote;
 * it can never enter quorum, safety review, or ratification.
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
  /** True when author identity was withheld; false for the identity-visible control arm. */
  feedbackAnonymized?: boolean;
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

export interface SafetyReviewRequest {
  view: PanelistCaseView;
  candidate: ScoredCandidate;
  /** The safety seat's public objections from its immediately prior revision. */
  maintainedObjections: Objection[];
  seed: number;
  signal?: AbortSignal;
}

export interface SafetyReviewResult {
  verdict: SafetyVerdict;
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
  /** Dedicated candidate-level safety decision; every eligible finalist is reviewed. */
  reviewSafety(req: SafetyReviewRequest): Promise<SafetyReviewResult>;
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

/**
 * Parse the provider contract literally. Panel adapters use this strict path so
 * prose wrappers, fences, trailing commas, and other repaired JSON never become
 * an eligible vote. The tolerant extractor remains exported for non-voting UI
 * utilities and backwards compatibility.
 */
export function extractStrictJSON(text: string): any {
  if (!text || !text.trim()) throw new Error("empty model output");
  const raw = text.trim();
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("model output must be one JSON object");
  }
  const duplicates = duplicateJsonKeys(raw);
  if (duplicates.length) throw new Error(`model output contains duplicate JSON key(s): ${duplicates.join(", ")}`);
  return value;
}

function duplicateJsonKeys(raw: string): string[] {
  let index = 0;
  const duplicates: string[] = [];
  const skipWhitespace = () => {
    while (index < raw.length && /[\u0020\u000a\u000d\u0009]/.test(raw[index])) index++;
  };
  const readString = (): string => {
    const start = index++;
    while (index < raw.length) {
      if (raw[index] === '"') {
        index++;
        return JSON.parse(raw.slice(start, index)) as string;
      }
      index += raw[index] === "\\" ? (raw[index + 1] === "u" ? 6 : 2) : 1;
    }
    throw new Error("unterminated JSON string");
  };
  const parseValue = (path: string): void => {
    skipWhitespace();
    if (raw[index] === "{") {
      index++;
      skipWhitespace();
      const keys = new Set<string>();
      if (raw[index] === "}") { index++; return; }
      for (;;) {
        skipWhitespace();
        const key = readString();
        const child = `${path}.${key}`;
        if (keys.has(key)) duplicates.push(child);
        keys.add(key);
        skipWhitespace();
        index++; // colon; JSON.parse already established valid syntax.
        parseValue(child);
        skipWhitespace();
        if (raw[index] === "}") { index++; return; }
        index++; // comma
      }
    }
    if (raw[index] === "[") {
      index++;
      skipWhitespace();
      if (raw[index] === "]") { index++; return; }
      let item = 0;
      for (;;) {
        parseValue(`${path}[${item++}]`);
        skipWhitespace();
        if (raw[index] === "]") { index++; return; }
        index++;
      }
    }
    if (raw[index] === '"') { readString(); return; }
    while (index < raw.length && !/[\u0020\u000a\u000d\u0009,\]}]/.test(raw[index])) index++;
  };
  parseValue("$");
  return duplicates;
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
