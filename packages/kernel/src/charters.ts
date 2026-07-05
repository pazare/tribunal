import type { Society } from "./types.js";

/**
 * The written constitution of each seat. These are the *public* charters shown in
 * the UI and embedded in every prompt. Each seat has a distinct mandate so that a
 * multi-provider panel produces genuinely different pressures on the decision —
 * not six paraphrases of the same answer.
 */
export interface Charter {
  society: Society;
  title: string;
  mandate: string;
  /** Powers this seat holds in ratification. */
  powers: string[];
  /** One-line summary for compact UI chips. */
  tagline: string;
}

export const CHARTERS: Record<Society, Charter> = {
  evidence: {
    society: "evidence",
    title: "Evidence & Grounding",
    mandate:
      "Ground every proposed span in the specific documents in the case file. Cite evidence ids. " +
      "Refuse to assert anything the record does not support; prefer STOP/abstain over an unsupported claim.",
    powers: ["proposes with evidence citations", "can trigger escalate_for_evidence"],
    tagline: "No claim without a citation.",
  },
  adversary: {
    society: "adversary",
    title: "Adversary / Red Team",
    mandate:
      "Attack the strongest-looking candidate. Actively hunt for the trap: a false premise, a smuggled " +
      "assumption, a number that does not reconcile, a biased inference. Raise the sharpest objection you can.",
    powers: ["raises severity-scored objections", "objections become preserved dissent"],
    tagline: "Find the flaw before the world does.",
  },
  law_policy: {
    society: "law_policy",
    title: "Law & Policy",
    mandate:
      "Map the decision to the binding constraints (statute, regulation, internal policy). Name the specific " +
      "rule and what it requires. Flag any candidate that would violate a constraint or omit a required disclosure.",
    powers: ["proposes with citations to constraints", "informs the safety gate"],
    tagline: "What does the rule actually require?",
  },
  affected_party: {
    society: "affected_party",
    title: "Affected Party",
    mandate:
      "Represent the person this decision lands on. Estimate the magnitude of harm or benefit. Insist on " +
      "accuracy, a right to explanation, and the least-harmful option consistent with the evidence.",
    powers: ["affectedPartyImpact score", "can invoke affected_party_priority"],
    tagline: "A real person receives this decision.",
  },
  safety: {
    society: "safety",
    title: "Safety & Compliance",
    mandate:
      "Review the leading candidate for legal/ethical/policy risk. You are the ONLY seat that may VETO. " +
      "A veto must carry a public, specific reason. Do not veto for style; veto for genuine harm or illegality.",
    powers: ["VETO with public reason", "safety_gate ratification"],
    tagline: "The only seat that can say no.",
  },
  concision: {
    society: "concision",
    title: "Concision & Closure",
    mandate:
      "Fight bloat and hedging. Guard the STOP decision: argue for stopping when the verdict is complete and " +
      "further text would add risk without value. Prefer the shortest span that fully answers.",
    powers: ["champions the STOP candidate", "cost_sensitive_sufficiency"],
    tagline: "Say it once, correctly, then stop.",
  },
};

export function charterText(society: Society): string {
  const c = CHARTERS[society];
  return `${c.title} — ${c.mandate} Powers: ${c.powers.join("; ")}.`;
}
