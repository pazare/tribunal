# Tribunal recovery ledger

As of: 2026-07-16 02:03 America/New_York

Status: active; first preservation checkpoint

## State vocabulary

- `recovered`: bytes or visible output preserved with provenance.
- `verified_source`: checked against the underlying paper, official source, or repository state.
- `method_checked`: calculation/design independently checked.
- `integrated`: incorporated into the reviewed Saturday package.
- `rejected`: preserved for provenance but excluded from claims or implementation.
- `pending`: useful lead that still needs verification.

## High-value recovered material

| Artifact | Provenance | State | Disposition |
| --- | --- | --- | --- |
| Scopus AI: physician diagnostic/referral/triage reliability | Conversation `b0c1b87e-d6cb-4f09-baaa-0a84483e7284`, CMU-authenticated, 13 references + 5 foundational papers | recovered | Use as discovery map; verify quoted values in underlying papers before presentation |
| Scopus AI: AI/physician agreement metrics over ICD/SNOMED | Conversation `f83f57c8-fe0e-4719-9964-40d8c7d8ee9c`, CMU-authenticated, 13 references + 5 foundational papers | recovered | Retain metric-selection and prevalence warnings; do not cite Scopus AI as the empirical source |
| Scopus AI: evidence revision versus conformity | Conversation `2416639b-a54e-45e7-933e-ce17aa43553e` | recovered, incomplete capture | Reopen live and capture full references; current summary is hypothesis-generating only |
| Agreement-statistics oracle | Recovered Fable workflow artifact; exact rational test cases | method_checked | Executed locally; all assertions passed. Promote into the Saturday TDD plan after source review |
| Eight completed Fable foundation returns | Workflow `wf_931d0571-f34` | recovered | Curate visible outputs; exclude hidden reasoning and unverified claims |
| Five interrupted Fable design agents | Same workflow | recovered partials only | No completed return exists; recover tool outputs/files, never label completed |
| PR #1 | GitHub + local git | verified_source | Accepted infrastructure substrate |
| PR #2 | GitHub draft + local remote ref | verified_source | Import for post-meeting revision; not merge-ready unchanged |

## First method conclusions

1. Primary construct: appropriateness of a bounded escalation tuple, not generic “clinical consensus.” The tuple is `escalate`, `specialty`, `urgency`, and `missing evidence`, with diagnosis/rationale/provenance/implications/cost/preferences carried separately.
2. Agreement panel: raw pairwise agreement and n-of-n counts first; Krippendorff alpha for multi-rater data with non-votes; pairwise Cohen kappa; weighted kappa for ordinal urgency; Gwet AC1 as a mandatory prevalence diagnostic; bootstrap intervals clustered by case.
3. Formal vocabulary: constrain Saturday output to a fixed, versioned codebook. ICD-10-CM can code diagnoses, but escalation, specialty, urgency, and treatment plans require their own explicit controlled vocabularies. Do not pretend an ICD codebook alone validates the full decision tuple.
4. Human comparison: the strongest design is two clinicians independently rating the same cases, information, tuple, and codebook. Published kappas are contextual unless the construct and statistic match.
5. Conformity experiment: compare sealed pre-exposure votes with private post-exposure votes under randomized debate/no-debate and evidence/majority-signal arms. A vote change is evidence-induced only when the new evidence is real, relevant, pre-specified, and directionally appropriate—not merely when an agent writes a persuasive certificate.
6. Counterfactual language: a planted paired-case manipulation can test local evidence sensitivity. A retrospective “what the agent would have done” comparison does not estimate patient-outcome causal effects.
7. Cost analysis: Saturday can report observed model cost, measured workflow time, and transparent resource-cost scenarios. It cannot claim cost-effectiveness, QALY gains, or lives saved without outcome data and a valid comparator design.

## Known blockers

- Exact five-hour, weekly, and Fable-specific quota percentages are not yet visible for either Claude account. The Desktop account is visibly limit-reached and previously exposed a 05:10 ET reset; the exhausted bucket is not yet identified.
- The live Scopus AI browser session still needs a stable authenticated handoff for new searches and full capture of the conformity conversation.
- Several PR #2 claims and recovered citations need primary-paper verification.
- Raw recovered workflow files contain hidden reasoning and will not be committed; only observable outputs and validated artifacts will be integrated.
