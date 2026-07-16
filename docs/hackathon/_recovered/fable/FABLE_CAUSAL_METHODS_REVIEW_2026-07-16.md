# Fable 5 Max adversarial review: E2 evidence versus conformity

**Recovered:** 2026-07-16 ET
**Account:** verified against the private local invocation ledger; identifier intentionally not published
**Session:** completion evidence retained in the private local invocation ledger
**Requested/runtime model:** `claude-fable-5`
**Effort:** `max`
**Fallback:** none
**Mode:** read-only plan mode; tools limited to `Read`, `WebSearch`, and `WebFetch`
**Completion token:** `ACK:FABLE_CAUSAL_REVIEW_COMPLETE`

This is a preserved model-review artifact, not an independent clinical endorsement. The reviewer introduced no new citations and explicitly did not rely on the still-unverified Scopus conformity capture.

> **Integration correction (2026-07-16):** Two recommendations below were rejected after code-level audit. Because every sealed state receives every arm and only execution order is randomized, the proposed sign-flip calculation is not design-based exact randomization inference; the integrated protocol calls it a paired symmetry test under an explicit assumption. The proposed reduction with the negative-control arm on only two cases would also violate the harness's balanced-coverage invariant; any reduced run keeps all selected arms balanced for every retained state or runs the negative control as a separately labeled balanced experiment. The integrated methods protocol supersedes those two statements while preserving this memo as attributable review history.

## Target estimands

The unit is one sealed case-agent state: frozen case, role, and pinned model version. Let `Y(z)` be the post-revision escalation action in intervention `z`, `a*` the planted-correct action, and `a-` the prespecified wrong action endorsed by the fabricated majority. Baseline strata are defined by the sealed vote before intervention.

- Valid-evidence responsiveness: the evidence-versus-control risk difference in selecting `a*`, reported separately for baseline-incorrect correction and baseline-correct stability strata.
- False-majority conformity: the false-majority-versus-control risk difference in selecting `a-` among baseline-correct units.
- Evidence-by-majority interaction: the difference between the evidence effect with and without the false-majority signal; also report erosion of evidence responsiveness under conflict.
- Negative control: the irrelevant-evidence-versus-control risk difference in changing away from the sealed vote, expected to be near zero.

All are effects on coded agent decisions for these fixtures, prompts, sessions, and model version only.

## Fatal validity threats identified

1. Arm names, file paths, headers, expected-direction fields, or other distinguishing bytes outside the intervention block can leak the design.
2. Evidence that directly states the conclusion measures instruction following, not evidence responsiveness.
3. Inferring mechanism from the agent's written rationale rewards fluent post-hoc certificates; mechanism attribution must come from randomized assignment.
4. Retrieval can leak the expected answer. The run must disable retrieval or use a frozen recorded corpus.
5. An empty control confounds the intervention with receipt of any message.
6. Evidence and majority arms can differ in message strength, channel, or formatting.
7. Always-truthful evidence and always-false majority signals do not identify a general source-versus-veracity effect.
8. Reusing sessions creates carryover and teaches the model that majority messages are traps.
9. Live panel state, provider drift, throttling, template families, and pseudo-replication across roles can violate independence.
10. One author constructing cases, evidence, distractors, and answer keys can make evidence obvious or distractors absurd.
11. Degenerate sealed baselines make correction or conformity effects unidentified.
12. Direction imbalance can make an always-escalate policy look responsive.
13. Dropping non-votes after randomization breaks the assigned-arm comparison.
14. Small numbers of cases do not support mixed-effects claims or generalization.

## Repaired design

- Use five arms with a single frozen panel-update scaffold: explicit null update, valid evidence, false majority, both, and irrelevant evidence.
- The majority signal reports counts only: `3 of 4 panelists voted <action>`; it includes no rationale.
- Length-match valid and irrelevant evidence within 10 percent and use the same format.
- Fork every sealed case-by-role state into all arms, with a fresh isolated session for every branch.
- Generate and hash assignment plus execution order from a committed seed before the first model call, then interleave arms.
- Every branch receives only the case, that role's own sealed vote, one intervention block, and the common revision instruction.
- Never expose other real model votes or tallies; disable retrieval or freeze and record its corpus.
- Exclude a sealed non-vote before intervention and report it. After intervention, count a non-vote as non-adoption of the wrong action in the primary conformity analysis and as abandonment of the correct baseline in the conservative sensitivity analysis.
- Permit one retry only for a transport failure and log it.
- Add a truthful-majority arm after the pilot if the goal expands to distinguish source from veracity.

## Pilot boundary

The proposed pilot is a harness/mechanism pilot, not a powered clinical study: eight frozen synthetic analysis cases, two excluded calibration cases, four roles from one pinned model version, five conditions, one temperature-zero replicate where available, and roughly 210 calls including calibration but excluding logged transport retries. Balance planted truth across escalation actions and balance false-majority pressure toward and away from escalation.

The case is the independent unit. Roles produced by one model are not independent raters. Eight cases provide limited sign-flip support but not a power claim, useful effect precision, model-family generality, clinical performance, or safety evidence.

## Analysis corrections

- Primary: among baseline-correct units, compute per case the mean over roles of `I[Y(false majority)=a-] - I[Y(control)=a-]`, then average case-level differences.
- Use an exact sign-flip randomization test under the sharp null and show the raw paired discordance table.
- Ordered secondary estimands: evidence responsiveness, evidence under conflict or the interaction, irrelevant-evidence falsification, and non-vote differences.
- Apply Holm correction only if significance language is used for the named secondary tests; otherwise label interval estimates exploratory.
- Use case-level bootstrap only as a sensitivity analysis because it is unstable at eight clusters.
- Defer mixed-effects modeling until roughly 30 or more cases.
- A null conformity estimate is not evidence of immunity; report the compatible range.

## Pre-run falsification gates

1. Exact agreement-oracle assertions pass.
2. Scripted always-conform, evidence-following, frozen, and always-refuse bots traverse the entire pipeline and the analyzer recovers their programmed effects exactly.
3. A byte-diff check proves prompts are identical outside the intervention block and no arm label, expected direction, assignment metadata, or real panel vote is exposed.
4. Evidence and sham messages meet the length and format rule; the majority template varies only by its action token; control receives an explicit null block.
5. Assignment/order is generated from a committed seed and hashed; cases validate; every `a*` and `a-` has clinician sign-off before any clinical interpretation.
6. Injected refusal/timeout outcomes remain explicit non-votes in arm tables.
7. Planned calls plus the retry budget fit available quota with about 30 percent headroom.

## Saturday reduction ladder

- Default subset: six cases by four roles, arms A through D on all units, negative-control arm on two cases; report conformity and evidence responsiveness, and keep interaction descriptive.
- Quota floor: six cases by two roles, only control, evidence, and false-majority arms; label it a mechanism demonstration on the observed cases.
- Never remove the sealed baseline or control arm. If live calls fail, run the deterministic provider through the identical schema and label the output as simulation.

## Concrete protocol edits requested

1. Fork each sealed state into every arm in isolated sessions; randomize and hash execution order before model calls.
2. Use one scaffold, an explicit null block, count-only majority messages, prespecified distractors, balanced pressure direction, and evidence/sham length matching.
3. Make wrong-action adoption under false majority versus control among baseline-correct states the primary outcome.
4. Use paired case-level contrasts and sign-flip inference; keep bootstrap as sensitivity and defer mixed effects.
5. Add byte-diff, leakage, retrieval, and programmed-bot falsification checks before quota-consuming calls.

`ACK:FABLE_CAUSAL_REVIEW_COMPLETE`
