/**
 * Tribunal API server — plain Node http, no framework. Responsibilities:
 *   - expose packs and panel/provider health (REAL probes, not assumptions),
 *   - start runs (offline | cli | openrouter panels) and stream every ledger
 *     event live over SSE,
 *   - accept human auditor interventions mid-run (typed or voice-transcribed),
 *   - verify any ledger (hash chain + answer cross-check) and score A1–A12,
 *   - persist finished runs to runs/ as replayable, committable artifacts,
 *   - serve recorded runs for instant replay (clearly labeled as recorded).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHARTERS,
  runTribunal,
  verifyLedger,
  buildPanel,
  buildPanelFromProviders,
  CliPanelClient,
  CLI_DEFAULT_ASSIGNMENT,
  DEFAULT_FLAGS,
  DEFAULT_SOCIETIES,
  OPENROUTER_DEFAULT_ASSIGNMENT,
  makeDefaultDecoderClients,
  type ControlFlags,
  type CancellationReceipt,
  type HumanIntervention,
  type LedgerEvent,
  type PanelMode,
  type Provider,
  type RunConfig,
  type Society,
} from "@tribunal/kernel";
import { computeAuditability, baselineReport } from "@tribunal/scorecard";
import { PACKS } from "@tribunal/packs";
import { createDecoderService, DecoderServiceError } from "./decoder-service.js";
import {
  assertDecoderNetworkPolicy,
  decoderOperatorAuthorized,
} from "./decoder-auth.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
// Node 20.12+ can load the documented repo-local .env file without another
// dependency. Older supported Node 20 builds simply keep the export-based path.
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(join(REPO_ROOT, ".env"));
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const PORT = Number(process.env.PORT ?? 8787);
// Local-first by default: this server can spawn locally-authenticated agent
// CLIs and spend API keys, so it must never listen on all interfaces unless
// the operator explicitly opts in (e.g. HOST=0.0.0.0 inside a container).
const HOST = process.env.HOST ?? "127.0.0.1";
const DECODER_OPERATOR_TOKEN = process.env.TRIBUNAL_DECODER_OPERATOR_TOKEN?.trim() || undefined;
assertDecoderNetworkPolicy(HOST, DECODER_OPERATOR_TOKEN);
// Resolve repository assets from this file, not process.cwd(). Workspace npm
// scripts launch with apps/server as cwd; tying paths to cwd made both persisted
// runs and the production web build disappear under that supported entrypoint.
const RUNS_DIR = resolve(REPO_ROOT, process.env.TRIBUNAL_RUNS_DIR ?? "runs");

// The live two-agent explainable decoder (Codex gpt-5.6-sol + Claude Opus 4.8).
// Operator policy (decided by the user over a genuine slow-but-real vs. hung
// call trade-off): latency is free, but a call that never returns must not hang
// the run forever. We apply a generous finite backstop per call so a hung or
// unreachable provider ends as an *invalid run* (status "timeout" -> failed),
// never a fabricated STOP, while a slow-but-real deliberation finishes untouched.
// The kernel default stays deadline-free; this is layered on at the service edge.
const DECODER_CALL_BACKSTOP_MS = Number(process.env.TRIBUNAL_DECODER_TIMEOUT_MS ?? 30 * 60_000);
const decoderService = createDecoderService({
  runsDir: resolve(RUNS_DIR, "decoder"),
  createClients: () => makeDefaultDecoderClients({ timeoutMs: DECODER_CALL_BACKSTOP_MS }),
});
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const CLI_PROVIDERS: Provider[] = ["openai", "xai", "anthropic", "cursor"];
const OPENROUTER_PROVIDERS: Provider[] = [
  "openai", "anthropic", "xai", "google", "microsoft", "nvidia", "meta", "deepseek", "mistral",
];
const OPENROUTER_MODEL_PREFIX: Partial<Record<Provider, string>> = {
  openai: "openai",
  anthropic: "anthropic",
  xai: "x-ai",
  google: "google",
  microsoft: "microsoft",
  nvidia: "nvidia",
  meta: "meta-llama",
  deepseek: "deepseek",
  mistral: "mistralai",
};
const SEED_MIN = 0;
const SEED_MAX = 0xffff_ffff;
const MAX_SPANS_MIN = 1;
const MAX_SPANS_MAX = 64;
mkdirSync(RUNS_DIR, { recursive: true });

/** 4xx errors thrown by handlers; everything else is a 500. */
class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Browser origins allowed to call this API (dev UI + same host). */
function corsOriginFor(req: IncomingMessage): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    const sameHost = Boolean(req.headers.host) && parsed.host === req.headers.host;
    const localHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(parsed.host);
    return ["http:", "https:"].includes(parsed.protocol) && (sameHost || localHost) ? origin : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Run registry: live runs stream; finished runs replay.
// ---------------------------------------------------------------------------

interface LiveRun {
  runId: string;
  packId: string;
  mode: PanelMode;
  status: "running" | "cancelling" | "cancelled" | "finished" | "error";
  startedAt: number;
  events: LedgerEvent[];
  subscribers: Set<ServerResponse>;
  pendingInterventions: HumanIntervention[];
  pulledInterventions: Map<string, HumanIntervention>;
  currentSpan: number;
  maxSpans: number;
  lastInterventionPullSpan: number;
  abortController: AbortController;
  cancelRequestedAt?: number;
  cancellation?: CancellationReceipt;
  error?: string;
}

const runs = new Map<string, LiveRun>();

function loadRecordedRuns(): {
  artifactId: string;
  runId: string;
  packId: string;
  mode: string;
  recorded: true;
  label: string;
}[] {
  const out: any[] = [];
  if (!existsSync(RUNS_DIR)) return out;
  for (const dir of readdirSync(RUNS_DIR)) {
    const metaPath = join(RUNS_DIR, dir, "meta.json");
    const ledgerPath = join(RUNS_DIR, dir, "ledger.json");
    if (existsSync(metaPath) && existsSync(ledgerPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        // artifactId is the unique storage/API key. A collision-safe directory
        // may intentionally contain a ledger whose kernel runId matches an older
        // artifact; exposing only meta.runId made the newer artifact unreachable.
        out.push({ ...meta, artifactId: dir, recorded: true });
      } catch {
        /* skip corrupt */
      }
    }
  }
  return out.sort((a, b) => Number(b.startedAt ?? 0) - Number(a.startedAt ?? 0));
}

function recordedLedger(runId: string): LedgerEvent[] | null {
  const p = join(RUNS_DIR, runId, "ledger.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

// ---------------------------------------------------------------------------
// Provider health: actually probe the local CLIs (cheap --version / auth files).
// ---------------------------------------------------------------------------

function probeCli(bin: string, args: string[]): Promise<{ present: boolean; note: string }> {
  return new Promise((resolveProbe) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let settled = false;
    const finish = (result: { present: boolean; note: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveProbe(result);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ present: false, note: "version probe timed out" });
    }, 8000);
    child.stdout.on("data", (chunk) => (output += chunk.toString()));
    child.stderr.on("data", (chunk) => (output += chunk.toString()));
    child.on("error", (error: any) =>
      finish({ present: false, note: error?.code === "ENOENT" ? "not installed" : String(error.message) }),
    );
    child.on("close", (code) => {
      const note = output.trim().split("\n")[0]?.slice(0, 80) ?? "";
      finish({ present: code === 0, note });
    });
  });
}

async function panelHealth() {
  const grokBin = existsSync(join(homedir(), ".grok/bin/agent"))
    ? join(homedir(), ".grok/bin/agent")
    : "agent";
  const [openai, xai, anthropic, cursor] = await Promise.all([
    probeCli("codex", ["--version"]),
    probeCli(grokBin, ["--version"]),
    probeCli("claude", ["--version"]),
    probeCli("cursor-agent", ["--version"]),
  ]);
  const cli = {
    openai,
    xai,
    anthropic,
    cursor,
  };
  return {
    offline: { available: true, note: "deterministic scripted panel (CI/tests only — labeled, never presented as a model)" },
    cli,
    openrouter: {
      available: Boolean(process.env.OPENROUTER_API_KEY),
      note: process.env.OPENROUTER_API_KEY
        ? "OPENROUTER_API_KEY set — Microsoft/NVIDIA/Meta/DeepSeek/Mistral panel available"
        : "set OPENROUTER_API_KEY to enable the 5-vendor panel",
    },
  };
}

// ---------------------------------------------------------------------------
// SSE plumbing
// ---------------------------------------------------------------------------

function sseSend(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function subscribe(run: LiveRun, res: ServerResponse, paceMs = 0) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  if (run.status === "finished" || run.status === "cancelled" || run.status === "error") {
    const fin = run.events.find((e) => e.kind === "run_finished");
    const done = () => {
      sseSend(res, "status", {
        status: run.status,
        runId: run.runId,
        error: run.error ?? null,
        finalAnswer: fin ? String((fin.payload as any).finalAnswer ?? "") : undefined,
        stoppedBy: fin ? String((fin.payload as any).stoppedBy ?? "") : undefined,
        cancellation: run.cancellation,
      });
      res.end();
    };
    if (paceMs > 0) {
      // Paced playback of a finished run (e.g. an instant offline run) so the
      // client can animate the deliberation instead of receiving one dump.
      let i = 0;
      const timer = setInterval(() => {
        if (i >= run.events.length) {
          clearInterval(timer);
          done();
          return;
        }
        sseSend(res, "ledger", run.events[i++]);
      }, paceMs);
      res.on("close", () => clearInterval(timer));
    } else {
      for (const e of run.events) sseSend(res, "ledger", e);
      done();
    }
    return;
  }
  for (const e of run.events) sseSend(res, "ledger", e);
  run.subscribers.add(res);
  sseSend(res, "status", { status: run.status });
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  res.on("close", () => {
    clearInterval(ping);
    run.subscribers.delete(res);
  });
}

function broadcast(run: LiveRun, event: string, data: unknown) {
  for (const res of run.subscribers) sseSend(res, event, data);
}

function beginCancellation(live: LiveRun, actor: string, reason: string): CancellationReceipt {
  if (live.cancellation) return live.cancellation;
  const unappliedInterventionIds = [...new Set([
    ...live.pendingInterventions.map((item) => item.interventionId),
    ...live.pulledInterventions.keys(),
  ].filter((id): id is string => Boolean(id)))];
  const cancellation: CancellationReceipt = {
    actor,
    reason,
    requestedAt: Date.now(),
    unappliedInterventions: unappliedInterventionIds.length,
    unappliedInterventionIds,
  };
  live.status = "cancelling";
  live.cancelRequestedAt = cancellation.requestedAt;
  live.cancellation = cancellation;
  live.pendingInterventions = [];
  live.pulledInterventions.clear();
  live.abortController.abort(cancellation);
  broadcast(live, "status", { status: "cancelling", cancellation });
  return cancellation;
}

// ---------------------------------------------------------------------------
// Run lifecycle
// ---------------------------------------------------------------------------

async function startRun(body: {
  packId: string;
  mode?: PanelMode;
  seed?: number;
  maxSpans?: number;
  flags?: Partial<ControlFlags>;
  providers?: string[];
  assignment?: Partial<Record<Society, { provider?: string; model?: string }>>;
  clientView?: RunConfig["clientView"];
}): Promise<{ runId: string } | { error: string }> {
  const pack = PACKS.find((p) => p.id === body.packId);
  if (!pack) return { error: `unknown pack ${body.packId}` };
  const mode: PanelMode = body.mode ?? "offline";
  if (!["offline", "cli", "openrouter"].includes(mode)) return { error: `unsupported mode ${String(mode)}` };

  const seed = body.seed ?? 7;
  if (!Number.isInteger(seed) || seed < SEED_MIN || seed > SEED_MAX) {
    return { error: `seed must be an integer from ${SEED_MIN} to ${SEED_MAX}` };
  }
  const maxSpans = body.maxSpans ?? pack.slots.length + 2;
  if (!Number.isInteger(maxSpans) || maxSpans < MAX_SPANS_MIN || maxSpans > MAX_SPANS_MAX) {
    return { error: `maxSpans must be an integer from ${MAX_SPANS_MIN} to ${MAX_SPANS_MAX}` };
  }
  if (body.clientView && !["answer_only", "answer_plus_summary"].includes(body.clientView)) {
    return { error: "clientView must be answer_only or answer_plus_summary" };
  }
  if (body.providers != null && !Array.isArray(body.providers)) {
    return { error: "providers must be an array" };
  }
  const providers = [...new Set(body.providers ?? [])];
  if (providers.some((provider) => typeof provider !== "string")) {
    return { error: "every provider must be a string" };
  }
  if (mode === "cli" && providers.some((provider) => !CLI_PROVIDERS.includes(provider as Provider))) {
    return { error: `CLI providers must be one or more of: ${CLI_PROVIDERS.join(", ")}` };
  }
  if (mode === "openrouter" && providers.length > 0) {
    return { error: "OpenRouter uses the audited six-seat vendor/model assignment; custom pools are not supported by this API" };
  }
  if (mode !== "offline" && body.providers && providers.length === 0) {
    return { error: "select at least one live provider" };
  }
  if (body.assignment != null && (typeof body.assignment !== "object" || Array.isArray(body.assignment))) {
    return { error: "assignment must be an object keyed by society" };
  }
  const assignmentKeys = Object.keys(body.assignment ?? {});
  const unknownSocieties = assignmentKeys.filter((key) => !DEFAULT_SOCIETIES.includes(key as Society));
  if (unknownSocieties.length) return { error: `unknown societies: ${unknownSocieties.join(", ")}` };
  if (assignmentKeys.length) {
    const missingSocieties = DEFAULT_SOCIETIES.filter((society) => !assignmentKeys.includes(society));
    if (missingSocieties.length) {
      return { error: `per-seat assignment must include all six societies; missing: ${missingSocieties.join(", ")}` };
    }
  }
  if (providers.length && assignmentKeys.length) {
    return { error: "provide either providers[] for round-robin seating or assignment{} for per-seat control, not both" };
  }
  if (mode === "offline" && assignmentKeys.length) {
    return { error: "offline mode uses the fixed scripted panel and does not accept seat assignment" };
  }

  const assignment: Partial<Record<Society, { provider: Provider; model?: string }>> = {};
  for (const society of assignmentKeys as Society[]) {
    const raw = body.assignment?.[society];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: `assignment.${society} must be an object` };
    }
    if (typeof raw.provider !== "string") return { error: `assignment.${society}.provider is required` };
    const provider = raw.provider as Provider;
    if (mode === "cli") {
      if (!CLI_PROVIDERS.includes(provider)) {
        return { error: `assignment.${society}.provider must be one of: ${CLI_PROVIDERS.join(", ")}` };
      }
      if (raw.model != null && raw.model !== "") {
        return { error: `assignment.${society}.model cannot override the authenticated ${provider} CLI model` };
      }
      assignment[society] = { provider };
    } else if (mode === "openrouter") {
      if (!OPENROUTER_PROVIDERS.includes(provider)) {
        return { error: `assignment.${society}.provider is not an allowed OpenRouter vendor label` };
      }
      const defaults = OPENROUTER_DEFAULT_ASSIGNMENT[society];
      const model = String(raw.model ?? (provider === defaults.provider ? defaults.model : "")).trim();
      if (!model) return { error: `assignment.${society}.model is required for provider ${provider}` };
      const prefix = OPENROUTER_MODEL_PREFIX[provider];
      if (prefix && !model.startsWith(`${prefix}/`)) {
        return { error: `assignment.${society}.model must use the ${prefix}/ prefix for provider ${provider}` };
      }
      assignment[society] = { provider, model };
    }
  }

  const flags: ControlFlags = { ...DEFAULT_FLAGS };
  if (body.flags != null && (typeof body.flags !== "object" || Array.isArray(body.flags))) {
    return { error: "flags must be an object" };
  }
  const unknownFlags = Object.keys(body.flags ?? {}).filter((key) => !(key in DEFAULT_FLAGS));
  if (unknownFlags.length) return { error: `unknown flags: ${unknownFlags.join(", ")}` };
  for (const key of Object.keys(DEFAULT_FLAGS) as (keyof ControlFlags)[]) {
    const value = body.flags?.[key];
    if (value === undefined) continue;
    if (key === "debateRounds") {
      if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 1) {
        return { error: "flags.debateRounds must be 0 or 1" };
      }
      flags.debateRounds = Number(value);
    } else if (typeof value !== "boolean") {
      return { error: `flags.${key} must be boolean` };
    } else {
      (flags as any)[key] = value;
    }
  }

  let seats;
  try {
    // With an explicit provider list, keep ALL SIX societies staffed by
    // round-robining live providers (graceful degradation when a CLI is down).
    seats =
      assignmentKeys.length && mode !== "offline"
        ? buildPanel({ mode, assignment, cliTimeoutMs: 180_000 })
        : providers.length && mode === "cli"
        ? buildPanelFromProviders(providers as Provider[], { mode, cliTimeoutMs: 180_000 })
        : buildPanel({ mode, cliTimeoutMs: 180_000 });
  } catch (e: any) {
    return { error: e.message };
  }

  const config: RunConfig = {
    seed,
    // +2 leaves room for the completion span (explicit STOP ratification)
    // plus one retry when the completion slot itself commits substantive
    // text instead of STOP (observed on run_b51538e11c68 — A11 miss).
    maxSpans,
    panel: seats.map((seat) => ({
      society: seat.client.society,
      provider: seat.client.provider,
      model: seat.client.model,
      modelSource: seat.client.modelSource,
    })),
    flags,
    clientView: body.clientView ?? "answer_plus_summary",
  };

  // Provisional id so subscribers can attach before the first event lands.
  const provisionalId = `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const abortController = new AbortController();
  const live: LiveRun = {
    runId: provisionalId,
    packId: pack.id,
    mode,
    status: "running",
    startedAt: Date.now(),
    events: [],
    subscribers: new Set(),
    pendingInterventions: [],
    pulledInterventions: new Map(),
    currentSpan: 0,
    maxSpans,
    lastInterventionPullSpan: -1,
    abortController,
  };
  runs.set(provisionalId, live);

  (async () => {
    try {
      const result = await runTribunal({
        pack,
        config,
        seats,
        clock: mode === "offline" ? "logical" : "wall",
        signal: abortController.signal,
        onEvent: (e) => {
          live.events.push(e);
          // Alias the kernel's content-derived runId to this live run from the
          // FIRST event, so clients that switch to it mid-run (SSE reconnects,
          // /intervene, /tampered) resolve while the run is still going.
          if (live.events.length === 1 && e.runId && e.runId !== live.runId) {
            runs.set(e.runId, live);
          }
          if (e.spanIndex != null) live.currentSpan = e.spanIndex;
          if (e.kind === "human_intervention") {
            const interventionId = (e.payload as HumanIntervention).interventionId;
            if (interventionId) live.pulledInterventions.delete(interventionId);
          }
          broadcast(live, "ledger", e);
        },
        pullHumanInterventions: (spanIndex) => {
          live.lastInterventionPullSpan = spanIndex;
          const take = live.pendingInterventions.filter(
            (h) => h.spanIndex === spanIndex || h.spanIndex < 0,
          );
          live.pendingInterventions = live.pendingInterventions.filter((h) => !take.includes(h));
          for (const intervention of take) {
            if (intervention.interventionId) {
              live.pulledInterventions.set(intervention.interventionId, intervention);
            }
          }
          return take.map((h) => ({ ...h, spanIndex }));
        },
        drainHumanInterventions: () => {
          const remaining = [
            ...live.pendingInterventions,
            ...live.pulledInterventions.values(),
          ];
          live.pendingInterventions = [];
          live.pulledInterventions.clear();
          return remaining;
        },
      });
      live.runId = result.runId;
      runs.set(result.runId, live);
      const finished = result.events.at(-1);
      const cancellation =
        finished?.kind === "run_finished" && (finished.payload as any).stoppedBy === "cancelled"
          ? ((finished.payload as any).cancellation as CancellationReceipt | undefined)
          : undefined;
      live.cancellation = cancellation ?? live.cancellation;
      live.status = result.stoppedBy === "cancelled" ? "cancelled" : "finished";
      persistRun(live, result.events);
      broadcast(live, "status", {
        status: live.status,
        runId: result.runId,
        finalAnswer: result.finalAnswer,
        stoppedBy: result.stoppedBy,
        cancellation: live.cancellation,
      });
    } catch (e: any) {
      live.status = "error";
      live.error = e.message;
      broadcast(live, "status", { status: "error", error: e.message });
    } finally {
      for (const res of live.subscribers) res.end();
      live.subscribers.clear();
    }
  })();

  return { runId: provisionalId };
}

function persistRun(live: LiveRun, events: LedgerEvent[]) {
  const verify = verifyLedger(events);
  if (!verify.ok) {
    throw new Error(`refusing to persist an invalid ledger: ${verify.problems.map((p) => p.reason).join(", ")}`);
  }
  const finished = events.at(-1);
  const stoppedBy = finished?.kind === "run_finished" ? (finished.payload as any).stoppedBy : undefined;
  const cancellation = finished?.kind === "run_finished" ? (finished.payload as any).cancellation : undefined;
  let dir = join(RUNS_DIR, live.runId);
  // Never overwrite a different ledger already stored under this id: a
  // committed run is an anchored artifact. (Identical bytes — deterministic
  // offline re-runs — are skipped entirely to avoid meta churn.)
  const existing = join(dir, "ledger.json");
  if (existsSync(existing)) {
    const prev = readFileSync(existing, "utf8");
    const next = JSON.stringify(events, null, 1);
    if (prev === next) return;
    dir = join(RUNS_DIR, `${live.runId}_${Date.now().toString(36)}`);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "ledger.json"), JSON.stringify(events, null, 1));
  const audit = computeAuditability(events);
  writeFileSync(
    join(dir, "meta.json"),
    JSON.stringify(
      {
        runId: live.runId,
        packId: live.packId,
        mode: live.mode,
        startedAt: live.startedAt,
        finishedAt: Date.now(),
        events: events.length,
        head: verify.head,
        verified: verify.ok,
        stoppedBy,
        ...(cancellation ? { cancellation } : {}),
        auditability: `${audit.total}/${audit.outOf}`,
        label: `${live.packId} · ${live.mode} · ${new Date(live.startedAt).toISOString()}`,
      },
      null,
      1,
    ),
  );
  writeFileSync(join(dir, "audit.json"), JSON.stringify(audit, null, 1));
}

// ---------------------------------------------------------------------------
// HTTP router
// ---------------------------------------------------------------------------

async function readBody(req: IncomingMessage): Promise<any> {
  // Requiring application/json means browsers must preflight cross-origin
  // POSTs (no-cors text/plain smuggling can't reach these handlers), and the
  // size cap bounds memory per request.
  const ct = String(req.headers["content-type"] ?? "");
  if (!ct.includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, `body exceeds ${MAX_BODY_BYTES} bytes`);
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "body is not valid JSON");
  }
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS: reflect only allowlisted (local) origins; set once for every route,
  // including SSE. Non-local browser origins get no CORS grant at all.
  const origin = corsOriginFor(req);
  if (req.headers.origin && !origin) {
    return json(res, 403, { error: "browser origin is not allowed" });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Tribunal-Operator-Token",
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") return json(res, 204, {});

  try {
    // ---- packs ------------------------------------------------------------
    if (req.method === "GET" && path === "/api/packs") {
      return json(
        res,
        200,
        PACKS.map((p) => ({
          id: p.id,
          title: p.title,
          domain: p.domain,
          question: p.question,
          tagline: p.tagline ?? "",
          problemStatement: p.problemStatement ?? "",
          trapNote: p.trapNote ?? "",
          slots: p.slots.map((s) => ({
            index: s.index,
            label: s.label,
            instruction: s.instruction,
            riskBands: s.riskBands,
            candidatesHint: s.candidatesHint,
          })),
          constraints: p.constraints,
          evidence: p.evidence,
          documents: p.documents,
        })),
      );
    }

    // ---- capability manifest -----------------------------------------------
    // The operator UI reads this instead of duplicating backend defaults and
    // supported control values. It is intentionally declarative and contains no
    // credentials or secret environment values.
    if (req.method === "GET" && path === "/api/capabilities") {
      return json(res, 200, {
        defaults: {
          seed: 7,
          maxSpansOffset: 2,
          flags: DEFAULT_FLAGS,
          clientView: "answer_plus_summary",
          assignments: {
            cli: Object.fromEntries(
              DEFAULT_SOCIETIES.map((society) => [society, { provider: CLI_DEFAULT_ASSIGNMENT[society] }]),
            ),
            openrouter: OPENROUTER_DEFAULT_ASSIGNMENT,
          },
        },
        limits: {
          seed: { min: SEED_MIN, max: SEED_MAX },
          maxSpans: { min: MAX_SPANS_MIN, max: MAX_SPANS_MAX },
          debateRounds: { min: 0, max: 1 },
        },
        cliProviders: CLI_PROVIDERS,
        openrouterProviders: OPENROUTER_PROVIDERS,
        societies: DEFAULT_SOCIETIES,
        interventions: ["objection", "veto", "question", "affirm"],
        channels: ["typed", "voice"],
        interventionQueue: { listPending: true, removePending: true, receiptIds: true },
        seating: { cliPool: true, exactSixSeat: ["cli", "openrouter"], cliModelOverride: false },
        verification: { runId: true, events: true, targetedTamper: true },
        cancellation: { liveRuns: true, preservesCompleteLedger: true, gracefulShutdown: true },
        charters: Object.values(CHARTERS),
      });
    }

    // ---- panel health -------------------------------------------------------
    if (req.method === "GET" && path === "/api/panel") {
      return json(res, 200, await panelHealth());
    }

    // Real probes can consume provider quota. Keep them behind a JSON POST so a
    // hostile website cannot trigger them with a cross-site image/navigation GET.
    if (req.method === "POST" && path === "/api/panel/probe") {
      await readBody(req);
      const targets: Provider[] = ["openai", "xai", "anthropic", "cursor"];
      const results = await Promise.all(
        targets.map(async (p) => {
          const t0 = Date.now();
          try {
            const client = new CliPanelClient(`probe_${p}`, "concision", p, { timeoutMs: 60_000 });
            // A real, minimal propose() against a truthful micro-case.
            const view = {
              case: {
                runId: "probe",
                packId: "probe",
                title: "Liveness probe",
                domain: "probe",
                question: "Confirm panel liveness.",
                constraints: [],
                evidence: [],
                documents: [
                  { id: "d1", title: "Probe", body: "This is a liveness probe. Propose the span 'LIVE'." },
                ],
                prefix: "",
                slot: {
                  index: 0,
                  label: "the probe span",
                  instruction: "Propose the single word LIVE (or STOP).",
                  riskBands: {},
                  candidatesHint: ["LIVE"],
                },
                ratifiedCommitments: [],
                rejectedAlternatives: [],
                unresolvedDissent: [],
              },
              seatId: `probe_${p}`,
              society: "concision" as const,
              evidence: [],
              memory: [],
            };
            const result = await client.propose({ view, seed: 1 });
            return {
              provider: p,
              live: true,
              latencyMs: Date.now() - t0,
              note: `responded with ${result.proposal.candidates.length} candidate(s)`,
            };
          } catch (error: any) {
            return {
              provider: p,
              live: false,
              latencyMs: Date.now() - t0,
              note: String(error.message).slice(0, 160),
            };
          }
        }),
      );
      return json(res, 200, { ...(await panelHealth()), probes: results });
    }

    // ---- runs ----------------------------------------------------------------
    if (req.method === "GET" && path === "/api/runs") {
      const liveList = [...new Set(runs.values())]
        .filter((r) => r.status === "running" || r.status === "cancelling")
        .map((r) => ({
          runId: r.runId,
          packId: r.packId,
          mode: r.mode,
          status: r.status,
          events: r.events.length,
          recorded: false,
          label: `${r.packId} · ${r.mode} · live`,
        }));
      return json(res, 200, { live: liveList, recorded: loadRecordedRuns() });
    }

    if (req.method === "POST" && path === "/api/run") {
      const body = await readBody(req);
      const out = await startRun(body);
      return json(res, "error" in out ? 400 : 200, out);
    }

    // --- Live explainable decoder (two-agent, one elected surface unit/round) ---
    if (
      (path === "/api/decoder" || path.startsWith("/api/decoder/")) &&
      !decoderOperatorAuthorized(req.headers, DECODER_OPERATOR_TOKEN)
    ) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="tribunal-decoder"');
      return json(res, 401, { error: "decoder operator authorization required" });
    }
    try {
      if (req.method === "GET" && path === "/api/decoder/health") {
        return json(res, 200, { ...(await decoderService.health()), checkedAt: Date.now() });
      }
      if (req.method === "GET" && path === "/api/decoder/runs") {
        return json(res, 200, decoderService.list());
      }
      if (req.method === "POST" && path === "/api/decoder/runs") {
        const body = await readBody(req);
        return json(res, 200, await decoderService.start(body));
      }
      const decEvents = path.match(/^\/api\/decoder\/runs\/([^/]+)\/events$/);
      if (req.method === "GET" && decEvents) {
        const rawAfterSeq = url.searchParams.get("afterSeq");
        const afterSeq = rawAfterSeq == null ? -1 : Number(rawAfterSeq);
        return decoderService.subscribe(decodeURIComponent(decEvents[1]), res, afterSeq);
      }
      const decCancel = path.match(/^\/api\/decoder\/runs\/([^/]+)\/cancel$/);
      if (req.method === "POST" && decCancel) {
        const body = await readBody(req);
        return json(res, 200, decoderService.cancel(decodeURIComponent(decCancel[1]), body));
      }
      const decDetail = path.match(/^\/api\/decoder\/runs\/([^/]+)$/);
      if (req.method === "GET" && decDetail) {
        return json(res, 200, decoderService.detail(decodeURIComponent(decDetail[1])));
      }
      if (req.method === "POST" && path === "/api/decoder/verify") {
        const body = await readBody(req);
        const result = decoderService.verify(body);
        return json(res, 200, { ok: result.ok, verify: result });
      }
    } catch (decoderError) {
      if (decoderError instanceof DecoderServiceError) {
        return json(res, decoderError.statusCode, { error: decoderError.message });
      }
      throw decoderError;
    }

    const evMatch = path.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (req.method === "GET" && evMatch) {
      const id = evMatch[1];
      const live = runs.get(id);
      if (live) return subscribe(live, res, Number(url.searchParams.get("pace") ?? 0));
      const rec = recordedLedger(id);
      if (rec) {
        // Replay a recorded (real) run over SSE with a small pacing delay so the
        // UI can animate it. Clearly labeled via the "replay" status.
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        sseSend(res, "status", { status: "replay", runId: id });
        let i = 0;
        const paceMs = Number(url.searchParams.get("pace") ?? 120);
        const timer = setInterval(() => {
          if (i >= rec.length) {
            sseSend(res, "status", { status: "finished", runId: id });
            clearInterval(timer);
            res.end();
            return;
          }
          sseSend(res, "ledger", rec[i++]);
        }, paceMs);
        res.on("close", () => clearInterval(timer));
        return;
      }
      return json(res, 404, { error: "unknown run" });
    }

    const runMatch = path.match(/^\/api\/runs\/([^/]+)$/);
    if (req.method === "GET" && runMatch) {
      const id = runMatch[1];
      const live = runs.get(id);
      if (live) {
        return json(res, 200, {
          runId: live.runId,
          events: live.events,
          status: live.status,
          error: live.error,
          cancellation: live.cancellation,
        });
      }
      const rec = recordedLedger(id);
      if (rec) return json(res, 200, { runId: rec[0]?.runId ?? id, artifactId: id, events: rec, status: "recorded" });
      return json(res, 404, { error: "unknown run" });
    }

    const cancelMatch = path.match(/^\/api\/runs\/([^/]+)\/cancel$/);
    if (req.method === "POST" && cancelMatch) {
      const live = runs.get(cancelMatch[1]);
      if (!live) return json(res, 404, { error: "unknown run" });
      const body = await readBody(req);
      if (live.status === "finished" || live.status === "error") {
        return json(res, 409, { error: `run is already ${live.status}` });
      }
      if (live.status === "cancelling" || live.status === "cancelled") {
        return json(res, 200, {
          accepted: true,
          status: live.status,
          cancellation: live.cancellation,
        });
      }
      const actor = String(body.actor ?? "Operator").trim();
      const reason = String(body.reason ?? "Stopped from operator console").trim();
      if (!actor || actor.length > 120) return json(res, 400, { error: "actor must be 1–120 characters" });
      if (!reason || reason.length > 1000) return json(res, 400, { error: "reason must be 1–1000 characters" });
      const cancellation = beginCancellation(live, actor, reason);
      return json(res, 202, { accepted: true, status: "cancelling", cancellation });
    }

    const interventionListMatch = path.match(/^\/api\/runs\/([^/]+)\/interventions$/);
    if (req.method === "GET" && interventionListMatch) {
      const live = runs.get(interventionListMatch[1]);
      if (!live) return json(res, 404, { error: "unknown run" });
      return json(res, 200, {
        status: live.status,
        currentSpan: live.currentSpan,
        lastInterventionPullSpan: live.lastInterventionPullSpan,
        pending: live.pendingInterventions,
        processing: [...live.pulledInterventions.values()],
      });
    }

    const interventionCancelMatch = path.match(/^\/api\/runs\/([^/]+)\/interventions\/([^/]+)\/cancel$/);
    if (req.method === "POST" && interventionCancelMatch) {
      const live = runs.get(interventionCancelMatch[1]);
      if (!live) return json(res, 404, { error: "unknown run" });
      await readBody(req);
      if (live.status !== "running") return json(res, 409, { error: "run is not accepting queue changes" });
      const index = live.pendingInterventions.findIndex(
        (item) => item.interventionId === interventionCancelMatch[2],
      );
      if (index < 0) return json(res, 404, { error: "pending intervention not found" });
      const [removed] = live.pendingInterventions.splice(index, 1);
      return json(res, 200, {
        cancelled: true,
        interventionId: removed.interventionId,
        status: "not_applied",
      });
    }

    const intMatch = path.match(/^\/api\/runs\/([^/]+)\/intervene$/);
    if (req.method === "POST" && intMatch) {
      const live = runs.get(intMatch[1]);
      if (!live) return json(res, 404, { error: "unknown run" });
      const body = await readBody(req);
      if (live.status !== "running") return json(res, 409, { error: "run is not live" });
      const text = String(body.text ?? "").trim();
      if (!text) return json(res, 400, { error: "intervention text is required" });
      if (text.length > 5000) return json(res, 400, { error: "intervention text must be at most 5000 characters" });
      const allowedKinds = ["objection", "veto", "question", "affirm"] as const;
      if (!allowedKinds.includes(body.kind)) {
        return json(res, 400, { error: `kind must be one of: ${allowedKinds.join(", ")}` });
      }
      const kind: HumanIntervention["kind"] = body.kind;
      if (!['typed', 'voice'].includes(body.channel)) {
        return json(res, 400, { error: "channel must be typed or voice" });
      }
      const channel: HumanIntervention["channel"] = body.channel;
      const actor = String(body.actor ?? "Human auditor").trim();
      if (!actor || actor.length > 120) return json(res, 400, { error: "actor must be 1–120 characters" });
      const targetKey = body.targetKey == null ? "" : String(body.targetKey).trim();
      if (targetKey.length > 2000) return json(res, 400, { error: "targetKey must be at most 2000 characters" });
      if (kind === "veto" && !targetKey) {
        return json(res, 400, { error: "a veto requires targetKey" });
      }
      const requestedSpan = body.spanIndex ?? -1;
      if (!Number.isInteger(requestedSpan) || requestedSpan < -1) {
        return json(res, 400, { error: "spanIndex must be -1 or a non-negative integer" });
      }
      if (requestedSpan >= live.maxSpans) {
        return json(res, 400, { error: `spanIndex must be below this run's maxSpans (${live.maxSpans})` });
      }
      if (requestedSpan >= 0 && requestedSpan <= live.lastInterventionPullSpan) {
        return json(res, 409, {
          error: `the intervention checkpoint for span ${requestedSpan} has closed; choose the next available checkpoint`,
        });
      }
      const interventionId = `human_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const h: HumanIntervention = {
        interventionId,
        spanIndex: requestedSpan,
        actor,
        kind,
        channel,
        text,
        targetKey: targetKey || undefined,
      };
      live.pendingInterventions.push(h);
      const willApplyAtSpan =
        h.spanIndex < 0 ? Math.max(live.currentSpan, live.lastInterventionPullSpan + 1) : h.spanIndex;
      return json(res, 200, { queued: true, interventionId, willApplyAtSpan });
    }

    // ---- verification + audit --------------------------------------------
    if (req.method === "POST" && path === "/api/verify") {
      const body = await readBody(req);
      let events: LedgerEvent[] | null = null;
      if (Array.isArray(body.events)) events = body.events;
      else if (body.runId) events = runs.get(body.runId)?.events ?? recordedLedger(body.runId);
      if (!events) return json(res, 400, { error: "provide events[] or runId" });
      return json(res, 200, {
        verify: verifyLedger(events),
        audit: computeAuditability(events),
        baseline: baselineReport(),
      });
    }

    const tamperMatch = path.match(/^\/api\/runs\/([^/]+)\/tampered$/);
    if (req.method === "GET" && tamperMatch) {
      const id = tamperMatch[1];
      const events = runs.get(id)?.events ?? recordedLedger(id);
      if (!events) return json(res, 404, { error: "unknown run" });
      const tampered: LedgerEvent[] = structuredClone(events);
      const seqParam = url.searchParams.get("seq");
      const idx = seqParam
        ? Number(seqParam)
        : tampered.findIndex((e) => e.kind === "ratification");
      if (idx < 0 || idx >= tampered.length) return json(res, 400, { error: "bad seq" });
      const target = tampered[idx];
      if (target.kind === "ratification") {
        (target.payload as any).decision.publicReason = "…reason silently rewritten after the fact…";
      } else if (target.kind === "span_committed") {
        (target.payload as any).text = ((target.payload as any).text ?? "") + " [altered]";
      } else {
        (target.payload as any).__tampered = true;
      }
      return json(res, 200, {
        tamperedSeq: idx,
        kind: target.kind,
        verify: verifyLedger(tampered),
      });
    }

    // ---- static web app (production build) --------------------------------
    if (req.method === "GET" && !path.startsWith("/api/")) {
      const webDist = resolve(REPO_ROOT, "apps/web/dist");
      const file = path === "/" ? "/index.html" : path;
      // Containment check on the RESOLVED path (string scanning for ".."
      // runs after URL normalization and proves nothing).
      const full = resolve(webDist, `.${file}`);
      if (full.startsWith(webDist + "/") && existsSync(full)) {
        const ext = full.split(".").pop() ?? "";
        const mime: Record<string, string> = {
          html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml",
          png: "image/png", woff2: "font/woff2", json: "application/json", ico: "image/x-icon",
        };
        res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
        res.end(readFileSync(full));
        return;
      }
      if (existsSync(join(webDist, "index.html"))) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(readFileSync(join(webDist, "index.html")));
        return;
      }
    }

    return json(res, 404, { error: `no route ${req.method} ${path}` });
  } catch (e: any) {
    if (e instanceof HttpError) return json(res, e.status, { error: e.message });
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`tribunal api listening on http://${HOST}:${PORT}`);
  console.log(`packs: ${PACKS.map((p) => p.id).join(", ")}`);
  console.log(`runs dir: ${RUNS_DIR}`);
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close();
  const active = [...new Set(runs.values())].filter(
    (run) => run.status === "running" || run.status === "cancelling",
  );
  decoderService.shutdown("Tribunal server", `${signal} shutdown`);
  for (const run of active) {
    if (run.status === "running") {
      beginCancellation(run, "Tribunal server", `${signal} shutdown`);
    }
  }
  const deadline = Date.now() + 5_000;
  while (
    Date.now() < deadline &&
    (active.some((run) => run.status === "running" || run.status === "cancelling") ||
      decoderService.activeCount() > 0)
  ) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  const incomplete =
    active.some((run) => run.status === "running" || run.status === "cancelling") ||
    decoderService.activeCount() > 0;
  if (incomplete) console.error("shutdown grace expired before every live ledger was sealed");
  process.exit(incomplete ? 1 : 0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
