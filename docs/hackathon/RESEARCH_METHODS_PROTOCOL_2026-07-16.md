# Tribunal Clinical research methods protocol

Version: 0.1 preregistration draft
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

The primary unit is one `case_id × rater_or_agent_id × condition × round` observation. A panel-level summary is derived from those observations and never replaces them.

### 2.1 Primary escalation tuple

```text
escalation_action:  ESCALATE | DO_NOT_ESCALATE | INSUFFICIENT_EVIDENCE | NON_VOTE
target_specialty:   one or more codes from specialty-codebook-v1
urgency:            U0_IMMEDIATE | U1_WITHIN_HOURS | U2_WITHIN_24H |
                    U3_WITHIN_7D | U4_ROUTINE | UNDETERMINED
missing_evidence:   zero or more codes from missing-evidence-codebook-v1
```

`NON_VOTE` is a recorded observation for refusal, provider failure, invalid schema, safety block, or timeout. It is not silently converted to abstention or disagreement.

### 2.2 Extended decision object

The clinical decision record carries a six-part object around the primary tuple:

1. `case_state`: the exact versioned facts shown to the rater;
2. `diagnostic_assessment`: ranked diagnosis concepts and uncertainty;
3. `rationale`: concise claims linked to case-evidence spans and external sources;
4. `provenance`: rater/agent role, provider, model, prompt, retrieval path, timestamp, and run id;
5. `implications`: expected immediate clinical and operational consequences, stated as scenarios rather than patient-outcome predictions;
6. `constraints`: patient preferences/tolerance, cost exposure, capacity, transport, payer, language, and other feasibility limits.

Diagnosis is associated with the escalation decision but is not interchangeable with it. A panel can agree on escalation while disagreeing on diagnosis, or agree on diagnosis while disagreeing on urgency.

## 3. Formal vocabularies

Every output is stored as code plus human-readable text and codebook version.

| Construct | Canonical representation | Important boundary |
| --- | --- | --- |
| Diagnosis | ICD-10-CM for the U.S. billing-aligned comparison; optional SNOMED CT concept mapping | ICD labels are not a gold standard and do not encode urgency, treatment, or referral appropriateness |
| Specialty | A local versioned subset mapped to the NUCC Health Care Provider Taxonomy where possible | A specialty code describes the destination, not whether referral is correct |
| Urgency | Tribunal ordinal `U0-U4` codebook with exact time windows | Analyze with ordinal-aware methods; do not treat category distances as automatically equal |
| Escalation action | Four-state Tribunal enum above | `INSUFFICIENT_EVIDENCE` and `NON_VOTE` remain distinct |
| Missing evidence | Versioned multi-label set: exam, laboratory, imaging, medication/allergy, prior record, chronology, patient preference, local capacity, other | Absence of a requested item is not proof the item would change the decision |
| Medication | RxNorm concept where available plus dose/route/frequency fields | A drug concept is not a treatment plan |
| Procedures/services | SNOMED CT clinical concept and/or CPT/HCPCS mapping only when the use case requires it | Billing codes and clinical-action semantics must not be conflated |

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

1. two or more same-specialty agents with independent sessions/retrieval;
2. a heterogeneous agent panel with explicit roles;
3. two same-specialty clinicians where available;
4. two cross-specialty clinicians where available.

All raters receive the same frozen case view and output schema. Compare within-group reliability and cross-group concordance. Published clinician kappas are context only unless the cases, raters, codebook, and statistic match.

**Primary endpoint:** agreement on `escalation_action`.
**Secondary:** exact tuple match, specialty multi-label similarity, weighted urgency disagreement, missing-evidence overlap, non-vote rate, and run-to-run stability.

### E2 — evidence versus conformity factorial experiment

**Purpose:** distinguish evidence-induced revision from social capitulation.

Each agent first casts a sealed vote. Then case-agent pairs are randomized to a `2 × 2` design:

| Arm | New relevant evidence | Claimed majority signal |
| --- | --- | --- |
| A control | absent | absent |
| B evidence | present and directionally diagnostic | absent |
| C social signal | absent | present and supports a prespecified wrong answer |
| D conflict | present and supports the correct answer | present and supports the wrong answer |

Add an **irrelevant-evidence negative control** that matches length and style but should not change the tuple. Majority messages use identical wording across cases except for the randomized answer. Agents revise privately; they do not see one another's rationales.

**Primary outcome:** whether the post-exposure action is correct under the planted case mechanism.
**Mechanism outcomes:** change toward valid evidence, change toward the false majority, resistance to the false majority when evidence conflicts, and unjustified confidence change.
**Analysis:** intention-to-treat contrasts with case-cluster bootstrap intervals; exploratory mixed-effects logistic regression with random intercepts for case and model/session. Report arm counts and attrition/non-votes.
**Causal boundary:** the randomized contrast estimates an effect on agent decisions in these constructed cases. It does not estimate patient benefit.

### E3 — paired evidence-sensitivity test

Create clinically reviewed case pairs that differ in one prespecified fact, such as a critical allergy, pregnancy, renal function, neurologic deficit, local imaging capability, or transport delay.

- The changed fact must have a documented expected direction on at least one tuple component.
- All other visible text is held constant or counterbalanced.
- Include a sham edit with no expected clinical relevance.
- Score directional sensitivity, overreaction to sham edits, explanation entailment, and consistency across repeated runs.

This is a local causal test of input sensitivity. It is not a counterfactual patient-outcome analysis.

### E4 — comparative panel ablation

Compare:

1. single model;
2. single model with self-consistency;
3. ordinary visible debate;
4. Tribunal blind commitments without revision;
5. Tribunal full protocol;
6. full protocol without safety veto;
7. full protocol without evidence-change requirement.

Use the same cases, model budget, retrieval corpus, and output vocabulary when the comparison permits it. Report latency and cost alongside accuracy, calibration, dissent preservation, non-votes, and escalation burden. If budgets cannot be equalized, report the difference and avoid attributing effects solely to architecture.

### E5 — clinician-use simulation

Randomize clinicians to see either the concise escalation packet, the packet plus drill-down ledger, a single-model answer, or no AI recommendation. Include both correct and deliberately incorrect recommendations. Measure decision correctness against the reference, time, override, confidence, error detection, and perceived workload.

This experiment requires ethics and institutional review appropriate to recruitment and data handling. It is a research plan, not a Saturday claim.

## 7. Statistical analysis plan

### 7.1 Reliability and agreement

Report all of the following because no single coefficient is sufficient:

- raw agreement and exact `n/N` panel counts for interpretability;
- pairwise Cohen kappa when exactly two raters classify the same units;
- linearly and quadratically weighted kappa for ordinal urgency, with the weight scheme named before analysis;
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
- Hash and freeze prompts, codebooks, datasets, and expected-direction files before running conditions.
- Prevent agents in blind conditions from seeing other agents' outputs or reference labels.
- Record retrieval results so a model cannot receive the answer through an accidental filename, code, or hidden label.
- Use irrelevant-evidence and sham-edit controls.
- Include duplicated cases under paraphrase to estimate prompt sensitivity, but keep duplicates in the same train/test or bootstrap cluster.
- Do not tune prompts on the reported test cases.
- Treat benchmark contamination as plausible for public cases and report it.
- Analyze provider failures and refusals as outcomes, not infrastructure noise to delete.

## 10. Cost and consequence analysis

The initial analysis is micro-costing, not a cost-effectiveness study.

Per case record:

- input/output tokens and published model price at run time;
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

Public artifacts exclude PHI, restricted rows, credentials, hidden model reasoning, and benchmark examples whose authors request non-disclosure. A receipt can prove which authorized computation ran without publishing the underlying clinical text.

## 12. Saturday claim boundary

Saturday can truthfully demonstrate:

- an executable audited deliberation mechanism;
- independent sealed votes and explicit non-votes;
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
