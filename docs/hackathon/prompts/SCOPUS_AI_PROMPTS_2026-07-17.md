# Scopus AI prompt library — Rao meeting and Saturday preparation

Date: 2026-07-16
Origin: 12 prompts drafted by the operator-commissioned Sol brief (local capture: `_recovered/sol/SOL_PRO_RAO_BRIEF_2026-07-16.md`), reviewed, deduplicated against work already completed, and extended with session protocol. Anyone with the operator's CMU-authenticated Scopus session can execute these; no Fable-specific capability is required.

## Session protocol (required)

1. Run each prompt in the authenticated Scopus AI tab (CMU Libraries banner visible). If the banner is missing, stop; access lapsed.
2. If Scopus AI answers with the banner "Not based on Scopus references", record the attempt as UNGROUNDED in the capture file and retry once with a more empirical phrasing (name concrete systems, outcomes, or study types). Two ungrounded attempts = bounded search-gap result; log it, do not force it.
3. Save every capture verbatim to `docs/hackathon/_recovered/scopus/` (gitignored) with: date, exact query, grounded/ungrounded verdict, full reference list, and a "relevance mapping" section.
4. Nothing from a capture may be presented until the primary source is fetched and checked; presentation-safe rows go to `SCOPUS_EVIDENCE_LEDGER_2026-07-16.md` with the standard population|N|comparison|statistic|design|source|causal-boundary fields.
5. Scopus AI accepts ~500 characters per turn — the long "universal prefix" in the Sol brief does not fit and is unnecessary; fold its requirements into step 4's ledger discipline instead.

## Status of the Sol brief's 12 prompts

| # | Topic | Status 2026-07-16 |
| --- | --- | --- |
| 1 | Multi-agent clinical decision support landscape | PARTIALLY DONE pre-recovery ("Performance of multi-agent LLMs in clinical settings" session; MDAgents/Anderson rows in evidence ledger). Remaining: the six named contrasts below. |
| 2 | Agreement metrics + formal vocabulary | DONE pre-recovery (kappa-baselines and IRR-metrics sessions; M-01…M-11 ledger rows). Do not rerun. |
| 3 | DRL citation network | OPEN — run after confirming DRL venue with Krishnan (verification memo: venue unproven, treat as preprint). |
| 4 | Counterfactual/metamorphic clinical AI evaluation | WEB-FALLBACK RUN 2026-07-16 (Scopus AI channel interrupted; bounded Fable open-web pass, results in evidence ledger §5c when integrated). Scopus AI re-run still worthwhile for indexing/venue confirmation. |
| 5 | Human–AI timing / automation bias | DONE 2026-07-16 (capture: `scopus-ai-2026-07-16-q-timing-automation-bias.md`, 10 grounded refs). Verify Kücking 2024/2026, Cabitza "Judicial AI", Rosbach time-pressure before citing. |
| 6 | Reliability/resilience/human factors (Rao seed) | DONE 2026-07-16 (capture: `scopus-ai-2026-07-16-q-reliability-failure-units.md`) — grounded gap: classical reliability literature only, no direct AI/CDSS transfer in retrieved abstracts; β-factor/α-factor common-cause-failure models retained as candidate framing to put to Rao. |
| 7 | Ambient clinical AI / evidence provenance | OPEN — most useful immediately before Saturday (Abridge context). |
| 8 | Specialist scarcity / teleconsultation economics | OPEN — feeds the CBA; not Rao-critical. |
| 9 | Governance / silent-mode deployment | DONE 2026-07-16 with a documented ungrounded first attempt and a grounded empirical retry (capture: `scopus-ai-2026-07-16-q-silent-mode-governance.md`: CHARTwatch, SAFE-WAIT, Kwong silent-trial bridge). Governance-package phrasing stays UNGROUNDED; use named reporting frameworks instead. |
| 10 | Source disagreement / multi-source RAG | OPEN — seed with verified 2605.29084. |
| 11 | Human-vs-AI comparison validity | DONE 2026-07-16 (capture: `scopus-ai-2026-07-16-q-apples-to-apples-comparators.md`; Chen 2026 scoping review + AIPSC checklist). Fetch Chen primary source and map AIPSC → protocol §7.3. |
| 12 | Evidence synthesis / gap ranking | RUN LAST, after 3/4/6/7/10. |

## Ready-to-paste queries (fit the 500-char box)

Q3-DRL-network: "Map work citing or closely related to Differential Reasoning Learning for clinical agents (reasoning graphs, graph edit distance on clinical rationales, reasoning correction retrieval, LLM-as-judge clinical evaluation). What is novel in each versus DRL, and which methods support public auditable reasoning graphs without claiming faithful hidden chain-of-thought?"

Q4-counterfactual-eval: "What counterfactual, metamorphic, perturbation, or invariance-based methods have been used to evaluate clinical AI and clinical LLM systems? Distinguish clinically decisive fact edits, irrelevant narrative edits, demographic changes, resource-availability changes, and social-pressure cues. How are counterfactual patient cases constructed and clinician-validated?"

Q6-reliability: "How have reliability engineering methods (failure rate, MTBF, FMEA, fault trees, STPA, resilience engineering, human reliability analysis) been applied to AI systems or clinical decision support? What failure units and denominators are used for stochastic AI, and how are correlated failures across models modeled?"

Q7-ambient-provenance: "What methods link ambient clinical documentation or encounter transcripts to span-level evidence for downstream clinical decisions? Include evidence-linked summarization, source attribution, hallucination detection in clinical notes, speaker attribution, and clinician audit tools for AI-generated documentation."

Q8-economics: "What is the empirical evidence on specialist scarcity, e-consults, teleconsultation, and virtual multidisciplinary case conferences: consult waiting times, clinician preparation time, referral completion, transfer rates, duplicate testing, cost per consult, and patient travel burden?"

Q10-source-dependence: "When different guidelines, hospitals, or source documents give different answers to the same clinical question, how do medical RAG and decision-support systems detect, represent, or resolve source disagreement? Include taxonomies of compatible, complementary, threshold-differing, contextual, contradictory, and outdated sources."

Q12-synthesis: "Across multi-agent clinical decision support, agreement measurement, counterfactual evaluation, human-AI timing, reliability engineering, and silent-mode deployment: what are the largest unresolved research gaps for an auditable multi-agent specialist-escalation system evaluated against clinician panels?"

## Standing verification rule

A Scopus AI synthesis sentence is a lead, not a fact. Before any deck, brief, or protocol cites it: fetch the primary paper, confirm design/N/statistic, record venue and peer-review status, and add the ledger row. Citation counts shown in Scopus AI proved unreliable in the 2026-07-16 verification pass (several implausible values) and are struck from evidentiary use entirely — use publisher/index records only.

Channel note 2026-07-16: the authenticated Scopus AI browser session was interrupted mid-run (tooling restart, not an access lapse). Q6 was captured before the interruption; Q4 was completed as a labeled open-web fallback. Re-establish the session from this library when resuming; entitlement recovers via the CMU Libraries Scopus link when the header shows "Preview".
