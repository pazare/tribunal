# Tribunal Scopus and primary-source evidence ledger

As of: 2026-07-16
Purpose: convert recovered Scopus AI synthesis into presentation-safe evidence decisions
Status vocabulary: `verified`, `corrected`, `context-only`, `reject`, `pending`

## 1. Provenance and evidence rule

Recovered CMU-authenticated Scopus AI sources:

| Source | Public provenance | Capture state |
| --- | --- | --- |
| Physician diagnostic/referral/triage reliability | Authenticated institutional-access Scopus AI capture; raw locator private | 13 references and 5 foundational papers recovered |
| AI/physician agreement over coded diagnoses | Authenticated institutional-access Scopus AI capture; raw locator private | 13 references and 5 foundational papers recovered |
| Evidence-induced revision versus conformity | Authenticated institutional-access Scopus AI capture; raw locator private | summary recovered; full reference capture still pending |
| Specialist scarcity, outcomes, integration, and cost | Authenticated Scopus AI and private Drive capture; raw locators private | complete 13-page extracted report with 66 references recovered |
| Unsupported-majority cues in high-stakes LLM revision | Authenticated institutional-access Scopus AI query run 2026-07-16 | no direct matching study appeared in retrieved abstracts; 10 adjacent clinical multi-agent references returned |
| Human–AI advice timing, automation bias, anchoring | Authenticated institutional-access Scopus AI query run 2026-07-16 (Rao-prep session); raw capture local-only | grounded; 10 references captured; primary verification pending |
| Apples-to-apples AI-vs-physician comparison controls | Authenticated institutional-access Scopus AI query run 2026-07-16 (Rao-prep session); raw capture local-only | grounded; Chen et al. 2026 scoping review + AIPSC checklist lead; primary verification pending |
| Silent trials / shadow-mode deployments | Authenticated institutional-access Scopus AI queries run 2026-07-16 (Rao-prep session); raw capture local-only | abstract governance phrasing returned Scopus AI's own "Not based on Scopus references" banner (recorded ungrounded attempt); empirical rephrasing grounded with 7 references (CHARTwatch, SAFE-WAIT, Kwong silent-trial bridge); primary verification pending |
| Content validity and formative measurement models | Authenticated institutional-access Scopus AI query run 2026-07-16 | COSMIN methodology surfaced; three primary publications independently verified |
| Differential Reasoning Learning exact-title follow-up | Authenticated institutional-access Scopus AI query attempted 2026-07-16 | synthesis failed twice; no indexing conclusion drawn; arXiv primary record and full text reviewed directly |

Scopus AI is a discovery and synthesis layer. It is never the final empirical citation. A claim becomes `verified` only when the underlying paper or authoritative source was inspected closely enough to support the exact wording. A DOI record confirms bibliographic identity, not every statistic or interpretation.

Raw Scopus and Drive exports remain in gitignored local storage. The repository carries only this curated claim ledger and paper-level citations.

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

The first bounded Fable citation resolver completed with the required acknowledgment; its memo is preserved at `docs/hackathon/_recovered/fable/FABLE_CITATION_RESOLVER_2026-07-16.md`, while account and session evidence remain in the private local invocation ledger. The entries below were independently checked against accessible primary publisher or bibliographic pages.

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
| M-10 | A proposed multidimensional quality umbrella can be validated by a high alpha or a reflective factor model | Mokkink et al., COSMIN guideline v2.0, DOI [`10.1007/s11136-024-03761-6`](https://doi.org/10.1007/s11136-024-03761-6): for constructs based on formative models, content validity is especially important while structural validity and internal consistency are not relevant | reject for Tribunal's present umbrella; decide the causal direction between dimensions and construct before choosing statistics, and report dimensions separately meanwhile |
| M-11 | Content validity should cover relevance, comprehensiveness, and comprehensibility for the construct, population, and context | Terwee et al. 2018, DOI [`10.1007/s11136-018-1829-0`](https://doi.org/10.1007/s11136-018-1829-0): four-round international Delphi with 159 experts from 21 countries and a 67% consensus rule; Mokkink et al. 2025, DOI [`10.1016/j.jclinepi.2025.111879`](https://doi.org/10.1016/j.jclinepi.2025.111879), extends the three-part framing beyond PROMs | verified as measurement-method guidance, not as a ready-made validation of Tribunal; adapt the principles to the decision-support packet and include intended users, but do not claim COSMIN compliance or clinical validity |

## 4. Data evidence that changes the experiment

| Dataset | What it really provides | Access/limits | Decision |
| --- | --- | --- | --- |
| [MIMIC-IV-Ext CDS v1.0.2](https://physionet.org/content/mimic-iv-ext-cds/1.0.2/) | 9,150 real de-identified ED-derived cases; HPI, demographics, vitals, ESI, ICD information, diagnosis; 2,200 specialty-referral cases and 419 clinician-reviewed cases | credentialed PhysioNet access, CITI training, signed DUA; observed labels are not error-free gold standards | preferred real-data external-validity study after access verification |
| [HealthBench Professional](https://huggingface.co/datasets/openai/healthbench-professional) | 525 real clinician-authored chat tasks with physician responses and iteratively adjudicated rubrics | not an EHR/outcome dataset; authors request no public reproduction of examples | private pre-event evaluation of evidence use, escalation language, and packet quality |
| [HealthBench](https://openai.com/index/healthbench/) | 5,000 realistic conversations built through synthetic generation and human adversarial testing; physician-written rubrics | not real patient encounters; public benchmark contamination is plausible | controlled safety and escalation benchmark, clearly labeled synthetic/adversarial |
| Abridge event data | unknown until organizer disclosure | permitted fields, de-identification, public-demo rights, model path, and retention must be confirmed | use only after written/recorded confirmation at check-in |

## 5. Targeted Scopus AI search and verified adjacent methods

Two authenticated institutional-access queries searched 2020–2026 clinical and nonclinical high-stakes literature for LLM decision revision under unsupported majority/social cues, prioritizing matched-prompt or repeated-measures designs that separate evidence from social information. No direct matching empirical study appeared in the retrieved abstracts. This is a reproducible bounded search result, not proof that the literature contains no such study.

The most useful adjacent records were checked against their primary publication pages:

| Paper | Verified design | Tribunal use | Boundary |
| --- | --- | --- | --- |
| Anderson, *Informatics in Medicine Unlocked* 2026, DOI [`10.1016/j.imu.2026.101783`](https://doi.org/10.1016/j.imu.2026.101783) | Controlled specialist-role versus generic-deliberative comparison on two tabular benchmarks, holding model, decoding, compute, and adjudication constant; Llama 3.1 8B primary with Qwen 2.5 14B ablation; in-press journal pre-proof online 2026-07-03 | Direct precedent for budget-matched role-structure ablation and error-distribution analysis | Benchmarks are not prospective clinical care; no conformity manipulation or patient outcome |
| Silveira, da Rosa Righi & André da Costa, *Applied Soft Computing* 2026, DOI [`10.1016/j.asoc.2025.114447`](https://doi.org/10.1016/j.asoc.2025.114447) | PRISMA-adapted systematic review of 42 studies from 2016–2025 across several multi-agent clinical-decision-support families | Taxonomy and gap positioning | Broader than LLM deliberation; not a meta-analysis and not evidence of superiority |
| Karamanlıoğlu et al., *Applied Sciences* 2025, DOI [`10.3390/app15158412`](https://doi.org/10.3390/app15158412) | Privacy-oriented modular CDSS; 750+ USMLE-style questions plus retrospective de-identified MIMIC-III evaluation; abstract reports 132 cases and 75.8% first-pass agreement | Privacy architecture and retrospective-evaluation precedent | “Real-world” is retrospective, not prospective deployment; reconcile the paper's distinct case/output denominators before quoting results |
| Han & Choi, *Advances in Artificial Intelligence and Machine Learning* 2025, DOI [`10.54364/AAIML.2025.51187`](https://doi.org/10.54364/AAIML.2025.51187) | Four Llama-3-70B role agents on 43 simulated Asclepius emergency scenarios, compared with one single-agent prompt and reviewed by one emergency physician | Illustrative architecture and failure-mode precedent | Small simulated sample, one reviewer, retrieval/tool and compute differences; no real-emergency validation or safe superiority claim |
| Kim et al., MDAgents, NeurIPS 2024, DOI [`10.52202/079017-2522`](https://doi.org/10.52202/079017-2522) | Adaptive routing among solo, multidisciplinary, and integrated configurations using GPT-3.5, GPT-4/V, and Gemini on ten medical QA/vision benchmarks | Adaptive escalation, compute allocation, and architecture ablation | Mostly benchmark QA and explicitly non-interactive; physician comparison concerns complexity classification, not diagnostic equivalence |

The Anderson and MDAgents studies are the strongest architecture-experiment precedents. None validates Tribunal's unsupported-count-cue construct, clinician workflow, clinical safety, or patient benefit.

## 6. Differential Reasoning Learning transfer decision

Liu et al., *Closing Reasoning Gaps in Clinical Agents with Differential Reasoning Learning*, is an [arXiv v1 preprint](https://arxiv.org/abs/2602.09945) submitted 2026-02-10, DOI [`10.48550/arXiv.2602.09945`](https://doi.org/10.48550/arXiv.2602.09945). The public record shows no conference or journal reference. Until separate acceptance evidence exists, do not call it a KDD or peer-reviewed paper.

### What the preprint actually evaluates

- It converts a reference rationale and an agent's free-form chain-of-thought into typed DAGs containing facts, hypotheses, actions, and a final answer. An LLM judge labels missing or mismatched nodes, hallucinated or irrelevant nodes, and reasoning-path discrepancies. Natural-language corrections are stored in a BM25-retrieved Differential Reasoning Knowledge Base.
- Qwen3-8B and LLaMA-3.1-8B-Instruct are the tested agent backbones. Gemini-2.5-Flash performs graph extraction and discrepancy judging; Gemini-2.5-Pro converts internal EHR notes into QA cases.
- MedQA and MedMCQA are keyword-restricted to sepsis, chest pain, and stroke, with 500 training and 100 test examples sampled from each. The internal Return Visit Admission task uses 436 single-site cases: 218 return admissions within nine days and 218 sampled non-return-admission cases, producing an artificially balanced evaluation set.
- The reported RVA accuracies are 81.28 plus or minus 0.47 percent for DRL-Qwen versus 56.97 plus or minus 0.57 percent for Qwen3-8B, and 65.23 plus or minus 0.37 percent for DRL-LLaMA versus 49.91 plus or minus 0.69 percent for LLaMA. These are preprint results on a retrospective balanced binary task, not prevalence-calibrated deployment performance.
- Three clinicians are named as reviewers, but the paper reports only three representative cases and does not state the total outputs reviewed, whether all reviewers rated all cases, blinding, an independent rubric, consensus procedure, or inter-rater reliability. One reviewer caught a concrete DRL error: an assessment said the agent failed to predict disposition even though its prediction was correct.

### Critical method correction

The paper calls its score a clinically weighted graph edit distance, but Appendix A.2 instructs an LLM to assign three heuristic penalties and sum them. It does not validate those scores against an exact minimum-cost edit script or independently coded graph discrepancies. More importantly, the appendix fixes score ranges partly from answer correctness: a correct answer with a correct path is directed toward 0.1-0.3, a correct answer with a wrong path toward 0.6-0.8, and a wrong answer above 0.8. This contradicts the main-text statement that answer correctness is only a sanity check and does not impose fixed numeric regimes. Reasoning quality and answer correctness are therefore entangled by construction.

Reference graphs may also come from guidelines, physician rationales, or a stronger model; those sources have different authority and error mechanisms. For RVA, reference material includes return-visit diagnostic impressions, raising a temporal-leakage risk unless future information is explicitly sealed from initial-decision labels. The internal train/validation/test split, generation temperatures, cohort dates and eligibility, calibration, external validation, and large-scale blinded clinician validation are not reported.

### Tribunal decision

Borrow only the engineering patterns: typed source-linked assertions; separate omission, unsupported-assertion, contradiction, and broken-inference audits; inspectable failure-pattern libraries; retrieval-depth and reference-rationale ablations; and clinician review for discovering failure modes. Tribunal will use concise structured justifications rather than hidden chain-of-thought, keep outcome/future information sealed until initial decisions are committed, require independently verified evidence pointers, and require clinician adjudication before a discrepancy becomes reusable guidance.

Do not borrow the numerical GED score or 1.0/1.5/2.0 weights, a stronger model's rationale as clinical truth, three unblinded representative cases as validation, or balanced-set accuracy as evidence of safety, effectiveness, patient benefit, or cost-effectiveness.

The most plausible meeting-adjacent paper is Li, Krishnan and Padman, *Consistency of Large Reasoning Models Under Multi-Turn Attacks*, [arXiv:2602.13093](https://arxiv.org/abs/2602.13093), DOI [`10.48550/arXiv.2602.13093`](https://doi.org/10.48550/arXiv.2602.13093). It studies misleading suggestions, expert or consensus appeals, answer flipping, and randomized multi-turn pressure across nine reasoning models and 700 factual multiple-choice items. This match is an inference, not confirmation of the paper mentioned in conversation; it is nonclinical and preprint-only. Its defensible use is to motivate separate evidence-only, unsupported-majority, authority-cue, wrong-suggestion, and evidence-plus-majority arms.

If the missed item was instead about verifying Abridge-like generated notes, the strongest peer-reviewed candidate in DRL's references is Wang et al., *Process-Supervised Reward Models for Verifying Clinical Note Generation*, [EMNLP 2025](https://aclanthology.org/2025.emnlp-main.967/), DOI [`10.18653/v1/2025.emnlp-main.967`](https://doi.org/10.18653/v1/2025.emnlp-main.967). It is not authored by Krishnan and cannot be identified as the verbally referenced paper without confirmation.

## 7. Scopus follow-up queue

Use the authenticated Scopus AI session to resolve these narrowly, then inspect the underlying papers:

1. complete the reference export for the earlier evidence-induced-revision search and keep its authenticated locator private;
2. inspect Pishbin et al. through CMU entitlement and verify the pooled kappa, confidence interval, number of studies, triage scales, and heterogeneity;
3. resolve the nine still-recovered-only human reliability rows listed in the Fable memo, but retain only construct-near comparators;
4. broaden the completed direct search to adjacent nonclinical high-stakes experiments that independently manipulate valid evidence and social-majority signals;
5. search for reliability or validity studies using the exact tuple: escalation action, specialty, urgency, and missing evidence;
6. search for health-economic evaluations of specialist referral/triage decision support that report clinician time, downstream utilization, and uncertainty—not only model accuracy;
7. fetch and verify the primary papers behind the 2026-07-16 Rao-prep captures before any presentation use: Chen et al. 2026 (AI-vs-physician scoping review; confirm the AIPSC checklist, 50.8% and 60.8% figures), Kücking et al. 2024/2026 (automation bias), Cabitza et al. 2025 ("Judicial AI" contrasting explanations), Pou-Prom et al. 2022 (CHARTwatch silent phase AUC 0.79), Kwong et al. 2022 (silent-trial AUC 0.90→0.50 drift), Hoang et al. 2025 (SAFE-WAIT);
8. search for datasets or studies of documented multidisciplinary-team/tumor-board decisions usable as recorded human-panel comparators (meeting note P9);
9. locate primary-care vs specialist diagnostic/referral error-rate comparisons on construct-near tasks — context anchors only, never a bar Tribunal "merely" exceeds (M-07 rule).

The broader COSMIN query is complete. It did not produce a Tribunal-specific measurement model. The primary-source decision is to use COSMIN's content-validity logic by analogy, not to relabel Tribunal as a PROM or to infer clinical validity from psychometric procedure.

## 8. Deck rule

Every quantitative slide must carry:

```text
population and setting | N | comparison | statistic and uncertainty | design | source | causal boundary
```

If any field is missing, the number stays in the research appendix. Scopus AI is named in provenance as the discovery tool; the slide cites the underlying paper.
