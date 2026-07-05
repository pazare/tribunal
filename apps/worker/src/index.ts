/**
 * Tribunal verify worker — faithful port of packages/kernel/src/ledger.ts verifyLedger().
 * CANONICAL SOURCE: packages/kernel/src/ledger.ts and packages/kernel/src/hash.ts
 * Keep field names and rules in sync when the kernel changes.
 */

export interface Env {}

const GENESIS_HASH = "0".repeat(64);

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) continue;
      out[key] = sortDeep(v);
    }
    return out;
  }
  return value;
}

function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

type ProblemReason = "bad_hash" | "broken_link" | "bad_seq" | "answer_mismatch" | "truncated";

interface VerifyProblem {
  seq: number;
  kind: string;
  reason: ProblemReason;
  detail: string;
}

interface LedgerEvent {
  seq: number;
  runId: string;
  spanIndex: number | null;
  ts: number;
  kind: string;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

interface VerifyResult {
  ok: boolean;
  events: number;
  head: string;
  problems: VerifyProblem[];
  answerConsistent: boolean;
}

async function verifyLedger(events: LedgerEvent[]): Promise<VerifyResult> {
  const problems: VerifyProblem[] = [];
  let prev = GENESIS_HASH;
  let committed = "";
  let finalAnswer: string | null = null;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.seq !== i) {
      problems.push({ seq: e.seq, kind: e.kind, reason: "bad_seq", detail: `expected seq ${i}` });
    }
    const { hash, ...body } = e;
    const recomputed = await sha256Hex(canonicalJSON(body));
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
      const p = e.payload as { isStop?: boolean; text?: string };
      if (!p.isStop) committed += p.text ?? "";
    }
    if (e.kind === "run_finished") {
      finalAnswer = (e.payload as { finalAnswer?: string }).finalAnswer ?? null;
    }
  }

  // Parity with kernel: a complete run must end with run_finished, otherwise
  // tail-truncation (dropping the final-answer binding) would verify.
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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === "POST" && (url.pathname === "/verify" || url.pathname === "/api/verify")) {
      let body: { events?: LedgerEvent[] };
      try {
        body = (await request.json()) as { events?: LedgerEvent[] };
      } catch {
        return json(400, { error: "invalid JSON body" });
      }
      if (!Array.isArray(body.events)) {
        return json(400, { error: "provide events[] array" });
      }
      const verify = await verifyLedger(body.events);
      return json(200, { verify });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json(200, {
        service: "tribunal-verify",
        endpoints: ["POST /verify", "POST /api/verify"],
        note: "Send { events: LedgerEvent[] } — same schema as packages/kernel",
      });
    }

    return json(404, { error: `no route ${request.method} ${url.pathname}` });
  },
};
