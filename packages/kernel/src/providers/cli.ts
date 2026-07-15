import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type {
  Objection,
  Provider,
  ScoredCandidate,
  Society,
} from "../types.js";
import { candidateKey } from "../types.js";
import { stableId } from "../hash.js";
import { proposePrompt, revisePrompt } from "../prompt.js";
import {
  asString,
  clamp01,
  extractJSON,
  type PanelClient,
  type ProposeRequest,
  type ProposeResult,
  type ReviseRequest,
  type ReviseResult,
} from "./base.js";

/**
 * Spawns a locally-installed, already-authenticated agent CLI as one panel seat.
 * This is how Tribunal runs a genuinely decorrelated, multi-PROVIDER panel with
 * ZERO new credentials: each seat is a different company's model.
 *
 *   openai     -> `codex exec` (OpenAI, via the ChatGPT-authenticated Codex CLI)
 *   xai        -> `agent -p`   (xAI Grok CLI)
 *   anthropic  -> `claude -p`  (Anthropic Claude Code CLI)
 *
 * Nothing here is simulated: the model text is captured from the child process,
 * the JSON is parsed from it, and the provider/model/latency are ledgered as
 * `provider_call` provenance. If a CLI is missing, unauthenticated, or rate
 * limited, the call throws and the engine records the seat as `error`/`refusal`
 * (it does not invent an answer).
 */

interface CliSpec {
  bin: string;
  buildArgs: (prompt: string) => string[];
  inputMode: "stdin" | "argv";
  model: string;
}

const CLI: Record<string, CliSpec> = {
  openai: {
    bin: "codex",
    buildArgs: () => ["exec", "--skip-git-repo-check", "-"],
    inputMode: "stdin",
    model: "openai/codex-cli",
  },
  xai: {
    // IMPORTANT: "agent" on PATH may be shadowed by another vendor's CLI (both
    // ship an `agent` binary). Resolve the xAI one by its install dir explicitly.
    bin: existsSync(join(homedir(), ".grok/bin/agent")) ? join(homedir(), ".grok/bin/agent") : "agent",
    buildArgs: (p) => ["-p", p],
    inputMode: "argv",
    model: "xai/grok-cli",
  },
  anthropic: {
    // Model is pinned explicitly (operator requirement: never the default alias).
    bin: "claude",
    buildArgs: (p) => [
      "-p",
      p,
      "--max-turns",
      "1",
      "--model",
      process.env.TRIBUNAL_CLAUDE_MODEL ?? "sonnet",
    ],
    inputMode: "argv",
    model: `anthropic/${process.env.TRIBUNAL_CLAUDE_MODEL ?? "sonnet"}`,
  },
  cursor: {
    bin: "cursor-agent",
    buildArgs: (p) =>
      process.env.TRIBUNAL_CURSOR_MODEL
        ? ["-p", p, "--output-format", "text", "--model", process.env.TRIBUNAL_CURSOR_MODEL]
        : ["-p", p, "--output-format", "text"],
    inputMode: "argv",
    model: `cursor/${process.env.TRIBUNAL_CURSOR_MODEL ?? "default"}`,
  },
};

const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const TERMINATE_GRACE_MS = 750;
const TERMINATE_FALLBACK_MS = 2_000;

export interface CliOptions {
  timeoutMs?: number;
  modelLabel?: string;
}

export class CliPanelClient implements PanelClient {
  readonly transport = "cli" as const;
  readonly modelSource = "cli_config" as const;
  readonly model: string;
  private readonly spec: CliSpec;
  private readonly timeoutMs: number;

  constructor(
    readonly seatId: string,
    readonly society: Society,
    readonly provider: Provider,
    opts: CliOptions = {},
  ) {
    const spec = CLI[provider];
    if (!spec) throw new Error(`no CLI adapter for provider ${provider}`);
    this.spec = spec;
    this.model = opts.modelLabel ?? spec.model;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  async propose(req: ProposeRequest): Promise<ProposeResult> {
    const { system, user } = proposePrompt(req.view);
    const prompt = `${system}\n\n${user}`;
    const t0 = Date.now();
    const raw = await this.run(prompt, req.signal);
    const latencyMs = Date.now() - t0;
    const { scored, objections, publicWarrant, rejected, repaired } = parseProposal(
      raw,
      this.society,
      req.view.case.slot.index,
    );
    return {
      repaired,
      usage: {
        provider: this.provider,
        model: this.model,
        modelSource: this.modelSource,
        latencyMs,
        status: "ok",
        transport: "cli",
        tokensOut: approxTokens(raw),
      },
      proposal: {
        seatId: this.seatId,
        society: this.society,
        provider: this.provider,
        spanIndex: req.view.case.slot.index,
        candidates: scored,
        rejectedAlternatives: rejected,
        publicWarrant,
        objections,
      },
    };
  }

  async revise(req: ReviseRequest): Promise<ReviseResult> {
    const { system, user } = revisePrompt(req.view, req.ownRound1, req.feedback, req.guidance);
    const prompt = `${system}\n\n${user}`;
    const t0 = Date.now();
    const raw = await this.run(prompt, req.signal);
    const latencyMs = Date.now() - t0;
    const { final, changed, ansObj, steel, cmm, maintained, repaired } = parseRevision(
      raw,
      this.society,
      req.view.case.slot.index,
      req.ownRound1,
    );
    return {
      repaired,
      usage: {
        provider: this.provider,
        model: this.model,
        modelSource: this.modelSource,
        latencyMs,
        status: "ok",
        transport: "cli",
        tokensOut: approxTokens(raw),
      },
      revision: {
        seatId: this.seatId,
        society: this.society,
        provider: this.provider,
        spanIndex: req.view.case.slot.index,
        final,
        changedFromRound1: changed,
        answerToStrongestObjection: ansObj,
        steelmanOfBestRival: steel,
        changeMyMind: cmm,
        maintainedObjections: maintained,
      },
    };
  }

  private run(prompt: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const args = this.spec.buildArgs(prompt);
    const cwd = mkdtempSync(join(tmpdir(), "tribunal-"));
    return new Promise<string>((resolve, reject) => {
      const child = spawn(this.spec.bin, args, {
        cwd,
        env: { ...process.env, NO_COLOR: "1", CI: "1" },
        stdio: ["pipe", "pipe", "pipe"],
        // A dedicated POSIX process group lets cancellation terminate any
        // descendants spawned by an agent CLI, not only its wrapper process.
        detached: process.platform !== "win32",
      });
      let out = "";
      let err = "";
      let settled = false;
      let terminationError: Error | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
      let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
      let postKillSettleTimer: ReturnType<typeof setTimeout> | undefined;
      let settleFallbackTimer: ReturnType<typeof setTimeout> | undefined;
      let childClosed = false;
      let forceKillSent = false;

      const signalProcessGroup = (killSignal: NodeJS.Signals) => {
        if (!child.pid) return;
        if (process.platform !== "win32") {
          try {
            process.kill(-child.pid, killSignal);
            return;
          } catch (error: any) {
            // ESRCH means the group already exited. For other errors, fall back
            // to the direct child so cancellation still makes best effort.
            if (error?.code === "ESRCH") return;
          }
        }
        try {
          child.kill(killSignal);
        } catch {
          // The bounded fallback below still settles if Node never emits close.
        }
      };
      const processGroupIsAlive = () => {
        if (process.platform === "win32" || !child.pid) return false;
        try {
          process.kill(-child.pid, 0);
          return true;
        } catch (error: any) {
          return error?.code !== "ESRCH";
        }
      };
      const cleanup = () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (forceKillTimer) clearTimeout(forceKillTimer);
        if (postKillSettleTimer) clearTimeout(postKillSettleTimer);
        if (settleFallbackTimer) clearTimeout(settleFallbackTimer);
        signal?.removeEventListener("abort", onAbort);
      };
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const succeed = (value: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const terminate = (error: Error) => {
        if (settled || terminationError) return;
        terminationError = error;
        signalProcessGroup("SIGTERM");
        forceKillTimer = setTimeout(() => {
          forceKillSent = true;
          signalProcessGroup("SIGKILL");
          if (childClosed) {
            postKillSettleTimer = setTimeout(() => fail(error), 50);
          }
        }, TERMINATE_GRACE_MS);
        // Normally `close` settles after every stdio handle closes. Bound that
        // wait so a broken CLI cannot leave the Tribunal run stuck forever.
        settleFallbackTimer = setTimeout(() => fail(error), TERMINATE_FALLBACK_MS);
      };

      const onAbort = () =>
        terminate(
          signal?.reason instanceof Error
            ? signal.reason
            : new DOMException("Run cancelled", "AbortError"),
        );

      child.stdout.on("data", (d) => (out += d.toString()));
      child.stderr.on("data", (d) => (err += d.toString()));
      child.stdin.on("error", (e) => {
        // Killing a CLI can close its stdin while buffered prompt bytes remain.
        // That EPIPE is part of cancellation; outside termination it is a real
        // transport failure and should not become an unhandled stream error.
        if (!terminationError) fail(new Error(`${this.spec.bin} stdin failed: ${e.message}`));
      });
      child.on("error", (e) => {
        fail(new Error(`${this.spec.bin} spawn failed: ${e.message}`));
      });
      child.on("close", (code) => {
        if (settled) return;
        childClosed = true;
        if (terminationError) {
          // The wrapper can close before a descendant that ignored SIGTERM. Keep
          // waiting until the group disappears or the force-kill path runs.
          if (processGroupIsAlive() && !forceKillSent) return;
          if (forceKillSent) {
            postKillSettleTimer = setTimeout(() => fail(terminationError!), 50);
            return;
          }
          fail(terminationError);
          return;
        }
        const clean = out.replace(ANSI, "").trim();
        if (!clean && code !== 0) {
          fail(new Error(`${this.spec.bin} exited ${code}: ${err.slice(0, 200)}`));
          return;
        }
        succeed(clean);
      });

      timeoutTimer = setTimeout(
        () => terminate(new Error(`${this.spec.bin} timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();

      if (!terminationError && this.spec.inputMode === "stdin") {
        child.stdin.write(prompt);
      }
      child.stdin.end();
    });
  }
}

// --- parsing (tolerant; counts repairs for honest scorecard behavior) --------

function parseProposal(raw: string, society: Society, spanIndex: number) {
  let repaired = 0;
  const obj = extractJSON(raw);
  const rawCands: any[] = Array.isArray(obj.candidates) ? obj.candidates : [];
  const scored: ScoredCandidate[] = rawCands.length
    ? rawCands.map((c) => coerceScored(c, () => repaired++))
    : [coerceScored({ isStop: true, warrant: "" }, () => repaired++)];

  const objections: Objection[] = (Array.isArray(obj.objections) ? obj.objections : [])
    .filter((o: any) => o && (o.text || o.targetKey))
    .map((o: any) => ({
      id: stableId("obj", society, asString(o.targetKey), asString(o.text), spanIndex),
      targetKey: asString(o.targetKey) || "<STOP>",
      text: asString(o.text) || "(objection text missing)",
      severity: clamp01(o.severity, 0.5),
      kind: coerceKind(o.kind),
      raisedBy: society,
    }));

  let publicWarrant = asString(obj.publicWarrant);
  if (!publicWarrant) {
    publicWarrant = scored[0]?.warrant || "(no public warrant returned)";
    repaired++;
  }
  const rejected = (Array.isArray(obj.rejectedAlternatives) ? obj.rejectedAlternatives : [])
    .filter((r: any) => r && r.text)
    .map((r: any) => ({ text: asString(r.text), reason: asString(r.reason) }));

  return { scored, objections, publicWarrant, rejected, repaired };
}

function parseRevision(raw: string, society: Society, spanIndex: number, ownR1: ScoredCandidate[]) {
  let repaired = 0;
  const obj = extractJSON(raw);
  const final = coerceScored(obj.final ?? {}, () => repaired++);
  const r1key = ownR1[0] ? candidateKey(ownR1[0].candidate) : "";
  const changed =
    typeof obj.changedFromRound1 === "boolean"
      ? obj.changedFromRound1
      : candidateKey(final.candidate) !== r1key;

  const need = (v: unknown, label: string) => {
    const s = asString(v);
    if (!s) {
      repaired++;
      return `(${label} not returned by model)`;
    }
    return s;
  };

  const maintained: Objection[] = (Array.isArray(obj.maintainedObjections) ? obj.maintainedObjections : [])
    .filter((o: any) => o && (o.text || o.targetKey))
    .map((o: any) => ({
      id: stableId("mobj", society, asString(o.targetKey), asString(o.text), spanIndex),
      targetKey: asString(o.targetKey) || "<STOP>",
      text: asString(o.text) || "(objection text missing)",
      severity: clamp01(o.severity, 0.5),
      kind: coerceKind(o.kind),
      raisedBy: society,
    }));

  return {
    final,
    changed,
    ansObj: need(obj.answerToStrongestObjection, "answerToStrongestObjection"),
    steel: need(obj.steelmanOfBestRival, "steelmanOfBestRival"),
    cmm: need(obj.changeMyMind, "changeMyMind"),
    maintained,
    repaired,
  };
}

function coerceScored(c: any, onRepair: () => void): ScoredCandidate {
  // "Empty iff isStop" (kernel contract): whitespace-only text IS a stop —
  // never a phantom non-stop candidate carrying blank text.
  const text = asString(c.text).trim();
  const isStop = !!c.isStop || text === "";
  let warrant = asString(c.warrant);
  if (!warrant) {
    warrant = "(no warrant returned by model)";
    onRepair();
  }
  return {
    candidate: { text: isStop ? "" : text, isStop },
    confidence: clamp01(c.confidence, 0.6),
    factualityRisk: clamp01(c.factualityRisk, 0.3),
    legalRisk: clamp01(c.legalRisk, 0.2),
    fairnessRisk: clamp01(c.fairnessRisk, 0.2),
    affectedPartyImpact: clamp01(c.affectedPartyImpact, 0.5),
    warrant,
    evidenceRefs: Array.isArray(c.evidenceRefs) ? c.evidenceRefs.map(asString) : [],
  };
}

function coerceKind(k: unknown): Objection["kind"] {
  const s = asString(k);
  const allowed = ["factual", "legal", "policy", "fairness", "user_impact", "cost"];
  return (allowed.includes(s) ? s : "factual") as Objection["kind"];
}

function approxTokens(s: string): number {
  return Math.round(s.length / 4);
}
