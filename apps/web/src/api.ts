const API = import.meta.env.VITE_API_BASE ?? "";

export type PanelMode = "offline" | "cli" | "openrouter";
export type PanelChoice = "auto" | PanelMode;
export type SeatingMode = "pool" | "exact";
export type InterventionKind = "objection" | "veto" | "question" | "affirm";
export type InterventionChannel = "typed" | "voice";
export const SOCIETIES = [
  "evidence",
  "adversary",
  "law_policy",
  "affected_party",
  "safety",
  "concision",
] as const;
export type Society = (typeof SOCIETIES)[number];
export interface SeatAssignment {
  provider: string;
  model?: string;
}
export interface PanelAssignments {
  cli: Record<Society, SeatAssignment>;
  openrouter: Record<Society, SeatAssignment>;
}

export interface CancellationReceipt {
  actor: string;
  reason: string;
  requestedAt: number;
  unappliedInterventions: number;
  unappliedInterventionIds: string[];
}

export interface QueuedIntervention {
  interventionId: string;
  spanIndex: number;
  actor: string;
  kind: InterventionKind;
  channel: InterventionChannel;
  text: string;
  targetKey?: string;
}

export interface Constraint {
  id: string;
  kind: "statute" | "regulation" | "policy" | "user" | "system";
  text: string;
  cite?: string;
}

export interface EvidenceItem {
  id: string;
  source: string;
  citation: string;
  summary: string;
  quality: number;
  contradicts?: string[];
}

export interface DecisionSlot {
  index: number;
  label: string;
  instruction?: string;
  riskBands?: Record<string, string>;
  candidatesHint?: string[];
}

export interface CaseDocument {
  id: string;
  title: string;
  body: string;
}

export interface PackSummary {
  id: string;
  title: string;
  domain: string;
  question: string;
  tagline: string;
  problemStatement: string;
  trapNote: string;
  slots: DecisionSlot[];
  constraints: Constraint[];
  evidence: EvidenceItem[];
  documents: CaseDocument[];
}

export interface ControlFlags {
  blindRound: boolean;
  anonymizeFeedback: boolean;
  randomizeCandidateOrder: boolean;
  debateRounds: number;
  roleMemory: boolean;
  independentEvidence: boolean;
  safetyVeto: boolean;
}

export interface RunRequest {
  packId: string;
  mode: PanelMode;
  seed?: number;
  maxSpans?: number;
  flags?: Partial<ControlFlags>;
  providers?: string[];
  assignment?: Record<Society, SeatAssignment>;
  clientView?: "answer_only" | "answer_plus_summary";
}

export interface CapabilityManifest {
  defaults: {
    seed: number;
    maxSpansOffset: number;
    flags: ControlFlags;
    clientView: "answer_only" | "answer_plus_summary";
    assignments: {
      cli: Record<Society, SeatAssignment>;
      openrouter: Record<Society, SeatAssignment>;
    };
  };
  limits: {
    seed: { min: number; max: number };
    maxSpans: { min: number; max: number };
    debateRounds: { min: number; max: number };
  };
  cliProviders: string[];
  openrouterProviders: string[];
  societies: Society[];
  interventions: InterventionKind[];
  channels: InterventionChannel[];
  interventionQueue: { listPending: boolean; removePending: boolean; receiptIds: boolean };
  seating: { cliPool: boolean; exactSixSeat: Exclude<PanelMode, "offline">[]; cliModelOverride: boolean };
  verification: { runId: boolean; events: boolean; targetedTamper: boolean };
  cancellation: { liveRuns: boolean; preservesCompleteLedger: boolean; gracefulShutdown: boolean };
  charters: {
    society: string;
    title: string;
    mandate: string;
    powers: string[];
    tagline: string;
  }[];
}

export interface PanelHealth {
  offline: { available: boolean; note: string };
  cli: Record<string, { present: boolean; note: string }>;
  openrouter: { available: boolean; note: string };
  probes?: { provider: string; live: boolean; latencyMs: number; note: string }[];
}

export interface RunMeta {
  /** Storage/API key. Differs from runId when collision-safe persistence adds a suffix. */
  artifactId?: string;
  runId: string;
  packId: string;
  mode: PanelMode;
  status?: string;
  recorded?: boolean;
  label: string;
  events?: number;
  head?: string;
  verified?: boolean;
  auditability?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface LedgerEvent {
  seq: number;
  runId: string;
  spanIndex: number | null;
  ts: number;
  kind: string;
  payload: Record<string, any>;
  prevHash: string;
  hash: string;
}

export interface RunDetails {
  runId: string;
  artifactId?: string;
  events: LedgerEvent[];
  status: string;
  error?: string;
  cancellation?: CancellationReceipt;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Tribunal API returned ${response.status} without JSON`);
  }
  if (!response.ok) throw new Error(body?.error ?? `Tribunal API returned ${response.status}`);
  return body as T;
}

export function fetchPacks(): Promise<PackSummary[]> {
  return request("/api/packs");
}

export function fetchCapabilities(): Promise<CapabilityManifest> {
  return request("/api/capabilities");
}

export function fetchPanel(probe = false): Promise<PanelHealth> {
  return probe
    ? request("/api/panel/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    : request("/api/panel");
}

export function fetchRuns(): Promise<{ live: RunMeta[]; recorded: RunMeta[] }> {
  return request("/api/runs");
}

export function fetchRun(runId: string): Promise<RunDetails> {
  return request(`/api/runs/${encodeURIComponent(runId)}`);
}

export function startRun(body: RunRequest): Promise<{ runId: string }> {
  return request("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function subscribeRun(
  runId: string,
  onLedger: (event: LedgerEvent) => void,
  onStatus: (status: Record<string, unknown>) => void,
  pace?: number,
  onError?: (message: string) => void,
): () => void {
  const url = `${API}/api/runs/${encodeURIComponent(runId)}/events${pace ? `?pace=${pace}` : ""}`;
  const source = new EventSource(url);
  source.addEventListener("ledger", (event) => {
    try {
      onLedger(JSON.parse(event.data));
    } catch {
      onError?.("The ledger stream returned an unreadable event.");
    }
  });
  source.addEventListener("status", (event) => {
    try {
      onStatus(JSON.parse(event.data));
    } catch {
      onError?.("The run status stream returned an unreadable event.");
    }
  });
  source.onerror = () => onError?.("Live stream interrupted; reconnecting automatically.");
  return () => source.close();
}

export function verifyRun(runId: string) {
  return request<any>("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });
}

export function verifyEvents(events: LedgerEvent[]) {
  return request<any>("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
}

export function tamperRun(runId: string, seq?: number) {
  const query = typeof seq === "number" ? `?seq=${seq}` : "";
  return request<any>(`/api/runs/${encodeURIComponent(runId)}/tampered${query}`);
}

export function cancelRun(runId: string, body: { actor: string; reason: string }) {
  return request<{
    accepted: boolean;
    status: "cancelling" | "cancelled";
    cancellation: CancellationReceipt;
  }>(
    `/api/runs/${encodeURIComponent(runId)}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function fetchInterventions(runId: string) {
  return request<{
    status: string;
    currentSpan: number;
    lastInterventionPullSpan: number;
    pending: QueuedIntervention[];
    processing: QueuedIntervention[];
  }>(`/api/runs/${encodeURIComponent(runId)}/interventions`);
}

export function cancelIntervention(runId: string, interventionId: string) {
  return request<{ cancelled: true; interventionId: string; status: "not_applied" }>(
    `/api/runs/${encodeURIComponent(runId)}/interventions/${encodeURIComponent(interventionId)}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );
}

export function intervene(
  runId: string,
  body: {
    kind: InterventionKind;
    text: string;
    targetKey?: string;
    actor?: string;
    channel?: InterventionChannel;
    spanIndex?: number;
  },
) {
  return request<{ queued: boolean; interventionId: string; willApplyAtSpan: number }>(
    `/api/runs/${encodeURIComponent(runId)}/intervene`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        channel: body.channel ?? "typed",
        spanIndex: body.spanIndex ?? -1,
      }),
    },
  );
}

export const EVENT_LABELS: Record<string, string> = {
  run_started: "Panel convened",
  decision_opened: "Decision opened",
  case_presented: "Case presented",
  blind_commitment: "Proposal sealed",
  proposals_revealed: "Proposals revealed",
  feedback_issued: "Delphi feedback",
  feedback_view_assigned: "Ballot order assigned",
  revision_received: "Revision received",
  safety_review: "Safety review",
  escalation_triggered: "Evidence escalation",
  ratification: "Span ratified",
  dissent_preserved: "Dissent preserved",
  span_committed: "Span committed",
  human_intervention: "Human intervention",
  memory_updated: "Memory updated",
  provider_call: "Provider call",
  decision_closed: "Decision closed",
  run_finished: "Run closed",
};

export const DOMAIN_META: Record<string, { label: string; statute: string; color: string }> = {
  lending: { label: "Lending", statute: "ECOA / Reg B", color: "text-tribunal-gold" },
  insurance: { label: "Insurance", statute: "SB 1120 / PxDx", color: "text-tribunal-sky" },
  benefits: { label: "Benefits", statute: "Robodebt / MiDAS", color: "text-tribunal-rose" },
  moderation: { label: "Moderation", statute: "EU DSA Art. 17", color: "text-tribunal-mint" },
};
