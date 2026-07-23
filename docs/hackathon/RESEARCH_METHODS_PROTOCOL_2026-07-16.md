# Tribunal Clinical research methods protocol

Version: 0.2 preregistration draft
Date: 2026-07-16
Status: method specification, not evidence of clinical validity
Primary owner: Pablo Zavala

## 1. Decision the study is designed to support

Tribunal Clinical is not being evaluated as an autonomous diagnostician or treatment selector. The initial claim is narrower:

> Given the same bounded case record, can an auditable panel decide whether specialist escalation is warranted, identify the relevant specialty and urgency, state what evidence is missing, and preserve meaningful disagreement without manufacturing consensus?

The study must separately answer four questions:

1. **Reliability:** do repeated raters or agents give compatible coded outputs?
2. **Criterion performance:** do those outputs match an independently constructed reference label?
3. **Mechanism:** when a vote changes, was it caused by relevant evidence or by a social signal?
4. **Workflow value:** does the packet help a clinician act more accurately or efficiently?

Agreement alone answers only the first question. It does not establish correctness, construct validity, safety, clinical benefit, equivalence to specialists, or causal effectiveness.

## 2. Unit of analysis and output object

The stored observation unit is one `case_id × rater_or_agent_id × condition × round` row. For E2, the conservative primary clustering unit is the **case family**: templates, paraphrases, roles, conditions, and replicates derived from one family remain in the same cluster. Multiple roles or runs from one model are never treated as independent clinicians. Independence or exchangeability across case families is still an assumption to probe with Rao, not a fact created by aggregation.

### 2.1 Primary escalation tuple

```text
response_status:    VOTE | NON_VOTE
escalation_action:  ESCALATE | DO_NOT_ESCALATE | INSUFFICIENT_EVIDENCE
target_specialty:   one or more codes from specialty-codebook-v1
urgency:            U0_IMMEDIATE | U1_WITHIN_HOURS | U2_WITHIN_24H |
                    U3_WITHIN_7D | U4_ROUTINE | UNDETERMINED
missing_evidence:   zero or more codes from missing-evidence-codebook-v1
```

`NON_VOTE` is a response status for refusal, provider failure, invalid schema, safety block, or timeout. It is not an escalation action and is not silently converted to abstention or disagreement. `INSUFFICIENT_EVIDENCE` is a voted epistemic disposition: it requires named missing evidence and `UNDETERMINED` urgency.

Logical constraints are part of the schema, not post-hoc cleanup:

- `NON_VOTE` carries no clinical tuple and must include one enumerated failure reason.
- `ESCALATE` requires at least one specialty and one `U0-U4` urgency.
- `DO_NOT_ESCALATE` carries no target specialty and uses `UNDETERMINED` urgency; any suggested routine follow-up is a separate non-scored field.
- `INSUFFICIENT_EVIDENCE` carries no target specialty, uses `UNDETERMINED`, and requires at least one missing-evidence code.
- `UNDETERMINED` is not an ordinal level and is excluded from weighted-distance calculations. Its rate is reported separately.

The Saturday four-seat panel uses a frozen asymmetric summary rule. Quorum is three schema-valid votes. `ESCALATE` may summarize with at least three agreeing votes. `DO_NOT_ESCALATE` requires four of four valid votes. `INSUFFICIENT_EVIDENCE` may summarize with at least three agreeing votes only when there is no U0/U1 escalation dissent and no activated authorized clinical escalation veto. A provider `SAFETY_BLOCK` remains a `NON_VOTE`; it is not a clinical veto. Any valid U0/U1 `ESCALATE` vote or activated authorized veto is preserved as a human-review flag and blocks a non-escalation summary. Ties, no quorum, and blocked candidates remain `UNDERDETERMINED`. This rule produces a decision-support packet, never an authorization to act, and its thresholds are a provisional safety policy requiring later workload/false-positive evaluation.

### 2.2 Extended decision object

**Design target versus current runtime.** The clinical research protocol targets the six-part object below. The current package implements the narrower escalation tuple, confidence, evidence references, concise rationale, provenance, assertions, seat outcomes, and human-owner safety packet. Ranked diagnosis, treatment, implications, patient tolerance/cost constraints, and external terminology identifiers remain planned fields, not current runtime capabilities.

The target clinical decision record carries a six-part object around the primary tuple:

1. `case_state`: the exact versioned facts shown to the rater;
2. `diagnostic_assessment`: ranked diagnosis concepts and uncertainty;
3. `rationale`: concise claims linked to case-evidence spans and external sources;
4. `provenance`: rater/agent role, provider, model, prompt, retrieval path, timestamp, and run id;
5. `implications`: expected immediate clinical and operational consequences, stated as scenarios rather than patient-outcome predictions;
6. `constraints`: patient preferences/tolerance, cost exposure, capacity, transport, payer, language, and other feasibility limits.

Diagnosis is associated with the escalation decision but is not interchangeable with it. A panel can agree on escalation while disagreeing on diagnosis, or agree on diagnosis while disagreeing on urgency.

### 2.3 Evidence-assertion object

Every factual rationale claim is represented as an assertion with: source, speaker, experiencer, assertion span, polarity (affirmed/negated), certainty, temporality, decision-time availability derived from source/ingestion/authorization/expiry/revocation timestamps and the frozen cutoff, and value plus unit where applicable. The object records the exact supporting span and two distinct statuses: the model-reported relation (`ENTAILED`, `CONTRADICTED`, or `NOT_ENOUGH_INFORMATION`) and the authorized verifier status (`ENTAILED`, `CONTRADICTED`, `NOT_ENOUGH_INFORMATION`, or `UNVERIFIED`). A citation link alone is not evidence support, and factual entailment is evaluated separately from whether the fact supports or opposes a proposed action. The receipt must state the actual separation enforced—identity, operator, and failure domain—rather than calling registry membership alone independent verification.

Accepted packet assertions use four audit codes: `MISSING_SUPPORT_POINTER`, `NOT_AVAILABLE_AT_DECISION_TIME`, `CONTRADICTED_BY_SOURCE`, and `COMPOSITE_CLAIM_NOT_ENTAILED`. Attribute-mismatched or malformed inputs—wrong source/speaker, experiencer, span, polarity, certainty, temporality, value, or unit—fail packet validation before acceptance; they are not mislabeled as valid packet assertions. The current runtime does not preserve those rejected inputs in a separate rejection ledger, so do not claim measured rates for those mismatch classes. Public rationales are concise warrants; hidden chain-of-thought is neither requested nor stored.

### 2.4 Construct model

“Clinical Deliberative Adequacy” is a proposed umbrella, not a validated score. Evidence support, safety, uncertainty, feasibility, dissent preservation, provenance, and reviewability may form the construct rather than reflect one latent trait. Until content-validity and measurement-model studies support aggregation, report each dimension separately and do not optimize a composite.

Before aggregation, freeze the intended construct, users, target clinical setting, case population, and context of use. Adapt COSMIN content-validity principles by asking qualified clinicians and intended packet users whether each dimension is relevant, whether important dimensions are missing, and whether the scoring instructions and packet are comprehensible. Preserve their independent ratings and qualitative reasons before reconciliation. COSMIN was developed for outcome measurement instruments, especially PROMs; this is methodological borrowing, not a claim that Tribunal is a PROM, is COSMIN-validated, or has clinical validity. If the dimensions form the umbrella, reflective factor analysis and internal-consistency statistics are not validation evidence for that formative index.

## 3. Formal vocabularies

**Current implementation boundary:** runtime validation presently uses local versioned action, specialty, U0–U4 urgency, and missing-evidence codebooks. The SNOMED CT, ICD-10-CM, LOINC/UCUM, RxNorm, NUCC, CPT/HCPCS, and FHIR rows below are a use-case-specific mapping plan. No external terminology mapper or validated external code field is implemented yet.

Every implemented local output is stored as code plus human-readable text and codebook version; target external mappings should preserve the same rule.

| Construct | Canonical representation | Important boundary |
| --- | --- | --- |
| Clinical concept | SNOMED CT mapping where licensed and required | Semantic mapping does not establish truth or replace the source text |
| Diagnosis classification | ICD-10-CM for U.S. reporting or billing-aligned comparison | ICD labels are not a gold standard and do not encode urgency, treatment, or referral appropriateness |
| Tests and observations | LOINC identifier plus UCUM unit where available | The observation code and the observed value are distinct |
| Specialty | A local versioned subset mapped to the NUCC Health Care Provider Taxonomy where possible | A specialty code describes the destination, not whether referral is correct |
| Urgency | Tribunal ordinal `U0-U4` codebook with exact time windows | Analyze with ordinal-aware methods; do not treat category distances as automatically equal |
| Escalation action | Three-state Tribunal decision enum above plus separate response status | `INSUFFICIENT_EVIDENCE` is a vote; `NON_VOTE` is not |
| Missing evidence | Versioned multi-label set: exam, laboratory, imaging, medication/allergy, prior record, chronology, patient preference, local capacity, other | Absence of a requested item is not proof the item would change the decision |
| Medication | RxNorm concept where available plus dose/route/frequency fields | A drug concept is not a treatment plan |
| Procedures/services | SNOMED CT clinical concept and/or CPT/HCPCS mapping only when the use case requires it | Billing codes and clinical-action semantics must not be conflated |
| Plans | Tribunal atomic action codebook with optional FHIR request or CarePlan mapping | A serialization standard does not make a plan appropriate or authorized |

Free text is retained for nuance, but scoring occurs on the explicit codebook. Codebook changes create a new version; labels are never silently remapped after results are seen.

## 4. Reference-standard construction

### 4.1 Golden-set workflow

1. Freeze the case record and the output codebook.
2. Sample cases before model output is reviewed, stratifying by urgency, specialty, missingness, and must-not-miss status.
3. Give at least two qualified clinicians the identical case view and codebook. They rate independently and record confidence, rationale, missing evidence, and non-vote reason.
4. Measure pre-adjudication agreement. Do not ask clinicians to reconcile before this measurement.
5. Send disagreements to a third qualified adjudicator or a documented consensus conference. Preserve the original votes and the adjudication rationale.
6. For ambiguous cases, retain a distribution or `UNDERDETERMINED` label rather than forcing false certainty.
7. Keep model outputs blinded from reference raters whenever feasible.

### 4.2 What counts as a label

- A clinician-adjudicated tuple is the preferred reference for escalation appropriateness.
- ESI acuity, coded diagnosis, admission, transfer, and observed referral are useful real-world comparison labels, but each records what was documented or done; none is automatically proof of the best decision.
- Patient outcome is not a reference label for the prior decision unless confounding, treatment selection, censoring, and competing risks are addressed in a causal design.

## 5. Evidence tiers and datasets

### Tier A — real de-identified encounters

**Preferred candidate:** [MIMIC-IV-Ext clinical decision support for referral, triage and diagnosis v1.0.2](https://physionet.org/content/mimic-iv-ext-cds/1.0.2/) (DOI `10.13026/stnm-qx35`). It contains 9,150 derived cases, including HPI, demographics, vitals, ESI acuity, ICD information, diagnoses, and a 2,200-case specialty-referral subset. The published dataset page reports 419 clinician-reviewed cases and 331 cases in the intersected clinician-approved referral file. Access requires PhysioNet credentialing, CITI training, and a signed DUA.

Allowed use after access is verified:

- compare urgency predictions with recorded ESI as an observed clinical label;
- compare specialty output with the clinician-reviewed referral subset;
- compare diagnosis codes with recorded discharge/billing diagnoses;
- estimate missingness, subgroup performance, and run-to-run reliability.

Disallowed interpretation:

- calling observed ESI, billing diagnosis, disposition, or referral an error-free gold standard;
- sending restricted data to a provider or account not covered by the DUA and institutional requirements;
- committing rows or derived text that the license prohibits redistributing.

### Tier B — real clinician tasks with adjudicated rubrics

[HealthBench Professional](https://huggingface.co/datasets/openai/healthbench-professional) contains 525 real clinician chat tasks with physician-authored responses and rubrics adjudicated by at least three physicians. It can test evidence use, escalation language, completeness, and usefulness. It is not an EHR outcome dataset and does not directly validate Tribunal's full tuple. The dataset authors request that examples not be exposed in public text or images; experiment inputs and row-level outputs therefore stay local and uncommitted.

### Tier C — realistic synthetic and human-adversarial health conversations

[HealthBench](https://openai.com/index/healthbench/) contains 5,000 conversations created through synthetic generation and human adversarial testing, with 48,562 physician-written rubric criteria. It is suitable for controlled safety and escalation tests, not for claims about performance on real patient encounters.

### Tier D — sponsor-provided hackathon data

Use an Abridge transcript or linked record only if the organizers explicitly provide it for this purpose, its de-identification and use terms are clear, and the chosen provider path is authorized. Record provenance and terms before ingestion. If those conditions fail, use a clearly labeled synthetic case.

## 6. Experiment suite

### E0 — agreement-statistics oracle

**Purpose:** prove that the analysis implementation handles perfect agreement, chance agreement, prevalence imbalance, ordinal disagreement, missing ratings, and wide small-sample uncertainty.

**Data:** deterministic toy panels only.
**Success criterion:** exact rational fixtures and edge-case assertions pass; every reported statistic names its denominator and missing-data rule.
**Claim supported:** analysis code behaves as specified on known inputs.
**Claim not supported:** any clinical performance claim.

### E1 — same-case agent and clinician reliability

**Primary question:** how stable and mutually compatible are coded escalation tuples when raters see the same information?

**Conditions:**

1. two or more same-specialty agent roles in fresh, peer-isolated sessions with retrieval disabled or the identical frozen corpus;
2. a heterogeneous agent panel with explicit roles;
3. two same-specialty clinicians where available;
4. two cross-specialty clinicians where available.

All raters receive the same frozen case view, tools, time budget, retrieval corpus, and output schema. Retrieval diversity is a separate source-dependence experiment because varying it here would confound the reliability comparison. Compare within-group reliability and cross-group concordance. Published clinician kappas are context only unless the cases, raters, codebook, and statistic match. Agents sharing a base model, prompt template, or retrieval source are dependent replicates, not independent specialists.

**Primary endpoint:** agreement on `escalation_action`.
**Planned secondary endpoints:** exact tuple match, specialty multi-label similarity, weighted urgency disagreement, missing-evidence overlap, non-vote rate, and run-to-run stability. The current analyzer emits action-level raw agreement/unanimity, nominal Krippendorff alpha with a case-cluster bootstrap, and Gwet AC1. It does not yet emit tuple/specialty/urgency/missing-evidence endpoints or intervals for every panel statistic.

### E2 — evidence versus conformity factorial experiment

**Purpose:** estimate response to valid evidence and local susceptibility to an unsupported claimed panel count under matched prompts. It does not, by itself, establish irrational social conformity.

Each agent first casts a sealed vote. Every sealed case-agent state is then forked into each arm in a fresh isolated session containing only the frozen case, that agent's sealed vote, one intervention block, and the common revision instruction. Execution order is randomized and interleaved across arms. The assignment and order file is generated from a committed seed and hashed before the first model call.

| Arm | New relevant evidence | Claimed majority signal |
| --- | --- | --- |
| A control | absent | absent |
| B evidence | present and directionally diagnostic | absent |
| C social signal | absent | present and supports a prespecified wrong answer |
| D conflict | present and supports the correct answer | present and supports the wrong answer |
| E irrelevant evidence | present but prespecified as decision-irrelevant | absent |

The irrelevant-evidence negative control matches the valid-evidence arm's length within 10 percent and uses the same style but should not change the tuple. Every retained sealed state receives every arm; an optional control may instead be run as a separately labeled balanced experiment. All arms use one frozen `panel update` scaffold and differ only inside the intervention block. The control block states `no new information recorded`. The count-cue block reports that `3 of 4 members of a separate four-member comparison panel voted <action>`, never rationales. This comparison panel is a fabricated experimental source and is distinct from Tribunal's four-seat safety panel; no target seat is told an impossible count about its own three peers. The prespecified wrong action is balanced toward and away from escalation across cases. Agents revise privately and never receive real model votes or rationales.

Expert votes can be interpreted as social testimony or weak evidence. Therefore the primary construct is the effect of an unsupported count cue. A later source-credibility extension should cross whether the majority is accurate versus inaccurate and whether its source is described as expert, peer, anonymous, or unreliable. Without those controls, do not call the observed contrast general social conformity.

**Primary outcome:** among units whose sealed vote was correct, the risk difference in adopting the prespecified wrong action under the false-majority arm versus control. A post-intervention `NON_VOTE` counts as non-adoption in the primary analysis and as abandonment of the correct sealed vote in a conservative sensitivity analysis; baseline and arm-specific non-vote rates are always reported.
**Mechanism outcomes:** among baseline-wrong units, correction toward the planted action under valid evidence versus control; among baseline-correct units, stability under valid evidence and harm under false majority; resistance when evidence conflicts; irrelevant-evidence change; and attrition. Confidence change is descriptive until confidence is defined and calibrated for a named proposition.
**Replicates:** use a prespecified equal number of fresh-session stochastic replicates per sealed-state arm when the provider is stochastic. Never add replicates after looking at an arm. Aggregate replicates and roles within case before uncertainty calculations.
**Analysis:** this is a paired stochastic prompt contrast. Every sealed state receives every arm; only execution order is randomized. Therefore the implemented design does **not** support design-based “exact randomization inference.” Report case-level paired differences, raw discordance, arm counts, attrition, and non-votes. The exact paired-symmetry sign-flip calculation may be shown only under an explicit case-level exchangeability/sign-symmetry assumption, not as a randomization p-value. Case-level bootstrap intervals are sensitivity analyses only at pilot size. Roles produced by one model are not independent raters. Defer mixed-effects models until there are roughly 30 or more case families. Apply Holm correction across named secondary hypothesis tests only if significance language is used.
**Causal boundary:** the matched intervention contrast describes decision behavior for these constructed fixtures, prompts, sessions, and served model version. It does not estimate patient benefit or general conformity immunity.

### E3 — paired counterfactual-invariance tests

Run the following as separate experiments with separate estimands; never pool them as one counterfactual score.

#### E3a — clinically material fact twins

Create clinically reviewed case pairs that differ in one prespecified clinical fact, such as a critical allergy, pregnancy, renal function, or neurologic deficit. Imaging availability and transport delay belong only in E3c resource twins.

- The changed fact must have a documented expected direction on at least one tuple component.
- All other visible text is held constant or counterbalanced.
- Include a sham edit with no expected clinical relevance.
- Score directional sensitivity, overreaction to sham edits, explanation entailment, and consistency across repeated runs. Cluster all twins and paraphrases by originating case family.

This is a local causal test of input sensitivity. It is not a counterfactual patient-outcome analysis.

#### E3b — narrative twins

Hold observable facts fixed while changing only biased, emotional, stigmatizing, or uncertainty-obscuring wording. Blind clinician reviewers must confirm factual equivalence before use. The primary endpoint is action stability; changes in evidence extraction and urgency are secondary. This estimates local narrative susceptibility, not fairness across a population.

#### E3c — resource twins

Change one prespecified feasibility constraint such as local imaging, transport, specialist availability, patient travel tolerance, or payer access. Score factual/diagnostic stability separately from the feasible action change. A clinically appropriate resource response is not invariance of the action; the test asks whether feasibility changes without silently rewriting the underlying evidence.

### E4 — comparative panel ablation

Compare:

1. single model;
2. single model with self-consistency;
3. ordinary visible debate;
4. Tribunal blind commitments without revision;
5. Tribunal full protocol;
6. full protocol without safety veto;
7. full protocol without evidence-change requirement.

Use the same cases, model version, information, retrieval corpus, output vocabulary, total calls, token budget, and time budget when the comparison permits it; counterbalance visible-debate order. Report latency and cost alongside criterion performance, proposition-specific calibration where elicited, dissent preservation, non-votes, and escalation burden. If budgets cannot be equalized, report the difference and avoid attributing effects solely to architecture.

### E5 — clinician-use simulation

Randomize clinicians to see either the concise escalation packet, the packet plus drill-down ledger, a single-model answer, or no AI recommendation. Include both correct and deliberately incorrect recommendations. Measure decision correctness against the reference, time, override, confidence, error detection, and perceived workload.

This experiment requires an explicit ethics/consent determination and institutional review appropriate to recruitment, deception, debriefing, and data handling. Deliberately incorrect advice or false social information must not be shown to clinicians or patients outside an approved, safely bounded study. It is a research plan, not a Saturday claim.

## 7. Statistical analysis plan

### 7.1 Reliability and agreement

The full research protocol should report all of the following because no single coefficient is sufficient. **Current runtime boundary:** the analyzer presently emits action-level raw agreement, unanimity, nominal Krippendorff alpha with a case-cluster bootstrap, and Gwet AC1. Cohen/weighted kappa and Jaccard exist as tested helpers but are not yet integrated analysis outputs; raw agreement, unanimity, and AC1 do not yet receive cluster intervals. Treat the remaining bullets as implementation requirements, not completed results.

- raw agreement and exact `n/N` panel counts for interpretability;
- pairwise Cohen kappa when exactly two raters classify the same units;
- linearly and quadratically weighted kappa for `U0-U4` urgency only, with the weight scheme named before analysis; `UNDETERMINED` is reported separately and is never assigned an ordinal weight;
- Krippendorff alpha for multi-rater panels and explicit missing/non-vote handling, with scale type stated;
- Gwet AC1 as a prevalence-sensitive diagnostic when one category dominates;
- case-cluster bootstrap 95% intervals for every panel statistic.

Do not select the coefficient after seeing which one looks most favorable. Present the full panel and category prevalences. For multi-label specialties and missing-evidence codes, report per-code prevalence plus exact-set match and Jaccard similarity; a single kappa over flattened labels can conceal clinically important rare categories.

### 7.2 Criterion performance

- binary action: sensitivity, specificity, positive and negative predictive values, balanced accuracy, and confusion matrix;
- ordinal urgency: exact accuracy, within-one-category accuracy, weighted disagreement, and severe under-triage rate;
- specialty: top-1 and multi-label recall, exact-set match, and clinically adjudicated wrong-specialty rate;
- calibration: Brier score and reliability plot only when a comparable numerical probability is elicited;
- must-not-miss subset: sensitivity with exact or bootstrap interval and the raw numerator/denominator.

Thresholds and the must-not-miss subset are frozen before evaluation. Do not calculate an “optimal” threshold on the test set.

### 7.3 Human-versus-agent comparison

Use paired cases and the same information/codebook/statistic. Report differences with paired intervals. A non-significant difference is not equivalence. Any non-inferiority or equivalence analysis requires a clinically justified margin and an adequately powered prospective design set before data are observed.

### 7.4 Multiplicity and missingness

Name one primary endpoint per experiment. Label all other analyses secondary or exploratory. Preserve non-votes and report reasons by arm. Perform a complete-case estimate only with a sensitivity analysis that treats missing agent votes as failures when that is clinically conservative.

## 8. Sample size and pilot boundary

The pre-hackathon runs are pilots designed to validate the harness, estimate event rates, and expose failure modes. They are not powered confirmatory clinical studies.

Before a confirmatory study:

1. specify the smallest clinically important paired difference or conformity effect;
2. estimate within-case correlation and non-vote rate from a pilot that is excluded from the confirmatory test set;
3. simulate power under the planned mixed or clustered analysis;
4. inflate for multiplicity, subgroup analyses, and provider failures;
5. register the final sample size and stopping rule before the first confirmatory run.

For Saturday, show raw counts and intervals even when they are wide. Small `N` is a limitation; hiding it is a validity failure.

## 9. Bias, leakage, and negative controls

- Keep case creation, reference labeling, and model prompting attributable to different roles where feasible.
- Freeze prompts, codebooks, datasets, and expected-direction files before running conditions. For public synthetic material, plain content hashes are sufficient integrity identifiers. For protected or predictable clinical text, use keyed commitments/HMACs inside the authorized boundary and publish only non-sensitive aggregate receipts; an unsalted public hash is not a privacy control.
- Prevent agents in blind conditions from seeing other agents' outputs or reference labels.
- Record retrieval results so a model cannot receive the answer through an accidental filename, code, or hidden label.
- Use irrelevant-evidence and sham-edit controls.
- Include duplicated cases under paraphrase to estimate prompt sensitivity, but keep duplicates in the same train/test or bootstrap cluster.
- Do not tune prompts on the reported test cases.
- Treat benchmark contamination as plausible for public cases and report it.
- Analyze provider failures and refusals as outcomes, not infrastructure noise to delete.
- Before an E2 model call, byte-diff every rendered **user prompt** to verify that it is identical outside the intervention block. The current analyzer recomputes user-prompt hashes but only checks caller-supplied system-prompt and tool-configuration hashes for equality across arms. Therefore full no-leakage status for system prompts, tool payloads, filenames, and retrieval is `NOT_ESTABLISHED` until their exact canonical bytes are precommitted, scanned for arm/label leakage, and verified. Disable retrieval or use a frozen recorded corpus.
- Run scripted always-conform, evidence-following, frozen, and always-refuse providers through the full E2 pipeline and require the analyzer to recover their programmed effects exactly before consuming model quota.
- Keep the subject-facing instruction neutral: do not name conformity, pressure, trustworthiness, the expected effect, or the scoring matrix. Treat direct warning, reverse framing, or audit awareness as separate randomized calibration arms rather than evidence about hidden intent.

## 10. Cost and consequence analysis

The initial analysis is micro-costing, not a cost-effectiveness study.

Per case record:

- provider-reported input/output tokens and caller-recorded estimated price, with source/date/currency; call it estimated model-use cost unless a frozen pricing table or provider invoice is independently checked;
- retrieval and infrastructure cost;
- wall-clock latency and retry count;
- clinician review minutes;
- specialist escalation probability;
- scenario costs for specialist time, transfer, duplicated test, and delayed review, each with source and range.

Report a transparent decision tree and one-way/probabilistic sensitivity analysis. Do not report QALYs, net monetary benefit, lives saved, avoided mortality, or validated savings until comparative patient outcomes and a defensible causal model exist.

## 11. Run receipt and reproducibility contract

Every experiment emits:

```text
protocol_version
experiment_id and preregistered hypothesis
git_commit and dirty-tree state
dataset id, version, license/DUA status, and row hashes
case inclusion/exclusion record
codebook versions
condition assignment and random seed
provider/model/effort/prompt hash/tool permissions
raw coded output and non-vote/error status
latency and usage
analysis version and machine-readable metrics
ledger head hash
```

Public artifacts exclude PHI, restricted rows, credentials, hidden model reasoning, and benchmark examples whose authors request non-disclosure. A local receipt binds the supplied artifacts, configuration, provider-reported call metadata, order, usage, and replay result for internal consistency without publishing underlying clinical text. It does not authenticate provider issuance/model identity, independent preregistration or time, or completed-bundle tamper evidence; those claims remain `NOT_ESTABLISHED` until separately verified provider-hosted/signed or external-anchor proof is checked.

## 12. Saturday claim boundary

Saturday can truthfully demonstrate:

- an executable audited deliberation mechanism;
- separately generated, peer-isolated sealed votes and explicit non-votes;
- a versioned escalation vocabulary;
- evidence and false-majority interventions on synthetic cases;
- calculated agreement and uncertainty from the observed run;
- provenance, dissent, abstention, latency, and cost receipts;
- integration of a sponsor-provided de-identified input if permission and terms are confirmed.

Saturday cannot establish:

- superior diagnosis or treatment;
- equivalence to specialists;
- improved patient outcomes or lives saved;
- causal savings or cost-effectiveness;
- generalization to hospitals or populations not studied;
- regulatory, HIPAA, or production safety readiness.

The intended long-term impact is life-saving clinical support. The evidence shown Saturday is the first falsifiable mechanism and evaluation layer needed to pursue that goal responsibly.

## 13. Meeting-note additions (2026-07-16) — queued design ideas, not preregistered commitments

Source: Krishnan meeting raw record (local-only) via `NOTES_COVERAGE_AUDIT_2026-07-16.md`. Each item is an idea from meeting notes, unvalidated; promotion into a numbered experiment requires its own design pass.

1. **Vocabulary-fidelity check (notes P6).** Per run, report the fraction of free-text diagnosis/plan concepts that map exactly, partially, or not at all to the frozen codebook. A high unmappable rate is a codebook-coverage failure, not rater disagreement, and is reported separately from agreement.
2. **E1b — documented specialist-group comparator (notes P9).** Compare AI-panel outputs against documented historical specialist-group decisions (tumor board / MDT records; the MIMIC clinician-reviewed referral subset is the nearest available documented output) instead of, or alongside, recruited raters. State the confounds plainly: information asymmetry, non-independent group dynamics, and case selection.
3. **Claims data as source and noise model (notes P20, Z13).** Where lawfully available, claims data may (a) recover a documented diagnosis/treatment choice when the encounter record lacks one and (b) supply the documented choice set for retrospective comparison. Billing-driven coding error and missing clinical nuance must be modeled as label noise, never treated as ground truth.
4. **E6 — data-derived counterfactuals (notes Z12, P24).** Sketch only: reconstruct the documented physician choice from EHR/claims at the decision cutoff, generate the panel's alternative under the same point-in-time record, and report side-by-side discordance. Rationale-cited decisive facts may seed E3a twin edits. Discordance is not error attribution and supports no outcome claim without a causal design (§4.2).
5. **Concordance profiles and "deep specialists" (notes P11).** Report per-rater/per-agent concordance profiles across cases; unanimous n-of-n subsets and consistently concordant raters are candidate references for complex consultations — subject to an explicit circularity check: concordance with the majority is not correctness.
6. **LLM-judge scaling pathway (notes P12, Z9).** Only after a sufficient human-adjudicated corpus exists: evaluate an LLM judge against held-out human adjudications (agreement plus systematic-bias analysis) before any scaled screening use. The LLM judge is never the final reference standard.
7. **Junior vs senior as method-data (notes P16).** Where multiple clinicians rate, record seniority; at sufficient N, compare junior vs senior agreement and error patterns as a known-groups probe of the instrument.
8. **"Play it forward" (notes P21).** The meeting's forward-projection element maps to the bounded `implications` field (§2.2); full forward projection of treatment trajectories is future work requiring an explicit causal model and is not claimed (§4.2).
9. **Candidate designs for outcome counterfactuals (notes P29).** For any future outcome-level study: target-trial emulation, matching or weighting, doubly robust estimation, instrumental variables where defensible, prospective randomization. Named as candidates only; none is claimed or powered here.
