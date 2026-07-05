import { hashOf, stableId } from "../hash.js";
import type {
  Objection,
  Provider,
  ScoredCandidate,
  Society,
} from "../types.js";
import type {
  PanelClient,
  ProposeRequest,
  ProposeResult,
  ReviseRequest,
  ReviseResult,
} from "./base.js";

/**
 * Deterministic, keyless panel used ONLY for tests, CI, and instant offline
 * smoke-demos. It is labeled `provider: "offline"`, `transport: "offline"` in the
 * ledger, and the run banner says so. It makes NO network/model call and never
 * claims to. Its job is to exercise every code path (proposals, objections,
 * revisions answering objections, safety veto, STOP) byte-deterministically under
 * a seed — so determinism and tamper-evidence can be tested without a provider.
 *
 * Each seat derives distinct, non-trivial content from (society, case, seed) so
 * the anonymization/anti-anchoring machinery has real, differing inputs to act on.
 */
export class OfflinePanelClient implements PanelClient {
  readonly transport = "offline" as const;
  constructor(
    readonly seatId: string,
    readonly society: Society,
    readonly provider: Provider = "offline",
    readonly model: string = "offline/scripted-v1",
  ) {}

  async propose(req: ProposeRequest): Promise<ProposeResult> {
    const { view, seed } = req;
    const slot = view.case.slot;
    const rng = mulberry32(hashOf([this.society, view.case.runId, slot.index, seed]));
    const cands = slot.candidatesHint && slot.candidatesHint.length ? slot.candidatesHint : ["<STOP>"];
    const scored: ScoredCandidate[] = cands.map((text, i) => {
      const isStop = text === "<STOP>";
      const bias = SOCIETY_BIAS[this.society];
      return {
        candidate: { text: isStop ? "" : text, isStop },
        confidence: round2(clampBias(0.55 + bias.confidence + rng() * 0.2 - 0.1)),
        factualityRisk: round2(clampBias(0.2 + (isStop ? -0.1 : 0) + bias.factuality + rng() * 0.1)),
        legalRisk: round2(clampBias(0.15 + bias.legal + rng() * 0.1)),
        fairnessRisk: round2(clampBias(0.2 + bias.fairness + rng() * 0.1)),
        affectedPartyImpact: round2(clampBias(0.5 + bias.impact + rng() * 0.1)),
        warrant: warrantFor(this.society, text, view),
        evidenceRefs: view.evidence.slice(0, 1).map((e) => e.id),
      };
    });
    // Sort so each society "prefers" a different candidate → real disagreement.
    scored.sort((a, b) => b.confidence - a.confidence);

    const objections: Objection[] = [];
    if (this.society === "adversary" || this.society === "safety") {
      const target = cands.find((t) => t !== "<STOP>") ?? "<STOP>";
      objections.push({
        id: stableId("obj", this.society, target, slot.index),
        targetKey: target === "<STOP>" ? "<STOP>" : target,
        text: objectionFor(this.society, target, view),
        severity: this.society === "safety" ? 0.7 : 0.5,
        kind: this.society === "safety" ? "legal" : "factual",
        raisedBy: this.society,
      });
    }

    return {
      repaired: 0,
      usage: { provider: this.provider, model: this.model, status: "ok", transport: "offline" },
      proposal: {
        seatId: this.seatId,
        society: this.society,
        provider: this.provider,
        spanIndex: slot.index,
        candidates: scored,
        rejectedAlternatives: cands
          .filter((_, i) => i > 0)
          .slice(0, 1)
          .map((t) => ({ text: t === "<STOP>" ? "(stop)" : t, reason: warrantReject(this.society) })),
        publicWarrant: warrantFor(this.society, scored[0].candidate.text || "<STOP>", view),
        objections,
      },
    };
  }

  async revise(req: ReviseRequest): Promise<ReviseResult> {
    const { view, ownRound1, feedback, guidance, seed } = req;
    const rng = mulberry32(hashOf([this.society, "revise", view.case.runId, view.case.slot.index, seed]));
    // Move toward the highest-support candidate unless this seat is the adversary
    // or safety (which hold their ground to produce preserved dissent).
    const bestSupported = [...feedback].sort((a, b) => b.supportCount - a.supportCount)[0];
    const holdGround = this.society === "adversary" || this.society === "safety";
    const finalCand = holdGround ? ownRound1[0].candidate : bestSupported.candidate;
    const changed =
      (finalCand.isStop ? "<STOP>" : finalCand.text) !==
      (ownRound1[0].candidate.isStop ? "<STOP>" : ownRound1[0].candidate.text);

    const final: ScoredCandidate = {
      candidate: finalCand,
      confidence: round2(Math.min(0.98, ownRound1[0].confidence + (changed ? 0.05 : 0.02) + rng() * 0.05)),
      factualityRisk: ownRound1[0].factualityRisk,
      legalRisk: ownRound1[0].legalRisk,
      fairnessRisk: ownRound1[0].fairnessRisk,
      affectedPartyImpact: ownRound1[0].affectedPartyImpact,
      warrant: warrantFor(this.society, finalCand.isStop ? "<STOP>" : finalCand.text, view),
      evidenceRefs: ownRound1[0].evidenceRefs,
    };

    const maintained: Objection[] = holdGround
      ? [
          {
            id: stableId("mobj", this.society, view.case.slot.index),
            targetKey: bestSupported.candidate.isStop ? "<STOP>" : bestSupported.candidate.text,
            text: objectionFor(this.society, bestSupported.candidate.text || "<STOP>", view),
            severity: this.society === "safety" ? 0.72 : 0.55,
            kind: this.society === "safety" ? "legal" : "fairness",
            raisedBy: this.society,
          },
        ]
      : [];

    return {
      repaired: 0,
      usage: { provider: this.provider, model: this.model, status: "ok", transport: "offline" },
      revision: {
        seatId: this.seatId,
        society: this.society,
        provider: this.provider,
        spanIndex: view.case.slot.index,
        final,
        changedFromRound1: changed,
        answerToStrongestObjection:
          bestSupported.strongestObjection
            ? `On "${bestSupported.strongestObjection}": ${answerObjection(this.society, view)}`
            : `The record (${view.evidence.map((e) => e.id).join(", ") || "case file"}) supports this span; ${guidance}`,
        steelmanOfBestRival: `The strongest case for the rival is that ${bestSupported.strongestArgument}`,
        changeMyMind: changeMyMind(this.society, view),
        maintainedObjections: maintained,
      },
    };
  }
}

// --- deterministic content helpers -----------------------------------------

const SOCIETY_BIAS: Record<Society, { confidence: number; factuality: number; legal: number; fairness: number; impact: number }> = {
  evidence: { confidence: 0.08, factuality: -0.08, legal: 0, fairness: 0, impact: 0 },
  adversary: { confidence: -0.05, factuality: 0.06, legal: 0.04, fairness: 0.06, impact: 0.05 },
  law_policy: { confidence: 0.04, factuality: 0, legal: 0.08, fairness: 0.02, impact: 0.02 },
  affected_party: { confidence: 0.02, factuality: 0, legal: 0.02, fairness: 0.1, impact: 0.15 },
  safety: { confidence: 0.0, factuality: 0.02, legal: 0.12, fairness: 0.06, impact: 0.06 },
  concision: { confidence: 0.06, factuality: 0, legal: 0, fairness: 0, impact: -0.02 },
};

function warrantFor(society: Society, text: string, view: any): string {
  const ev = view.evidence?.[0]?.id ? ` grounded in ${view.evidence[0].id}` : "";
  const t = text === "<STOP>" ? "stopping here" : `"${text}"`;
  switch (society) {
    case "evidence":
      return `Evidence seat: ${t} is the span best supported by the case record${ev}.`;
    case "adversary":
      return `Adversary seat: ${t} survives the sharpest attack I can mount${ev}, but see my objection.`;
    case "law_policy":
      return `Law/Policy seat: ${t} satisfies the binding constraints and required disclosures${ev}.`;
    case "affected_party":
      return `Affected-party seat: ${t} is the least-harmful span consistent with the evidence${ev}.`;
    case "safety":
      return `Safety seat: ${t} does not, on review, cross the veto threshold${ev}.`;
    case "concision":
      return `Concision seat: ${t} is the shortest span that fully answers the slot${ev}.`;
  }
}

function warrantReject(society: Society): string {
  return `${society} seat rejected this as weaker under its mandate.`;
}

function objectionFor(society: Society, text: string, view: any): string {
  const q = view.case?.question ?? "the decision";
  if (society === "safety")
    return `This span risks a compliance gap on "${q}" — it may omit a required disclosure or overstate certainty.`;
  return `This span leans on an inference the record does not fully support for "${q}"; the premise should be checked.`;
}

function answerObjection(society: Society, view: any): string {
  return `the cited evidence (${view.evidence?.map((e: any) => e.id).join(", ") || "case file"}) addresses it, and the ${society} mandate is satisfied.`;
}

function changeMyMind(society: Society, view: any): string {
  return `A document contradicting ${view.evidence?.[0]?.id ?? "the primary evidence"} would flip the ${society} seat.`;
}

function mulberry32(seedStr: string) {
  let a = parseInt(seedStr.slice(0, 8), 16) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function clampBias(x: number): number {
  return Math.max(0.02, Math.min(0.98, x));
}
