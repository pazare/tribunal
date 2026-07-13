import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { hashOf } from "../hash.js";
import {
  decodeClaudeCliEnvelope,
  type DecoderClient,
  type DecoderClientRequest,
  type DecoderPrincipalId,
  type DecoderTransportResult,
} from "../decoder.js";
/** Public runtime contract: no deadline and no transcript truncation by default. */
export const DECODER_CLI_RUNTIME_DEFAULTS = {
  timeoutMs: 0,
  maxOutputBytes: 0,
} as const;
const TERMINATE_GRACE_MS = 1_000;
const SETTLE_FALLBACK_MS = 3_000;

export const DECODER_CLIENT_DEFAULTS = {
  codex: { provider: "openai", model: "gpt-5.6-sol", effort: "medium" },
  claude: { provider: "anthropic", model: "claude-opus-4-8", effort: "medium" },
} as const;

export interface DecoderCliClientOptions {
  bin?: string;
  model?: string;
  effort?: "medium";
  timeoutMs?: number;
  maxOutputBytes?: number;
}

interface CliSpec {
  clientId: DecoderPrincipalId;
  provider: "openai" | "anthropic";
  bin: string;
  model: string;
  effort: "medium";
  timeoutMs: number;
  maxOutputBytes: number;
}

interface SpawnReceipt {
  stdout: string;
  stderr: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  status: DecoderTransportResult["status"];
  error?: string;
}

export class DecoderCliClient implements DecoderClient {
  readonly transport = "cli" as const;
  readonly modelSource = "requested" as const;
  readonly clientId: DecoderPrincipalId;
  readonly provider: "openai" | "anthropic";
  readonly requestedModel: string;
  readonly requestedEffort = "medium" as const;
  readonly executable: string;
  private readonly spec: CliSpec;
  private versionPromise?: Promise<string | undefined>;

  constructor(clientId: DecoderPrincipalId, options: DecoderCliClientOptions = {}) {
    const defaults = DECODER_CLIENT_DEFAULTS[clientId];
    this.clientId = clientId;
    this.provider = defaults.provider;
    this.requestedModel = options.model ?? defaults.model;
    this.spec = {
      clientId,
      provider: defaults.provider,
      bin:
        options.bin ??
        (clientId === "codex"
          ? process.env.TRIBUNAL_DECODER_CODEX_BIN ?? "codex"
          : process.env.TRIBUNAL_DECODER_CLAUDE_BIN ?? "claude"),
      model: this.requestedModel,
      effort: options.effort ?? defaults.effort,
      timeoutMs: options.timeoutMs ?? DECODER_CLI_RUNTIME_DEFAULTS.timeoutMs,
      maxOutputBytes: options.maxOutputBytes ?? DECODER_CLI_RUNTIME_DEFAULTS.maxOutputBytes,
    };
    this.executable = this.spec.bin;
  }

  async invoke(request: DecoderClientRequest): Promise<DecoderTransportResult> {
    const workingDir = mkdtempSync(join(tmpdir(), `tribunal-decoder-${this.clientId}-`));
    const schemaPath = join(workingDir, "output-schema.json");
    const schemaJson = JSON.stringify(request.outputSchema);
    writeFileSync(schemaPath, schemaJson, { encoding: "utf8", mode: 0o600 });

    const actualArgs = this.clientId === "codex"
      ? [
          "exec",
          "--ephemeral",
          "--ignore-user-config",
          "--ignore-rules",
          "--skip-git-repo-check",
          "--color",
          "never",
          "--sandbox",
          "read-only",
          "--model",
          this.spec.model,
          "-c",
          'model_reasoning_effort="medium"',
          "-c",
          "mcp_servers={}",
          "--output-schema",
          schemaPath,
          "-",
        ]
      : [
          "-p",
          "--model",
          this.spec.model,
          "--effort",
          "medium",
          "--safe-mode",
          "--no-session-persistence",
          "--prompt-suggestions",
          "false",
          "--tools",
          "",
          "--permission-mode",
          "dontAsk",
          "--output-format",
          "json",
          "--json-schema",
          schemaJson,
        ];
    const safeArgs = this.clientId === "codex"
      ? actualArgs.map((value) => value === schemaPath ? `<output-schema:${hashOf(request.outputSchema).slice(0, 16)}>` : value)
      : actualArgs.map((value) => value === schemaJson ? `<json-schema:${hashOf(request.outputSchema).slice(0, 16)}>` : value);
    const environment = this.clientId === "claude"
      ? {
          ANTHROPIC_SMALL_FAST_MODEL: this.spec.model,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        }
      : undefined;

    try {
      this.versionPromise ??= probeVersion(this.spec.bin);
      const [version, receipt] = await Promise.all([
        this.versionPromise,
        spawnWithReceipt(this.spec.bin, actualArgs, request.prompt, workingDir, {
          signal: request.signal,
          timeoutMs: this.spec.timeoutMs,
          maxOutputBytes: this.spec.maxOutputBytes,
          environment,
        }),
      ]);
      const decoded = this.clientId === "claude"
        ? decodeClaudeCliEnvelope(receipt.stdout)
        : { responseText: receipt.stdout, reportedModel: undefined, reportedModels: undefined };
      const status = receipt.status === "ok" && decoded.responseText.length === 0 ? "error" : receipt.status;
      return {
        responseText: decoded.responseText,
        stdout: receipt.stdout,
        stderr: receipt.stderr,
        command: {
          bin: this.spec.bin,
          args: safeArgs,
          promptTransport: "stdin",
          ...(environment ? { environment } : {}),
        },
        startedAt: receipt.startedAt,
        finishedAt: receipt.finishedAt,
        durationMs: receipt.durationMs,
        exitCode: receipt.exitCode,
        signal: receipt.signal,
        status,
        error:
          status === "error" && !receipt.error
            ? "CLI returned no structured public response"
            : receipt.error,
        reportedModel: decoded.reportedModel,
        reportedModels: decoded.reportedModels,
        cliVersion: version,
      };
    } finally {
      rmSync(workingDir, { recursive: true, force: true });
    }
  }
}

function spawnWithReceipt(
  bin: string,
  args: string[],
  prompt: string,
  cwd: string,
  options: {
    signal?: AbortSignal;
    timeoutMs: number;
    maxOutputBytes: number;
    environment?: Record<string, string>;
  },
): Promise<SpawnReceipt> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");
    let decodersFlushed = false;
    let outputBytes = 0;
    let settled = false;
    let terminalStatus: SpawnReceipt["status"] | undefined;
    let terminalError: string | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    let settleFallback: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(bin, args, {
      cwd,
      env: { ...process.env, NO_COLOR: "1", CI: "1", ...options.environment },
      stdio: ["pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });

    const killGroup = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (process.platform !== "win32") process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        // The process already exited.
      }
    };
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      if (settleFallback) clearTimeout(settleFallback);
      options.signal?.removeEventListener("abort", onAbort);
    };
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null, error?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!decodersFlushed) {
        stdout += stdoutDecoder.end();
        stderr += stderrDecoder.end();
        decodersFlushed = true;
      }
      const finishedAt = Date.now();
      resolve({
        stdout,
        stderr,
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        exitCode,
        signal,
        status: terminalStatus ?? (exitCode === 0 ? "ok" : "error"),
        error: terminalError ?? error ?? (exitCode === 0 ? undefined : `${bin} exited ${exitCode}`),
      });
    };
    const terminate = (status: SpawnReceipt["status"], error: string) => {
      if (settled || terminalStatus) return;
      terminalStatus = status;
      terminalError = error;
      killGroup("SIGTERM");
      forceKill = setTimeout(() => killGroup("SIGKILL"), TERMINATE_GRACE_MS);
      settleFallback = setTimeout(() => finish(null, "SIGKILL", error), SETTLE_FALLBACK_MS);
    };
    const onAbort = () => terminate("cancelled", "decoder run cancelled");
    const capture = (target: "stdout" | "stderr", chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (target === "stdout") stdout += stdoutDecoder.write(chunk);
      else stderr += stderrDecoder.write(chunk);
      if (options.maxOutputBytes > 0 && outputBytes > options.maxOutputBytes) {
        terminate("error", `CLI output exceeded ${options.maxOutputBytes} bytes`);
      }
    };

    child.stdout.on("data", (chunk: Buffer) => capture("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => capture("stderr", chunk));
    child.stdin.on("error", (error) => {
      if (!terminalStatus) terminate("error", `${bin} stdin failed: ${error.message}`);
    });
    child.on("error", (error) => finish(null, null, `${bin} spawn failed: ${error.message}`));
    child.on("close", (code, signal) => {
      // A detached descendant may outlive the group leader's SIGTERM. Ensure
      // the whole process group is gone before sealing a cancellation receipt.
      if (terminalStatus) killGroup("SIGKILL");
      finish(code, signal);
    });
    if (options.timeoutMs > 0) {
      timeout = setTimeout(
        () => terminate("timeout", `${bin} timed out after ${options.timeoutMs}ms`),
        options.timeoutMs,
      );
    }
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) onAbort();
    if (!terminalStatus) child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function probeVersion(bin: string): Promise<string | undefined> {
  const receipt = await spawnWithReceipt(bin, ["--version"], "", tmpdir(), {
    timeoutMs: 8_000,
    maxOutputBytes: 16 * 1024,
  });
  if (receipt.status !== "ok") return undefined;
  return `${receipt.stdout}\n${receipt.stderr}`.trim().split("\n")[0]?.slice(0, 160) || undefined;
}

export function makeCodexDecoderClient(options?: DecoderCliClientOptions): DecoderCliClient {
  return new DecoderCliClient("codex", options);
}

export function makeClaudeDecoderClient(options?: DecoderCliClientOptions): DecoderCliClient {
  return new DecoderCliClient("claude", options);
}

export function makeDefaultDecoderClients(
  options?: DecoderCliClientOptions,
): readonly [DecoderCliClient, DecoderCliClient] {
  // Additive: with no options the kernel default (no wall-clock deadline) is
  // preserved. The local service passes an explicit timeoutMs backstop as
  // operator policy so a hung/unreachable call ends as an invalid run.
  return [makeCodexDecoderClient(options), makeClaudeDecoderClient(options)];
}
