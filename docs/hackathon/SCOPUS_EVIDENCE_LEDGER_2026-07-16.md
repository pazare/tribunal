# Tribunal Scopus and primary-source evidence ledger

As of: 2026-07-16
Purpose: convert recovered Scopus AI synthesis into presentation-safe evidence decisions
Status vocabulary: `verified`, `corrected`, `context-only`, `reject`, `pending`

## 1. Provenance and evidence rule

Recovered CMU-authenticated Scopus AI sources:

| Source | Identifier | Capture state |
| --- | --- | --- |
| Physician diagnostic/referral/triage reliability | Scopus AI conversation `b0c1b87e-d6cb-4f09-baaa-0a84483e7284` | 13 references and 5 foundational papers recovered |
| AI/physician agreement over coded diagnoses | Scopus AI conversation `f83f57c8-fe0e-4719-9964-40d8c7d8ee9c` | 13 references and 5 foundational papers recovered |
| Evidence-induced revision versus conformity | Scopus AI conversation `2416639b-a54e-45e7-933e-ce17aa43553e` | summary recovered; full reference capture still pending |
| Specialist scarcity, outcomes, integration, and cost | Scopus AI conversation `590602b6-b003-4b6e-b7d5-351f3f64ed0d`; Drive file `1UG1JO89yd8bnwOoxX17Qvag-LiOvzhUo` | complete 13-page extracted report with 66 references recovered |

Scopus AI is a discovery and synthesis layer. It is never the final empirical citation. A claim becomes `verified` only when the underlying paper or authoritative source was inspected closely enough to support the exact wording. A DOI record confirms bibliographic identity, not every statistic or interpretation.

Raw recovered source: `docs/hackathon/_recovered/scopus/problem-research-drive-scopus-ai.txt`.

## 2. Problem and economic claims

| ID | Recovered claim | Primary evidence checked | Status | Safe use |
| --- | --- | --- | --- | --- |
| P-01 | Rural Medicare beneficiaries have higher preventable hospitalization and mortality, while specialist visits are associated with lower rates | Johnston, Wen & Joynt Maddox, *Health Affairs* 2019, DOI [`10.1377/hlthaff.2019.00838`](https://doi.org/10.1377/hlthaff.2019.00838): rural residence was associated with 40% higher preventable hospitalization and 23% higher mortality; at least one specialist visit with 15.9% lower preventable hospitalization and 16.6% lower mortality after controls | verified, observational | Use as evidence that specialist access is a consequential workflow problem in one U.S. Medicare cohort. Say “associated,” not “caused,” and do not infer that Tribunal reproduces specialist benefit. |
| P-02 | Cardiologist care in AMI had lower risk-adjusted in-hospital mortality than internist/family-practice care | Nash, Nash & Fuster, *JACC* 1997, DOI [`10.1016/S0735-1097(96)00528-1`](https://www.jacc.org/doi/10.1016/S0735-1097%2896%2900528-1): 40,684 Pennsylvania AMI admissions in 1993; reported risk ratios 1.26 and 1.29 for internist and family-practitioner groups relative to cardiologists, with stated attribution and confounding limitations | context-only | Historical motivation only. It is a 1997 perspective using 1993 observational state data, not evidence about present-day routing, AI, or a general specialist effect. Omit from the main contest headline. |
| P-03 | Integrated care often has positive economic impact | Desmedt et al., *Value in Health* 2016, DOI [`10.1016/j.jval.2016.05.001`](https://pubmed.ncbi.nlm.nih.gov/27712719/): 22/26 included studies reported positive economic impact, limited to type 2 diabetes, schizophrenia, and multiple sclerosis; the paper notes relatively few studies and calls for stronger evaluation | context-only | Use only to motivate explicit economic evaluation. Do not generalize 84.6% to all integrated care, specialist panels, or Tribunal. |
| P-04 | Integrated HIV/diabetes/hypertension services reduced patient/provider costs | Shiri et al., *BMC Medicine* 2021, DOI [`10.1186/s12916-021-02094-2`](https://bmcmedicine.biomedcentral.com/articles/10.1186/s12916-021-02094-2): cohort and costing study across ten Tanzanian and Ugandan primary facilities with nested bootstrap uncertainty | context-only | A rigorous example of context-specific micro-costing and resource analysis. It does not validate an AI workflow or U.S. hospital economics. |
| P-05 | Specialist scarcity and fragmentation cause higher mortality and cost across settings | The recovered Scopus report combines heterogeneous cohorts, diseases, countries, dates, and designs | corrected | Say that lack of access and fragmented care are associated with worse outcomes in several settings and that causal magnitude is context-specific. Do not use one pooled causal statement. |
| P-06 | Tribunal will save lives or reduce mortality | No Tribunal patient-outcome comparison exists | reject | “Saving lives” is the intended long-term impact and contest motivation, not an observed result. Saturday can demonstrate a safety mechanism and evaluation pathway. |
| P-07 | Tribunal is cost-effective because AI deliberation is cheaper than specialists | No outcome-based incremental cost-effectiveness analysis exists | reject | Report observed model cost, latency, clinician review time, and transparent cost scenarios. Do not report QALYs, net monetary benefit, or validated savings. |

## 3. Measurement claims

The first bounded Fable citation resolver completed under session `e260e89b-d21f-48a7-8214-e3391fa790e0`; its memo is preserved at `docs/hackathon/_recovered/fable/FABLE_CITATION_RESOLVER_2026-07-16.md`. The entries below were independently checked against accessible primary publisher or bibliographic pages.

| ID | Claim decision | Evidence | Status and use |
| --- | --- | --- | --- |
| M-01 | Cohen kappa is appropriate for two raters on nominal categories | Cohen 1960, DOI [`10.1177/001316446002000104`](https://doi.org/10.1177/001316446002000104) | verified; pairwise reliability only, never correctness |
| M-02 | Weighted kappa applies to ordinal urgency | Cohen 1968, DOI [`10.1037/h0026256`](https://doi.org/10.1037/h0026256) | verified; weights must be preregistered. The Scopus phrasing that tied severity to ICD-10 was wrong. ICD-10-CM is not Tribunal's urgency scale. |
| M-03 | Multi-rater data with missing ratings should use Krippendorff alpha with bootstrap uncertainty | Zapf et al. 2016, DOI [`10.1186/s12874-016-0200-9`](https://link.springer.com/article/10.1186/s12874-016-0200-9): simulations found alpha stable under MCAR missingness while complete-case Fleiss K was biased; bootstrap intervals had better coverage than the examined asymptotic Fleiss interval | verified with scope correction; missingness result is simulation- and MCAR-specific. Record refusal/timeout reasons separately. |
| M-04 | Gwet AC1 can diagnose kappa/prevalence instability | Wongpakaran et al. 2013, DOI [`10.1186/1471-2288-13-61`](https://link.springer.com/article/10.1186/1471-2288-13-61): in 67 personality-disorder assessments, kappa ranged 0–1 and AC1 0.752–1; AC1 was less affected by prevalence/marginals in that setting. Gwet 2008, DOI [`10.1348/000711006X126600`](https://doi.org/10.1348/000711006X126600), proposed AC1 under high agreement. | verified as a companion diagnostic; AC1 uses a different chance model and is not a favorable substitute to cherry-pick |
| M-05 | High raw agreement can coexist with low kappa | Feinstein & Cicchetti 1990, DOI [`10.1016/0895-4356(90)90158-L`](https://pubmed.ncbi.nlm.nih.gov/2348207/) | verified; always show raw agreement, marginals, and category prevalence with kappa |
| M-06 | Reliability studies must account for prevalence, bias, non-independence, confidence intervals, and sample size | Sim & Wright 2005, DOI [`10.1093/ptj/85.3.257`](https://academic.oup.com/ptj/article/85/3/257/2805022) | verified; use for design, not a universal kappa threshold |
| M-07 | Five PCPs had kappa about 0.2 on binary urgency triage | Entezarjou et al. 2020, DOI [`10.2196/18930`](https://medinform.jmir.org/2020/9/e18930/): five PCPs independently rated digital histories; average physician kappa 0.20; cases were ultimately dichotomized as urgent/non-urgent | verified but context-only; never use this as a weak human bar that Tribunal merely has to exceed |
| M-08 | A pooled physician–nurse ED triage kappa was 0.756 | Pishbin et al. 2019, DOI `10.1007/s10049-019-0580-6`; bibliographic record was found, but the decisive statistic and interval could not be inspected in the bounded pass | pending; do not quote until the full paper is opened through CMU access |
| M-09 | Landis–Koch verbal bands define clinical acceptability | Landis & Koch 1977, PMID [`843571`](https://pubmed.ncbi.nlm.nih.gov/843571/) | context-only; report coefficients and intervals, and if bands appear label them as conventions rather than clinical thresholds |

## 4. Data evidence that changes the experiment

| Dataset | What it really provides | Access/limits | Decision |
| --- | --- | --- | --- |
| [MIMIC-IV-Ext CDS v1.0.2](https://physionet.org/content/mimic-iv-ext-cds/1.0.2/) | 9,150 real de-identified ED-derived cases; HPI, demographics, vitals, ESI, ICD information, diagnosis; 2,200 specialty-referral cases and 419 clinician-reviewed cases | credentialed PhysioNet access, CITI training, signed DUA; observed labels are not error-free gold standards | preferred real-data external-validity study after access verification |
| [HealthBench Professional](https://huggingface.co/datasets/openai/healthbench-professional) | 525 real clinician-authored chat tasks with physician responses and iteratively adjudicated rubrics | not an EHR/outcome dataset; authors request no public reproduction of examples | private pre-event evaluation of evidence use, escalation language, and packet quality |
| [HealthBench](https://openai.com/index/healthbench/) | 5,000 realistic conversations built through synthetic generation and human adversarial testing; physician-written rubrics | not real patient encounters; public benchmark contamination is plausible | controlled safety and escalation benchmark, clearly labeled synthetic/adversarial |
| Abridge event data | unknown until organizer disclosure | permitted fields, de-identification, public-demo rights, model path, and retention must be confirmed | use only after written/recorded confirmation at check-in |

## 5. Scopus follow-up queue

Use the authenticated Scopus AI session to resolve these narrowly, then inspect the underlying papers:

1. reopen conversation `2416639b-a54e-45e7-933e-ce17aa43553e` and capture its complete reference list for evidence-induced revision versus conformity;
2. inspect Pishbin et al. through CMU entitlement and verify the pooled kappa, confidence interval, number of studies, triage scales, and heterogeneity;
3. resolve the nine still-recovered-only human reliability rows listed in the Fable memo, but retain only construct-near comparators;
4. search for randomized or factorial experiments that independently manipulate valid evidence and social-majority signals in clinical or high-stakes agent decisions;
5. search for reliability or validity studies using the exact tuple: escalation action, specialty, urgency, and missing evidence;
6. search for health-economic evaluations of specialist referral/triage decision support that report clinician time, downstream utilization, and uncertainty—not only model accuracy.

## 6. Deck rule

Every quantitative slide must carry:

```text
population and setting | N | comparison | statistic and uncertainty | design | source | causal boundary
```

If any field is missing, the number stays in the research appendix. Scopus AI is named in provenance as the discovery tool; the slide cites the underlying paper.
