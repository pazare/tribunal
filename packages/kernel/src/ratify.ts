import { stableId } from "./hash.js";
import { candidateKey } from "./types.js";
import type {
  CandidateScoreRow,
  DissentRecord,
  Objection,
  RatificationDecision,
  RatificationMethod,
  Revision,
  SafetyVerdict,
  ScoredCandidate,
  VetoRecord,
} from "./types.js";

export interface RatifyInput {
  spanIndex: number;
  revisions: Revision[];
  safety: SafetyVerdict[];
  vetoEnabled: boolean;
  /** dissent carried in from earlier spans (kept on the record). */
  carriedDissent: DissentRecord[];
  /** escalation rounds already spent on this span. */
  escalationRoundsDone: number;
}

/**
 * Constitutional ratification. Builds a per-candidate score table from the final
 * revisions, applies safety vetoes, then walks an ORDERED meta-constitution and
 * fires the FIRST rule that applies. The fired rule name + its public reason are
 * part of the returned decision (and therefore the ledger). Material minority
 * objections are preserved as dissent regardless of which candidate won.
 */
export function ratify(input: RatifyInput): RatificationDecision {
  const { spanIndex, revisions, safety, vetoEnabled } = input;

  // --- aggregate the candidate table ---------------------------------------
  const rows = buildTable(revisions);
  const vetoedKeys = new Set(
    vetoEnabled ? safety.filter((s) => s.veto).map((s) => s.candidateKey) : [],
  );
  const vetoes: VetoRecord[] = safety
    .filter((s) => s.veto && vetoEnabled)
    .map((s) => ({ candidateKey: s.candidateKey, publicReason: s.publicReason, upheld: true }));

  const eligible = rows.filter((r) => !vetoedKeys.has(r.key));
  const table = rows; // full table is public (vetoed rows included, marked by veto records)

  // --- ordered meta-constitution -------------------------------------------
  const totalSeats = revisions.length;
  const support = (key: string) => rows.find((r) => r.key === key)?.support ?? 0;
  const byScore = [...eligible].sort((a, b) => b.aggregateScore - a.aggregateScore);
  const top = byScore[0];

  let method: RatificationMethod;
  let metaRule: string;
  let selectedKey: string;
  let publicReason: string;
  let escalationRounds = input.escalationRoundsDone;

  const stopRow = eligible.find((r) => r.key === "<STOP>");
  const maxLegal = top ? top.maxLegalRisk : 1;

  if (eligible.length === 0) {
    // Everything was vetoed → forced STOP with a safety rationale.
    method = "safety_gate";
    metaRule = "R2: all surface candidates vetoed on safety grounds → ratify STOP";
    selectedKey = "<STOP>";
    publicReason =
      "Every non-stop candidate was vetoed by the safety seat; the panel declines to emit a span.";
  } else if (vetoedKeys.size > 0 && vetoedKeys.has(topKeyIfNoVeto(rows))) {
    method = "safety_gate";
    metaRule = "R1: the highest-scoring candidate was vetoed → pick best non-vetoed";
    selectedKey = top.key;
    publicReason = `The leading candidate was vetoed for a stated safety reason; the best non-vetoed candidate "${short(top.key)}" is ratified.`;
  } else if (needsEscalation(byScore) && input.escalationRoundsDone === 0) {
    method = "escalate_for_evidence";
    metaRule = "R3: top candidates within margin and dispersion high → escalate for one evidence round";
    selectedKey = top.key;
    escalationRounds = input.escalationRoundsDone + 1;
    publicReason =
      "The two leading candidates are within the decision margin with high confidence dispersion; the panel escalates for one evidence round before committing.";
  } else if (affectedPartyContested(byScore)) {
    method = "affected_party_priority";
    metaRule = "R4: candidates tie on epistemics → prefer the lower-harm option for the affected party";
    const lowHarm = [...byScore]
      .filter((r) => within(r.aggregateScore, top.aggregateScore, 0.05))
      .sort((a, b) => a.meanAffectedPartyImpact - b.meanAffectedPartyImpact)[0];
    selectedKey = lowHarm.key;
    publicReason = `The leading candidates are epistemically comparable; the lower-harm option "${short(lowHarm.key)}" is preferred for the affected party.`;
  } else if (stopRow && concisionSufficient(stopRow, top)) {
    method = "cost_sensitive_sufficiency";
    metaRule = "R5: the verdict is complete and further text adds risk without value → ratify STOP";
    selectedKey = "<STOP>";
    publicReason = "The verdict already answers the question; the panel ratifies STOP rather than adding unwarranted text.";
  } else if (top.support >= majority(totalSeats) && top.dispersion <= 0.15) {
    method = "epistemic_dominance";
    metaRule = "R6: one candidate holds majority support at low dispersion → epistemic dominance";
    selectedKey = top.key;
    publicReason = `Candidate "${short(top.key)}" holds majority support (${top.support}/${totalSeats}) at low confidence dispersion.`;
  } else {
    method = "dissent_preserving_supermajority";
    metaRule = "R7: no dominant winner → ratify the plurality leader and PRESERVE minority dissent";
    selectedKey = top.key;
    publicReason = `No candidate dominates; the plurality leader "${short(top.key)}" is ratified and every material minority objection is preserved on the record.`;
  }

  const selected = pickSelected(revisions, selectedKey);

  // --- preserve dissent -----------------------------------------------------
  const dissents = preserveDissent(revisions, selectedKey, spanIndex, input.carriedDissent);

  return {
    spanIndex,
    method,
    metaRule,
    selected,
    publicReason,
    candidateTable: table,
    vetoes,
    dissents,
    escalationRounds,
  };
}

function buildTable(revisions: Revision[]): CandidateScoreRow[] {
  const byKey = new Map<string, ScoredCandidate[]>();
  for (const r of revisions) {
    const key = candidateKey(r.final.candidate);
    const arr = byKey.get(key) ?? [];
    arr.push(r.final);
    byKey.set(key, arr);
  }
  const rows: CandidateScoreRow[] = [];
  for (const [key, finals] of byKey) {
    const support = finals.length;
    const meanConfidence = mean(finals.map((f) => f.confidence));
    const dispersion = stdev(finals.map((f) => f.confidence), meanConfidence);
    const maxLegalRisk = Math.max(...finals.map((f) => f.legalRisk));
    const meanFactualityRisk = mean(finals.map((f) => f.factualityRisk));
    const meanFairnessRisk = mean(finals.map((f) => f.fairnessRisk));
    const meanAffectedPartyImpact = mean(finals.map((f) => f.affectedPartyImpact));
    // Aggregate: reward support+confidence, penalize legal/factual/fairness risk.
    const aggregateScore =
      0.35 * (support / revisions.length) +
      0.30 * meanConfidence -
      0.20 * maxLegalRisk -
      0.10 * meanFactualityRisk -
      0.05 * meanFairnessRisk;
    rows.push({
      key,
      support,
      meanConfidence: round4(meanConfidence),
      dispersion: round4(dispersion),
      maxLegalRisk: round4(maxLegalRisk),
      meanFactualityRisk: round4(meanFactualityRisk),
      meanFairnessRisk: round4(meanFairnessRisk),
      meanAffectedPartyImpact: round4(meanAffectedPartyImpact),
      aggregateScore: round4(aggregateScore),
    });
  }
  return rows.sort((a, b) => b.aggregateScore - a.aggregateScore);
}

function preserveDissent(
  revisions: Revision[],
  chosenKey: string,
  spanIndex: number,
  carried: DissentRecord[],
): DissentRecord[] {
  const out: DissentRecord[] = [];
  const seen = new Set<string>();
  // Every maintained objection is preserved, whether it targets the winner or a loser.
  for (const r of revisions) {
    for (const o of r.maintainedObjections) {
      const id = stableId("dissent", spanIndex, o.targetKey, o.text);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        spanIndex,
        chosenKey,
        objection: o,
        status: "preserved",
        materiality: o.severity,
      });
    }
  }
  // Carry forward prior unresolved dissent (still on the record).
  for (const d of carried) {
    const id = stableId("dissent", d.spanIndex, d.objection.targetKey, d.objection.text);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ ...d, carriedFromSpan: d.spanIndex, spanIndex, chosenKey, status: "preserved" });
  }
  return out;
}

function pickSelected(revisions: Revision[], key: string): ScoredCandidate {
  const matches = revisions.filter((r) => candidateKey(r.final.candidate) === key).map((r) => r.final);
  if (matches.length) {
    // Highest-confidence instance of the chosen candidate.
    return matches.slice().sort((a, b) => b.confidence - a.confidence)[0];
  }
  // STOP forced by safety with no seat having proposed it: synthesize a STOP.
  return {
    candidate: { text: "", isStop: true },
    confidence: 0.5,
    factualityRisk: 0,
    legalRisk: 0,
    fairnessRisk: 0,
    affectedPartyImpact: 0.5,
    warrant: "STOP ratified by the constitution.",
    evidenceRefs: [],
  };
}

// --- meta-constitution predicates -------------------------------------------

function topKeyIfNoVeto(rows: CandidateScoreRow[]): string {
  return rows[0]?.key ?? "<STOP>";
}
function needsEscalation(byScore: CandidateScoreRow[]): boolean {
  if (byScore.length < 2) return false;
  return within(byScore[0].aggregateScore, byScore[1].aggregateScore, 0.04) && byScore[0].dispersion > 0.2;
}
function affectedPartyContested(byScore: CandidateScoreRow[]): boolean {
  if (byScore.length < 2) return false;
  const near = byScore.filter((r) => within(r.aggregateScore, byScore[0].aggregateScore, 0.05));
  if (near.length < 2) return false;
  const impacts = near.map((r) => r.meanAffectedPartyImpact);
  return Math.max(...impacts) - Math.min(...impacts) >= 0.15;
}
function concisionSufficient(stopRow: CandidateScoreRow, top: CandidateScoreRow): boolean {
  return stopRow.key === top.key && stopRow.support >= top.support;
}

// --- helpers ----------------------------------------------------------------

function majority(n: number): number {
  return Math.floor(n / 2) + 1;
}
function within(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) <= eps;
}
function short(key: string): string {
  return key.length > 48 ? key.slice(0, 45) + "…" : key;
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export { buildTable };
