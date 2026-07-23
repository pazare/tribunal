/** Tribunal verify worker — WebCrypto hash checks plus the canonical protocol verifier. */

import {
  verifyLedgerStructure,
  type LedgerProblem,
} from "../../../packages/kernel/src/ledger-structure.js";

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
  problems: LedgerProblem[];
  answerConsistent: boolean;
}

async function verifyLedger(events: LedgerEvent[]): Promise<VerifyResult> {
  const problems: LedgerProblem[] = [];
  let prev = GENESIS_HASH;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e || typeof e !== "object") continue;
    const { hash, ...body } = e;
    const recomputed = await sha256Hex(canonicalJSON(body));
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
        const actual = await sha256Hex(canonicalJSON(proposal));
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

  const structure = verifyLedgerStructure(events as unknown[]);
  problems.push(...structure.problems);

  return {
    ok: problems.length === 0,
    events: events.length,
    head: prev,
    problems,
    answerConsistent: structure.answerConsistent,
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
