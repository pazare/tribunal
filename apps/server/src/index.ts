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
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  runTribunal,
  verifyLedger,
  buildPanel,
  buildPanelFromProviders,
  CliPanelClient,
  DEFAULT_FLAGS,
  type ControlFlags,
  type HumanIntervention,
  type LedgerEvent,
  type PanelMode,
  type Provider,
  type RunConfig,
} from "@tribunal/kernel";
import { computeAuditability, baselineReport } from "@tribunal/scorecard";
import { PACKS } from "@tribunal/packs";

const PORT = Number(process.env.PORT ?? 8787);
const RUNS_DIR = resolve(process.cwd(), process.env.TRIBUNAL_RUNS_DIR ?? "runs");
mkdirSync(RUNS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Run registry: live runs stream; finished runs replay.
// ---------------------------------------------------------------------------

interface LiveRun {
  runId: string;
  packId: string;
  mode: PanelMode;
  status: "running" | "finished" | "error";
  startedAt: number;
  events: LedgerEvent[];
  subscribers: Set<ServerResponse>;
  pendingInterventions: HumanIntervention[];
  currentSpan: number;
  error?: string;
}

const runs = new Map<string, LiveRun>();

function loadRecordedRuns(): { runId: string; packId: string; mode: string; recorded: true; label: string }[] {
  const out: any[] = [];
  if (!existsSync(RUNS_DIR)) return out;
  for (const dir of readdirSync(RUNS_DIR)) {
    const metaPath = join(RUNS_DIR, dir, "meta.json");
    const ledgerPath = join(RUNS_DIR, dir, "ledger.json");
    if (existsSync(metaPath) && existsSync(ledgerPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        out.push({ ...meta, recorded: true });
      } catch {
        /* skip corrupt */
      }
    }
  }
  return out;
}

function recordedLedger(runId: string): LedgerEvent[] | null {
  const p = join(RUNS_DIR, runId, "ledger.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

// ---------------------------------------------------------------------------
// Provider health: actually probe the local CLIs (cheap --version / auth files).
// ---------------------------------------------------------------------------

function probeCli(bin: string, args: string[]): { present: boolean; note: string } {
  const r = spawnSync(bin, args, { encoding: "utf8", timeout: 8000 });
  if (r.error) return { present: false, note: (r.error as any).code === "ENOENT" ? "not installed" : String(r.error.message) };
  const out = `${r.stdout}\n${r.stderr}`.trim().split("\n")[0]?.slice(0, 80) ?? "";
  return { present: r.status === 0, note: out };
}

function panelHealth() {
  const grokBin = existsSync(join(homedir(), ".grok/bin/agent"))
    ? join(homedir(), ".grok/bin/agent")
    : "agent";
  const cli = {
    openai: probeCli("codex", ["--version"]),
    xai: probeCli(grokBin, ["--version"]),
    anthropic: probeCli("claude", ["--version"]),
    cursor: probeCli("cursor-agent", ["--version"]),
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

function subscribe(run: LiveRun, res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  for (const e of run.events) sseSend(res, "ledger", e);
  if (run.status !== "running") {
    const fin = run.events.find((e) => e.kind === "run_finished");
    sseSend(res, "status", {
      status: run.status,
      runId: run.runId,
      error: run.error ?? null,
      finalAnswer: fin ? String((fin.payload as any).finalAnswer ?? "") : undefined,
    });
    res.end();
    return;
  }
  run.subscribers.add(res);
  sseSend(res, "status", { status: "running" });
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  res.on("close", () => {
    clearInterval(ping);
    run.subscribers.delete(res);
  });
}

function broadcast(run: LiveRun, event: string, data: unknown) {
  for (const res of run.subscribers) sseSend(res, event, data);
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
}): Promise<{ runId: string } | { error: string }> {
  const pack = PACKS.find((p) => p.id === body.packId);
  if (!pack) return { error: `unknown pack ${body.packId}` };
  const mode: PanelMode = body.mode ?? "offline";

  let seats;
  try {
    // With an explicit provider list, keep ALL SIX societies staffed by
    // round-robining live providers (graceful degradation when a CLI is down).
    seats =
      body.providers?.length && mode !== "offline"
        ? buildPanelFromProviders(body.providers as Provider[], { mode, cliTimeoutMs: 180_000 })
        : buildPanel({ mode, cliTimeoutMs: 180_000 });
  } catch (e: any) {
    return { error: e.message };
  }

  const config: RunConfig = {
    seed: body.seed ?? 7,
    maxSpans: body.maxSpans ?? Math.min(pack.slots.length, 4),
    flags: { ...DEFAULT_FLAGS, ...(body.flags ?? {}) },
    clientView: "answer_plus_summary",
  };

  // Provisional id so subscribers can attach before the first event lands.
  const provisionalId = `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const live: LiveRun = {
    runId: provisionalId,
    packId: pack.id,
    mode,
    status: "running",
    startedAt: Date.now(),
    events: [],
    subscribers: new Set(),
    pendingInterventions: [],
    currentSpan: 0,
  };
  runs.set(provisionalId, live);

  (async () => {
    try {
      const result = await runTribunal({
        pack,
        config,
        seats,
        clock: mode === "offline" ? "logical" : "wall",
        onEvent: (e) => {
          live.events.push(e);
          if (e.spanIndex != null) live.currentSpan = e.spanIndex;
          broadcast(live, "ledger", e);
        },
        pullHumanInterventions: (spanIndex) => {
          const take = live.pendingInterventions.filter(
            (h) => h.spanIndex === spanIndex || h.spanIndex < 0,
          );
          live.pendingInterventions = live.pendingInterventions.filter((h) => !take.includes(h));
          return take.map((h) => ({ ...h, spanIndex }));
        },
      });
      live.runId = result.runId;
      runs.set(result.runId, live);
      live.status = "finished";
      persistRun(live, result.events);
      broadcast(live, "status", {
        status: "finished",
        runId: result.runId,
        finalAnswer: result.finalAnswer,
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
  const dir = join(RUNS_DIR, live.runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "ledger.json"), JSON.stringify(events, null, 1));
  const verify = verifyLedger(events);
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
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function json(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

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
          slots: p.slots.map((s) => ({ index: s.index, label: s.label })),
          constraints: p.constraints,
          evidence: p.evidence,
          documents: p.documents,
        })),
      );
    }

    // ---- panel health -------------------------------------------------------
    if (req.method === "GET" && path === "/api/panel") {
      if (url.searchParams.get("probe") === "1") {
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
              const r = await client.propose({ view, seed: 1 });
              return {
                provider: p,
                live: true,
                latencyMs: Date.now() - t0,
                note: `responded with ${r.proposal.candidates.length} candidate(s)`,
              };
            } catch (e: any) {
              return { provider: p, live: false, latencyMs: Date.now() - t0, note: String(e.message).slice(0, 160) };
            }
          }),
        );
        return json(res, 200, { ...panelHealth(), probes: results });
      }
      return json(res, 200, panelHealth());
    }

    // ---- runs ----------------------------------------------------------------
    if (req.method === "GET" && path === "/api/runs") {
      const liveList = [...new Set(runs.values())].map((r) => ({
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

    const evMatch = path.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (req.method === "GET" && evMatch) {
      const id = evMatch[1];
      const live = runs.get(id);
      if (live) return subscribe(live, res);
      const rec = recordedLedger(id);
      if (rec) {
        // Replay a recorded (real) run over SSE with a small pacing delay so the
        // UI can animate it. Clearly labeled via the "replay" status.
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
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
      if (live) return json(res, 200, { runId: id, events: live.events, status: live.status });
      const rec = recordedLedger(id);
      if (rec) return json(res, 200, { runId: id, events: rec, status: "recorded" });
      return json(res, 404, { error: "unknown run" });
    }

    const intMatch = path.match(/^\/api\/runs\/([^/]+)\/intervene$/);
    if (req.method === "POST" && intMatch) {
      const live = runs.get(intMatch[1]);
      if (!live || live.status !== "running") return json(res, 400, { error: "run is not live" });
      const body = await readBody(req);
      const h: HumanIntervention = {
        spanIndex: typeof body.spanIndex === "number" ? body.spanIndex : -1,
        actor: String(body.actor ?? "Human auditor"),
        kind: ["objection", "veto", "question", "affirm"].includes(body.kind) ? body.kind : "objection",
        channel: body.channel === "voice" ? "voice" : "typed",
        text: String(body.text ?? ""),
        targetKey: body.targetKey ? String(body.targetKey) : undefined,
      };
      live.pendingInterventions.push(h);
      return json(res, 200, { queued: true, willApplyAtSpan: h.spanIndex < 0 ? live.currentSpan : h.spanIndex });
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
      const webDist = resolve(process.cwd(), "apps/web/dist");
      const file = path === "/" ? "/index.html" : path;
      const full = join(webDist, file);
      if (existsSync(full) && !full.includes("..")) {
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
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`tribunal api listening on http://localhost:${PORT}`);
  console.log(`packs: ${PACKS.map((p) => p.id).join(", ")}`);
  console.log(`runs dir: ${RUNS_DIR}`);
});
