import { randomBytes, randomUUID } from "node:crypto";
import { canonicalJSON, sha256Hex } from "./hash.js";
import {
  decoderUnitKey,
  decoderUnitText,
  validateDecoderUnit,
  type DecoderUnit,
} from "./surface.js";

export type DecoderPrincipalId = "codex" | "claude";
export type DecoderPhase = "propose" | "revise" | "judge";
export type DecoderRunStatus = "stopped" | "failed" | "cancelled" | "budget_exhausted";

export interface DecoderClientRequest {
  phase: DecoderPhase;
  roundIndex: number;
  attempt: number;
  prompt: string;
  signal?: AbortSignal;
  outputSchema: Record<string, unknown>;
}

export interface DecoderTransportResult {
  responseText: string;
  stdout: string;
  stderr: string;
  command: {
    bin: string;
    args: string[];
    promptTransport: "stdin";
    environment?: Record<string, string>;
  };
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  status: "ok" | "error" | "cancelled" | "timeout";
  error?: string;
  reportedModel?: string;
  reportedModels?: string[];
  cliVersion?: string;
}

export interface DecoderClient {
  clientId: DecoderPrincipalId;
  provider: "openai" | "anthropic";
  requestedModel: string;
  requestedEffort: "medium";
  modelSource: "requested" | "configured" | "provider_reported";
  transport: "cli" | "test";
  executable?: string;
  invoke(request: DecoderClientRequest): Promise<DecoderTransportResult>;
}

export interface DecoderProposal {
  unit: DecoderUnit;
  publicWarrant: string;
}

export interface DecoderRevision extends DecoderProposal {
  critiqueOfPeer: string;
}

export interface DecoderJudge {
  pick: 0 | 1;
  publicWarrant: string;
}

export type DecoderParsedTurn = DecoderProposal | DecoderRevision | DecoderJudge;

export type DecoderEventKind =
  | "decoder_started"
  | "round_started"
  | "tie_committed"
  | "provider_call_started"
  | "provider_attempt"
  | "phase_completed"
  | "unit_selected"
  | "dissent_preserved"
  | "unit_committed"
  | "decoder_finished";

export interface DecoderEvent {
  seq: number;
  runId: string;
  roundIndex: number | null;
  ts: number;
  kind: DecoderEventKind;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface DecoderRunResult {
  runId: string;
  status: DecoderRunStatus;
  finalOutput: string;
  committedUnits: DecoderUnit[];
  rounds: number;
  events: DecoderEvent[];
  error?: string;
}

export interface DecoderTieBreakSample {
  bit: 0 | 1;
  nonce: string;
}

export interface RunDecoderOptions {
  userPrompt: string;
  clients: readonly [DecoderClient, DecoderClient];
  maxRounds: number;
  signal?: AbortSignal;
  runId?: string;
  clock?: "wall" | "logical";
  sampleTieBreak?: (roundIndex: number) => DecoderTieBreakSample;
  onEvent?: (event: DecoderEvent) => void;
}

const GENESIS_HASH = "0".repeat(64);

class DecoderLedger {
  private readonly events: DecoderEvent[] = [];
  private logicalTick = 0;

  constructor(
    readonly runId: string,
    private readonly clock: "wall" | "logical",
    private readonly onEvent?: (event: DecoderEvent) => void,
  ) {}

  get head(): string {
    return this.events.at(-1)?.hash ?? GENESIS_HASH;
  }

  all(): DecoderEvent[] {
    return this.events.slice();
  }

  append(kind: DecoderEventKind, roundIndex: number | null, payload: Record<string, unknown>): DecoderEvent {
    const base = {
      seq: this.events.length,
      runId: this.runId,
      roundIndex,
      ts: this.clock === "logical" ? ++this.logicalTick : Date.now(),
      kind,
      payload,
      prevHash: this.head,
    };
    const event: DecoderEvent = { ...base, hash: sha256Hex(canonicalJSON(base)) };
    this.events.push(event);
    try {
      this.onEvent?.(event);
    } catch {
      // Observers stream a copy of the canonical ledger; they must never be
      // able to truncate or alter the ledger by throwing synchronously.
    }
    return event;
  }
}

interface ParsedAttempt<T extends DecoderParsedTurn> {
  client: DecoderClient;
  parsed: T;
  transport: DecoderTransportResult;
  attempt: number;
}

interface FailedAttempt {
  client: DecoderClient;
  errors: string[];
  transport?: DecoderTransportResult;
  attempt: number;
}

type AttemptResult<T extends DecoderParsedTurn> = ParsedAttempt<T> | FailedAttempt;

function isParsed<T extends DecoderParsedTurn>(value: AttemptResult<T>): value is ParsedAttempt<T> {
  return "parsed" in value;
}

export function decoderOutputSchema(phase: DecoderPhase): Record<string, unknown> {
  const unit = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "text"],
    properties: {
      kind: { type: "string", enum: ["span", "space", "enter", "stop"] },
      text: { type: "string" },
    },
  };
  if (phase === "judge") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["pick", "publicWarrant"],
      properties: {
        pick: { type: "integer", enum: [0, 1] },
        publicWarrant: { type: "string", minLength: 1 },
      },
    };
  }
  const required = phase === "revise"
    ? ["unit", "publicWarrant", "critiqueOfPeer"]
    : ["unit", "publicWarrant"];
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties: {
      unit,
      publicWarrant: { type: "string", minLength: 1 },
      ...(phase === "revise" ? { critiqueOfPeer: { type: "string", minLength: 1 } } : {}),
    },
  };
}

function duplicateJsonKeys(raw: string): string[] {
  let index = 0;
  const duplicates: string[] = [];
  const skipWhitespace = () => {
    while (index < raw.length && /[\u0020\u000a\u000d\u0009]/.test(raw[index])) index++;
  };
  const readString = (): string => {
    const start = index;
    index++;
    while (index < raw.length) {
      if (raw[index] === '"') {
        index++;
        return JSON.parse(raw.slice(start, index)) as string;
      }
      if (raw[index] === "\\") {
        index += raw[index + 1] === "u" ? 6 : 2;
      } else {
        index++;
      }
    }
    throw new Error("unterminated JSON string");
  };
  const parseValue = (path: string): void => {
    skipWhitespace();
    if (raw[index] === "{") {
      index++;
      skipWhitespace();
      const keys = new Set<string>();
      if (raw[index] === "}") {
        index++;
        return;
      }
      for (;;) {
        skipWhitespace();
        const key = readString();
        const childPath = `${path}.${key}`;
        if (keys.has(key)) duplicates.push(childPath);
        keys.add(key);
        skipWhitespace();
        index++; // colon; JSON.parse has already proved syntax.
        parseValue(childPath);
        skipWhitespace();
        if (raw[index] === "}") {
          index++;
          return;
        }
        index++; // comma
      }
    }
    if (raw[index] === "[") {
      index++;
      skipWhitespace();
      if (raw[index] === "]") {
        index++;
        return;
      }
      let item = 0;
      for (;;) {
        parseValue(`${path}[${item++}]`);
        skipWhitespace();
        if (raw[index] === "]") {
          index++;
          return;
        }
        index++; // comma
      }
    }
    if (raw[index] === '"') {
      readString();
      return;
    }
    while (index < raw.length && !/[\u0020\u000a\u000d\u0009,\]}]/.test(raw[index])) index++;
  };
  parseValue("$");
  return duplicates;
}

function strictObject(raw: string): { value?: Record<string, unknown>; errors: string[] } {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { errors: ["response must be one JSON object"] };
    }
    const duplicates = duplicateJsonKeys(raw);
    if (duplicates.length) {
      return { errors: [`response contains duplicate JSON key(s): ${duplicates.join(", ")}`] };
    }
    return { value: value as Record<string, unknown>, errors: [] };
  } catch (error: any) {
    return { errors: [`response is not strict JSON: ${String(error?.message ?? error)}`] };
  }
}

function exactKeys(value: Record<string, unknown>, allowed: string[], required: string[]): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`unexpected field ${key}`);
  }
  for (const key of required) {
    if (!(key in value)) errors.push(`missing field ${key}`);
  }
  return errors;
}

export function parseDecoderTurn(
  phase: DecoderPhase,
  responseText: string,
): { parsed?: DecoderParsedTurn; errors: string[] } {
  const object = strictObject(responseText);
  if (!object.value) return { errors: object.errors };
  const value = object.value;
  if (phase === "judge") {
    const errors = exactKeys(value, ["pick", "publicWarrant"], ["pick", "publicWarrant"]);
    const pick = value.pick;
    const warrant = value.publicWarrant;
    if (pick !== 0 && pick !== 1) errors.push("pick must be 0 or 1");
    if (typeof warrant !== "string" || warrant.trim().length === 0) {
      errors.push("publicWarrant must contain non-whitespace text");
    }
    return errors.length
      ? { errors }
      : { parsed: { pick: pick as 0 | 1, publicWarrant: warrant as string }, errors: [] };
  }

  const allowed = phase === "revise"
    ? ["unit", "publicWarrant", "critiqueOfPeer"]
    : ["unit", "publicWarrant"];
  const errors = exactKeys(value, allowed, allowed);
  const validation = validateDecoderUnit(value.unit);
  errors.push(...validation.errors.map((error) => `unit: ${error}`));
  const warrant = value.publicWarrant;
  if (typeof warrant !== "string" || warrant.trim().length === 0) {
    errors.push("publicWarrant must contain non-whitespace text");
  }
  if (phase === "revise") {
    const critique = value.critiqueOfPeer;
    if (typeof critique !== "string" || critique.trim().length === 0) {
      errors.push("critiqueOfPeer must contain non-whitespace text");
    }
    return errors.length
      ? { errors }
      : {
          parsed: {
            unit: validation.unit!,
            publicWarrant: warrant as string,
            critiqueOfPeer: critique as string,
          },
          errors: [],
        };
  }
  return errors.length
    ? { errors }
    : { parsed: { unit: validation.unit!, publicWarrant: warrant as string }, errors: [] };
}

/**
 * Deterministically extract the public structured response and provider model
 * receipt from Claude Code's JSON envelope. Keeping this pure lets both the
 * live transport and the offline verifier bind parsed decisions to the exact
 * observed stdout bytes.
 */
export function decodeClaudeCliEnvelope(stdout: string): {
  responseText: string;
  reportedModel?: string;
  reportedModels?: string[];
} {
  try {
    const envelope = JSON.parse(stdout) as Record<string, any>;
    const structured = envelope.structured_output ?? envelope.structuredOutput;
    const responseText = structured && typeof structured === "object"
      ? JSON.stringify(structured)
      : typeof envelope.result === "string"
        ? envelope.result
        : stdout;
    const directModel = typeof envelope.model === "string" ? envelope.model : undefined;
    const usageModels = envelope.modelUsage && typeof envelope.modelUsage === "object"
      ? Object.keys(envelope.modelUsage)
      : [];
    return {
      responseText,
      reportedModel: directModel ?? (usageModels.length === 1 ? usageModels[0] : undefined),
      ...(usageModels.length ? { reportedModels: usageModels } : {}),
    };
  } catch {
    return { responseText: stdout };
  }
}

function promptHeader(userPrompt: string, prefix: string, history: unknown[]): string {
  return [
    "You are one of exactly two provider agents in a surface-level explainable decoder.",
    "Return only the requested public JSON object. Do not use tools.",
    "This asks for a public warrant, not private chain-of-thought, system text, or hidden policy.",
    "A unit is exactly one tagged object:",
    '{"kind":"span","text":"one-contiguous-non-whitespace-string"}',
    '{"kind":"space","text":" "}',
    '{"kind":"enter","text":"\\n"}',
    '{"kind":"stop","text":""}',
    "Do not trim, normalize, combine, truncate, or infer a control from a magic word.",
    `USER_PROMPT_JSON=${JSON.stringify(userPrompt)}`,
    `EXACT_PREFIX_JSON=${JSON.stringify(prefix)}`,
    `PRIOR_PUBLIC_HISTORY_JSON=${JSON.stringify(history)}`,
  ].join("\n");
}

export function buildDecoderPrompt(args: {
  phase: DecoderPhase;
  principalId: DecoderPrincipalId;
  userPrompt: string;
  prefix: string;
  history: unknown[];
  proposals?: DecoderProposal[];
  revisions?: DecoderRevision[];
  validationErrors?: string[];
}): string {
  const header = promptHeader(args.userPrompt, args.prefix, args.history);
  const retry = args.validationErrors?.length
    ? `\nYOUR_PREVIOUS_RESPONSE_WAS_INVALID_JSON=${JSON.stringify(args.validationErrors)}\nRetry without silently repairing the prior response.`
    : "";
  if (args.phase === "propose") {
    return `${header}\nYOU_ARE=${args.principalId}\nIndependently propose exactly one next unit and one concise, contradictable public warrant.\nSCHEMA={"unit":{"kind":"span|space|enter|stop","text":"exact"},"publicWarrant":"public reason"}${retry}`;
  }
  if (args.phase === "revise") {
    return `${header}\nYOU_ARE=${args.principalId}\nLABEL_BLINDED_PROPOSALS_JSON=${JSON.stringify(args.proposals ?? [])}\nCritique the rival option and return your final revised unit. You may hold, adopt, or propose a new valid unit.\nSCHEMA={"unit":{"kind":"span|space|enter|stop","text":"exact"},"publicWarrant":"public reason","critiqueOfPeer":"public critique"}${retry}`;
  }
  return `${header}\nYOU_ARE=${args.principalId}\nLABEL_BLINDED_FINALISTS_JSON=${JSON.stringify(args.revisions ?? [])}\nPick finalist 0 or 1. Confidence is not requested and cannot affect selection.\nSCHEMA={"pick":0,"publicWarrant":"public reason"}${retry}`;
}

async function invokeOne<T extends DecoderParsedTurn>(args: {
  client: DecoderClient;
  phase: DecoderPhase;
  roundIndex: number;
  ledger: DecoderLedger;
  buildPrompt: (errors?: string[]) => string;
  signal?: AbortSignal;
}): Promise<AttemptResult<T>> {
  let priorErrors: string[] | undefined;
  let last: FailedAttempt = { client: args.client, errors: ["not attempted"], attempt: 0 };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = args.buildPrompt(priorErrors);
    args.ledger.append("provider_call_started", args.roundIndex, {
      phase: args.phase,
      attempt,
      principalId: args.client.clientId,
      provider: args.client.provider,
      requestedModel: args.client.requestedModel,
      requestedEffort: args.client.requestedEffort,
      modelSource: args.client.modelSource,
      transport: args.client.transport,
      prompt,
    });
    let transport: DecoderTransportResult;
    try {
      transport = await args.client.invoke({
        phase: args.phase,
        roundIndex: args.roundIndex,
        attempt,
        prompt,
        signal: args.signal,
        outputSchema: decoderOutputSchema(args.phase),
      });
    } catch (error: any) {
      const now = Date.now();
      transport = {
        responseText: "",
        stdout: "",
        stderr: "",
        command: { bin: "(client threw before receipt)", args: [], promptTransport: "stdin" },
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        exitCode: null,
        signal: null,
        status: args.signal?.aborted ? "cancelled" : "error",
        error: String(error?.message ?? error),
      };
    }
    let parsed = transport.status === "ok"
      ? parseDecoderTurn(args.phase, transport.responseText)
      : { errors: [transport.error ?? `transport status ${transport.status}`] };
    if (transport.status === "ok") {
      const reportedModels = new Set([
        ...(transport.reportedModels ?? []),
        ...(transport.reportedModel ? [transport.reportedModel] : []),
      ]);
      const mismatches = [...reportedModels].filter(
        (model) => model !== args.client.requestedModel,
      );
      if (mismatches.length) {
        parsed = {
          errors: [
            ...parsed.errors,
            `provider reported unexpected model(s): ${mismatches.join(", ")}`,
          ],
        };
      }
    }
    args.ledger.append("provider_attempt", args.roundIndex, {
      phase: args.phase,
      attempt,
      principalId: args.client.clientId,
      provider: args.client.provider,
      requestedModel: args.client.requestedModel,
      requestedEffort: args.client.requestedEffort,
      reportedModel: transport.reportedModel,
      reportedModels: transport.reportedModels,
      cliVersion: transport.cliVersion,
      prompt,
      command: transport.command,
      stdout: transport.stdout,
      stderr: transport.stderr,
      responseText: transport.responseText,
      status: transport.status,
      exitCode: transport.exitCode,
      signal: transport.signal,
      startedAt: transport.startedAt,
      finishedAt: transport.finishedAt,
      durationMs: transport.durationMs,
      transportError: transport.error,
      validation: { ok: Boolean(parsed.parsed), errors: parsed.errors },
      parsed: parsed.parsed,
    });
    if (parsed.parsed) {
      return { client: args.client, parsed: parsed.parsed as T, transport, attempt };
    }
    last = { client: args.client, errors: parsed.errors, transport, attempt };
    priorErrors = parsed.errors;
    if (transport.status === "cancelled" || args.signal?.aborted) break;
  }
  return last;
}

async function invokePhase<T extends DecoderParsedTurn>(args: {
  clients: readonly [DecoderClient, DecoderClient];
  phase: DecoderPhase;
  roundIndex: number;
  ledger: DecoderLedger;
  buildPrompt: (client: DecoderClient, errors?: string[]) => string;
  signal?: AbortSignal;
}): Promise<readonly [AttemptResult<T>, AttemptResult<T>]> {
  const results = await Promise.all(args.clients.map((client) => invokeOne<T>({
    client,
    phase: args.phase,
    roundIndex: args.roundIndex,
    ledger: args.ledger,
    buildPrompt: (errors) => args.buildPrompt(client, errors),
    signal: args.signal,
  }))) as unknown as readonly [AttemptResult<T>, AttemptResult<T>];
  args.ledger.append("phase_completed", args.roundIndex, {
    phase: args.phase,
    quorum: results.filter(isParsed).length,
    requiredQuorum: 2,
    valid: results.every(isParsed),
    principals: results.map((result) => result.client.clientId),
  });
  return results;
}

function defaultTieBreak(roundIndex: number): DecoderTieBreakSample {
  return { bit: (randomBytes(1)[0] & 1) as 0 | 1, nonce: randomBytes(16).toString("hex") };
}

function tieCommitment(runId: string, roundIndex: number, sample: DecoderTieBreakSample): string {
  return sha256Hex(canonicalJSON({ runId, roundIndex, bit: sample.bit, nonce: sample.nonce }));
}

function terminalError(results: readonly AttemptResult<DecoderParsedTurn>[]): string {
  return results
    .filter((result): result is FailedAttempt => !isParsed(result))
    .map((result) => `${result.client.clientId}: ${result.errors.join("; ")}`)
    .join(" | ");
}

type DecoderSelectionMethod =
  | "revision_consensus"
  | "judge_consensus"
  | "unilateral_stop_overruled"
  | "precommitted_tie_break";

function selectionPublicReason(method: DecoderSelectionMethod): string {
  if (method === "revision_consensus") {
    return "Both provider agents independently revised to the same exact unit.";
  }
  if (method === "judge_consensus") {
    return "Both provider agents selected the same finalist in fresh judge ballots.";
  }
  if (method === "unilateral_stop_overruled") {
    return "A split ballot cannot make STOP unilateral; the non-STOP finalist continues.";
  }
  return "A precommitted coordinator tie bit selected between two non-STOP finalists.";
}

export async function runDecoder(options: RunDecoderOptions): Promise<DecoderRunResult> {
  if (!options.userPrompt.trim()) throw new Error("userPrompt must be nonempty");
  if (!Number.isInteger(options.maxRounds) || options.maxRounds < 1) {
    throw new Error("maxRounds must be a positive integer");
  }
  if (options.clients[0].clientId !== "codex" || options.clients[1].clientId !== "claude") {
    throw new Error("decoder clients must be ordered [codex, claude]");
  }
  const requiredClients = {
    codex: { provider: "openai", model: "gpt-5.6-sol" },
    claude: { provider: "anthropic", model: "claude-opus-4-8" },
  } as const;
  for (const client of options.clients) {
    const required = requiredClients[client.clientId];
    if (
      client.provider !== required.provider ||
      client.requestedModel !== required.model ||
      client.requestedEffort !== "medium"
    ) {
      throw new Error(
        `${client.clientId} must be ${required.provider}/${required.model} at medium effort`,
      );
    }
  }

  const runId = options.runId ?? `decoder_${randomUUID()}`;
  const ledger = new DecoderLedger(runId, options.clock ?? "wall", options.onEvent);
  const committedUnits: DecoderUnit[] = [];
  const publicHistory: unknown[] = [];
  let output = "";
  let status: DecoderRunStatus = "budget_exhausted";
  let error: string | undefined;
  let rounds = 0;
  let cancellationReceipt: Record<string, unknown> | undefined;
  const observeCancellation = (): boolean => {
    if (!options.signal?.aborted) return false;
    status = "cancelled";
    const reason = options.signal.reason;
    if (reason instanceof Error) {
      error = reason.message;
      cancellationReceipt = { reason: reason.message };
    } else if (reason && typeof reason === "object" && !Array.isArray(reason)) {
      const record = reason as Record<string, unknown>;
      error = typeof record.reason === "string" && record.reason ? record.reason : "cancelled";
      cancellationReceipt = {
        ...(typeof record.actor === "string" ? { actor: record.actor } : {}),
        reason: error,
        ...(typeof record.requestedAt === "number" ? { requestedAt: record.requestedAt } : {}),
        ...(typeof record.runId === "string" ? { runId: record.runId } : {}),
      };
    } else {
      error = typeof reason === "string" && reason ? reason : "cancelled";
      cancellationReceipt = { reason: error };
    }
    return true;
  };

  ledger.append("decoder_started", null, {
    userPrompt: options.userPrompt,
    clients: options.clients.map((client) => ({
      principalId: client.clientId,
      provider: client.provider,
      requestedModel: client.requestedModel,
      requestedEffort: client.requestedEffort,
      modelSource: client.modelSource,
      transport: client.transport,
    })),
    config: { maxRounds: options.maxRounds, requiredQuorum: 2, freshDeliberationPerUnit: true },
    transcriptBoundary: "complete observed public CLI I/O; not private chain-of-thought",
  });

  for (let roundIndex = 0; roundIndex < options.maxRounds; roundIndex++) {
    if (observeCancellation()) break;
    let tie: DecoderTieBreakSample;
    try {
      tie = (options.sampleTieBreak ?? defaultTieBreak)(roundIndex);
    } catch (tieError: any) {
      status = "failed";
      error = `tie-break sampling failed: ${String(tieError?.message ?? tieError)}`;
      break;
    }
    if ((tie.bit !== 0 && tie.bit !== 1) || !tie.nonce) {
      status = "failed";
      error = "invalid tie-break sample";
      break;
    }
    rounds++;
    const commitment = tieCommitment(runId, roundIndex, tie);
    ledger.append("round_started", roundIndex, {
      prefixBefore: output,
      requiredQuorum: 2,
      phases: ["propose", "revise", "judge_if_needed"],
    });
    ledger.append("tie_committed", roundIndex, {
      commitment,
      scheme: "coordinator nonce and bit committed before provider calls",
      externalRandomnessProven: false,
    });

    const proposalResults = await invokePhase<DecoderProposal>({
      clients: options.clients,
      phase: "propose",
      roundIndex,
      ledger,
      signal: options.signal,
      buildPrompt: (client, validationErrors) => buildDecoderPrompt({
        phase: "propose",
        principalId: client.clientId,
        userPrompt: options.userPrompt,
        prefix: output,
        history: publicHistory,
        validationErrors,
      }),
    });
    if (observeCancellation()) break;
    if (!proposalResults.every(isParsed)) {
      status = options.signal?.aborted ? "cancelled" : "failed";
      error = terminalError(proposalResults);
      break;
    }
    const proposals = proposalResults.map((result) => (result as ParsedAttempt<DecoderProposal>).parsed);

    const revisionResults = await invokePhase<DecoderRevision>({
      clients: options.clients,
      phase: "revise",
      roundIndex,
      ledger,
      signal: options.signal,
      buildPrompt: (client, validationErrors) => buildDecoderPrompt({
        phase: "revise",
        principalId: client.clientId,
        userPrompt: options.userPrompt,
        prefix: output,
        history: publicHistory,
        proposals,
        validationErrors,
      }),
    });
    if (observeCancellation()) break;
    if (!revisionResults.every(isParsed)) {
      status = options.signal?.aborted ? "cancelled" : "failed";
      error = terminalError(revisionResults);
      break;
    }
    const revisions = revisionResults.map((result) => (result as ParsedAttempt<DecoderRevision>).parsed);
    let selectedIndex: 0 | 1 = 0;
    let method: DecoderSelectionMethod;
    let judgeVotes: DecoderJudge[] = [];
    let tieReveal: Record<string, unknown> | undefined;

    if (decoderUnitKey(revisions[0].unit) === decoderUnitKey(revisions[1].unit)) {
      method = "revision_consensus";
    } else {
      const judgeResults = await invokePhase<DecoderJudge>({
        clients: options.clients,
        phase: "judge",
        roundIndex,
        ledger,
        signal: options.signal,
        buildPrompt: (client, validationErrors) => buildDecoderPrompt({
          phase: "judge",
          principalId: client.clientId,
          userPrompt: options.userPrompt,
          prefix: output,
          history: publicHistory,
          revisions,
          validationErrors,
        }),
      });
      if (observeCancellation()) break;
      if (!judgeResults.every(isParsed)) {
        status = options.signal?.aborted ? "cancelled" : "failed";
        error = terminalError(judgeResults);
        break;
      }
      judgeVotes = judgeResults.map((result) => (result as ParsedAttempt<DecoderJudge>).parsed);
      if (judgeVotes[0].pick === judgeVotes[1].pick) {
        selectedIndex = judgeVotes[0].pick;
        method = "judge_consensus";
      } else {
        const stopIndex = revisions.findIndex((revision) => revision.unit.kind === "stop");
        if (stopIndex >= 0 && revisions[1 - stopIndex].unit.kind !== "stop") {
          selectedIndex = (1 - stopIndex) as 0 | 1;
          method = "unilateral_stop_overruled";
        } else {
          selectedIndex = tie.bit;
          method = "precommitted_tie_break";
          tieReveal = { bit: tie.bit, nonce: tie.nonce, commitment, externalRandomnessProven: false };
        }
      }
    }

    if (observeCancellation()) break;

    const selected = revisions[selectedIndex].unit;
    const losingIndex = (1 - selectedIndex) as 0 | 1;
    ledger.append("unit_selected", roundIndex, {
      method,
      selectedIndex,
      selected,
      finalists: revisions,
      judgeVotes,
      tieReveal,
      publicReason: selectionPublicReason(method),
    });
    if (observeCancellation()) break;
    if (decoderUnitKey(revisions[losingIndex].unit) !== decoderUnitKey(selected)) {
      ledger.append("dissent_preserved", roundIndex, {
        selected,
        losingPrincipal: options.clients[losingIndex].clientId,
        losingRevision: revisions[losingIndex],
        judgeVotes,
      });
    }
    if (observeCancellation()) break;

    const prefixBefore = output;
    if (selected.kind !== "stop") output += decoderUnitText(selected);
    committedUnits.push(selected);
    ledger.append("unit_committed", roundIndex, {
      unit: selected,
      unitKey: decoderUnitKey(selected),
      surfaceText: decoderUnitText(selected),
      prefixBefore,
      prefixAfter: output,
      method,
    });
    publicHistory.push({ roundIndex, proposals, revisions, judgeVotes, selected, method });
    if (selected.kind === "stop") {
      status = "stopped";
      break;
    }
  }

  ledger.append("decoder_finished", null, {
    status,
    finalOutput: output,
    rounds,
    committedUnits,
    partial: status !== "stopped",
    error,
    ...(status === "cancelled" ? { cancellation: cancellationReceipt ?? { reason: error ?? "cancelled" } } : {}),
  });
  return { runId, status, finalOutput: output, committedUnits, rounds, events: ledger.all(), error };
}

export interface VerifyDecoderProblem {
  seq: number;
  kind: string;
  reason: string;
  detail: string;
}

export interface VerifyDecoderResult {
  ok: boolean;
  events: number;
  head: string;
  exactOutputConsistent: boolean;
  problems: VerifyDecoderProblem[];
}

interface VerifyRoundState {
  index: number;
  started: DecoderEvent;
  tie?: DecoderEvent;
  calls: Map<string, DecoderEvent>;
  attempts: Map<string, DecoderEvent>;
  completed: Map<DecoderPhase, DecoderEvent>;
  selected?: DecoderEvent;
  dissent?: DecoderEvent;
  committed?: DecoderEvent;
}

function verifyRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function exactJsonEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalJSON(left) === canonicalJSON(right);
  } catch {
    return false;
  }
}

export function verifyDecoderLedger(events: DecoderEvent[]): VerifyDecoderResult {
  const problems: VerifyDecoderProblem[] = [];
  let previous = GENESIS_HASH;
  let runId: string | undefined;
  let expectedRound = 0;
  let startedCount = 0;
  let terminalCount = 0;
  let currentRound: VerifyRoundState | undefined;
  const rounds = new Map<number, VerifyRoundState>();
  const committedUnits: DecoderUnit[] = [];
  let exactOutput = "";
  let stopSeq: number | null = null;
  let terminalOutput: unknown;
  let terminalStatus: unknown;
  let terminalEvent: DecoderEvent | undefined;
  let startEvent: DecoderEvent | undefined;
  const verifiedHistory: unknown[] = [];
  const rosterTransports = new Map<DecoderPrincipalId, "cli" | "test">();
  const principals = ["codex", "claude"] as const;

  const problem = (event: DecoderEvent | undefined, reason: string, detail: string) => {
    problems.push({ seq: event?.seq ?? 0, kind: event?.kind ?? "(empty)", reason, detail });
  };
  const phaseOfEvent = (event: DecoderEvent): DecoderPhase | undefined => {
    const phase = event.payload.phase;
    return phase === "propose" || phase === "revise" || phase === "judge" ? phase : undefined;
  };
  const principalOf = (event: DecoderEvent): DecoderPrincipalId | undefined => {
    const principal = event.payload.principalId;
    return principal === "codex" || principal === "claude" ? principal : undefined;
  };
  const attemptOf = (event: DecoderEvent): number | undefined => {
    const attempt = event.payload.attempt;
    return attempt === 1 || attempt === 2 ? attempt : undefined;
  };
  const callKey = (phase: DecoderPhase, principal: DecoderPrincipalId, attempt: number) =>
    `${phase}:${principal}:${attempt}`;
  const validParsed = (
    round: VerifyRoundState,
    phase: DecoderPhase,
    principal: DecoderPrincipalId,
  ): unknown => {
    for (const attempt of [2, 1]) {
      const event = round.attempts.get(callKey(phase, principal, attempt));
      const validation = verifyRecord(event?.payload.validation);
      if (event?.payload.status === "ok" && validation.ok === true) return event.payload.parsed;
    }
    return undefined;
  };
  const phaseQuorum = (round: VerifyRoundState, phase: DecoderPhase): number =>
    principals.filter(
      (principal) => validParsed(round, phase, principal) !== undefined,
    ).length;
  const expectedPrompt = (
    round: VerifyRoundState,
    phase: DecoderPhase,
    principal: DecoderPrincipalId,
    attempt: number,
  ): string | undefined => {
    const userPrompt = startEvent?.payload.userPrompt;
    if (typeof userPrompt !== "string") return undefined;
    let validationErrors: string[] | undefined;
    if (attempt === 2) {
      const prior = round.attempts.get(callKey(phase, principal, 1));
      const errors = verifyRecord(prior?.payload.validation).errors;
      if (!Array.isArray(errors) || !errors.every((item) => typeof item === "string")) return undefined;
      validationErrors = errors;
    }
    const proposals = principals.map(
      (id) => validParsed(round, "propose", id),
    ) as DecoderProposal[];
    const revisions = principals.map(
      (id) => validParsed(round, "revise", id),
    ) as DecoderRevision[];
    if (phase === "revise" && proposals.some((item) => item === undefined)) return undefined;
    if (phase === "judge" && revisions.some((item) => item === undefined)) return undefined;
    return buildDecoderPrompt({
      phase,
      principalId: principal,
      userPrompt,
      prefix: String(round.started.payload.prefixBefore ?? ""),
      history: verifiedHistory,
      ...(phase === "revise" ? { proposals } : {}),
      ...(phase === "judge" ? { revisions } : {}),
      validationErrors,
    });
  };

  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (event.seq !== index) problem(event, "bad_seq", `expected ${index}`);
    if (runId == null) runId = event.runId;
    else if (event.runId !== runId) problem(event, "run_id_mismatch", "event belongs to a different run");
    const { hash, ...body } = event;
    const recomputed = sha256Hex(canonicalJSON(body));
    if (hash !== recomputed) problem(event, "bad_hash", "stored hash does not match event body");
    if (event.prevHash !== previous) problem(event, "broken_link", "prevHash does not match prior event");
    previous = hash;

    if (terminalEvent) problem(event, "event_after_terminal", "decoder_finished must be the last event");
    if (stopSeq != null && event.kind !== "decoder_finished") {
      problem(event, "event_after_stop", "only decoder_finished may follow a committed STOP");
    }
    if (
      event.kind !== "decoder_started" &&
      event.kind !== "decoder_finished" &&
      (!Number.isInteger(event.roundIndex) || Number(event.roundIndex) < 0)
    ) {
      problem(event, "bad_round_index", "round event requires a nonnegative integer roundIndex");
    }
    if (
      (event.kind === "decoder_started" || event.kind === "decoder_finished") &&
      event.roundIndex !== null
    ) {
      problem(event, "bad_terminal_round", "start and finish events require roundIndex null");
    }
    if (
      currentRound?.committed &&
      event.kind !== "round_started" &&
      event.kind !== "decoder_finished"
    ) {
      problem(event, "event_after_commit", "a committed round permits only the next round or decoder_finished");
    }

    switch (event.kind) {
      case "decoder_started": {
        startedCount++;
        startEvent ??= event;
        if (index !== 0) problem(event, "late_start", "decoder_started must be first");
        const clients = event.payload.clients;
        const expected = [
          {
            principalId: "codex",
            provider: "openai",
            requestedModel: "gpt-5.6-sol",
            requestedEffort: "medium",
          },
          {
            principalId: "claude",
            provider: "anthropic",
            requestedModel: "claude-opus-4-8",
            requestedEffort: "medium",
          },
        ];
        if (!Array.isArray(clients) || clients.length !== 2) {
          problem(event, "bad_roster", "decoder must record exactly two clients");
        } else {
          for (let clientIndex = 0; clientIndex < 2; clientIndex++) {
            const client = verifyRecord(clients[clientIndex]);
            for (const [key, value] of Object.entries(expected[clientIndex])) {
              if (client[key] !== value) {
                problem(event, "bad_roster", `client ${clientIndex} ${key} must equal ${value}`);
              }
            }
            const principal = client.principalId;
            const transport = client.transport;
            if (
              (principal !== "codex" && principal !== "claude") ||
              (transport !== "cli" && transport !== "test")
            ) {
              problem(event, "bad_roster", `client ${clientIndex} requires a canonical transport`);
            } else {
              rosterTransports.set(principal, transport);
            }
          }
        }
        if (typeof event.payload.userPrompt !== "string" || !event.payload.userPrompt.trim()) {
          problem(event, "bad_user_prompt", "decoder_started requires the exact nonempty user prompt");
        }
        const config = verifyRecord(event.payload.config);
        if (
          config.requiredQuorum !== 2 ||
          config.freshDeliberationPerUnit !== true ||
          !Number.isInteger(config.maxRounds) ||
          Number(config.maxRounds) < 1
        ) {
          problem(event, "bad_config", "decoder must require fresh 2/2 deliberation per unit");
        }
        break;
      }
      case "round_started": {
        if (event.roundIndex !== expectedRound) {
          problem(event, "bad_round", `expected round ${expectedRound}`);
        }
        if (currentRound && !currentRound.committed) {
          problem(event, "unclosed_round", "a new round opened before the prior round committed");
        }
        const state: VerifyRoundState = {
          index: Number(event.roundIndex),
          started: event,
          calls: new Map(),
          attempts: new Map(),
          completed: new Map(),
        };
        if (rounds.has(state.index)) problem(event, "duplicate_round", "round opened twice");
        rounds.set(state.index, state);
        currentRound = state;
        expectedRound++;
        if (event.payload.prefixBefore !== exactOutput || event.payload.requiredQuorum !== 2) {
          problem(event, "bad_round_start", "round prefix or quorum does not match current exact state");
        }
        break;
      }
      case "tie_committed": {
        if (!currentRound || event.roundIndex !== currentRound.index) {
          problem(event, "orphan_tie", "tie commitment does not belong to the open round");
          break;
        }
        if (currentRound.tie) problem(event, "duplicate_tie", "round has more than one tie commitment");
        if (currentRound.calls.size || currentRound.attempts.size) {
          problem(event, "late_tie", "tie commitment must precede every provider call");
        }
        if (typeof event.payload.commitment !== "string" || !/^[0-9a-f]{64}$/.test(event.payload.commitment)) {
          problem(event, "bad_tie_commitment", "tie commitment must be a SHA-256 hex string");
        }
        currentRound.tie = event;
        break;
      }
      case "provider_call_started": {
        if (!currentRound || event.roundIndex !== currentRound.index || !currentRound.tie) {
          problem(event, "orphan_call", "provider call requires an open round and prior tie commitment");
          break;
        }
        const phase = phaseOfEvent(event);
        const principal = principalOf(event);
        const attempt = attemptOf(event);
        if (!phase || !principal || !attempt) {
          problem(event, "bad_call_identity", "call requires canonical phase, principal, and attempt");
          break;
        }
        if (phase === "revise" && currentRound.completed.get("propose")?.payload.valid !== true) {
          problem(event, "phase_order", "revise may start only after valid proposal quorum");
        }
        if (phase === "judge" && currentRound.completed.get("revise")?.payload.valid !== true) {
          problem(event, "phase_order", "judge may start only after valid revision quorum");
        }
        if (phase === "propose" && currentRound.completed.has("propose")) {
          problem(event, "phase_order", "proposal call occurred after proposal completion");
        }
        if (currentRound.completed.has(phase)) {
          problem(event, "phase_order", `${phase} call occurred after phase completion`);
        }
        const key = callKey(phase, principal, attempt);
        if (currentRound.calls.has(key)) problem(event, "duplicate_call", `duplicate call ${key}`);
        if (attempt === 2 && !currentRound.attempts.has(callKey(phase, principal, 1))) {
          problem(event, "bad_retry", "attempt 2 started before attempt 1 produced a receipt");
        }
        if (attempt === 2) {
          const prior = currentRound.attempts.get(callKey(phase, principal, 1));
          if (verifyRecord(prior?.payload.validation).ok === true || prior?.payload.status === "cancelled") {
            problem(event, "bad_retry", "attempt 2 may follow only an invalid, non-cancelled first receipt");
          }
        }
        if (typeof event.payload.prompt !== "string") problem(event, "missing_prompt", "call start lacks exact prompt");
        const reconstructedPrompt = expectedPrompt(currentRound, phase, principal, attempt);
        if (reconstructedPrompt == null || event.payload.prompt !== reconstructedPrompt) {
          problem(event, "protocol_prompt_mismatch", "provider prompt does not match exact decoder state");
        }
        const expectedProvider = principal === "codex" ? "openai" : "anthropic";
        const expectedModel = principal === "codex" ? "gpt-5.6-sol" : "claude-opus-4-8";
        if (
          event.payload.provider !== expectedProvider ||
          event.payload.requestedModel !== expectedModel ||
          event.payload.requestedEffort !== "medium"
        ) {
          problem(event, "bad_call_roster", "provider call does not match the pinned model roster");
        }
        currentRound.calls.set(key, event);
        break;
      }
      case "provider_attempt": {
        if (!currentRound || event.roundIndex !== currentRound.index) {
          problem(event, "orphan_attempt", "provider receipt does not belong to the open round");
          break;
        }
        const phase = phaseOfEvent(event);
        const principal = principalOf(event);
        const attempt = attemptOf(event);
        if (!phase || !principal || !attempt) {
          problem(event, "bad_attempt_identity", "receipt requires canonical phase, principal, and attempt");
          break;
        }
        const key = callKey(phase, principal, attempt);
        const call = currentRound.calls.get(key);
        if (!call) problem(event, "missing_call_start", `receipt ${key} has no matching call start`);
        if (currentRound.attempts.has(key)) problem(event, "duplicate_attempt", `duplicate receipt ${key}`);
        if (call && event.payload.prompt !== call.payload.prompt) {
          problem(event, "prompt_mismatch", "receipt prompt differs from its call-start prompt");
        }
        if (
          typeof event.payload.stdout !== "string" ||
          typeof event.payload.stderr !== "string" ||
          typeof event.payload.responseText !== "string" ||
          typeof event.payload.status !== "string" ||
          typeof event.payload.command !== "object" ||
          typeof verifyRecord(event.payload.validation).ok !== "boolean"
        ) {
          problem(event, "incomplete_receipt", "provider receipt lacks raw I/O, process status, command, or validation");
        }
        const command = verifyRecord(event.payload.command);
        if (
          typeof command.bin !== "string" ||
          !Array.isArray(command.args) ||
          command.promptTransport !== "stdin" ||
          !["ok", "error", "cancelled", "timeout"].includes(String(event.payload.status))
        ) {
          problem(event, "incomplete_receipt", "provider receipt command or process status is not canonical");
        }
        if (typeof event.payload.stdout === "string" && typeof event.payload.responseText === "string") {
          const transport = rosterTransports.get(principal);
          if (principal === "claude" && transport === "cli") {
            const decoded = decodeClaudeCliEnvelope(event.payload.stdout);
            if (event.payload.responseText !== decoded.responseText) {
              problem(event, "raw_response_mismatch", "Claude responseText is not derived from exact stdout");
            }
            if (
              event.payload.reportedModel !== decoded.reportedModel ||
              !exactJsonEqual(event.payload.reportedModels, decoded.reportedModels)
            ) {
              problem(event, "raw_model_receipt_mismatch", "Claude model receipt is not derived from exact stdout");
            }
          } else if (event.payload.responseText !== event.payload.stdout) {
            problem(event, "raw_response_mismatch", "responseText differs from exact observed stdout");
          }
        }
        const reportedModels = [
          ...(Array.isArray(event.payload.reportedModels) ? event.payload.reportedModels : []),
          ...(typeof event.payload.reportedModel === "string" ? [event.payload.reportedModel] : []),
        ];
        const requestedModel = principal === "codex" ? "gpt-5.6-sol" : "claude-opus-4-8";
        const modelMismatches = [...new Set(reportedModels)].filter(
          (model) => model !== requestedModel,
        );
        const validationReceipt = verifyRecord(event.payload.validation);
        let expectedValidation = event.payload.status === "ok"
          ? parseDecoderTurn(phase, String(event.payload.responseText ?? ""))
          : {
              errors: [
                typeof event.payload.transportError === "string"
                  ? event.payload.transportError
                  : `transport status ${String(event.payload.status)}`,
              ],
            };
        if (event.payload.status === "ok" && modelMismatches.length) {
          expectedValidation = {
            errors: [
              ...expectedValidation.errors,
              `provider reported unexpected model(s): ${modelMismatches.join(", ")}`,
            ],
          };
        }
        if (
          validationReceipt.ok !== Boolean(expectedValidation.parsed) ||
          !exactJsonEqual(validationReceipt.errors, expectedValidation.errors) ||
          !exactJsonEqual(event.payload.parsed, expectedValidation.parsed)
        ) {
          problem(event, "false_validation", "validation receipt does not exactly match raw response and model evidence");
        }
        const expectedProvider = principal === "codex" ? "openai" : "anthropic";
        if (
          event.payload.provider !== expectedProvider ||
          event.payload.requestedModel !== requestedModel ||
          event.payload.requestedEffort !== "medium"
        ) {
          problem(event, "bad_attempt_roster", "provider receipt does not match the pinned model roster");
        }
        if (
          modelMismatches.length > 0 &&
          verifyRecord(event.payload.validation).ok === true
        ) {
          problem(event, "model_mismatch", "an unexpected reported model was admitted as valid");
        }
        currentRound.attempts.set(key, event);
        break;
      }
      case "phase_completed": {
        if (!currentRound || event.roundIndex !== currentRound.index) {
          problem(event, "orphan_phase", "phase completion does not belong to the open round");
          break;
        }
        const phase = phaseOfEvent(event);
        if (!phase) {
          problem(event, "bad_phase", "phase completion lacks canonical phase");
          break;
        }
        if (currentRound.completed.has(phase)) problem(event, "duplicate_phase", `${phase} completed twice`);
        if (phase === "revise" && currentRound.completed.get("propose")?.payload.valid !== true) {
          problem(event, "phase_order", "revision completion requires valid proposals");
        }
        if (phase === "judge" && currentRound.completed.get("revise")?.payload.valid !== true) {
          problem(event, "phase_order", "judge completion requires valid revisions");
        }
        for (const [key] of currentRound.calls) {
          if (key.startsWith(`${phase}:`) && !currentRound.attempts.has(key)) {
            problem(event, "missing_receipt", `phase completed before receipt ${key}`);
          }
        }
        for (const principal of principals) {
          if (
            !currentRound.attempts.has(callKey(phase, principal, 1)) &&
            !currentRound.attempts.has(callKey(phase, principal, 2))
          ) {
            problem(event, "missing_principal_attempt", `${phase} lacks a receipt from ${principal}`);
          }
        }
        const quorum = phaseQuorum(currentRound, phase);
        if (
          event.payload.quorum !== quorum ||
          event.payload.requiredQuorum !== 2 ||
          event.payload.valid !== (quorum === 2) ||
          !exactJsonEqual(event.payload.principals, ["codex", "claude"])
        ) {
          problem(event, "false_quorum", `${phase} completion does not match its two provider receipts`);
        }
        currentRound.completed.set(phase, event);
        break;
      }
      case "unit_selected": {
        if (!currentRound || event.roundIndex !== currentRound.index) {
          problem(event, "orphan_selection", "selection does not belong to the open round");
          break;
        }
        if (
          currentRound.completed.get("propose")?.payload.valid !== true ||
          currentRound.completed.get("revise")?.payload.valid !== true
        ) {
          problem(event, "selection_without_quorum", "selection requires valid proposal and revision quorum");
        }
        if (currentRound.selected) problem(event, "duplicate_selection", "round selected more than once");
        const revisions = (["codex", "claude"] as const).map(
          (principal) => validParsed(currentRound!, "revise", principal),
        );
        if (!exactJsonEqual(event.payload.finalists, revisions)) {
          problem(event, "finalist_mismatch", "selection finalists differ from valid revision receipts");
        }
        const finalists = Array.isArray(event.payload.finalists) ? event.payload.finalists : [];
        const selectedIndex = event.payload.selectedIndex;
        const method = event.payload.method;
        if (
          method !== "revision_consensus" &&
          method !== "judge_consensus" &&
          method !== "unilateral_stop_overruled" &&
          method !== "precommitted_tie_break"
        ) {
          problem(event, "bad_selection_rule", "selection method is not canonical");
        } else if (event.payload.publicReason !== selectionPublicReason(method)) {
          problem(event, "public_reason_mismatch", "selection public reason does not match its rule");
        }
        if ((selectedIndex !== 0 && selectedIndex !== 1) || !finalists[selectedIndex]) {
          problem(event, "bad_selected_index", "selection index must identify one finalist");
        } else if (!exactJsonEqual(event.payload.selected, verifyRecord(finalists[selectedIndex]).unit)) {
          problem(event, "selected_mismatch", "selected unit differs from selected finalist");
        }
        const finalistUnits = finalists.map((item) => validateDecoderUnit(verifyRecord(item).unit));
        if (finalistUnits.some((validation) => !validation.ok)) {
          problem(event, "invalid_finalist", "selection contains an invalid exact unit");
        } else if (finalistUnits.length === 2) {
          const same = decoderUnitKey(finalistUnits[0].unit!) === decoderUnitKey(finalistUnits[1].unit!);
          if (same && method !== "revision_consensus") {
            problem(event, "bad_selection_rule", "equal revisions require revision_consensus");
          }
          if (same && (selectedIndex !== 0 || currentRound.completed.has("judge"))) {
            problem(event, "bad_selection_rule", "equal revisions commit index 0 without an unnecessary judge phase");
          }
          if (!same) {
            if (currentRound.completed.get("judge")?.payload.valid !== true) {
              problem(event, "selection_without_judges", "different revisions require fresh 2/2 judge quorum");
            }
            const judges = (["codex", "claude"] as const).map(
              (principal) => validParsed(currentRound!, "judge", principal),
            );
            if (!exactJsonEqual(event.payload.judgeVotes, judges)) {
              problem(event, "judge_mismatch", "selection judgeVotes differ from valid judge receipts");
            }
            const picks = judges.map((judge) => verifyRecord(judge).pick);
            if (picks[0] === picks[1]) {
              if (method !== "judge_consensus" || selectedIndex !== picks[0]) {
                problem(event, "bad_selection_rule", "matching judge ballots must select judge_consensus winner");
              }
            } else {
              const stopIndex = finalistUnits.findIndex((item) => item.unit?.kind === "stop");
              if (stopIndex >= 0 && finalistUnits[1 - stopIndex].unit?.kind !== "stop") {
                if (method !== "unilateral_stop_overruled" || selectedIndex !== 1 - stopIndex) {
                  problem(event, "bad_selection_rule", "a split ballot cannot make STOP unilateral");
                }
              } else {
                const reveal = verifyRecord(event.payload.tieReveal);
                const commitment = String(currentRound.tie?.payload.commitment ?? "");
                const recomputed = sha256Hex(canonicalJSON({
                  runId: event.runId,
                  roundIndex: currentRound.index,
                  bit: reveal.bit,
                  nonce: reveal.nonce,
                }));
                if (
                  method !== "precommitted_tie_break" ||
                  selectedIndex !== reveal.bit ||
                  reveal.commitment !== commitment ||
                  recomputed !== commitment
                ) {
                  problem(event, "bad_tie_reveal", "persistent split lacks a valid precommitted tie reveal");
                }
              }
            }
          }
        }
        currentRound.selected = event;
        break;
      }
      case "dissent_preserved": {
        if (!currentRound || event.roundIndex !== currentRound.index || !currentRound.selected) {
          problem(event, "orphan_dissent", "dissent requires a selection in the open round");
          break;
        }
        if (currentRound.dissent) problem(event, "duplicate_dissent", "round preserved dissent twice");
        const selectedIndex = currentRound.selected.payload.selectedIndex;
        const finalists = Array.isArray(currentRound.selected.payload.finalists)
          ? currentRound.selected.payload.finalists
          : [];
        if (selectedIndex !== 0 && selectedIndex !== 1) {
          problem(event, "dissent_mismatch", "dissent cannot resolve an invalid selected index");
        } else {
          const losingIndex = (1 - selectedIndex) as 0 | 1;
          const expectedPrincipal = principals[losingIndex];
          const distinct = finalists.length === 2 &&
            !exactJsonEqual(verifyRecord(finalists[0]).unit, verifyRecord(finalists[1]).unit);
          if (!distinct) {
            problem(event, "unexpected_dissent", "equal finalists do not produce a losing dissent");
          }
          if (
            !exactJsonEqual(event.payload.selected, currentRound.selected.payload.selected) ||
            event.payload.losingPrincipal !== expectedPrincipal ||
            !exactJsonEqual(event.payload.losingRevision, finalists[losingIndex]) ||
            !exactJsonEqual(event.payload.judgeVotes, currentRound.selected.payload.judgeVotes)
          ) {
            problem(event, "dissent_mismatch", "dissent does not exactly preserve the losing finalist and ballots");
          }
        }
        currentRound.dissent = event;
        break;
      }
      case "unit_committed": {
        if (!currentRound || event.roundIndex !== currentRound.index || !currentRound.selected) {
          problem(event, "commit_without_selection", "unit commit requires this round's selection");
          break;
        }
        if (currentRound.committed) problem(event, "duplicate_commit", "round committed twice");
        const validation = validateDecoderUnit(event.payload.unit);
        if (!validation.ok) {
          problem(event, "invalid_unit", validation.errors.join("; "));
          break;
        }
        const unit = validation.unit!;
        if (
          !exactJsonEqual(event.payload.unit, currentRound.selected.payload.selected) ||
          event.payload.method !== currentRound.selected.payload.method
        ) {
          problem(event, "commit_mismatch", "committed unit or method differs from the selection");
        }
        const finalists = Array.isArray(currentRound.selected.payload.finalists)
          ? currentRound.selected.payload.finalists
          : [];
        if (
          finalists.length === 2 &&
          !exactJsonEqual(verifyRecord(finalists[0]).unit, verifyRecord(finalists[1]).unit) &&
          !currentRound.dissent
        ) {
          problem(event, "missing_dissent", "a losing distinct finalist must remain on the record");
        }
        const before = exactOutput;
        if (unit.kind !== "stop") exactOutput += decoderUnitText(unit);
        if (
          event.payload.prefixBefore !== before ||
          event.payload.prefixAfter !== exactOutput ||
          event.payload.surfaceText !== decoderUnitText(unit) ||
          event.payload.unitKey !== decoderUnitKey(unit)
        ) {
          problem(event, "prefix_mismatch", "commit does not match exact unit concatenation");
        }
        committedUnits.push(unit);
        currentRound.committed = event;
        verifiedHistory.push({
          roundIndex: currentRound.index,
          proposals: principals.map((principal) => validParsed(currentRound!, "propose", principal)),
          revisions: principals.map((principal) => validParsed(currentRound!, "revise", principal)),
          judgeVotes: currentRound.selected.payload.judgeVotes,
          selected: unit,
          method: event.payload.method,
        });
        if (unit.kind === "stop") stopSeq = event.seq;
        break;
      }
      case "decoder_finished": {
        terminalCount++;
        terminalEvent = event;
        terminalOutput = event.payload.finalOutput;
        terminalStatus = event.payload.status;
        break;
      }
      default:
        problem(event, "unknown_event", `unknown decoder event kind ${String(event.kind)}`);
    }
  }

  if (startedCount !== 1) problem(startEvent, "bad_start_count", `expected one decoder_started, found ${startedCount}`);
  if (events[0]?.kind !== "decoder_started") problem(events[0], "missing_start", "first event must be decoder_started");
  const last = events.at(-1);
  if (terminalCount !== 1) problem(terminalEvent, "bad_terminal_count", `expected one decoder_finished, found ${terminalCount}`);
  if (last?.kind !== "decoder_finished") problem(last, "truncated", "last event must be decoder_finished");
  for (const round of rounds.values()) {
    if (!round.tie) {
      problem(round.started, "missing_tie_commitment", "every opened round requires a pre-call tie commitment");
    }
    if (!round.completed.has("propose")) {
      problem(round.started, "incomplete_round", "every opened round must complete the two-provider proposal phase");
    }
  }
  const exactOutputConsistent = terminalOutput === exactOutput;
  if (!exactOutputConsistent) problem(last, "output_mismatch", "terminal output differs byte-for-byte from committed units");
  if (!exactJsonEqual(last?.payload.committedUnits, committedUnits)) {
    problem(last, "committed_units_mismatch", "terminal committedUnits differ from exact commit events");
  }
  if (last?.payload.rounds !== rounds.size) {
    problem(last, "round_count_mismatch", "terminal round count differs from opened rounds");
  }
  if (last?.payload.partial !== (terminalStatus !== "stopped")) {
    problem(last, "partial_mismatch", "terminal partial flag disagrees with terminal status");
  }
  if (terminalStatus === "stopped" && stopSeq == null) problem(last, "missing_stop", "stopped run has no committed STOP");
  if (terminalStatus !== "stopped" && stopSeq != null) problem(last, "bad_terminal_status", "committed STOP requires stopped status");
  if (!["stopped", "failed", "cancelled", "budget_exhausted"].includes(String(terminalStatus))) {
    problem(last, "bad_terminal_status", "terminal status is not a canonical decoder status");
  }
  if (terminalStatus === "budget_exhausted") {
    const maxRounds = verifyRecord(startEvent?.payload.config).maxRounds;
    if (typeof maxRounds !== "number" || rounds.size !== maxRounds) {
      problem(last, "false_budget_exhaustion", "budget_exhausted requires every configured round to open");
    }
    if ([...rounds.values()].some((round) => !round.committed)) {
      problem(last, "false_budget_exhaustion", "budget_exhausted requires every opened round to commit");
    }
  }
  if (terminalStatus === "failed") {
    if (typeof last?.payload.error !== "string" || !last.payload.error) {
      problem(last, "missing_failure", "failed run requires a public terminal error");
    }
    const uncommitted = [...rounds.values()].filter((round) => !round.committed);
    for (const round of uncommitted) {
      const hasInvalidPhase = [...round.completed.values()].some(
        (completion) => completion.payload.valid === false,
      );
      if (!hasInvalidPhase || round.selected) {
        problem(
          last,
          "ungrounded_failure",
          "an opened failed round must end at an invalid provider phase before selection",
        );
      }
    }
    const maxRounds = verifyRecord(startEvent?.payload.config).maxRounds;
    if (
      uncommitted.length === 0 &&
      typeof maxRounds === "number" &&
      rounds.size >= maxRounds
    ) {
      problem(last, "false_failure", "a fully committed configured budget must end as budget_exhausted");
    }
  }
  if (terminalStatus === "cancelled") {
    const cancellation = verifyRecord(last?.payload.cancellation);
    if (typeof cancellation.reason !== "string" || !cancellation.reason) {
      problem(last, "missing_cancellation", "cancelled run requires a public cancellation receipt");
    }
  }

  return { ok: problems.length === 0, events: events.length, head: previous, exactOutputConsistent, problems };
}
