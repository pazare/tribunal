# Fable 5 Max task: resolve Tribunal measurement citations

You are the first bounded reviewer in the Tribunal hackathon recovery protocol.

## Exact task

Resolve the most decision-relevant methodological claims in the recovered Scopus material to their underlying primary sources. The output will be used to decide what Tribunal can responsibly claim in a research protocol and Saturday hackathon presentation.

Read these local files first:

- `docs/hackathon/_recovered/scopus/q1-human-kappa-baselines.md`
- `docs/hackathon/_recovered/scopus/q2-irr-metrics-ai-diagnostics.md`
- `docs/hackathon/RECOVERY_LEDGER_2026-07-16.md`
- `docs/clinical/validation-log.md`

You may use web search and web fetch only to verify primary papers or authoritative statistical documentation. Prefer publisher pages, DOI records, original papers, reporting guidelines, or standards bodies. Do not use vendor marketing or a secondary review to validate a headline number when the primary source is available.

## Required output

Return a concise Markdown research memo, no more than 1,800 words, with:

1. `Invocation boundary`: state that this was a read-only citation review; do not infer the running model or effort unless the runtime exposes it.
2. `Verified claim ledger`: a table with 8-12 rows and these columns:
   - claim id;
   - proposed Tribunal claim;
   - primary source and DOI or stable URL;
   - population/setting and exact construct;
   - statistic and uncertainty actually supported;
   - status (`verified`, `corrected`, `context-only`, or `reject`);
   - safe wording for Tribunal.
3. `Metric decision`: assess raw agreement, n-of-n agreement, pairwise Cohen kappa, weighted kappa for ordinal urgency, Krippendorff alpha for multiple raters/non-votes, Gwet AC1 as a prevalence diagnostic, and case-cluster bootstrap confidence intervals. Separate what each metric measures from what it does not measure.
4. `Three highest-risk overclaims`: identify the most dangerous ways the recovered material could be misused.
5. `Open evidence gaps`: list only gaps that remain after you actually attempted primary-source resolution.

## Hard constraints

- Do not edit or create files.
- Do not run shell commands.
- Do not create or delegate to subagents.
- Do not claim that agreement establishes validity, correctness, safety, clinical benefit, or causal effectiveness.
- Do not treat ICD-10-CM as a vocabulary for treatment, urgency, or escalation.
- Do not invent exact values, DOIs, page numbers, quotations, or access results.
- Mark any source you cannot inspect as unverified.
- End the response with the exact token `ACK:FABLE_CITATION_RESOLVER_COMPLETE`.
