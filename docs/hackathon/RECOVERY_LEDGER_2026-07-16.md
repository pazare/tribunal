# Tribunal recovery ledger

As of: 2026-07-16 03:31 America/New_York

Status: active; clean replacement history is built and validated locally (three commits on `main`: curated integration, receipted falsification run, verification ledger); the remote branch still holds the old leaked history — force-with-lease replacement awaits explicit operator approval, after which fresh CI and the PR #2 disposition follow

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
| Scopus AI: physician diagnostic/referral/triage reliability | Authenticated institutional-access capture; 13 references + 5 foundational papers; raw locator retained locally | recovered | Use as discovery map; verify quoted values in underlying papers before presentation |
| Scopus AI: AI/physician agreement metrics over ICD/SNOMED | Authenticated institutional-access capture; 13 references + 5 foundational papers; raw locator retained locally | recovered | Retain metric-selection and prevalence warnings; do not cite Scopus AI as the empirical source |
| Scopus AI: evidence revision versus conformity | Authenticated institutional-access capture; raw locator retained locally | recovered, incomplete capture | Current summary is hypothesis-generating only |
| Scopus AI: targeted unsupported-majority-cue search | Authenticated institutional-access query run 2026-07-16; 10 adjacent references returned | recovered, method_checked | No direct matching empirical study appeared in the retrieved abstracts. Treat as a bounded search-gap result, not proof of absence; verify adjacent papers individually. |
| Agreement-statistics oracle | Recovered Fable workflow artifact; exact rational test cases | method_checked | Executed locally; all assertions passed. Promote into the Saturday TDD plan after source review |
| Eight completed Fable foundation returns | Private local workflow record | recovered | Curate visible outputs; exclude hidden reasoning and unverified claims |
| Five interrupted Fable design agents | Same workflow | recovered partials only | No completed return exists; recover tool outputs/files, never label completed |
| PR #1 | GitHub + local git | verified_source | Accepted infrastructure substrate |
| PR #2 | GitHub draft + local remote ref | verified_source | Privacy-clean; useful content is incorporated into the curated recovery tree, but a clean squash will not preserve commit ancestry. Keep it until the sanitized successor is green, then close rather than merge both. |
| Fable citation resolver | Claude CLI completion evidence retained in the private local invocation ledger; runtime model `claude-fable-5`; visible `max` request; no fallback; exact ACK | recovered, method_checked | Memo preserved; verified/corrected metric claims integrated into the Scopus evidence ledger |
| Scopus Drive problem report | Private Drive and authenticated Scopus capture; 13 pages, 66 references; raw locators retained locally | recovered | Full extracted text is local-only; selected claims checked against primary sources |
| Research methods protocol | `docs/hackathon/RESEARCH_METHODS_PROTOCOL_2026-07-16.md` | integrated draft | Primary tuple, codebooks, golden set, experiments, analysis, cost and claim boundaries specified |
| Saturday execution plan | `docs/hackathon/SATURDAY_EXECUTION_PLAN_2026-07-18.md` | integrated draft | Prework/day-of provenance, two-person timeline, partner questions, gates, demo and submission checks specified |
| Official event facts | `docs/hackathon/OFFICIAL_EVENT_FACTS_2026-07-16.md` + live public event page inspection | verified_source | 09:00–22:00 PDT, San Francisco, in person, team size two, clinic-agent prompt, Monday-use expectation, and access to Abridge/clinician input verified; judging, submission, exact address, supplied resources, and day-of-code boundary remain open |
| Clinical evaluation harness | `packages/clinical-eval/` | method_checked, integration pending clean commit | 24 package tests pass; full 240-assignment scripted-provider falsification run and semantic receipt verification pass. This is analyzer behavior only, not an LLM or clinical result. |
| Full repository validation | Same uncommitted tree, 2026-07-16 | method_checked | 109 tests pass; all workspace typechecks, production build, web smoke, 13 ledger anchors, lockfile dry-run, and diff check pass locally. CI has not yet tested this tree. |

## Addendum — 2026-07-16 Rao-prep session (Claude app, operator-directed)

| Artifact | Provenance | State | Disposition |
| --- | --- | --- | --- |
| Krishnan meeting raw record | Operator paste (Zoom auto-summary + verbatim personal notes); `_recovered/meetings/` (gitignored) | recovered | Primary source for the notes coverage audit; sanitized derivatives tracked |
| Sol (GPT-5.6) Rao brief | Operator paste; `_recovered/sol/` (gitignored) | recovered | Second-pass audit complete; citations verified 12/13; corrections in integration doc 13–15 |
| Sol-brief citation verification memo | Fable 5 bounded agent, web-verified; `_recovered/fable/FABLE_SOL_BRIEF_VERIFICATION_2026-07-16.md` | verified_source | UC re-pointed to 2605.29087; DRL venue unverified; preprint labeling required |
| Notes coverage audit | Independent Fable 5 audit agent + orchestrator cross-check; `NOTES_COVERAGE_AUDIT_2026-07-16.md` | method_checked | 6 missed + 13 partial interpretations dispositioned into protocol §13, Rao docs, Saturday plan |
| Scopus AI Rao-prep captures (3 grounded, 1 ungrounded attempt) | Authenticated CMU Chrome session, operator-authorized; `_recovered/scopus/scopus-ai-2026-07-16-q-*.md` (gitignored) | recovered | Timing/automation-bias, apples-to-apples controls, silent-trial precedents; primary verification queued (evidence ledger §7) |
| Scopus AI prompt library | `prompts/SCOPUS_AI_PROMPTS_2026-07-17.md` | integrated | Sol's 12 prompts deduplicated against completed work; session protocol included |
| Continuity plan | `CONTINUITY_PLAN_2026-07-16.md` | integrated | Fable-5-unavailability contingency; model-agnostic task specs |
| PR/tree audit | Fable 5 bounded agent report (session-local) | method_checked | PR #2 supersession confirmed no-gaps; PR #3 leak still live on remote head; staged tree privacy-clean; 125/125 tests green; commit unit must include unstaged edits + three untracked safety-packet/.gitignore files |

## Addendum — 2026-07-16 clean-history build and Rao-prep verification (Claude app, operator-directed, Fable-only delegation)

| Artifact | Provenance | State | Disposition |
| --- | --- | --- | --- |
| Clean replacement history | Local commits `315baea` (curated squash from `main`), `1ba7ce0` (receipted run), `2b0be47` (verification ledger); backup ref `backup/pr3-old-head` preserves the old head locally | method_checked | All gates green pre-commit (tests, typecheck, build, web smoke, 13 anchors); tree privacy-scanned (one accepted pre-existing `/Users/` path in `runs/demo-recording/manifest.json`, inherited unchanged from `main`); leaked paths absent from all three trees; awaiting operator-approved force-with-lease |
| Receipted E2 falsification-gate run | `runs/clinical-eval/mechanism-simulator-v0.1-seed18/` committed on clean history | method_checked | First receipted run whose receipt binds to presentable git state; scripted providers only — analyzer behavior, never an LLM or clinical result |
| Primary-source verification, Rao-prep captures | Two bounded Fable 5 web passes; integrated as evidence ledger §5b (T-01…T-11, C-01…C-03, S-01…S-04) | verified_source | Timing: human-first best in the only randomized comparison (Yin, Mgmt Sci 2025), residual disuse and revision-bias costs quantified; comparators: Chen 2026 AIPSC percentages confirmed, one venue rejected as predatory/hijacked (Gopi); silent trials: Kwong 0.90→0.50 and CHARTwatch verified; Scopus-AI-displayed citation counts struck as unreliable |
| Scopus AI Q6 reliability capture | Authenticated session, captured before tooling interruption; `_recovered/scopus/scopus-ai-2026-07-16-q-reliability-failure-units.md` (gitignored) | recovered, method_checked | Grounded gap: no direct AI/CDSS reliability-engineering transfer in retrieved abstracts; β/α-factor common-cause-failure framing goes to Rao as a question |
| Q4 counterfactual-evaluation pass | Bounded Fable 5 open-web fallback (Scopus AI channel interrupted mid-session) | pending | Labeled web-fallback, not Scopus AI; results integrate to evidence ledger §5c after primary-source checks return |
| Chen 2026 AIPSC full text | Paywalled (ScienceDirect 403 to automated fetch) | pending | Operator pulls via CMU-entitled browser; until then AIPSC item wording must not be paraphrased |

## First method conclusions

1. Primary construct: appropriateness of a bounded escalation tuple, not generic “clinical consensus.” The tuple is `escalate`, `specialty`, `urgency`, and `missing evidence`, with diagnosis/rationale/provenance/implications/cost/preferences carried separately.
2. Agreement panel: raw pairwise agreement and n-of-n counts first; Krippendorff alpha for multi-rater data with non-votes; pairwise Cohen kappa; weighted kappa for ordinal urgency; Gwet AC1 as a mandatory prevalence diagnostic; bootstrap intervals clustered by case.
3. Formal vocabulary: constrain Saturday output to a fixed, versioned codebook. ICD-10-CM can code diagnoses, but escalation, specialty, urgency, and treatment plans require their own explicit controlled vocabularies. Do not pretend an ICD codebook alone validates the full decision tuple.
4. Human comparison: the strongest design is two clinicians independently rating the same cases, information, tuple, and codebook. Published kappas are contextual unless the construct and statistic match.
5. Conformity experiment: compare sealed pre-exposure votes with private post-exposure votes under randomized debate/no-debate and evidence/majority-signal arms. A vote change is evidence-induced only when the new evidence is real, relevant, pre-specified, and directionally appropriate—not merely when an agent writes a persuasive certificate.
6. Counterfactual language: a planted paired-case manipulation can test local evidence sensitivity. A retrospective “what the agent would have done” comparison does not estimate patient-outcome causal effects.
7. Cost analysis: Saturday can report observed model cost, measured workflow time, and transparent resource-cost scenarios. It cannot claim cost-effectiveness, QALY gains, or lives saved without outcome data and a valid comparator design.

## Known blockers

- Exact five-hour, weekly, and Fable-specific quota values are recorded only when visible in the authenticated account surface; unknown values must not be inferred. The private local quota monitor is the source of truth.
- The live Scopus AI session is authenticated and supports new searches. The older conformity capture still lacks a complete reference export.
- Several PR #2 claims and recovered citations need primary-paper verification.
- Raw recovered workflow and Scopus exports are local-only because they contain internal locators and may contain hidden reasoning; only observable outputs and validated, source-linked artifacts are public.
- PR #3's earlier public history contained private operational provenance. The replacement must be a clean squashed history from `main`; a normal deletion commit would not remove old commits, and even a rewritten branch may remain in hosting-provider caches or retained pull-request references.
- Public event hours, city, in-person format, and team-size rule are verified. The exact street address/check-in instructions, submission deadline, judging rubric, available data/model paths, and reported day-of-only code rule still require confirmation from the approval or organizer; the descriptive event page does not state the day-of-only rule.
- MIMIC-IV-Ext CDS is the closest real-data match but requires verified PhysioNet credentials, CITI training, and a signed DUA; no local dataset access has been claimed.
