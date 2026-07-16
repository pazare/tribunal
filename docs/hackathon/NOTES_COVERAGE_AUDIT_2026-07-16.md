# Krishnan meeting-notes coverage audit

Date: 2026-07-16
Status: second-pass audit of the Sol research brief and the on-disk plan against the raw meeting record; every proposed addition is a meeting-note idea, not a validated commitment
Primary sources (local-only, gitignored): `_recovered/meetings/KRISHNAN_MEETING_2026-07-16_RAW.md`, `_recovered/sol/SOL_PRO_RAO_BRIEF_2026-07-16.md`
Method: independent Fable 5 audit agent enumerated every distinct idea in the operator tasking, Zoom auto-summary, and verbatim personal notes (30 items), then classified each as COVERED / PARTIAL / MISSED against the Sol brief and the tracked plan docs. Verdicts were cross-checked by the orchestrating session. Citation verification for the Sol brief is in `_recovered/fable/FABLE_SOL_BRIEF_VERIFICATION_2026-07-16.md`.

## Verdict summary

- COVERED: 11 of 30 items were already fully carried by the plan docs (construct validity, formal vocabulary, kappa panel, sealed-vote conformity design, golden set, point-in-time reconstruction, two-stage architecture, CBA boundary, partner questions, Rao decisions, DRL review) — in several cases more rigorously than the notes themselves.
- PARTIAL: 13 items had the object on disk but not the note's specific idea.
- MISSED: 6 items appeared in neither the Sol brief nor any tracked doc.

## The six missed interpretations, and where each now lives

| # | Note fragment (verbatim) | What it means | Applied to |
| --- | --- | --- | --- |
| O8 | "Only limits that you and several other agents have exhausted in attempts should be considered real limits, not just hypothesized" | Operating rule: label every stated limitation `EXHAUSTED` (multiple documented failed attempts) or `HYPOTHESIZED`; only exhausted limits are presented as real. Demonstrated today: the Sol brief claimed Scopus AI was unreachable; an actual attempt through the operator's authenticated Chrome session succeeded. | `ORCHESTRATION_RECOVERY_PLAN` (limit-claim rule), `SATURDAY_EXECUTION_PLAN` §11 checklist, `RAO_AND_ATTACHMENT_INTEGRATION` correction 15 |
| Z8 | Krishnan: "Delphi protocols are typically used for different setups" | A caution, not an endorsement: describe Tribunal as a Delphi-inspired sealed-commitment/revision protocol, never a classical Delphi implementation. | `RAO_AND_ATTACHMENT_INTEGRATION` correction 13 |
| P6 | "compare this formal vocabulary for diagnosis … with the used vocabulary" | Vocabulary-fidelity check: measure per run how much of the agents' free-text output maps exactly / partially / not at all to the frozen codebook; high unmappable rate = codebook-coverage failure, not rater disagreement. | `RESEARCH_METHODS_PROTOCOL` §13.1 |
| P9 | "a group of different specialists who do independent research, and with different personas … relative to a **documented** group of different specialists" | Compare AI panels against documented, historical specialist-group decisions (tumor boards, MDT records, the MIMIC clinician-reviewed referral subset), not only recruited raters — with stated confounds. | `RESEARCH_METHODS_PROTOCOL` §13.2 (E1b sketch); Rao one-pager decision-3 context |
| P20 | "If we do not have a diagnosis, and we do have the transcript -> input to claims system EHR … Counterfactual (lack)? Claims-system. That gives us the choice" | Claims data as (a) recovery path for missing documented diagnoses and (b) source for constructing the counterfactual choice set; billing-coding error modeled as label noise. | `RESEARCH_METHODS_PROTOCOL` §13.3; new Abridge on-floor question in `SATURDAY_EXECUTION_PLAN` §7 |
| P26 | "Journals -> hard to keep track of (Anthropic)" | Literature overload is itself a discussion topic for Anthropic: evidence-currency tooling (dated retrieval, citations, provenance) and how evidence currency is audited. | New Anthropic on-floor question in `SATURDAY_EXECUTION_PLAN` §7 |

## The thirteen partial items, and dispositions

| # | Note idea | Gap | Applied to |
| --- | --- | --- | --- |
| O7 | Every headline claim needs technical + plain-language + example + counterexample + direct citation | Practiced in style, never stated as a requirement | `SATURDAY_EXECUTION_PLAN` §11 checklist item |
| Z12 | Data-derived counterfactuals from documented physician choices | E3 twins are authored edits, not data-derived | `RESEARCH_METHODS_PROTOCOL` §13.4 (E6 sketch) |
| Z13 | Claims systems in point-in-time reconstruction | "Claims" appeared once as a field name | `RESEARCH_METHODS_PROTOCOL` §13.3 |
| Z14 | Governance evidence package = local data + verified literature + costing + named causal designs | Pieces exist; recipe never assembled | Post-Rao addendum template (one-pager "Leave with written answers" already collects the inputs); silent-trial precedents captured 2026-07-16 in the Scopus ledger |
| P1 | Clinician evaluates the DIAGNOSIS vs the TREATMENT/action — separate loci, separate ordering | Objects separated in schema; never posed as an experimental design decision | `RAO_EVALUATION_SCENARIO_WORKSHEET` decision 6 |
| P11 | n-of-n unanimity profiles to identify "deep specialists" and rely on them | n/N reported; the identification/reliance mechanism absent | `RESEARCH_METHODS_PROTOCOL` §13.5 (with circularity caveat) |
| P12 | LLM-as-a-judge scaled from accumulated human judgments | Human adjudication only; scaling path unstated | `RESEARCH_METHODS_PROTOCOL` §13.6 |
| P14 | Simple-case tier: physician documentation + one lightweight AI rationale; panel reserved for complex cases | Mode table exists in the brief; the lightweight product tier and routing validation absent from plan docs | `SATURDAY_EXECUTION_PLAN` §12 Monday package line |
| P16 | Junior vs senior clinicians as method-data (known-groups probe) | Years-of-experience recorded; contrast never used | `RESEARCH_METHODS_PROTOCOL` §13.7 |
| P21 | "Play it forward" projection in the six-tuple | `implications` field exists, bounded to scenarios; mapping unstated | `RESEARCH_METHODS_PROTOCOL` §13.8 (one line) |
| P22 | Primary-vs-specialist error rates as comparison anchors | Only context-only PCP kappa row exists | Scopus follow-up queue item |
| P27 | Population/community-level evidence, "not only one patient" | Machinery exists (Tier A batching); ambition unstated | `SATURDAY_EXECUTION_PLAN` §12 Monday package line |
| P29 | Causal methods for outcome counterfactuals: matching → deployments | Requirement named, methods not | `RESEARCH_METHODS_PROTOCOL` §13.9 (candidate-design list) |

## Sol-brief verification highlights (full memo in `_recovered/fable/FABLE_SOL_BRIEF_VERIFICATION_2026-07-16.md`)

- 13 of 13 checked citation candidates VERIFIED against live primary sources (the CDC ICD-10-CM page initially returned 403 to automated fetch and was verified through the operator's real browser the same day); zero fabricated citations.
- Two load-bearing corrections: "unfaithful capitulation" is defined in arXiv 2605.29087 ("The Chain Holds, the Answer Folds"), not 2602.13093 as the Sol brief implies; the DRL paper's "KDD" venue is unverified — cite as preprint and confirm with Krishnan (consistent with the Scopus ledger §6 ruling).
- Only 2 of the 10 arXiv items are peer-reviewed/accepted (generalized Fleiss kappa — Behavior Research Methods 2025; pathology automation-bias — MELBA); label the rest preprints.
- The "second paper" Pablo did not catch: high confidence the hallucination-detection remark refers to the DRL paper itself (hallucinated-node discrepancy class); candidate alternates ranked in the memo; confirm with Krishnan by email.
- Anand Rao confirmed as Distinguished Service Professor of Applied Data Science and AI, Heinz College, CMU; the apples-to-apples paper (2605.07986) is a NIST–CMU collaboration whose demo domain is financial services — say so when citing it.
- The Sol brief's claims that the repo has "zero public pull requests" and that Scopus AI was unreachable were both wrong; each is now a corrections entry, and the second is the canonical example of the O8 exhausted-limits rule.

## Scopus AI session 2026-07-16 (this pass)

Three grounded captures and one recorded ungrounded attempt, all in `_recovered/scopus/` (gitignored) pending primary verification: human–AI timing/automation bias (10 refs); apples-to-apples comparison controls (Chen 2026 scoping review, AIPSC checklist); silent-trial precedents (CHARTwatch, SAFE-WAIT, Kwong bridge). The abstract governance-package phrasing returned Scopus AI's own "Not based on Scopus references" banner and is recorded as a bounded ungrounded result. Prompt library and session protocol: `prompts/SCOPUS_AI_PROMPTS_2026-07-17.md`.
