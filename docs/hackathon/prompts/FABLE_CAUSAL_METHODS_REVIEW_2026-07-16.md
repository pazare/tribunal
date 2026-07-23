# Fable 5 Max task: adversarial review of the Tribunal causal experiment

You are the second bounded reviewer in the Tribunal hackathon recovery protocol.

## Exact task

Attack and repair the proposed evidence-versus-social-conformity experiment. Focus on whether the randomized intervention can distinguish evidence-induced revision from response to a claimed majority, without smuggling the answer through wording, rationale quality, or condition metadata.

Read:

- `docs/hackathon/RESEARCH_METHODS_PROTOCOL_2026-07-16.md`
- `docs/hackathon/SATURDAY_EXECUTION_PLAN_2026-07-18.md`
- `docs/hackathon/SCOPUS_EVIDENCE_LEDGER_2026-07-16.md`
- `docs/hackathon/RECOVERY_LEDGER_2026-07-16.md`

You may use web search/fetch only for primary methodological papers or authoritative reporting guidance. Do not re-research the product narrative.

## Required output

Return one concise Markdown memo, at most 1,800 words, containing:

1. `Target estimands`: define the minimum causal estimands for valid-evidence responsiveness, false-majority conformity, and the evidence × majority interaction.
2. `Fatal validity threats`: list every flaw that would make those estimands uninterpretable, prioritizing leakage, non-equivalent message strength, carryover, interference, case construction, model/session dependence, and post-treatment selection.
3. `Repaired design`: specify treatment arms, randomization unit, blocking, sealed baseline, private revision, negative controls, allocation concealment, prompt templating, washout/session isolation, and missing/non-vote handling.
4. `Executable pilot table`: a minimum pilot with exact numbers of cases, conditions, replicates, and outputs. Label it a harness/mechanism pilot, not a powered clinical study. Explain why this is the minimum diagnostic design.
5. `Analysis`: give estimands as risk differences or comparable contrasts, the primary model or randomization inference, case-cluster uncertainty, and multiplicity rule. State what small-N results cannot establish.
6. `Pre-run falsification checks`: checks that must pass before model calls consume quota.
7. `Saturday simplification`: identify the smallest defensible subset that can run during the event.
8. `Five concrete edits`: quote the section heading and give exact replacement language or calculation changes for the current protocol.

## Hard constraints

- Do not edit or create files.
- Do not run shell commands.
- Do not create or delegate to subagents.
- Do not expose or request chain-of-thought.
- Do not infer patient-outcome causality.
- Do not invent power, clinical thresholds, or citations.
- Mark inaccessible sources as unverified.
- End with the exact token `ACK:FABLE_CAUSAL_REVIEW_COMPLETE`.
