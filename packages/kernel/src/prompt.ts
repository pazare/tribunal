import { charterText } from "./charters.js";
import type {
  FeedbackCandidateSummary,
  PanelistCaseView,
  ScoredCandidate,
} from "./types.js";

/**
 * Prompt construction for real model panelists. Every prompt demands a single
 * strict-JSON object and forbids private reasoning: the model must externalize
 * only the PUBLIC warrant fields the schema names. This is the operational form
 * of "external rationale, not hidden chain-of-thought".
 */

const JSON_RULES = `
Return ONE JSON object and nothing else — no prose before or after, no markdown fence.
Every string must be plain ASCII-safe text. Do not include private reasoning or
"thinking"; only the public fields below, each of which may be quoted verbatim to
the affected person and to a regulator.`;

export function proposePrompt(view: PanelistCaseView): { system: string; user: string } {
  const c = view.case;
  const evidence = view.evidence
    .map((e) => `  - [${e.id}] (${e.source}, ${e.citation}, quality ${e.quality}): ${e.summary}`)
    .join("\n");
  const docs = c.documents
    .map((d) => `### ${d.title} [${d.id}]\n${d.body}`)
    .join("\n\n");
  const constraints = c.constraints
    .map((k) => `  - [${k.id}] (${k.kind}${k.cite ? `, ${k.cite}` : ""}): ${k.text}`)
    .join("\n");
  const carried = c.unresolvedDissent
    .map((d) => `  - carried dissent on "${d.chosenKey}": ${d.objection.text}`)
    .join("\n");

  const system = `You are the ${charterText(view.society)}
You sit on an independent decision panel. Other seats are staffed by models from
OTHER providers; you cannot see their proposals in this round. Deliberate in good
faith strictly within your mandate.${JSON_RULES}`;

  const user = `DECISION: ${c.title}
DOMAIN: ${c.domain}
QUESTION FOR THE WHOLE RUN: ${c.question}

CURRENT SPAN TO DECIDE (#${c.slot.index}): ${c.slot.label}
INSTRUCTION: ${c.slot.instruction}
VERDICT SO FAR: ${c.prefix || "(nothing committed yet)"}

BINDING CONSTRAINTS:
${constraints || "  (none)"}

YOUR EVIDENCE BUNDLE:
${evidence || "  (none assigned to your seat)"}

CASE DOCUMENTS:
${docs || "(none)"}
${carried ? `\nUNRESOLVED DISSENT CARRIED FORWARD:\n${carried}` : ""}

Propose 1-3 candidate spans for THIS span only. On a completion span, make your
FIRST candidate STOP (text "", isStop true) unless you identify a specific legally
or materially required gap — a complete verdict must end by electing STOP, not by
padding. Output exactly this JSON shape:
{
  "candidates": [
    {
      "text": "the surface text of the span (empty string if isStop)",
      "isStop": false,
      "confidence": 0.0,
      "factualityRisk": 0.0,
      "legalRisk": 0.0,
      "fairnessRisk": 0.0,
      "affectedPartyImpact": 0.0,
      "warrant": "public, contradictable reason grounded in the evidence/constraints",
      "evidenceRefs": ["evidence id(s) you relied on"]
    }
  ],
  "rejectedAlternatives": [{"text": "a span you considered and rejected", "reason": "why"}],
  "publicWarrant": "one paragraph: why your top candidate is the right span for your mandate",
  "objections": [
    {"targetKey": "text of a candidate you object to (or <STOP>)", "text": "the objection",
     "severity": 0.0, "kind": "factual|legal|policy|fairness|user_impact|cost"}
  ]
}`;

  return { system, user };
}

export function revisePrompt(
  view: PanelistCaseView,
  ownRound1: ScoredCandidate[],
  feedback: FeedbackCandidateSummary[],
  guidance: string,
): { system: string; user: string } {
  const fb = feedback
    .map((s, i) => {
      const key = s.candidate.isStop ? "<STOP>" : s.candidate.text;
      return `  ${i + 1}. "${key}" — support ${s.supportCount}, mean confidence ${s.meanConfidence.toFixed(
        2,
      )}, dispersion ${s.confidenceDispersion.toFixed(2)}\n     strongest argument: ${
        s.strongestArgument
      }${s.strongestObjection ? `\n     strongest objection: ${s.strongestObjection}` : ""}${
        s.evidenceConflicts.length ? `\n     evidence conflicts: ${s.evidenceConflicts.join("; ")}` : ""
      }`;
    })
    .join("\n");

  const own = ownRound1
    .map((sc) => `  - "${sc.candidate.isStop ? "<STOP>" : sc.candidate.text}" (conf ${sc.confidence})`)
    .join("\n");

  const system = `You are the ${charterText(view.society)}
This is the revision round. You received ANONYMIZED feedback about all candidates
(authors hidden; order shuffled for you specifically to control position bias).
You must (a) commit to one final candidate, (b) answer the strongest objection to
it, (c) steelman the best rival, and (d) state what would change your mind.${JSON_RULES}`;

  const user = `DECISION: ${view.case.title}
SPAN #${view.case.slot.index}: ${view.case.slot.label}

YOUR ROUND-1 CANDIDATES:
${own || "  (none)"}

ANONYMIZED FEEDBACK (all candidates, your shuffled order):
${fb}

GUIDANCE: ${guidance}

Output exactly this JSON shape:
{
  "final": {
    "text": "your final chosen span text (empty if isStop)",
    "isStop": false,
    "confidence": 0.0,
    "factualityRisk": 0.0,
    "legalRisk": 0.0,
    "fairnessRisk": 0.0,
    "affectedPartyImpact": 0.0,
    "warrant": "public reason for your final choice",
    "evidenceRefs": []
  },
  "changedFromRound1": false,
  "answerToStrongestObjection": "directly answer the strongest objection to your final pick",
  "steelmanOfBestRival": "the strongest case FOR the rival you did not pick",
  "changeMyMind": "the specific evidence or argument that would flip your vote",
  "maintainedObjections": [
    {"targetKey": "candidate you still object to", "text": "why", "severity": 0.0,
     "kind": "factual|legal|policy|fairness|user_impact|cost"}
  ]
}`;

  return { system, user };
}

/** The safety seat's dedicated review prompt (veto power). */
export function safetyPrompt(
  view: PanelistCaseView,
  leadingKey: string,
  leadingText: string,
): { system: string; user: string } {
  const system = `You are the ${charterText("safety")}${JSON_RULES}`;
  const user = `DECISION: ${view.case.title}
QUESTION: ${view.case.question}
LEADING CANDIDATE for span #${view.case.slot.index} ("${view.case.slot.label}"):
"${leadingText || "<STOP>"}"

BINDING CONSTRAINTS:
${view.case.constraints.map((k) => `  - [${k.id}] ${k.text}${k.cite ? ` (${k.cite})` : ""}`).join("\n") || "  (none)"}

Decide whether to VETO this candidate. Veto only for genuine legal/ethical/policy
harm, never for style. Output exactly:
{"candidateKey": ${JSON.stringify(leadingKey)}, "veto": false, "legalRisk": 0.0,
 "publicReason": "specific, public reason for your decision"}`;
  return { system, user };
}
