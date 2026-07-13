const API = import.meta.env?.VITE_API_BASE ?? "";

export type DecoderTerminalReason =
  | "stop"
  | "stop_ratified"
  | "cancelled"
  | "failure"
  | "provider_failure"
  | "budget_exhausted"
  | "max_rounds";

export interface DecoderEvent {
  seq: number;
  runId: string;
  roundIndex?: number | null;
  ts: number;
  kind: string;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface DecoderAgentHealth {
  id: "codex" | "claude";
  provider: "openai" | "anthropic" | "unknown";
  label: string;
  requestedModel: string;
  requestedEffort: string;
  binaryPresent: boolean;
  version?: string;
  liveVerified: boolean;
  reportedModel?: string;
  reportedModels?: string[];
  note?: string;
}

export interface DecoderHealth {
  agents: [DecoderAgentHealth, DecoderAgentHealth];
  checkedAt?: number;
}

export interface DecoderRunDetails {
  runId: string;
  userPrompt?: string;
  maxRounds?: number;
  status: string;
  events: DecoderEvent[];
  error?: string;
  stoppedBy?: DecoderTerminalReason | string;
}

export interface DecoderRunSummary {
  runId: string;
  status: string;
}

export interface DecoderRunList {
  active: DecoderRunSummary[];
  recorded: DecoderRunSummary[];
}

export interface DecoderStartRequest {
  prompt: string;
  maxRounds: number;
}

export interface DecoderStartResponse {
  runId: string;
  status?: string;
}

export interface DecoderCancelResponse {
  accepted: boolean;
  status: string;
  cancellation?: {
    actor?: string;
    reason?: string;
    requestedAt?: number;
  };
}

export interface DecoderVerifyResponse {
  ok?: boolean;
  verify?: {
    ok: boolean;
    events?: number;
    head?: string;
    exactOutputConsistent?: boolean;
    answerConsistent?: boolean;
    problems?: { seq?: number; kind?: string; reason?: string; detail?: string }[];
  };
  [key: string]: unknown;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function stringValue(...values: unknown[]): string | undefined {
  const found = values.find((value) => typeof value === "string" && value.length > 0);
  return typeof found === "string" ? found : undefined;
}

function booleanValue(...values: unknown[]): boolean {
  const found = values.find((value) => typeof value === "boolean");
  return found === true;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Decoder API returned ${response.status} without JSON.`);
  }
  if (!response.ok) {
    const message = stringValue(record(body).error, record(body).message);
    throw new Error(message ?? `Decoder API returned ${response.status}.`);
  }
  return body as T;
}

export function normalizeAgentHealth(
  id: DecoderAgentHealth["id"],
  rawValue: unknown,
): DecoderAgentHealth {
  const raw = record(rawValue);
  const binary = record(raw.binary);
  const probe = record(raw.probe ?? raw.liveProbe);
  const isCodex = id === "codex";
  return {
    id,
    provider:
      raw.provider === "openai" || raw.provider === "anthropic"
        ? raw.provider
        : "unknown",
    label: stringValue(raw.label, raw.name) ?? (isCodex ? "Codex" : "Claude"),
    requestedModel:
      stringValue(raw.requestedModel, raw.modelRequested) ??
      "unreported",
    requestedEffort: stringValue(raw.requestedEffort, raw.effort) ?? "unreported",
    binaryPresent: booleanValue(
      raw.binaryPresent,
      raw.present,
      raw.available,
      binary.present,
      binary.available,
    ),
    version: stringValue(raw.version, binary.version, raw.binaryVersion),
    liveVerified: booleanValue(
      raw.liveVerified,
      raw.live,
      raw.probeSucceeded,
      probe.ok,
      probe.live,
    ),
    reportedModel: stringValue(
      raw.reportedModel,
      raw.servedModel,
      probe.reportedModel,
      probe.servedModel,
    ),
    reportedModels: Array.isArray(raw.reportedModels)
      ? raw.reportedModels.filter((model): model is string => typeof model === "string")
      : undefined,
    note: stringValue(raw.note, raw.error, probe.note, probe.error),
  };
}

function normalizeHealth(value: unknown): DecoderHealth {
  const body = record(value);
  const agents = Array.isArray(body.agents) ? body.agents : [];
  const find = (id: "codex" | "claude") =>
    agents.find((agent) => {
      const item = record(agent);
      return item.id === id || item.clientId === id;
    }) ?? body[id];
  return {
    agents: [
      normalizeAgentHealth("codex", find("codex")),
      normalizeAgentHealth("claude", find("claude")),
    ],
    checkedAt: typeof body.checkedAt === "number" ? body.checkedAt : undefined,
  };
}

function normalizeEvent(value: unknown, fallbackRunId?: string): DecoderEvent | null {
  const envelope = record(value);
  const raw = record(envelope.event ?? value);
  if (!Number.isInteger(raw.seq) || typeof raw.kind !== "string") {
    return null;
  }
  const runId = stringValue(raw.runId, envelope.runId, fallbackRunId);
  if (!runId) return null;
  return {
    seq: Number(raw.seq),
    runId,
    roundIndex:
      typeof raw.roundIndex === "number"
        ? raw.roundIndex
        : typeof raw.round === "number"
          ? raw.round
          : null,
    ts: typeof raw.ts === "number" ? raw.ts : 0,
    kind: raw.kind,
    payload: record(raw.payload),
    prevHash: typeof raw.prevHash === "string" ? raw.prevHash : "",
    hash: typeof raw.hash === "string" ? raw.hash : "",
  };
}

export async function fetchDecoderHealth(): Promise<DecoderHealth> {
  return normalizeHealth(await request<unknown>("/api/decoder/health"));
}

export async function startDecoderRun(
  body: DecoderStartRequest,
): Promise<DecoderStartResponse> {
  return request<DecoderStartResponse>("/api/decoder/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt: body.prompt, maxRounds: body.maxRounds }),
  });
}

export async function fetchDecoderRun(runId: string): Promise<DecoderRunDetails> {
  const body = await request<UnknownRecord>(
    `/api/decoder/runs/${encodeURIComponent(runId)}`,
  );
  const result = record(body.result);
  return {
    runId: stringValue(body.runId) ?? runId,
    userPrompt: stringValue(body.userPrompt),
    maxRounds: typeof body.maxRounds === "number" ? body.maxRounds : undefined,
    status: stringValue(body.status) ?? "unknown",
    events: Array.isArray(body.events)
      ? body.events
          .map((event) => normalizeEvent(event, stringValue(body.runId) ?? runId))
          .filter((event): event is DecoderEvent => event !== null)
      : [],
    error: stringValue(body.error),
    stoppedBy: stringValue(body.stoppedBy, result.status, result.reason),
  };
}

export async function fetchDecoderRuns(): Promise<DecoderRunList> {
  const body = record(await request<unknown>("/api/decoder/runs"));
  const normalize = (value: unknown): DecoderRunSummary[] =>
    (Array.isArray(value) ? value : [])
      .map((item) => record(item))
      .filter((item) => typeof item.runId === "string")
      .map((item) => ({
        runId: item.runId as string,
        status: stringValue(item.status) ?? "unknown",
      }));
  return { active: normalize(body.active), recorded: normalize(body.recorded) };
}

export function subscribeDecoderRun(
  runId: string,
  handlers: {
    afterSeq?: number;
    onEvent: (event: DecoderEvent) => void;
    onStatus: (status: Record<string, unknown>) => void;
    onOpen?: () => void;
    onError: (message: string) => void;
    onMalformed?: (message: string) => void;
  },
): () => void {
  const suffix = handlers.afterSeq != null ? `?afterSeq=${handlers.afterSeq}` : "";
  const source = new EventSource(
    `${API}/api/decoder/runs/${encodeURIComponent(runId)}/events${suffix}`,
  );
  let receivedNamedEvent = false;

  const receive = (message: MessageEvent<string>) => {
    const parsed = safeParse(message.data);
    const event = normalizeEvent(parsed, runId);
    if (event) handlers.onEvent(event);
    else handlers.onMalformed?.("A decoder stream message was malformed or missing its canonical event envelope.");
  };
  const receiveNamed = (message: Event) => {
    receivedNamedEvent = true;
    receive(message as MessageEvent<string>);
  };
  const receiveStatus = (message: Event) => {
    const parsed = safeParse((message as MessageEvent<string>).data);
    handlers.onStatus(record(parsed));
  };

  source.addEventListener("ledger", receiveNamed);
  source.addEventListener("decoder", receiveNamed);
  source.addEventListener("event", receiveNamed);
  source.addEventListener("status", receiveStatus);
  source.onmessage = (message) => {
    if (!receivedNamedEvent) receive(message);
  };
  source.onopen = () => handlers.onOpen?.();
  source.onerror = () => handlers.onError("Decoder event stream disconnected; reconnecting from the last event.");

  return () => source.close();
}

export async function cancelDecoderRun(
  runId: string,
  body: { actor: string; reason: string },
): Promise<DecoderCancelResponse> {
  return request<DecoderCancelResponse>(
    `/api/decoder/runs/${encodeURIComponent(runId)}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function verifyDecoderEvents(
  events: DecoderEvent[],
): Promise<DecoderVerifyResponse> {
  return request<DecoderVerifyResponse>("/api/decoder/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
