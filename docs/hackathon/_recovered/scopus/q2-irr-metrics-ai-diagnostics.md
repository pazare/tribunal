# Scopus AI — Inter-rater reliability metrics in AI diagnostics

> **RECOVERY ARTIFACT.** Captured verbatim from the live CMU-authenticated Scopus AI session
> ("Brought to you by Carnegie Mellon University Libraries", user PZ) on 2026-07-16 by a
> recovery agent. Nothing here was authored or paraphrased by the recovery agent except the
> bracketed `[recovery note: ...]` annotations and this header block.

| Field | Value |
| --- | --- |
| Conversation title | Inter-rater reliability metrics in AI diagnostics |
| conversationId | `f83f57c8-fe0e-4719-9964-40d8c7d8ee9c` |
| Conversation URL | https://www.scopus.com/pages/ai?temporary-convo=false&conversationId=f83f57c8-fe0e-4719-9964-40d8c7d8ee9c |
| Run date | 2026-07-16 (listed under "Today" in Scopus AI conversation history at capture time) |
| Captured | 2026-07-16 |
| Source | Scopus AI (Elsevier), CMU Libraries entitlement |
| Reference count | 13 |
| Foundational documents | 5 |

---

## Query (exact text)

```
How should inter-rater reliability metrics such as Cohen's kappa, Fleiss' kappa, or Krippendorff's alpha be applied to measure diagnostic agreement between AI agents or between AI and physicians when diagnoses are coded in formal vocabularies like ICD-10 or SNOMED CT?
```

---

## Summary (full synthesized answer, verbatim)

### Application of Inter-Rater Reliability Metrics for Diagnostic Agreement in AI and Physician Evaluations Using Formal Vocabularies

Inter-rater reliability metrics such as Cohen's kappa, Fleiss' kappa, and Krippendorff's alpha can be effectively applied to measure diagnostic agreement between AI systems and physicians when diagnoses are coded in formal vocabularies like ICD-10 or SNOMED CT. Below are key considerations and recommendations based on the provided abstracts:

#### Key Metrics and Their Applications

- **Cohen's Kappa**: Suitable for pairwise agreement between two raters, including AI-human comparisons. It accounts for chance agreement but is sensitive to prevalence and marginal probabilities, which can distort results in imbalanced datasets [1][2][3]. Weighted Cohen's kappa can be used for ordinal data, such as severity scales in ICD-10 [4].
- **Fleiss' Kappa**: Designed for multiple raters, making it applicable for scenarios involving multiple AI systems or a group of physicians. However, it is sensitive to missing data and category prevalence, which can bias estimates [5][6][7].
- **Krippendorff's Alpha**: Offers flexibility for nominal, ordinal, and interval data, making it ideal for complex diagnostic coding systems like SNOMED CT. It is robust in cases of missing data and provides stable estimates across different data types [6][8].

#### Challenges in Application

- **Prevalence and Category Distribution**: Metrics like Cohen's and Fleiss' kappa are affected by the prevalence of diagnostic categories, leading to inflated or deflated agreement scores in imbalanced datasets [1][7][9].
- **Interpretation of Agreement**: Thresholds for acceptable kappa values (e.g. κ > 0.8) may not always reflect meaningful agreement in healthcare settings. Transparent reporting of rater expertise and reconciliation procedures is essential [10].
- **Missing Data**: Krippendorff's alpha is recommended over Fleiss' kappa when data is missing or incomplete, as it provides unbiased estimates [6].

#### Recommendations for Use

1. **Metric Selection**:
   - Use **Cohen's kappa** for pairwise comparisons between AI and individual physicians.
   - Apply **Fleiss' kappa** for multi-rater scenarios involving multiple AI systems or physician groups.
   - Prefer **Krippendorff's alpha** for datasets with missing values or when analyzing ordinal/interval data.

2. **Prevalence Adjustment**:
   - Consider alternative metrics like Gwet's AC1 or AC2, which are less sensitive to prevalence and provide more stable agreement coefficients [1][7].

3. **Transparent Reporting**:
   - Include details on rater expertise, coding guidelines, and reconciliation processes to ensure reliability and interpretability of results [10].

4. **AI-Specific Considerations**:
   - Validate AI performance against human raters using inter-rater reliability metrics. For example, Cohen's kappa has been successfully used to compare AI diagnostic accuracy with human experts in medical imaging [11][12].

5. **Quality Control**:
   - Implement scoring systems to assess data quality before applying AI models. For instance, low-quality scans can lead to poor AI performance, as demonstrated in diagnostic imaging studies [13].

#### Conclusion

Inter-rater reliability metrics are valuable tools for assessing diagnostic agreement between AI systems and physicians, especially when diagnoses are coded in formal vocabularies. However, careful selection of metrics, adjustment for prevalence, and transparent reporting are critical to ensure meaningful and robust evaluations.

---

## Go deeper (Scopus AI suggested follow-up questions)

1. What are the limitations of using Cohen's kappa in measuring diagnostic agreement between AI and physicians?
2. How can Krippendorff's alpha be adapted for multi-rater scenarios in AI diagnostic systems?
3. What role do formal vocabularies like ICD-10 and SNOMED CT play in calculating inter-rater reliability metrics?

> `[recovery note: none of these three follow-ups were submitted. The recovery task was capture-only.]`

---

## References (all 13, fully expanded)

Citation counts are as displayed by Scopus on 2026-07-16. Counts for references 6, 7, 8, 11,
12 and 13 were each visually confirmed in the "Summary references" panel.

**Reference 1** — 871 citations
A comparison of Cohen's Kappa and Gwet's AC1 when calculating inter-rater reliability coefficients: A study conducted with personality disorder samples
Wongpakaran, N.; Wongpakaran, T.; Wedding, D.; Gwet, K.L.
*BMC Medical Research Methodology*, 2013

**Reference 2** — 17,157 citations
Interrater reliability: The kappa statistic
McHugh, M.L.
*Biochemia Medica*, 2012

**Reference 3** — 22 citations
Quality criteria of assessment scales--Cohen's kappa as measure of interrator reliability (1)
Mayer, H.; Nonn, C.; Osterbrink, J.; Evers, G.C.
*Pflege*, 2004

**Reference 4** — 0 citations
Evaluating AI-Powered Q&A Systems: A Simple Approach to Determining the Need for Expert Ratings
Zwanzig, D.; Kreibich, L.; Binder, U.; Dietrich, U.
*Studies in Health Technology and Informatics*, 2025

**Reference 5** — 1 citation
Coefficient Lambda for Interrater Agreement Among Multiple Raters: Correction for Category Prevalence
Almehrizi, R.S.
*Educational and Psychological Measurement*, 2026

**Reference 6** — 306 citations
Measuring inter-rater reliability for nominal data - Which coefficients and confidence intervals are appropriate?
Zapf, A.; Castell, S.; Morawietz, L.; Karch, A.
*BMC Medical Research Methodology*, 2016

**Reference 7** — 105 citations
How Robust Are Multirater Interrater Reliability Indices to Changes in Frequency Distribution?
Quarfoot, D.; Levine, R.A.
*American Statistician*, 2016

**Reference 8** — 0 citations
Evaluating Generative AI and Human Performance in Question-Answer Validation Tasks
Opait, E.-E.; Duca, A.; Olariu, M.-E.
*Procedia Computer Science*, 2025

**Reference 9** — 3 citations
Simulating and estimating agreement in the presence of multiple raters and covariates
McKenzie, K.A.; Mahnken, J.D.
*Statistics in Medicine*, 2023

**Reference 10** — 0 citations
Modernizing Ground Truth: Four Shifts Toward Improving Reliability and Validity in AI in Education
Thomas, D.R.; Borchers, C.; Vanacore, K.P.; (...); Kizilcec, R.F.
*Lecture Notes in Computer Science*, 2027

**Reference 11** — 0 citations
Advantage of grading classification using volumetric artificial intelligence for periventricular hyperintensity and deep subcortical white matter hyperintensity
Kuwabara, M.; Ikawa, F.; Nakazawa, S.; (...); Horie, N.
*Scientific Reports*, 2025

**Reference 12** — 13 citations
Deep learning-based algorithm accurately classifies sleep stages in preadolescent children with sleep-disordered breathing symptoms and age-matched controls
Somaskandhan, P.; Leppänen, T.; Terrill, P.I.; (...); Korkalainen, H.
*Frontiers in Neurology*, 2023

**Reference 13** — 30 citations
Impact of scan quality on AI assessment of hip dysplasia ultrasound
Hareendranathan, A.R.; Chahal, B.; Ghasseminia, S.; (...); Jaremko, J.L.
*Journal of Ultrasound*, 2022

> `[recovery note: author lists shown as "(...)" are truncated by Scopus itself in the
> reference panel — the full author list is not exposed in this view. Not a capture loss.]`

> `[recovery note: Reference 10 (Thomas, Borchers, Vanacore, ..., Kizilcec — "Modernizing
> Ground Truth", Lecture Notes in Computer Science) carries a 2027 date, and Reference 5
> (Almehrizi) a 2026 date. These are Scopus's own forward-dated in-press/online-first
> records, reproduced as displayed. Flagged because a 2027 citation in a 2026 deck will
> read as an error to a reviewer unless it is knowingly kept.]`

> `[recovery note: Reference 10's first two authors, D.R. Thomas and C. Borchers, are
> Carnegie Mellon (HCII) researchers — potentially a useful local citation for Pablo's
> hackathon framing. Flagged as an observation about the recovered data, not a claim
> made by Scopus.]`

---

## Foundational documents

Scopus AI's own definition, verbatim: "Foundational documents are cited by two or more of the
references used to create your summary."

**1.** 35,673 citations · Commonly cited by 8
A Coefficient of Agreement for Nominal Scales
Cohen, J.
*Educational and Psychological Measurement*, 1960

**2.** 68,002 citations · Commonly cited by 7
The measurement of observer agreement for categorical data
Landis, J.R.; Koch, G.G.
*Biometrics*, 1977

**3.** 7,542 citations · Commonly cited by 5
Measuring nominal scale agreement among many raters
Fleiss, J.L.
*Psychological Bulletin*, 1971

**4.** 2,540 citations · Commonly cited by 4
High agreement but low Kappa: I. the problems of two paradoxes
Feinstein, A.R.; Cicchetti, D.V.
*Journal of Clinical Epidemiology*, 1990

**5.** 17,157 citations · Commonly cited by 3
Interrater reliability: The kappa statistic
McHugh, M.L.
*Biochemia Medica*, 2012

> `[recovery note: the "More documents" panel also carries a "Related documents" tab, which
> was NOT captured. The task scoped capture to foundational documents.]`

---

## Capture completeness

| Element | Status |
| --- | --- |
| Exact query text | CAPTURED |
| Full summary prose | CAPTURED |
| Key Metrics / Challenges / Recommendations / Conclusion | CAPTURED |
| Go deeper follow-ups (3) | CAPTURED |
| References 1–13 + citation counts | CAPTURED (expanded via "Show all 13 references") |
| Foundational documents (5) | CAPTURED (expanded via "Show more documents") |
| "Show Copilot steps" detail | NOT CAPTURED — collapsed control, not expanded |
| "Expanded summary" tab | NOT CAPTURED — separate tab, not opened |
| "Insights at a glance" / Concept Map / Topic Experts / Emerging Themes | NOT CAPTURED — separate tabs, not opened |
| "Related documents" tab | NOT CAPTURED |

This conversation contains **no tables** — the answer is entirely prose and nested lists.
Structure above preserves the original heading hierarchy and citation markers.
