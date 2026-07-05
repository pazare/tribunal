const API = import.meta.env.VITE_API_BASE ?? "";

export interface PackSummary {
  id: string;
  title: string;
  domain: string;
  question: string;
  tagline: string;
  problemStatement: string;
  trapNote: string;
  slots: { index: number; label: string }[];
}

export interface PanelHealth {
  offline: { available: boolean; note: string };
  cli: Record<string, { present: boolean; note: string }>;
  openrouter: { available: boolean; note: string };
  probes?: { provider: string; live: boolean; latencyMs: number; note: string }[];
}

export interface RunMeta {
  runId: string;
  packId: string;
  mode: string;
  status?: string;
  recorded?: boolean;
  label: string;
  events?: number;
}

export interface LedgerEvent {
  seq: number;
  runId: string;
  spanIndex: number | null;
  ts: number;
  kind: string;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export async function fetchPacks(): Promise<PackSummary[]> {
  const r = await fetch(`${API}/api/packs`);
  return r.json();
}

export async function fetchPanel(probe = false): Promise<PanelHealth> {
  const r = await fetch(`${API}/api/panel${probe ? "?probe=1" : ""}`);
  return r.json();
}

export async function fetchRuns(): Promise<{ live: RunMeta[]; recorded: RunMeta[] }> {
  const r = await fetch(`${API}/api/runs`);
  return r.json();
}

export async function startRun(body: {
  packId: string;
  mode: "offline" | "cli" | "openrouter";
  providers?: string[];
}): Promise<{ runId: string }> {
  const r = await fetch(`${API}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "run failed");
  return j;
}

export function subscribeRun(
  runId: string,
  onLedger: (e: LedgerEvent) => void,
  onStatus: (s: Record<string, unknown>) => void,
  pace?: number,
): () => void {
  const url = `${API}/api/runs/${runId}/events${pace ? `?pace=${pace}` : ""}`;
  const es = new EventSource(url);
  es.addEventListener("ledger", (ev) => onLedger(JSON.parse(ev.data)));
  es.addEventListener("status", (ev) => onStatus(JSON.parse(ev.data)));
  return () => es.close();
}

export async function verifyRun(runId: string) {
  const r = await fetch(`${API}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });
  return r.json();
}

export async function tamperRun(runId: string) {
  const r = await fetch(`${API}/api/runs/${runId}/tampered`);
  return r.json();
}

export async function intervene(
  runId: string,
  body: { kind: string; text: string; targetKey?: string; actor?: string },
) {
  const r = await fetch(`${API}/api/runs/${runId}/intervene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, channel: "typed", spanIndex: -1 }),
  });
  return r.json();
}

export const EVENT_LABELS: Record<string, string> = {
  run_started: "Panel convened",
  blind_commitment: "Proposal sealed",
  proposals_revealed: "Proposals revealed",
  feedback_issued: "Anonymized feedback",
  revision_received: "Revision received",
  safety_review: "Safety review",
  ratification: "Ratified",
  dissent_preserved: "Dissent preserved",
  span_committed: "Span committed",
  human_intervention: "Human intervention",
  run_finished: "Verdict finalized",
};

export const DOMAIN_META: Record<string, { icon: string; statute: string; color: string }> = {
  lending: { icon: "§", statute: "ECOA / Reg B", color: "text-tribunal-gold" },
  insurance: { icon: "⚕", statute: "SB 1120 / PxDx", color: "text-tribunal-sky" },
  benefits: { icon: "◈", statute: "Robodebt / MiDAS", color: "text-tribunal-rose" },
  moderation: { icon: "◉", statute: "EU DSA Art. 17", color: "text-tribunal-mint" },
};
