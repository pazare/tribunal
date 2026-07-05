import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
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
    bin: "agent",
    buildArgs: (p) => ["-p", p],
    inputMode: "argv",
    model: "xai/grok-cli",
  },
  anthropic: {
    bin: "claude",
    buildArgs: (p) => ["-p", p, "--max-turns", "1"],
    inputMode: "argv",
    model: "anthropic/claude-cli",
  },
};

const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export interface CliOptions {
  timeoutMs?: number;
  modelLabel?: string;
}

export class CliPanelClient implements PanelClient {
  readonly transport = "cli" as const;
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
    const raw = await this.run(prompt);
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
    const raw = await this.run(prompt);
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

  private run(prompt: string): Promise<string> {
    const args = this.spec.buildArgs(prompt);
    const cwd = mkdtempSync(join(tmpdir(), "tribunal-"));
    return new Promise<string>((resolve, reject) => {
      const child = spawn(this.spec.bin, args, {
        cwd,
        env: { ...process.env, NO_COLOR: "1", CI: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`${this.spec.bin} timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      child.stdout.on("data", (d) => (out += d.toString()));
      child.stderr.on("data", (d) => (err += d.toString()));
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(new Error(`${this.spec.bin} spawn failed: ${e.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const clean = out.replace(ANSI, "").trim();
        if (!clean && code !== 0) {
          reject(new Error(`${this.spec.bin} exited ${code}: ${err.slice(0, 200)}`));
          return;
        }
        resolve(clean);
      });

      if (this.spec.inputMode === "stdin") {
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
  const isStop = !!c.isStop || asString(c.text).trim() === "" && !c.text;
  let warrant = asString(c.warrant);
  if (!warrant) {
    warrant = "(no warrant returned by model)";
    onRepair();
  }
  return {
    candidate: { text: isStop ? "" : asString(c.text), isStop },
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
