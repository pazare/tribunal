import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  cancelDecoderRun,
  fetchDecoderHealth,
  fetchDecoderRun,
  fetchDecoderRuns,
  startDecoderRun,
  subscribeDecoderRun,
  verifyDecoderEvents,
  type DecoderAgentHealth,
  type DecoderEvent,
  type DecoderHealth,
  type DecoderVerifyResponse,
} from "./decoder-api";

type UnknownRecord = Record<string, unknown>;
type UnitKind = "span" | "space" | "enter" | "stop";

interface CommittedUnit {
  seq: number;
  round: number;
  kind: UnitKind;
  text: string;
  rule: string;
  support: number | null;
  dissent: unknown;
}

interface EvidenceField {
  label: string;
  value: unknown;
  exact?: boolean;
}

const CONTROL_CLASS =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-tribunal-gold/70 focus:ring-2 focus:ring-tribunal-gold/20 disabled:cursor-not-allowed disabled:opacity-50";

const ROSTER = [
  {
    id: "codex" as const,
    name: "Codex",
    provider: "OpenAI",
    model: "gpt-5.6-sol",
    effort: "medium",
  },
  {
    id: "claude" as const,
    name: "Claude",
    provider: "Anthropic",
    model: "claude-opus-4-8",
    effort: "medium",
  },
];

const TERMINAL_STATUSES = new Set([
  "finished",
  "stopped",
  "cancelled",
  "failed",
  "failure",
  "error",
  "budget_exhausted",
  "ledger_conflict",
]);

export function isDecoderTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function decoderStatusTone(status: string): "error" | "live" | "neutral" {
  const normalized = status.toLowerCase();
  if (/error|fail|cancel|conflict/.test(normalized)) return "error";
  if (/running|starting|cancelling/.test(normalized)) return "live";
  return "neutral";
}

export function decoderAgentsReady(health: DecoderHealth | null): boolean {
  if (!health || health.agents.length !== ROSTER.length) return false;
  const identities = new Set(health.agents.map((agent) => agent.id));
  if (identities.size !== ROSTER.length) return false;
  return ROSTER.every((expected) => {
    const agent = health.agents.find((candidate) => candidate.id === expected.id);
    return Boolean(
      agent?.binaryPresent &&
      agent.provider === expected.provider.toLowerCase() &&
      agent.requestedModel === expected.model &&
      agent.requestedEffort === expected.effort,
    );
  });
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function stringValue(...values: unknown[]): string | undefined {
  const found = values.find((value) => typeof value === "string");
  return typeof found === "string" ? found : undefined;
}

function numberValue(...values: unknown[]): number | undefined {
  const found = values.find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof found === "number" ? found : undefined;
}

function deepFind(value: unknown, keys: string[], depth = 0): unknown {
  if (depth > 3) return undefined;
  const object = record(value);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) return object[key];
  }
  for (const child of Object.values(object)) {
    if (!child || typeof child !== "object") continue;
    const found = deepFind(child, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function hasDeepKey(value: unknown, keys: string[]): boolean {
  return deepFind(value, keys) !== undefined;
}

function roundOf(event: DecoderEvent): number {
  return (
    event.roundIndex ??
    numberValue(
      event.payload.roundIndex,
      event.payload.round,
      deepFind(event.payload, ["roundIndex", "round"]),
    ) ??
    -1
  );
}

function providerId(event: DecoderEvent): "codex" | "claude" | null {
  const raw = stringValue(
    deepFind(event.payload, ["principalId", "agentId", "agent", "providerId", "provider"]),
  )?.toLowerCase();
  if (!raw) return null;
  if (raw.includes("codex") || raw.includes("openai")) return "codex";
  if (raw.includes("claude") || raw.includes("anthropic")) return "claude";
  return null;
}

function phaseOf(event: DecoderEvent): string {
  const explicit = stringValue(deepFind(event.payload, ["phase", "stage"]));
  if (explicit) return explicit.replace(/_/g, " ");
  return event.kind.replace(/_/g, " ");
}

export function phaseReceiptStatus(event?: DecoderEvent): {
  present: boolean;
  quorum: number;
  valid: boolean;
} {
  if (!event || event.kind !== "phase_completed") {
    return { present: false, quorum: 0, valid: false };
  }
  const quorum = numberValue(event.payload.quorum) ?? 0;
  return {
    present: true,
    quorum,
    valid: event.payload.valid === true && quorum === 2,
  };
}

function isCommitEvent(event: DecoderEvent): boolean {
  return event.kind === "unit_committed";
}

export function strictSurfaceUnit(value: unknown): { kind: UnitKind; text: string } | null {
  const unit = record(value);
  const keys = Object.keys(unit);
  if (keys.length !== 2 || !keys.includes("kind") || !keys.includes("text")) return null;
  if (typeof unit.kind !== "string" || typeof unit.text !== "string") return null;
  if (unit.kind === "space") return unit.text === " " ? { kind: "space", text: " " } : null;
  if (unit.kind === "enter") return unit.text === "\n" ? { kind: "enter", text: "\n" } : null;
  if (unit.kind === "stop") return unit.text === "" ? { kind: "stop", text: "" } : null;
  if (unit.kind !== "span" || !unit.text.length) return null;
  if (/\p{White_Space}|[\p{Cc}\p{Cf}\p{Cs}]/u.test(unit.text)) return null;
  return { kind: "span", text: unit.text };
}

export function assessDecoderEvent(
  existing: DecoderEvent | undefined,
  incoming: DecoderEvent,
): "new" | "identical" | "conflict" {
  if (!existing) return "new";
  return existing.hash === incoming.hash && stableDisplay(existing) === stableDisplay(incoming)
    ? "identical"
    : "conflict";
}

function unitFromEvent(event: DecoderEvent): CommittedUnit | null {
  if (!isCommitEvent(event)) return null;
  const payload = event.payload;
  const selected = strictSurfaceUnit(payload.unit);
  if (!selected || !Number.isInteger(event.roundIndex) || Number(event.roundIndex) < 0) return null;
  const rule = stringValue(payload.method) ?? "recorded rule unavailable";
  const support = numberValue(deepFind(payload, ["support", "supportCount", "quorum"]));
  return {
    seq: event.seq,
    round: Number(event.roundIndex),
    kind: selected.kind,
    text: selected.text,
    rule,
    support: support ?? null,
    dissent: deepFind(payload, ["dissent", "dissents", "minorityReport"]),
  };
}

function unitLiteral(unit: Pick<CommittedUnit, "kind" | "text">): string {
  return JSON.stringify(unit.text);
}

function unitLabel(kind: UnitKind): string {
  if (kind === "span") return "SPAN";
  if (kind === "space") return "SPACE";
  if (kind === "enter") return "ENTER";
  return "STOP";
}

function consensusLabel(unit: CommittedUnit): string {
  const normalized = unit.rule.toLowerCase();
  if (/consensus|concurrence|unanim/.test(normalized) || unit.support === 2) return "consensus";
  if (unit.dissent !== undefined && unit.dissent !== null) return "rule-selected with dissent";
  if (unit.support === 1) return "rule-selected with dissent";
  return "rule-selected";
}

function latestTerminalEvent(events: DecoderEvent[]): DecoderEvent | null {
  return (
    [...events]
      .reverse()
      .find((event) => /(?:^|_)(?:run_)?(?:finished|stopped|failed)$/.test(event.kind)) ?? null
  );
}

function terminalReason(events: DecoderEvent[]): string | null {
  const terminal = latestTerminalEvent(events);
  if (!terminal) return null;
  return (
    stringValue(
      deepFind(terminal.payload, ["stoppedBy", "terminalReason", "reason", "status"]),
    ) ?? "finished"
  );
}

function terminalCopy(reason: string | null): string {
  const normalized = (reason ?? "").toLowerCase();
  if (/budget|max.?round/.test(normalized)) return "Budget exhausted — the round limit ended the run.";
  if (/cancel/.test(normalized)) return "Cancelled by the operator — this is not a model STOP.";
  if (/fail|error|quorum|conflict/.test(normalized)) return "Provider or protocol failure — no successful STOP was claimed.";
  if (/stop/.test(normalized)) return "STOP — the decoder ended before opening another round.";
  return reason ? `Finished: ${reason.replace(/_/g, " ")}.` : "Run is still in progress.";
}

function statusFromTerminalReason(reason: string | null): string {
  const normalized = (reason ?? "").toLowerCase();
  if (/budget|max.?round|forced.?cap/.test(normalized)) return "budget_exhausted";
  if (/cancel/.test(normalized)) return "cancelled";
  if (/fail|error|halt|quorum/.test(normalized)) return "failed";
  return "stopped";
}

function eventIsProviderEvidence(event: DecoderEvent): boolean {
  return /provider|agent|prompt|stdout|stderr|proposal|revision|judge|validation|retry|tie|dissent|selection/.test(
    event.kind,
  );
}

export function transcriptCompleteness(
  events: DecoderEvent[],
  terminal: boolean,
  ledgerConflict: boolean,
  malformedStreamMessage: boolean,
  invalidCommitCount: number,
): { state: "collecting" | "full" | "partial"; note: string } {
  const explicitlyPartial = events.some(
    (event) =>
      deepFind(event.payload, ["rawTruncated", "transcriptTruncated"]) === true ||
      deepFind(event.payload, ["transcriptComplete"]) === false,
  );
  if (ledgerConflict || malformedStreamMessage || invalidCommitCount > 0 || explicitlyPartial) {
    return { state: "partial", note: "The ledger identifies missing or truncated public exchange evidence." };
  }

  const runIds = new Set(events.map((event) => event.runId));
  const sequenceComplete = events.every(
    (event, index) =>
      event.seq === index &&
      typeof event.hash === "string" &&
      event.hash.length === 64 &&
      typeof event.prevHash === "string" &&
      event.prevHash.length === 64,
  );
  if (runIds.size > 1 || !sequenceComplete) {
    return {
      state: "partial",
      note: "The visible event sequence has a gap, mixed run identity, or missing hash evidence.",
    };
  }

  const terminalEvent = latestTerminalEvent(events);
  if (terminal && !terminalEvent) {
    return {
      state: "partial",
      note: "The run reached a terminal status without a terminal transcript event.",
    };
  }

  const groups = new Map<
    string,
    {
      start: boolean;
      attempt: boolean;
      prompt: boolean;
      terminal: boolean;
      rawReceipt: boolean;
      validation: boolean;
      agent: "codex" | "claude" | null;
      round: number;
      phase: string;
      startPrompt?: string;
      receiptPrompt?: string;
    }
  >();
  const callEvents = events.filter(
    (event) => event.kind === "provider_call_started" || event.kind === "provider_attempt",
  );
  for (const event of callEvents) {
    const agent = providerId(event);
    const round = roundOf(event);
    const phase = stringValue(event.payload.phase) ?? "unknown";
    const attempt = numberValue(deepFind(event.payload, ["attempt"])) ?? 1;
    const callId = `${round}:${agent ?? "unknown"}:${phase}:${attempt}`;
    const group = groups.get(callId) ?? {
      start: false,
      attempt: false,
      prompt: false,
      terminal: false,
      rawReceipt: false,
      validation: false,
      agent,
      round,
      phase,
    };
    if (event.kind === "provider_call_started") {
      group.start = true;
      group.startPrompt = typeof event.payload.prompt === "string" ? event.payload.prompt : undefined;
    } else {
      group.attempt = true;
      group.receiptPrompt = typeof event.payload.prompt === "string" ? event.payload.prompt : undefined;
      group.rawReceipt =
        typeof event.payload.stdout === "string" &&
        typeof event.payload.stderr === "string" &&
        typeof event.payload.responseText === "string";
      group.terminal =
        typeof event.payload.status === "string" &&
        Object.prototype.hasOwnProperty.call(event.payload, "exitCode") &&
        Object.prototype.hasOwnProperty.call(event.payload, "signal") &&
        typeof event.payload.command === "object";
      group.validation = typeof record(event.payload.validation).ok === "boolean";
    }
    group.prompt = Boolean(
      group.startPrompt &&
      group.receiptPrompt &&
      group.startPrompt === group.receiptPrompt,
    );
    groups.set(callId, group);
  }

  if (!terminal) {
    return {
      state: "collecting",
      note: groups.size
        ? `Collecting evidence for ${groups.size} provider call${groups.size === 1 ? "" : "s"}.`
        : "Waiting for the first provider call receipt.",
    };
  }
  if (groups.size === 0 && terminalEvent && !events.some((event) => event.kind === "round_started")) {
    return {
      state: "full",
      note: "The run ended before any provider call opened; no public provider exchange is missing.",
    };
  }
  const phaseCompletions = events.filter((event) => event.kind === "phase_completed");
  const openedPhaseKeys = new Set(
    [...groups.values()].map((group) => `${group.round}:${group.phase}`),
  );
  const completionCounts = new Map<string, number>();
  for (const event of phaseCompletions) {
    const phase = stringValue(event.payload.phase) ?? "unknown";
    const key = `${roundOf(event)}:${phase}`;
    completionCounts.set(key, (completionCounts.get(key) ?? 0) + 1);
  }
  const phaseEvidenceComplete =
    phaseCompletions.length === openedPhaseKeys.size &&
    [...openedPhaseKeys].every((key) => completionCounts.get(key) === 1) &&
    phaseCompletions.every((event) => {
      const phase = stringValue(event.payload.phase);
      const principals = Array.isArray(event.payload.principals)
        ? new Set(event.payload.principals)
        : new Set<unknown>();
      if (
        !phase ||
        event.payload.requiredQuorum !== 2 ||
        principals.size !== 2 ||
        !principals.has("codex") ||
        !principals.has("claude")
      ) return false;
      return (
        openedPhaseKeys.has(`${roundOf(event)}:${phase}`) &&
        (["codex", "claude"] as const).every((agent) =>
          [...groups.values()].some(
            (group) =>
              group.round === roundOf(event) &&
              group.phase === phase &&
              group.agent === agent &&
              group.start &&
              group.attempt,
          ),
        )
      );
    });
  const committedRoundsValid = events
    .filter((event) => event.kind === "unit_committed")
    .every((event) =>
      ["propose", "revise"].every((phase) =>
        phaseCompletions.some(
          (completion) =>
            roundOf(completion) === roundOf(event) &&
            completion.payload.phase === phase &&
            completion.payload.valid === true &&
            completion.payload.quorum === 2,
        ),
      ),
    );
  const roundWithoutCalls = events.some(
    (event) =>
      event.kind === "round_started" &&
      ![...groups.values()].some((group) => group.round === roundOf(event)),
  );
  const complete =
    groups.size > 0 &&
    !roundWithoutCalls &&
    phaseEvidenceComplete &&
    committedRoundsValid &&
    [...groups.values()].every(
      (group) =>
        group.start &&
        group.attempt &&
        group.prompt &&
        group.terminal &&
        group.rawReceipt &&
        group.validation &&
        group.agent !== null &&
        ["propose", "revise", "judge"].includes(group.phase),
    );
  return complete
    ? {
        state: "full",
        note: "Every recorded provider call has its sent prompt, raw response receipt, and terminal process receipt.",
      }
    : {
        state: "partial",
        note: "At least one recorded provider call lacks a sent prompt, raw response receipt, or terminal process receipt.",
      };
}

function eventEvidenceFields(event: DecoderEvent): EvidenceField[] {
  const payload = event.payload;
  const phase = stringValue(deepFind(payload, ["phase", "stage"]))?.toLowerCase();
  const parsedLabel =
    phase === "propose"
      ? "Parsed proposal"
      : phase === "revise"
        ? "Parsed revision"
        : phase === "judge"
          ? "Parsed judge ballot"
          : "Parsed public object";
  const specs: { label: string; keys: string[]; exact?: boolean }[] = [
    { label: "Exact prompt sent", keys: ["promptSent", "publicPrompt", "exactPrompt", "prompt"], exact: true },
    { label: "Exact public response", keys: ["responseText"], exact: true },
    { label: "Raw stdout", keys: ["rawStdout", "stdout", "rawOutput", "raw"], exact: true },
    { label: "Raw stderr", keys: ["rawStderr", "stderr"], exact: true },
    { label: parsedLabel, keys: ["parsedPublicObject", "publicObject", "parsed"] },
    { label: "Proposal", keys: ["proposal"] },
    { label: "Revision", keys: ["revision"] },
    { label: "Finalists", keys: ["finalists"] },
    { label: "Judge artifact", keys: ["judgeVotes", "judge", "judgment", "adjudication"] },
    { label: "Validation", keys: ["validation", "validationResult", "schemaError", "validationError"] },
    { label: "Phase quorum", keys: ["quorum"] },
    { label: "Required quorum", keys: ["requiredQuorum"] },
    { label: "Retry", keys: ["retry", "retryReason", "attempt"] },
    { label: "Safe command / argv", keys: ["command", "safeArgv", "sanitizedArgv", "argv"] },
    { label: "Process status", keys: ["status"] },
    { label: "Cancellation receipt", keys: ["cancellation"] },
    { label: "Exit code", keys: ["exitCode"] },
    { label: "Process signal", keys: ["signal"] },
    { label: "Requested model", keys: ["requestedModel", "modelRequested"] },
    { label: "Requested effort", keys: ["requestedEffort", "effort"] },
    { label: "Reported model", keys: ["reportedModel", "servedModel", "modelReported"] },
    { label: "Timing", keys: ["timing", "latencyMs", "durationMs"] },
    { label: "Selected rule", keys: ["selectionRule", "selectedRule", "rule", "method"] },
    { label: "Dissent", keys: ["dissent", "dissents", "minorityReport"] },
    { label: "Tie commitment", keys: ["tieCommitment", "commitment"] },
    { label: "Tie reveal", keys: ["tieReveal", "reveal"] },
  ];
  const seen = new Set<string>();
  const fields: EvidenceField[] = [];
  for (const spec of specs) {
    const value = deepFind(payload, spec.keys);
    if (value === undefined) continue;
    const fingerprint = stableDisplay(value);
    if (seen.has(`${spec.label}:${fingerprint}`)) continue;
    seen.add(`${spec.label}:${fingerprint}`);
    fields.push({ label: spec.label, value, exact: spec.exact });
  }
  return fields;
}

function stableDisplay(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatTime(timestamp: number): string {
  if (!timestamp) return "time unavailable";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(value: unknown): string {
  const milliseconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(milliseconds)) return String(value ?? "unavailable");
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} s`;
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function downloadLedger(runId: string | null, events: DecoderEvent[]) {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${runId ?? "decoder-run"}.decoder-ledger.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DecoderLab() {
  const [prompt, setPrompt] = useState("");
  const [maxRounds, setMaxRounds] = useState(256);
  const [health, setHealth] = useState<DecoderHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<DecoderEvent[]>([]);
  const [status, setStatus] = useState("idle");
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamNotice, setStreamNotice] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [cancelActor, setCancelActor] = useState("Operator");
  const [cancelReason, setCancelReason] = useState("Stopped from Decoder Lab");
  const [cancelling, setCancelling] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DecoderVerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [ledgerConflict, setLedgerConflict] = useState("");
  const [transcriptIssue, setTranscriptIssue] = useState("");

  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const latestSeqRef = useRef(-1);
  const terminalRef = useRef(false);
  const connectRef = useRef<(id: string) => void>(() => {});
  const eventMapRef = useRef(new Map<string, DecoderEvent>());
  const reattachCheckedRef = useRef(false);

  const ingestEvents = useCallback((incoming: DecoderEvent[]): boolean => {
    let conflict = "";
    for (const event of incoming) {
      const key = `${event.runId}:${event.seq}`;
      const existing = eventMapRef.current.get(key);
      const assessment = assessDecoderEvent(existing, event);
      if (assessment !== "new") {
        if (assessment === "conflict") {
          conflict = `Ledger fork detected at sequence ${event.seq}; the original event was preserved and the conflicting copy was not displayed.`;
          break;
        }
        continue;
      }
      eventMapRef.current.set(key, event);
      latestSeqRef.current = Math.max(latestSeqRef.current, event.seq);
    }
    if (conflict) {
      setLedgerConflict(conflict);
      setStatus("ledger_conflict");
      setStreamConnected(false);
      terminalRef.current = true;
      disconnectRef.current?.();
      return false;
    }
    setEvents([...eventMapRef.current.values()].sort((left, right) => left.seq - right.seq));
    return true;
  }, []);

  const units = useMemo(() => {
    const dissentByRound = new Map<number, unknown>();
    for (const event of events) {
      if (event.kind === "dissent_preserved") dissentByRound.set(roundOf(event), event.payload);
    }
    return events
      .map(unitFromEvent)
      .filter((unit): unit is CommittedUnit => unit !== null)
      .map((unit) => ({ ...unit, dissent: dissentByRound.get(unit.round) ?? unit.dissent }));
  }, [events]);
  const rosterHealth = useMemo(
    () =>
      ROSTER.map((entry) => {
        const base = health?.agents.find((agent) => agent.id === entry.id);
        const attempts = events.filter(
          (event) => event.kind === "provider_attempt" && providerId(event) === entry.id,
        );
        const successfulAttempts = attempts.filter(
          (event) => stringValue(event.payload.status)?.toLowerCase() === "ok",
        );
        const liveVerified = successfulAttempts.length > 0;
        const reportedModel = stringValue(
          ...successfulAttempts
            .map((event) => deepFind(event.payload, ["reportedModel", "servedModel"]))
            .reverse(),
        );
        const reportedModels = successfulAttempts
          .map((event) => deepFind(event.payload, ["reportedModels"]))
          .reverse()
          .find((value) => Array.isArray(value));
        const normalizedReportedModels = Array.isArray(reportedModels)
          ? reportedModels.filter((model): model is string => typeof model === "string")
          : base?.reportedModels;
        if (!base && !liveVerified && !reportedModel && !normalizedReportedModels?.length) return undefined;
        return {
          ...(base ?? {
            id: entry.id,
            provider: "unknown" as const,
            label: entry.name,
            requestedModel: "unreported",
            requestedEffort: "unreported",
            binaryPresent: false,
            liveVerified: false,
          }),
          liveVerified: Boolean(base?.liveVerified || liveVerified),
          reportedModel: reportedModel ?? base?.reportedModel,
          reportedModels: normalizedReportedModels,
        } satisfies DecoderAgentHealth;
      }),
    [events, health],
  );
  const committedOutput = useMemo(
    () => units.filter((unit) => unit.kind !== "stop").map((unit) => unit.text).join(""),
    [units],
  );
  const invalidCommitCount = useMemo(
    () => events.filter(isCommitEvent).length - units.length,
    [events, units],
  );
  const terminal = Boolean(latestTerminalEvent(events)) || isDecoderTerminalStatus(status);
  const stoppedBy = terminalReason(events) ?? (isDecoderTerminalStatus(status) ? status : null);
  const latestEvent = events.at(-1) ?? null;
  const currentRound = Math.max(-1, ...events.map(roundOf));
  const currentPhase = latestEvent ? phaseOf(latestEvent) : "waiting to start";
  const latestPhaseCompletion = [...events]
    .reverse()
    .find((event) => event.kind === "phase_completed" && roundOf(event) === currentRound);
  const phaseReceipt = phaseReceiptStatus(latestPhaseCompletion);
  const completeness = useMemo(
    () => transcriptCompleteness(
      events,
      terminal,
      Boolean(ledgerConflict),
      Boolean(transcriptIssue),
      invalidCommitCount,
    ),
    [events, terminal, ledgerConflict, transcriptIssue, invalidCommitCount],
  );
  const agentsReady = decoderAgentsReady(health);
  const active = Boolean(runId) && !terminal && status !== "idle";

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      setHealth(await fetchDecoderHealth());
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const reconcile = useCallback(async (id: string) => {
    try {
      const details = await fetchDecoderRun(id);
      if (details.runId !== id || details.events.some((event) => event.runId !== id)) {
        setTranscriptIssue("Decoder reconciliation returned events for a different run identity.");
        return;
      }
      if (!ingestEvents(details.events)) return;
      if (details.error) setError(details.error);
      if (details.status) {
        setStatus(details.status);
        if (isDecoderTerminalStatus(details.status)) terminalRef.current = true;
      }
    } catch {
      // The SSE reconnect remains authoritative; reconciliation retries later.
    }
  }, [ingestEvents]);

  const connect = useCallback(
    (id: string) => {
      disconnectRef.current?.();
      disconnectRef.current = subscribeDecoderRun(id, {
        afterSeq: latestSeqRef.current >= 0 ? latestSeqRef.current : undefined,
        onOpen: () => {
          setStreamConnected(true);
          setStreamNotice("");
        },
        onEvent: (event) => {
          if (event.runId !== id) {
            setTranscriptIssue("Decoder stream returned an event for a different run identity.");
            return;
          }
          if (!ingestEvents([event])) return;
          if (latestTerminalEvent([event])) {
            terminalRef.current = true;
            setStatus(statusFromTerminalReason(terminalReason([event])));
            setStreamConnected(false);
            disconnectRef.current?.();
          } else {
            setStatus((current) =>
              current === "starting" || current === "idle" ? "running" : current,
            );
          }
        },
        onStatus: (next) => {
          const nextStatus = stringValue(next.status);
          if (nextStatus) {
            setStatus(nextStatus);
            if (isDecoderTerminalStatus(nextStatus)) {
              terminalRef.current = true;
              setStreamConnected(false);
              disconnectRef.current?.();
              void reconcile(id);
            }
          }
          const nextError = stringValue(next.error);
          if (nextError) setError(nextError);
        },
        onError: (message) => {
          setStreamConnected(false);
          if (terminalRef.current) return;
          setStreamNotice(message);
          disconnectRef.current?.();
          void reconcile(id);
          if (reconnectTimerRef.current != null) window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = window.setTimeout(() => {
            if (!terminalRef.current) connectRef.current(id);
          }, 1500);
        },
        onMalformed: (message) => {
          setTranscriptIssue(message);
          setStreamNotice(message);
        },
      });
    },
    [ingestEvents, reconcile],
  );

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (reattachCheckedRef.current) return;
    reattachCheckedRef.current = true;
    let disposed = false;
    void (async () => {
      try {
        const list = await fetchDecoderRuns();
        if (disposed || list.active.length !== 1) return;
        const id = list.active[0].runId;
        const details = await fetchDecoderRun(id);
        if (
          disposed ||
          details.runId !== id ||
          details.events.some((event) => event.runId !== id)
        ) {
          if (!disposed) {
            setTranscriptIssue("Decoder re-attachment returned events for a different run identity.");
          }
          return;
        }
        eventMapRef.current.clear();
        latestSeqRef.current = -1;
        terminalRef.current = false;
        setRunId(id);
        setPrompt(details.userPrompt ?? "");
        if (details.maxRounds) setMaxRounds(details.maxRounds);
        setStatus(details.status || "running");
        if (!ingestEvents(details.events)) return;
        connectRef.current(id);
      } catch {
        // Normal when no live run exists; the prompt remains ready.
      }
    })();
    return () => {
      disposed = true;
    };
  }, [ingestEvents]);

  useEffect(
    () => () => {
      disconnectRef.current?.();
      if (reconnectTimerRef.current != null) window.clearTimeout(reconnectTimerRef.current);
    },
    [],
  );

  const start = async (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Enter a live prompt before starting the decoder.");
      return;
    }
    if (!Number.isInteger(maxRounds) || maxRounds < 1) {
      setError("Max rounds must be a positive whole number.");
      return;
    }
    setError("");
    setStreamNotice("");
    setVerifyResult(null);
    setEvents([]);
    eventMapRef.current.clear();
    setRunId(null);
    setStatus("starting");
    setStarting(true);
    setLedgerConflict("");
    setTranscriptIssue("");
    latestSeqRef.current = -1;
    terminalRef.current = false;
    if (reconnectTimerRef.current != null) window.clearTimeout(reconnectTimerRef.current);
    disconnectRef.current?.();
    try {
      const response = await startDecoderRun({ prompt, maxRounds });
      setRunId(response.runId);
      setStatus(response.status ?? "starting");
      connect(response.runId);
    } catch (nextError: unknown) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setStarting(false);
    }
  };

  const cancel = async (event: FormEvent) => {
    event.preventDefault();
    if (!runId || !cancelActor.trim() || !cancelReason.trim()) return;
    setCancelling(true);
    setError("");
    try {
      const response = await cancelDecoderRun(runId, {
        actor: cancelActor.trim(),
        reason: cancelReason.trim(),
      });
      setStatus(response.status || "cancelling");
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setCancelling(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    setError("");
    try {
      setVerifyResult(await verifyDecoderEvents(events));
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="space-y-5" data-testid="decoder-lab" aria-labelledby="decoder-lab-title">
      <header className="glass ledger-glow p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow text-tribunal-gold">Live explainable decoder</p>
            <h1 id="decoder-lab-title" className="mt-2 font-serif text-3xl text-zinc-100 md:text-4xl">
              Decoder Lab
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              A fresh two-provider deliberation selects exactly one visible surface unit per round.
              The output below is the exact concatenation of committed SPAN, SPACE, and ENTER units;
              STOP ends the run before another round opens.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-testid="decoder-status">
            <StatusChip status={status} connected={streamConnected} />
            <span className="status-chip status-chip-neutral">
              {currentRound >= 0 ? `round ${currentRound + 1}` : "no round"}
            </span>
            <span className="status-chip status-chip-neutral">last phase quorum {phaseReceipt.quorum}/2</span>
            {phaseReceipt.present && (
              <span className={`status-chip ${phaseReceipt.valid ? "status-chip-live" : "status-chip-error"}`}>
                phase {phaseReceipt.valid ? "valid" : "invalid"}
              </span>
            )}
          </div>
        </div>
        <div className="sr-only" aria-live="polite">
          Decoder status {status}. Phase {currentPhase}. Round {currentRound >= 0 ? currentRound + 1 : 0}.
          {streamNotice}
        </div>
      </header>

      {error && (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
          <button type="button" className="text-button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      {ledgerConflict && (
        <div className="notice notice-error" role="alert">
          <span>{ledgerConflict}</span>
        </div>
      )}
      {invalidCommitCount > 0 && (
        <div className="notice notice-error" role="alert">
          {invalidCommitCount} committed event{invalidCommitCount === 1 ? "" : "s"} failed exact tagged-unit validation and were not rendered.
        </div>
      )}
      {!error && streamNotice && <div className="notice notice-warn">{streamNotice}</div>}

      <div className="grid gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <form className="glass space-y-4 p-4 md:p-5" onSubmit={start}>
            <div>
              <p className="eyebrow">Prompt</p>
              <h2 className="mt-1 font-serif text-2xl text-zinc-100">Ask the live pair</h2>
            </div>
            <label htmlFor="decoder-prompt" className="block">
              <span className="field-label">Arbitrary live prompt</span>
              <textarea
                id="decoder-prompt"
                data-testid="decoder-prompt"
                className={`${CONTROL_CLASS} mt-1.5 min-h-40 resize-y leading-relaxed`}
                value={prompt}
                onChange={(next) => setPrompt(next.target.value)}
                placeholder="Ask a question or request a response…"
                disabled={active || starting}
                required
              />
            </label>
            <label htmlFor="decoder-max-rounds" className="block">
              <span className="field-label">Max rounds</span>
              <input
                id="decoder-max-rounds"
                className={`${CONTROL_CLASS} mt-1.5`}
                type="number"
                min={1}
                max={600}
                step={1}
                value={maxRounds}
                onChange={(next) => setMaxRounds(Number(next.target.value))}
                disabled={active || starting}
              />
              <span className="field-help mt-1 block">
                A budget ending is reported as budget_exhausted, never as model STOP.
              </span>
              <span className="field-help mt-1 block">
                Provider calls have no latency deadline; they wait for completion or operator cancellation.
              </span>
            </label>

            <button
              type="submit"
              className="primary-button w-full"
              data-testid="decoder-start"
              disabled={active || starting || healthLoading || !agentsReady || !prompt.trim()}
            >
              {starting ? "Starting live decoder…" : "Start live decoder"}
            </button>
            {!healthLoading && !agentsReady && (
              <p className="text-xs text-rose-300">
                Both exact local CLI model/effort pins must match before this two-provider run can start.
              </p>
            )}
          </form>

          <section className="glass p-4" aria-labelledby="decoder-roster-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Read-only roster</p>
                <h2 id="decoder-roster-title" className="mt-1 text-sm font-semibold text-zinc-200">
                  Exactly two provider CLIs
                </h2>
              </div>
              <button type="button" className="text-button" onClick={() => void refreshHealth()} disabled={healthLoading}>
                {healthLoading ? "Checking…" : "Refresh"}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {ROSTER.map((entry) => (
                <RosterCard
                  key={entry.id}
                  entry={entry}
                  health={rosterHealth.find((agent) => agent?.id === entry.id)}
                  loading={healthLoading}
                />
              ))}
            </div>
          </section>

          {active && (
            <form className="glass space-y-3 border-rose-400/20 p-4" onSubmit={cancel}>
              <div>
                <p className="eyebrow text-rose-300">Operator cancellation</p>
                <p className="field-help mt-1">Cancellation is distinct from a model-emitted STOP.</p>
              </div>
              <label htmlFor="decoder-cancel-actor" className="block">
                <span className="field-label">Actor</span>
                <input
                  id="decoder-cancel-actor"
                  className={`${CONTROL_CLASS} mt-1`}
                  value={cancelActor}
                  onChange={(next) => setCancelActor(next.target.value)}
                  maxLength={120}
                />
              </label>
              <label htmlFor="decoder-cancel-reason" className="block">
                <span className="field-label">Public reason</span>
                <textarea
                  id="decoder-cancel-reason"
                  className={`${CONTROL_CLASS} mt-1 min-h-20 resize-y`}
                  value={cancelReason}
                  onChange={(next) => setCancelReason(next.target.value)}
                  maxLength={1000}
                />
              </label>
              <button
                type="submit"
                className="danger-button w-full"
                data-testid="decoder-cancel"
                disabled={cancelling || status === "cancelling" || !cancelActor.trim() || !cancelReason.trim()}
              >
                {cancelling ? "Requesting cancellation…" : "Cancel run"}
              </button>
            </form>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="glass overflow-hidden" aria-labelledby="decoder-output-title">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 p-4">
              <div>
                <p className="eyebrow">Exact accumulated output</p>
                <h2 id="decoder-output-title" className="mt-1 text-sm font-semibold text-zinc-200">
                  One committed unit per round
                </h2>
              </div>
              <span className="status-chip status-chip-neutral">
                {units.length} {units.length === 1 ? "unit" : "units"}
              </span>
            </div>
            <div className="relative bg-zinc-950/40">
              <pre
                data-testid="decoder-output"
                className="min-h-40 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-base leading-relaxed text-zinc-100"
                aria-label="Exact accumulated decoder output"
                tabIndex={0}
              >
                {committedOutput}
              </pre>
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {units.length
                  ? `Round ${units.at(-1)!.round + 1} committed ${unitLabel(units.at(-1)!.kind)}.`
                  : "No decoder unit committed."}
              </div>
              {units.length === 0 && (
                <p className="pointer-events-none absolute left-5 top-5 text-sm text-zinc-600" aria-hidden="true">
                  No surface unit has been committed yet.
                </p>
              )}
              {units.length > 0 && committedOutput.length === 0 && (
                <p className="pointer-events-none absolute left-5 top-5 text-sm text-zinc-500" aria-hidden="true">
                  Exact output is empty; STOP was committed.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
              <span>Phase: {currentPhase}</span>
              <span>{terminalCopy(stoppedBy)}</span>
            </div>
          </section>

          <section className="glass p-4" aria-labelledby="emission-timeline-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Emission timeline</p>
                <h2 id="emission-timeline-title" className="mt-1 text-sm font-semibold text-zinc-200">
                  Every visible commitment
                </h2>
              </div>
              <span className="status-chip status-chip-neutral">quorum target 2/2</span>
            </div>
            {units.length ? (
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {units.map((unit) => (
                  <li key={unit.seq} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-chip status-chip-neutral">round {unit.round + 1}</span>
                      <span className={`status-chip ${unit.kind === "stop" ? "status-chip-live" : "status-chip-neutral"}`}>
                        {unitLabel(unit.kind)}
                      </span>
                      <span className="status-chip status-chip-neutral">{consensusLabel(unit)}</span>
                    </div>
                    <p className="mt-2 break-all font-mono text-sm text-zinc-200">{unitLiteral(unit)}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">Rule: {unit.rule}</p>
                    {unit.support != null && (
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        support {unit.support}/2
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-xs text-zinc-500">Committed units will appear here in ledger order.</p>
            )}
          </section>

          <section className="glass overflow-hidden" aria-labelledby="public-exchange-title">
            <div className="border-b border-zinc-800 p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <p className="eyebrow">Chronological public record</p>
                  <h2 id="public-exchange-title" className="mt-1 font-serif text-2xl text-zinc-100">
                    Public provider exchange — not private chain-of-thought
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Every prompt sent by Decoder Lab and every public CLI response received is shown when the ledger contains it.
                    Provider-hidden reasoning, private system text, and undisclosed platform policy are unavailable and are not claimed here.
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`status-chip ${completeness.state === "full" ? "status-chip-live" : completeness.state === "partial" ? "status-chip-error" : "status-chip-warn"}`}>
                    transcript {completeness.state}
                  </span>
                  <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-zinc-500">{completeness.note}</p>
                </div>
              </div>
            </div>
            <ol
              className="max-h-[900px] divide-y divide-zinc-800 overflow-y-auto"
              data-testid="decoder-transcript"
              tabIndex={0}
              aria-label="Chronological public decoder transcript"
            >
              {events.map((event) => (
                <TranscriptEvent key={`${event.runId}:${event.seq}`} event={event} />
              ))}
              {events.length === 0 && (
                <li className="p-5 text-sm text-zinc-500">The public exchange will stream here as ledger events arrive.</li>
              )}
            </ol>
          </section>

          <section className="glass p-4" aria-labelledby="decoder-integrity-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="eyebrow">Exact ledger integrity</p>
                <h2 id="decoder-integrity-title" className="mt-1 text-sm font-semibold text-zinc-200">
                  Export and verify
                </h2>
                <p className="field-help mt-1">
                  Verification must bind the final output to exact committed whitespace and newlines.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => downloadLedger(runId, events)}
                  disabled={!events.length}
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void verify()}
                  disabled={!events.length || verifying || !terminal || Boolean(ledgerConflict) || invalidCommitCount > 0}
                >
                  {verifying ? "Verifying…" : "Verify exact ledger"}
                </button>
              </div>
            </div>
            {verifyResult && <VerificationResult result={verifyResult} />}
          </section>
        </div>
      </div>
    </section>
  );
}

function StatusChip({ status, connected }: { status: string; connected: boolean }) {
  const tone = decoderStatusTone(status);
  const className = tone === "error"
    ? "status-chip-error"
    : tone === "live"
      ? "status-chip-live"
      : "status-chip-neutral";
  return (
    <span className={`status-chip ${className}`}>
      {status}
      {connected && <span className="live-dot" aria-label="event stream connected" />}
    </span>
  );
}

function RosterCard({
  entry,
  health,
  loading,
}: {
  entry: (typeof ROSTER)[number];
  health?: DecoderAgentHealth;
  loading: boolean;
}) {
  const requestedModel = health?.requestedModel ?? entry.model;
  const requestedEffort = health?.requestedEffort ?? entry.effort;
  const provider = health?.provider === "unknown"
    ? "Provider identity unreported"
    : health?.provider === "openai"
      ? "OpenAI"
      : health?.provider === "anthropic"
        ? "Anthropic"
        : entry.provider;
  const proof = loading
    ? "Checking binary presence…"
    : health?.reportedModels?.length
      ? `provider models reported: ${health.reportedModels.join(", ")}`
      : health?.reportedModel
      ? `served model reported: ${health.reportedModel}`
      : health?.liveVerified
        ? "live response verified · requested through CLI; served model unverified"
        : health?.binaryPresent
          ? "binary detected · requested through CLI; served model unverified"
          : "binary not detected";
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">{entry.name}</p>
          <p className="mt-0.5 text-[10px] text-zinc-500">{provider}</p>
        </div>
        <span className={`status-chip ${health?.binaryPresent ? "status-chip-live" : "status-chip-neutral"}`}>
          {health?.binaryPresent ? "binary present" : loading ? "checking" : "unavailable"}
        </span>
      </div>
      <p className="mt-2 break-all font-mono text-[11px] text-zinc-300">
        {requestedModel} · effort {requestedEffort}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{proof}</p>
      {health?.version && <p className="mt-1 font-mono text-[10px] text-zinc-600">CLI {health.version}</p>}
      {health?.note && <p className="mt-1 text-[10px] text-zinc-500">{health.note}</p>}
    </article>
  );
}

function TranscriptEvent({ event }: { event: DecoderEvent }) {
  const agent = providerId(event);
  const round = roundOf(event);
  const providerPhase = stringValue(deepFind(event.payload, ["phase", "stage"]));
  const fields = eventEvidenceFields(event);
  const kind = event.kind.replace(/_/g, " ");
  const isTie = /tie_(?:commit|reveal)|commitment|coin/.test(event.kind);
  const isDissent = /dissent|minority/.test(event.kind);
  const isFailure = /fail|error|invalid|retry/.test(event.kind);
  return (
    <li className="p-4">
      <article aria-labelledby={`decoder-event-${event.seq}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500">#{event.seq}</span>
            <h3 id={`decoder-event-${event.seq}`} className="text-xs font-medium capitalize text-zinc-200">
              {kind}
            </h3>
            {agent && <span className="status-chip status-chip-neutral">{agent}</span>}
            {providerPhase && <span className="status-chip status-chip-neutral">{providerPhase}</span>}
            {round >= 0 && <span className="status-chip status-chip-neutral">round {round + 1}</span>}
            {isTie && <span className="status-chip status-chip-warn">tie evidence</span>}
            {isDissent && <span className="status-chip status-chip-warn">dissent preserved</span>}
            {isFailure && <span className="status-chip status-chip-error">validation / retry</span>}
          </div>
          <time className="font-mono text-[10px] text-zinc-500" dateTime={event.ts ? new Date(event.ts).toISOString() : undefined}>
            {formatTime(event.ts)}
          </time>
        </div>

        {fields.length > 0 && (
          <dl className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div key={`${field.label}:${index}`}>
                <dt className="field-label">{field.label}</dt>
                <dd className="mt-1">
                  <ExactValue value={field.value} exact={field.exact} label={field.label} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/25 p-2.5">
          <summary className="cursor-pointer text-[11px] text-zinc-400">Raw hash-chained event payload</summary>
          <pre
            className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-950 p-3 font-mono text-[10px] leading-relaxed text-zinc-400"
            tabIndex={0}
            aria-label={`Raw payload for event ${event.seq}`}
          >
            {JSON.stringify(event.payload, null, 2)}
          </pre>
          <div className="mt-2 grid gap-1 font-mono text-[9px] text-zinc-600 sm:grid-cols-2">
            <span className="break-all">hash {event.hash || "unavailable"}</span>
            <span className="break-all">previous {event.prevHash || "unavailable"}</span>
          </div>
        </details>
      </article>
    </li>
  );
}

function ExactValue({ value, exact, label }: { value: unknown; exact?: boolean; label: string }) {
  if (label === "Timing" && typeof value === "number") {
    return <p className="text-xs text-zinc-300">{formatDuration(value)}</p>;
  }
  if (typeof value === "string") {
    return (
      <pre
        className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
        aria-label={exact ? `${label}, exact text` : label}
        tabIndex={0}
      >
        {value.length ? value : ""}
      </pre>
    );
  }
  return (
    <pre
      className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
      tabIndex={0}
      aria-label={label}
    >
      {stableDisplay(value)}
    </pre>
  );
}

function VerificationResult({ result }: { result: DecoderVerifyResponse }) {
  const verify = record(result.verify ?? result);
  const ok = typeof verify.ok === "boolean" ? verify.ok : result.ok === true;
  const exact =
    typeof verify.exactOutputConsistent === "boolean"
      ? verify.exactOutputConsistent
      : typeof verify.answerConsistent === "boolean"
        ? verify.answerConsistent
        : undefined;
  const problems = Array.isArray(verify.problems) ? verify.problems : [];
  return (
    <div className={`mt-4 rounded-lg border p-3 ${ok ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-rose-400/25 bg-rose-400/[0.06]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`audit-mark ${ok ? "audit-mark-pass" : "audit-mark-fail"}`}>{ok ? "VALID" : "INVALID"}</span>
        <p className="text-xs text-zinc-300">
          Hash chain {ok ? "verified" : "needs review"}
          {exact !== undefined ? ` · exact output binding ${exact ? "passed" : "failed"}` : ""}
        </p>
      </div>
      {problems.length > 0 && (
        <ul className="mt-3 space-y-1 text-[11px] text-rose-200">
          {problems.map((problem, index) => (
            <li key={index}>{stableDisplay(problem)}</li>
          ))}
        </ul>
      )}
      {typeof verify.head === "string" && (
        <p className="mt-3 break-all font-mono text-[10px] text-zinc-500">head {verify.head}</p>
      )}
    </div>
  );
}

export default DecoderLab;
