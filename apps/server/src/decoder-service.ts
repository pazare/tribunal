import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import type { ServerResponse } from "node:http";
import { join } from "node:path";
import {
  runDecoder,
  verifyDecoderLedger,
  type DecoderClient,
  type DecoderEvent,
  type DecoderRunResult,
  type VerifyDecoderResult,
} from "@tribunal/kernel";

export const DECODER_MAX_PROMPT_BYTES = 64 * 1024;
export const DECODER_MIN_ROUNDS = 1;
export const DECODER_DEFAULT_MAX_ROUNDS = 256;
export const DECODER_MAX_ROUNDS = 600;
export const DECODER_SSE_EVENT = "decoder";
export const DECODER_SSE_STATUS_EVENT = "status";

const HEARTBEAT_MS = 15_000;
const VERSION_PROBE_TIMEOUT_MS = 8_000;
const DECODER_ID = /^decoder_[a-z0-9_]+$/;
const LEASE_FILE = ".decoder-service.lease.json";

export type DecoderServiceStatus =
  | "starting"
  | "running"
  | "cancelling"
  | "stopped"
  | "failed"
  | "cancelled"
  | "budget_exhausted";

export interface DecoderStartInput {
  userPrompt: string;
  maxRounds?: number;
}

export interface DecoderStartReceipt {
  runId: string;
  status: "starting";
}

export interface DecoderCancellationReceipt {
  runId: string;
  actor: string;
  reason: string;
  requestedAt: number;
}

export interface DecoderRunSummary {
  runId: string;
  status: DecoderServiceStatus;
  startedAt: number;
  finishedAt?: number;
  maxRounds: number;
  eventCount: number;
  promptPreview: string;
  outputPreview?: string;
  source: "memory" | "recorded";
}

export interface DecoderRunDetail {
  runId: string;
  userPrompt: string;
  maxRounds: number;
  status: DecoderServiceStatus;
  startedAt: number;
  finishedAt?: number;
  events: DecoderEvent[];
  result?: Omit<DecoderRunResult, "events">;
  cancellation?: DecoderCancellationReceipt;
  error?: string;
  source: "memory" | "recorded";
}

export interface DecoderRunList {
  active: DecoderRunSummary[];
  recorded: DecoderRunSummary[];
}

export interface DecoderHealthAgent {
  clientId: "codex" | "claude";
  provider: "openai" | "anthropic";
  binary: string;
  present: boolean;
  version?: string;
  requestedModel: string;
  requestedEffort: "medium";
  transport: "cli";
  modelClaim: "requested_configuration_only";
  note: string;
}

export interface DecoderHealth {
  available: boolean;
  authChecked: false;
  servedModelChecked: false;
  agents: [DecoderHealthAgent, DecoderHealthAgent];
  note: string;
}

export interface DecoderServiceOptions {
  /** Repository-resolved runs directory. Tests can inject an isolated temp dir. */
  runsDir: string;
  /** Kernel-owned factory for the pinned Codex + Claude live CLI tuple. */
  createClients: () => readonly [DecoderClient, DecoderClient];
}

interface MutableDecoderRun {
  runId: string;
  userPrompt: string;
  maxRounds: number;
  status: DecoderServiceStatus;
  startedAt: number;
  finishedAt?: number;
  events: DecoderEvent[];
  result?: DecoderRunResult;
  cancellation?: DecoderCancellationReceipt;
  error?: string;
  abortController: AbortController;
  subscribers: Map<ServerResponse, ReturnType<typeof setInterval>>;
}

interface PersistedDecoderMeta {
  schemaVersion: 1;
  runId: string;
  userPrompt: string;
  maxRounds: number;
  status: DecoderServiceStatus;
  startedAt: number;
  finishedAt?: number;
  eventCount: number;
  result?: Omit<DecoderRunResult, "events">;
  cancellation?: DecoderCancellationReceipt;
  error?: string;
}

interface DecoderLeaseReceipt {
  schemaVersion: 1;
  pid: number;
  token: string;
  acquiredAt: number;
}

interface JournalPrefix {
  events: DecoderEvent[];
  corruptTail: boolean;
}

const TERMINAL_STATUSES = new Set<DecoderServiceStatus>([
  "stopped",
  "failed",
  "cancelled",
  "budget_exhausted",
]);

/** HTTP-aware error intended to pass cleanly through the server's route layer. */
export class DecoderServiceError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DecoderServiceError";
  }
}

/**
 * Local-first service wrapper around the live two-provider decoder kernel.
 *
 * It never constructs an offline client, substitutes a missing provider, or
 * converts a two-provider failure into a one-provider result.
 */
export class DecoderService {
  private readonly runsDir: string;
  private readonly clientFactory: () => readonly [DecoderClient, DecoderClient];
  private readonly runs = new Map<string, MutableDecoderRun>();
  private readonly leasePath: string;
  private readonly leaseToken: string;
  private leaseHeld = false;
  private accepting = true;

  constructor(options: DecoderServiceOptions) {
    if (!options?.runsDir || typeof options.runsDir !== "string") {
      throw new TypeError("DecoderService requires a runsDir");
    }
    if (typeof options.createClients !== "function") {
      throw new TypeError("DecoderService requires a kernel createClients factory");
    }
    this.runsDir = options.runsDir;
    this.clientFactory = options.createClients;
    mkdirSync(this.runsDir, { recursive: true, mode: 0o700 });
    chmodSync(this.runsDir, 0o700);
    this.leasePath = join(this.runsDir, LEASE_FILE);
    this.leaseToken = randomBytes(16).toString("hex");
    this.acquireLease();
    try {
      this.recoverInterruptedRuns();
    } catch (error) {
      this.releaseLease();
      throw error;
    }
  }

  /** Binary/version detection only. This does not spend quota or prove auth/model serving. */
  async health(): Promise<DecoderHealth> {
    const clients = this.createPinnedClients();
    const [codexProbe, claudeProbe] = await Promise.all([
      probeVersion(clients[0].executable ?? "codex", ["--version"]),
      probeVersion(clients[1].executable ?? "claude", ["--version"]),
    ]);
    const agents: [DecoderHealthAgent, DecoderHealthAgent] = [
      healthAgent(clients[0], clients[0].executable ?? "codex", codexProbe),
      healthAgent(clients[1], clients[1].executable ?? "claude", claudeProbe),
    ];
    const available = agents.every((agent) => agent.present);
    return {
      available,
      authChecked: false,
      servedModelChecked: false,
      agents,
      note: available
        ? "Both required CLI binaries are present. Authentication and served-model identity are checked only by an actual decoder run."
        : "The decoder requires both CLI binaries; there is no offline or one-provider fallback.",
    };
  }

  async start(input: unknown): Promise<DecoderStartReceipt> {
    const { userPrompt, maxRounds } = validateStart(input);
    if (!this.accepting) throw new DecoderServiceError(503, "decoder service is shutting down");
    if (this.activeCount() > 0) {
      throw new DecoderServiceError(409, "exactly one two-agent decoder run may be active at a time");
    }
    const health = await this.health();
    const missing = health.agents.filter((agent) => !agent.present).map((agent) => agent.binary);
    if (missing.length) {
      throw new DecoderServiceError(503, `required decoder CLI binaries are unavailable: ${missing.join(", ")}`);
    }
    if (!this.accepting) throw new DecoderServiceError(503, "decoder service is shutting down");
    if (this.activeCount() > 0) {
      throw new DecoderServiceError(409, "exactly one two-agent decoder run may be active at a time");
    }

    const clients = this.createPinnedClients();
    const runId = this.nextRunId();
    const run: MutableDecoderRun = {
      runId,
      userPrompt,
      maxRounds,
      status: "starting",
      startedAt: Date.now(),
      events: [],
      abortController: new AbortController(),
      subscribers: new Map(),
    };
    this.initializePersistence(run);
    this.runs.set(runId, run);

    // Preserve a visible `starting` state and return the subscription id before
    // invoking either quota-bearing provider.
    queueMicrotask(() => void this.execute(run, clients));
    return { runId, status: "starting" };
  }

  list(): DecoderRunList {
    const active = [...this.runs.values()]
      .filter((run) => !TERMINAL_STATUSES.has(run.status))
      .map((run) => summaryFromMemory(run));
    const recorded = this.loadRecordedSummaries().filter((item) => !this.runs.has(item.runId));
    for (const run of this.runs.values()) {
      if (TERMINAL_STATUSES.has(run.status)) recorded.push(summaryFromMemory(run));
    }
    return {
      active: active.sort((a, b) => b.startedAt - a.startedAt),
      recorded: recorded.sort((a, b) => b.startedAt - a.startedAt),
    };
  }

  detail(runId: string): DecoderRunDetail {
    assertDecoderId(runId);
    const live = this.runs.get(runId);
    if (live) return detailFromMemory(live);
    const persisted = this.readPersisted(runId);
    if (!persisted) throw new DecoderServiceError(404, "unknown decoder run");
    return persisted;
  }

  subscribe(runId: string, res: ServerResponse, afterSeq = -1): void {
    assertDecoderId(runId);
    if (!Number.isInteger(afterSeq) || afterSeq < -1) {
      throw new DecoderServiceError(400, "afterSeq must be an integer greater than or equal to -1");
    }
    const run = this.runs.get(runId);
    if (!run) {
      const recorded = this.readPersisted(runId);
      if (!recorded) throw new DecoderServiceError(404, "unknown decoder run");
      openSse(res);
      for (const event of recorded.events) {
        if (event.seq > afterSeq && !sseSend(res, DECODER_SSE_EVENT, event, event.seq)) {
          endResponse(res);
          return;
        }
      }
      if (!sseSend(res, DECODER_SSE_STATUS_EVENT, statusPayload(recorded))) {
        endResponse(res);
        return;
      }
      res.end();
      return;
    }

    openSse(res);
    for (const event of run.events) {
      if (event.seq > afterSeq && !sseSend(res, DECODER_SSE_EVENT, event, event.seq)) {
        endResponse(res);
        return;
      }
    }
    if (!sseSend(res, DECODER_SSE_STATUS_EVENT, statusPayload(detailFromMemory(run)))) {
      endResponse(res);
      return;
    }
    if (TERMINAL_STATUSES.has(run.status)) {
      res.end();
      return;
    }

    const heartbeat = setInterval(() => {
      if (!res.destroyed && !res.writableEnded && !res.write(": ping\n\n")) {
        this.dropSubscriber(run, res);
      }
    }, HEARTBEAT_MS);
    run.subscribers.set(res, heartbeat);
    const cleanup = () => this.removeSubscriber(run, res);
    res.once("close", cleanup);
    res.once("error", cleanup);
  }

  cancel(runId: string, input: unknown): {
    accepted: true;
    status: "cancelling" | DecoderServiceStatus;
    cancellation: DecoderCancellationReceipt;
  } {
    assertDecoderId(runId);
    const run = this.runs.get(runId);
    if (!run) throw new DecoderServiceError(404, "unknown decoder run");
    if (run.status === "cancelling" && run.cancellation) {
      return { accepted: true, status: "cancelling", cancellation: run.cancellation };
    }
    if (TERMINAL_STATUSES.has(run.status)) {
      if (run.cancellation && run.status === "cancelled") {
        return { accepted: true, status: run.status, cancellation: run.cancellation };
      }
      throw new DecoderServiceError(409, `decoder run is already ${run.status}`);
    }

    const { actor, reason } = validateCancellation(input);
    const cancellation: DecoderCancellationReceipt = {
      runId,
      actor,
      reason,
      requestedAt: Date.now(),
    };
    run.cancellation = cancellation;
    run.status = "cancelling";
    this.broadcastStatus(run);
    run.abortController.abort(cancellation);
    return { accepted: true, status: "cancelling", cancellation };
  }

  verify(input: unknown): VerifyDecoderResult {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new DecoderServiceError(400, "provide {runId} or {events}");
    }
    const body = input as Record<string, unknown>;
    const hasRunId = typeof body.runId === "string";
    const hasEvents = Array.isArray(body.events);
    if (hasRunId === hasEvents) {
      throw new DecoderServiceError(400, "provide exactly one of runId or events");
    }
    const events = hasEvents
      ? (body.events as DecoderEvent[])
      : this.detail(body.runId as string).events;
    return verifyDecoderLedger(events);
  }

  /** Cancel every in-flight decoder run without relabeling cancellation as STOP. */
  shutdown(actor: string, reason: string): DecoderCancellationReceipt[] {
    this.accepting = false;
    const receipts: DecoderCancellationReceipt[] = [];
    for (const run of this.runs.values()) {
      if (TERMINAL_STATUSES.has(run.status)) continue;
      const result = this.cancel(run.runId, { actor, reason });
      receipts.push(result.cancellation);
    }
    if (this.activeCount() === 0) this.releaseLease();
    return receipts;
  }

  activeCount(): number {
    return [...this.runs.values()].filter((run) => !TERMINAL_STATUSES.has(run.status)).length;
  }

  private async execute(
    run: MutableDecoderRun,
    clients: readonly [DecoderClient, DecoderClient],
  ): Promise<void> {
    run.status = run.abortController.signal.aborted ? "cancelling" : "running";
    this.broadcastStatus(run);
    try {
      const result = await runDecoder({
        runId: run.runId,
        userPrompt: run.userPrompt,
        clients,
        maxRounds: run.maxRounds,
        signal: run.abortController.signal,
        onEvent: (event) => this.appendEvent(run, event),
      });
      for (let index = run.events.length; index < result.events.length; index++) {
        this.appendEvent(run, result.events[index]);
      }
      run.result = result;
      run.status = result.status;
      if (result.status === "failed") run.error = result.error;
    } catch (error) {
      run.status = run.abortController.signal.aborted ? "cancelled" : "failed";
      run.error = error instanceof Error ? error.message : String(error);
    }
    run.finishedAt = Date.now();

    let persisted = false;
    try {
      this.persist(run);
      persisted = true;
    } catch (error) {
      run.status = "failed";
      run.error = `decoder persistence failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    this.broadcastStatus(run);
    this.closeSubscribers(run);
    if (persisted) this.runs.delete(run.runId);
    if (!this.accepting && this.activeCount() === 0) this.releaseLease();
  }

  private appendEvent(run: MutableDecoderRun, event: DecoderEvent): void {
    const seq = eventSequence(event);
    if (seq == null) throw new Error("decoder event is missing an integer sequence");
    const existing = run.events[seq];
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(event)) {
        throw new Error(`conflicting decoder event at sequence ${seq}`);
      }
      return;
    }
    if (seq !== run.events.length) {
      throw new Error(`noncontiguous decoder event sequence ${seq}; expected ${run.events.length}`);
    }
    const dir = join(this.runsDir, run.runId);
    appendFileSync(join(dir, "decoder.jsonl"), `${JSON.stringify(event)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    run.events.push(event);
    for (const res of run.subscribers.keys()) {
      try {
        if (!sseSend(res, DECODER_SSE_EVENT, event, event.seq)) {
          this.dropSubscriber(run, res);
        }
      } catch {
        this.dropSubscriber(run, res);
      }
    }
  }

  private broadcastStatus(run: MutableDecoderRun): void {
    const payload = statusPayload(detailFromMemory(run));
    for (const res of run.subscribers.keys()) {
      try {
        if (!sseSend(res, DECODER_SSE_STATUS_EVENT, payload)) {
          this.dropSubscriber(run, res);
        }
      } catch {
        this.dropSubscriber(run, res);
      }
    }
  }

  private closeSubscribers(run: MutableDecoderRun): void {
    for (const res of [...run.subscribers.keys()]) {
      this.removeSubscriber(run, res);
      if (!res.writableEnded) res.end();
    }
  }

  private removeSubscriber(run: MutableDecoderRun, res: ServerResponse): void {
    const heartbeat = run.subscribers.get(res);
    if (heartbeat) clearInterval(heartbeat);
    run.subscribers.delete(res);
  }

  private dropSubscriber(run: MutableDecoderRun, res: ServerResponse): void {
    this.removeSubscriber(run, res);
    endResponse(res);
  }

  private persist(run: MutableDecoderRun): void {
    if (!run.finishedAt || !TERMINAL_STATUSES.has(run.status)) return;
    const dir = join(this.runsDir, run.runId);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
    const result = run.result ? omitEvents(run.result) : undefined;
    const meta: PersistedDecoderMeta = {
      schemaVersion: 1,
      runId: run.runId,
      userPrompt: run.userPrompt,
      maxRounds: run.maxRounds,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      eventCount: run.events.length,
      ...(result ? { result } : {}),
      ...(run.cancellation ? { cancellation: run.cancellation } : {}),
      ...(run.error ? { error: run.error } : {}),
    };
    // Deliberately avoid meta.json/ledger.json: the existing Tribunal loader
    // keys on those filenames and must never present decoder transcripts as packs.
    writeJsonAtomic(join(dir, "decoder.json"), run.events);
    writeJsonAtomic(join(dir, "decoder-meta.json"), meta);
  }

  private initializePersistence(run: MutableDecoderRun): void {
    const dir = join(this.runsDir, run.runId);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
    writeFileSync(join(dir, "decoder.jsonl"), "", { encoding: "utf8", mode: 0o600 });
    const meta: PersistedDecoderMeta = {
      schemaVersion: 1,
      runId: run.runId,
      userPrompt: run.userPrompt,
      maxRounds: run.maxRounds,
      status: run.status,
      startedAt: run.startedAt,
      eventCount: 0,
    };
    writeJsonAtomic(join(dir, "decoder-meta.json"), meta);
  }

  private recoverInterruptedRuns(): void {
    for (const entry of readdirSync(this.runsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !DECODER_ID.test(entry.name)) continue;
      const dir = join(this.runsDir, entry.name);
      secureRunArtifacts(dir);
      const metaPath = join(dir, "decoder-meta.json");
      const journalPath = join(dir, "decoder.jsonl");
      if (!existsSync(metaPath) || !existsSync(journalPath)) continue;
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8")) as PersistedDecoderMeta;
        if (meta.schemaVersion !== 1 || meta.runId !== entry.name || TERMINAL_STATUSES.has(meta.status)) {
          continue;
        }
        const journal = readJournalPrefix(journalPath, entry.name);
        const events = journal.events;
        const terminal = !journal.corruptTail && events.at(-1)?.kind === "decoder_finished"
          ? events.at(-1)
          : undefined;
        const payload = terminal?.payload ?? {};
        const recoveredStatus = !journal.corruptTail && TERMINAL_STATUSES.has(payload.status as DecoderServiceStatus)
          ? payload.status as DecoderServiceStatus
          : "failed";
        const recovered: PersistedDecoderMeta = {
          ...meta,
          status: recoveredStatus,
          finishedAt: Date.now(),
          eventCount: events.length,
          ...(terminal
            ? {
                result: {
                  runId: meta.runId,
                  status: recoveredStatus as DecoderRunResult["status"],
                  finalOutput: String(payload.finalOutput ?? ""),
                  committedUnits: Array.isArray(payload.committedUnits) ? payload.committedUnits as any : [],
                  rounds: Number(payload.rounds ?? 0),
                  ...(typeof payload.error === "string" ? { error: payload.error } : {}),
                },
              }
            : {
                error: journal.corruptTail
                  ? `decoder journal ended with a corrupt tail; salvaged ${events.length} complete event(s)`
                  : "server exited before the decoder emitted a terminal receipt",
              }),
        };
        writeJsonAtomic(join(dir, "decoder.json"), events);
        writeJsonAtomic(metaPath, recovered);
      } catch {
        // Leave corrupt recovery artifacts untouched for manual inspection.
      }
    }
  }

  private readPersisted(runId: string): DecoderRunDetail | null {
    const dir = join(this.runsDir, runId);
    const eventsPath = join(dir, "decoder.json");
    const metaPath = join(dir, "decoder-meta.json");
    if (!existsSync(eventsPath) || !existsSync(metaPath)) return null;
    try {
      const events = JSON.parse(readFileSync(eventsPath, "utf8"));
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as PersistedDecoderMeta;
      if (!Array.isArray(events) || meta.runId !== runId || meta.schemaVersion !== 1) return null;
      const result = meta.result;
      return {
        runId,
        userPrompt: meta.userPrompt,
        maxRounds: meta.maxRounds,
        status: meta.status,
        startedAt: meta.startedAt,
        ...(meta.finishedAt ? { finishedAt: meta.finishedAt } : {}),
        events,
        ...(result ? { result } : {}),
        ...(meta.cancellation ? { cancellation: meta.cancellation } : {}),
        ...(meta.error ? { error: meta.error } : {}),
        source: "recorded",
      };
    } catch {
      return null;
    }
  }

  private loadRecordedSummaries(): DecoderRunSummary[] {
    if (!existsSync(this.runsDir)) return [];
    const summaries: DecoderRunSummary[] = [];
    for (const entry of readdirSync(this.runsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !DECODER_ID.test(entry.name)) continue;
      const metaPath = join(this.runsDir, entry.name, "decoder-meta.json");
      if (!existsSync(metaPath)) continue;
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8")) as PersistedDecoderMeta;
        if (meta.schemaVersion !== 1 || meta.runId !== entry.name) continue;
        summaries.push(summaryFromMeta(meta));
      } catch {
        // Skip corrupt metadata without parsing the full transcript.
      }
    }
    return summaries;
  }

  private acquireLease(): void {
    const receipt = {
      schemaVersion: 1,
      pid: process.pid,
      token: this.leaseToken,
      acquiredAt: Date.now(),
    };
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        writeFileSync(this.leasePath, JSON.stringify(receipt), {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
        this.leaseHeld = true;
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") throw error;
      }

      const owner = readLease(this.leasePath);
      if (owner && pidIsAlive(owner.pid)) {
        throw new DecoderServiceError(
          409,
          `decoder runs directory is already leased by process ${owner.pid}`,
        );
      }

      const stalePath = `${this.leasePath}.stale.${process.pid}.${randomBytes(5).toString("hex")}`;
      try {
        renameSync(this.leasePath, stalePath);
        unlinkSync(stalePath);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw error;
      }
    }
    throw new DecoderServiceError(503, "could not acquire the decoder process lease");
  }

  private releaseLease(): void {
    if (!this.leaseHeld) return;
    try {
      const owner = readLease(this.leasePath);
      if (owner?.pid === process.pid && owner.token === this.leaseToken) {
        unlinkSync(this.leasePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    } finally {
      this.leaseHeld = false;
    }
  }

  private createPinnedClients(): readonly [DecoderClient, DecoderClient] {
    const clients = this.clientFactory();
    const [codex, claude] = clients;
    if (
      codex.clientId !== "codex" ||
      codex.provider !== "openai" ||
      codex.transport !== "cli" ||
      codex.requestedModel !== "gpt-5.6-sol" ||
      codex.requestedEffort !== "medium" ||
      claude.clientId !== "claude" ||
      claude.provider !== "anthropic" ||
      claude.transport !== "cli" ||
      claude.requestedModel !== "claude-opus-4-8" ||
      claude.requestedEffort !== "medium"
    ) {
      throw new Error("kernel decoder factories did not return the pinned Codex + Claude CLI pair");
    }
    return clients;
  }

  private nextRunId(): string {
    for (;;) {
      const runId = `decoder_${Date.now().toString(36)}_${randomBytes(8).toString("hex")}`;
      if (!this.runs.has(runId) && !existsSync(join(this.runsDir, runId))) return runId;
    }
  }
}

export function createDecoderService(options: DecoderServiceOptions): DecoderService {
  return new DecoderService(options);
}

function validateStart(input: unknown): { userPrompt: string; maxRounds: number } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DecoderServiceError(400, "decoder start body must be an object");
  }
  const body = input as Record<string, unknown>;
  if (typeof body.userPrompt !== "string" || !body.userPrompt.trim()) {
    throw new DecoderServiceError(400, "userPrompt must be a nonempty string");
  }
  if (Buffer.byteLength(body.userPrompt, "utf8") > DECODER_MAX_PROMPT_BYTES) {
    throw new DecoderServiceError(413, `userPrompt must be at most ${DECODER_MAX_PROMPT_BYTES} UTF-8 bytes`);
  }
  const maxRounds = body.maxRounds ?? DECODER_DEFAULT_MAX_ROUNDS;
  if (
    typeof maxRounds !== "number" ||
    !Number.isInteger(maxRounds) ||
    maxRounds < DECODER_MIN_ROUNDS ||
    maxRounds > DECODER_MAX_ROUNDS
  ) {
    throw new DecoderServiceError(
      400,
      `maxRounds must be an integer from ${DECODER_MIN_ROUNDS} to ${DECODER_MAX_ROUNDS}`,
    );
  }
  return { userPrompt: body.userPrompt, maxRounds };
}

function validateCancellation(input: unknown): { actor: string; reason: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DecoderServiceError(400, "cancellation body must be an object");
  }
  const body = input as Record<string, unknown>;
  const actor = typeof body.actor === "string" ? body.actor.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!actor || actor.length > 120) {
    throw new DecoderServiceError(400, "actor must be 1-120 characters");
  }
  if (!reason || reason.length > 1_000) {
    throw new DecoderServiceError(400, "reason must be 1-1000 characters");
  }
  return { actor, reason };
}

function detailFromMemory(run: MutableDecoderRun): DecoderRunDetail {
  return {
    runId: run.runId,
    userPrompt: run.userPrompt,
    maxRounds: run.maxRounds,
    status: run.status,
    startedAt: run.startedAt,
    ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
    events: run.events.slice(),
    ...(run.result ? { result: omitEvents(run.result) } : {}),
    ...(run.cancellation ? { cancellation: run.cancellation } : {}),
    ...(run.error ? { error: run.error } : {}),
    source: "memory",
  };
}

function summaryFromMemory(run: MutableDecoderRun): DecoderRunSummary {
  return summaryFromDetail(detailFromMemory(run));
}

function summaryFromDetail(detail: DecoderRunDetail): DecoderRunSummary {
  return {
    runId: detail.runId,
    status: detail.status,
    startedAt: detail.startedAt,
    ...(detail.finishedAt ? { finishedAt: detail.finishedAt } : {}),
    maxRounds: detail.maxRounds,
    eventCount: detail.events.length,
    promptPreview: preview(detail.userPrompt),
    ...(detail.result?.finalOutput ? { outputPreview: preview(detail.result.finalOutput) } : {}),
    source: detail.source,
  };
}

function summaryFromMeta(meta: PersistedDecoderMeta): DecoderRunSummary {
  return {
    runId: meta.runId,
    status: meta.status,
    startedAt: meta.startedAt,
    ...(meta.finishedAt ? { finishedAt: meta.finishedAt } : {}),
    maxRounds: meta.maxRounds,
    eventCount: meta.eventCount,
    promptPreview: preview(meta.userPrompt),
    ...(meta.result?.finalOutput ? { outputPreview: preview(meta.result.finalOutput) } : {}),
    source: "recorded",
  };
}

function statusPayload(detail: DecoderRunDetail) {
  return {
    runId: detail.runId,
    status: detail.status,
    ...(detail.result
      ? {
          finalOutput: detail.result.finalOutput,
          rounds: detail.result.rounds,
          error: detail.result.error,
        }
      : {}),
    ...(detail.cancellation ? { cancellation: detail.cancellation } : {}),
    ...(detail.error ? { error: detail.error } : {}),
  };
}

function preview(value: string, length = 180): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > length ? `${oneLine.slice(0, length - 1)}…` : oneLine;
}

function eventSequence(event: DecoderEvent): number | null {
  const seq = (event as unknown as { seq?: unknown }).seq;
  return typeof seq === "number" && Number.isInteger(seq) ? seq : null;
}

function secureRunArtifacts(dir: string): void {
  chmodSync(dir, 0o700);
  for (const filename of ["decoder.jsonl", "decoder.json", "decoder-meta.json"]) {
    const path = join(dir, filename);
    if (existsSync(path)) chmodSync(path, 0o600);
  }
}

function readJournalPrefix(path: string, runId: string): JournalPrefix {
  const raw = readFileSync(path, "utf8");
  const hasUnterminatedTail = raw.length > 0 && !raw.endsWith("\n");
  const lastNewline = raw.lastIndexOf("\n");
  const complete = hasUnterminatedTail
    ? (lastNewline >= 0 ? raw.slice(0, lastNewline + 1) : "")
    : raw;
  const lines = complete.split("\n");
  if (lines.at(-1) === "") lines.pop();

  const events: DecoderEvent[] = [];
  let corruptTail = hasUnterminatedTail;
  for (const line of lines) {
    if (!line) {
      corruptTail = true;
      break;
    }
    try {
      const event = JSON.parse(line) as DecoderEvent;
      if (
        !event ||
        typeof event !== "object" ||
        event.runId !== runId ||
        event.seq !== events.length ||
        typeof event.kind !== "string"
      ) {
        corruptTail = true;
        break;
      }
      events.push(event);
    } catch {
      corruptTail = true;
      break;
    }
  }
  return { events, corruptTail };
}

function readLease(path: string): DecoderLeaseReceipt | undefined {
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as Partial<DecoderLeaseReceipt>;
    if (
      value.schemaVersion !== 1 ||
      !Number.isInteger(value.pid) ||
      Number(value.pid) <= 0 ||
      typeof value.token !== "string" ||
      !value.token ||
      typeof value.acquiredAt !== "number"
    ) return undefined;
    return value as DecoderLeaseReceipt;
  } catch {
    return undefined;
  }
}

function pidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function omitEvents(result: DecoderRunResult): Omit<DecoderRunResult, "events"> {
  const { events: _events, ...rest } = result;
  return rest;
}

function assertDecoderId(runId: string): void {
  if (typeof runId !== "string" || !DECODER_ID.test(runId)) {
    throw new DecoderServiceError(400, "invalid decoder run id");
  }
}

function openSse(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
}

function sseSend(res: ServerResponse, event: string, data: unknown, id?: number): boolean {
  if (res.destroyed || res.writableEnded) return false;
  return res.write(`${id == null ? "" : `id: ${id}\n`}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function endResponse(res: ServerResponse): void {
  if (!res.destroyed && !res.writableEnded) res.end();
}

function writeJsonAtomic(path: string, value: unknown): void {
  const temp = `${path}.${process.pid}.${randomBytes(5).toString("hex")}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(temp, path);
}

interface VersionProbe {
  present: boolean;
  version?: string;
  note: string;
}

function probeVersion(binary: string, args: string[]): Promise<VersionProbe> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let settled = false;
    const finish = (result: VersionProbe) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ present: false, note: "version probe timed out" });
    }, VERSION_PROBE_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => (output += chunk.toString()));
    child.stderr.on("data", (chunk) => (output += chunk.toString()));
    child.once("error", (error: NodeJS.ErrnoException) =>
      finish({
        present: false,
        note: error.code === "ENOENT" ? "binary not installed" : error.message,
      }),
    );
    child.once("close", (code) => {
      const version = output.trim().split("\n")[0]?.slice(0, 200);
      finish({
        present: code === 0,
        ...(version ? { version } : {}),
        note: code === 0 ? "binary version probe succeeded" : `version probe exited ${code}`,
      });
    });
  });
}

function healthAgent(
  client: DecoderClient,
  binary: string,
  probe: VersionProbe,
): DecoderHealthAgent {
  return {
    clientId: client.clientId as "codex" | "claude",
    provider: client.provider as "openai" | "anthropic",
    binary,
    present: probe.present,
    ...(probe.version ? { version: probe.version } : {}),
    requestedModel: client.requestedModel,
    requestedEffort: "medium",
    transport: "cli",
    modelClaim: "requested_configuration_only",
    note: `${probe.note}; this does not prove authentication or the model actually served`,
  };
}
