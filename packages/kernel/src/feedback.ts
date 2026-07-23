import { candidateKey } from "./types.js";
import type {
  Candidate,
  FeedbackCandidateSummary,
  FeedbackPacket,
  Proposal,
} from "./types.js";
import { mulberry32FromString } from "./rng.js";

/**
 * Build the canonical (ledger-side) controlled-feedback packet from the
 * revealed proposals. The packet aggregates, per distinct candidate:
 *   - support count (how many seats proposed it),
 *   - mean confidence + dispersion (spread of confidence — a disagreement signal),
 *   - the strongest supporting argument (highest-confidence warrant), and
 *   - the strongest objection against it (highest-severity objection).
 *
 * In the anonymized arm, attribution is omitted. In the identity-visible control
 * arm, the same summary carries explicit seat/society/provider attributions.
 */
export function buildFeedbackPacket(
  proposals: Proposal[],
  spanIndex: number,
  roundNo: number,
  anonymize: boolean,
): FeedbackPacket {
  const byKey = new Map<
    string,
    {
      candidate: Candidate;
      confidences: number[];
      args: { text: string; conf: number }[];
      objections: { text: string; severity: number }[];
      evidenceConflicts: Set<string>;
      attributions: { seatId: string; society: Proposal["society"]; provider: Proposal["provider"] }[];
    }
  >();

  for (const p of proposals) {
    for (const sc of p.candidates) {
      const key = candidateKey(sc.candidate);
      const slot = byKey.get(key) ?? {
        candidate: sc.candidate,
        confidences: [],
        args: [],
        objections: [],
        evidenceConflicts: new Set<string>(),
        attributions: [],
      };
      slot.confidences.push(sc.confidence);
      slot.args.push({ text: sc.warrant, conf: sc.confidence });
      slot.attributions.push({ seatId: p.seatId, society: p.society, provider: p.provider });
      byKey.set(key, slot);
    }
    for (const o of p.objections) {
      const slot = byKey.get(o.targetKey);
      if (slot) slot.objections.push({ text: o.text, severity: o.severity });
    }
  }

  const summaries: FeedbackCandidateSummary[] = [...byKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) // canonical key order
    .map(([, s]) => {
      const mean = avg(s.confidences);
      const strongestArg = s.args.slice().sort((a, b) => b.conf - a.conf)[0]?.text ?? "";
      const strongestObj = s.objections.slice().sort((a, b) => b.severity - a.severity)[0]?.text;
      return {
        candidate: s.candidate,
        supportCount: s.confidences.length,
        meanConfidence: round4(mean),
        confidenceDispersion: round4(stdev(s.confidences, mean)),
        strongestArgument: strongestArg,
        strongestObjection: strongestObj,
        evidenceConflicts: [...s.evidenceConflicts],
        ...(!anonymize ? { attributions: s.attributions } : {}),
      };
    });

  const overall = round4(avg(summaries.map((x) => x.confidenceDispersion)));
  const guidance = anonymize
    ? "Feedback is anonymized and your candidate order is shuffled. Weigh arguments, not authors."
    : "Feedback shows authorship (anonymization disabled for this run).";

  return { spanIndex, roundNo, summaries, overallDispersion: overall, guidance };
}

/**
 * Produce a per-recipient permutation of the summary indices (position-bias
 * control). Deterministic in the run seed + recipient id so it is reproducible
 * and ledgerable, but different across recipients.
 */
export function orderFor(
  summaryCount: number,
  recipientSeatId: string,
  seed: number,
  randomize: boolean,
): number[] {
  const idx = Array.from({ length: summaryCount }, (_, i) => i);
  if (!randomize) return idx;
  const rng = mulberry32FromString(`${seed}:${recipientSeatId}`);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function applyOrder<T>(items: T[], order: number[]): T[] {
  return order.map((i) => items[i]);
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[], mean: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
