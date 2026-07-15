# Tribunal Clinical brief — validation log

**Validation date: July 15, 2026.** Every external claim in the original draft was checked against primary or authoritative secondary sources; every repository claim was checked against the code and committed run artifacts on `main`. Verdicts: **Verified** (claim accurate as written), **Precision upgraded** (accurate but sharpened with exact figures/terms), **Corrected** (claim was wrong; fixed), **Replaced** (could not be verified; substituted with a verified equivalent).

Per the revision policy, overclaims were resolved by increasing precision or specifying the missing capability — no capability claims were removed where the underlying mechanism exists or is specified.

---

## 1. Repository claims (checked against code and run ledgers)

| Claim in draft | Verdict | Evidence |
| --- | --- | --- |
| Span-by-span elections; sealed blind commitments; anonymized cross-examination; candidate-order rotation; revisions answering objections + steelman; binding safety veto; named constitutional rules; minority reports; STOP first-class; hash-chained ledger | **Verified** | `packages/kernel/src/{engine,decoder,feedback,ratify,ledger,hash,types}.ts`; event kinds `blind_commitment`, `proposals_revealed`, `feedback_issued`, `feedback_view_assigned`, `revision_received`, `safety_review`, `ratification`, `dissent_preserved`, `span_committed` (`docs/architecture.md`) |
| Event-sourced architecture distinguishing case presentation … human intervention | **Verified** | 18 typed event kinds in `types.ts`, incl. `human_intervention`, `memory_updated`, `provider_call`, `escalation_triggered` |
| Honesty policy: process auditability not quality; public rationales ≠ faithful CoT; unanchored-chain caveat | **Verified** | `docs/honesty.md` (claims/non-claims tables, invariants 1–9, anchoring caveat); heads in `runs/*/meta.json`, `runs/ANCHORS.md` |
| Named rule with binding safety veto | **Verified + example added** | `safety_gate` in `types.ts:47`, `ratify.ts:65,71`; live run `run_5467a5efcf9c` shows the safety veto overriding a 3–2 STOP majority |
| Domain packs with planted traps | **Verified** | `packages/packs/src/{lending,insurance,benefits,moderation}.ts` |
| (New in revision) Fail-closed timeouts, requested-pin vs served-model evidence | **Added from repo** | README decoder section: 30-min backstop "fails the run closed rather than fabricating STOP"; out-of-pin served models rejected from quorum (`docs/honesty.md`) |

## 2. Krishnan-group research claims

| Claim | Verdict | Finding |
| --- | --- | --- |
| "All examined reasoning models remained vulnerable under multi-turn adversarial pressure, misleading suggestions universally effective, self-doubt + social conformity ≈ half of failures" ([arXiv:2602.13093](https://arxiv.org/abs/2602.13093)) | **Precision upgraded** | Li, Krishnan & Padman, Feb 2026. Nine frontier reasoning models; 8/9 significantly outperform instruction-tuned baselines (robustness "meaningful but incomplete") yet **all** exhibit distinct vulnerability profiles; misleading suggestions universally effective; five-mode taxonomy (Self-Doubt, Social Conformity, Suggestion Hijacking, Emotional Susceptibility, Reasoning Fatigue), first two ≈ 50% of failures |
| "Confidence-based defenses unreliable because extended reasoning can increase overconfidence" | **Verified exactly** | Same paper: Confidence-Aware Response Generation (CARG), effective for standard LLMs, *fails* for reasoning models due to overconfidence induced by extended reasoning traces; random confidence embedding outperforms targeted extraction |
| Trace–answer dissociation: reasoning stays correct while answer flips ([arXiv:2605.29087](https://arxiv.org/abs/2605.29087)) | **Precision upgraded** | "The Chain Holds, the Answer Folds" (Li, Krishnan, Padman, May 27, 2026). Term of art: **unfaithful capitulation**; latent-correct rate at behavioral flip ≈ 50% in think mode vs 11–15% no-think, across MT-Consistency, MMLU-Pro, GSM8K; 2×2 latent-vs-behavioral framework adopted as the capitulation-detector spec in §6 |
| Differential Reasoning Learning: reasoning as graphs, clinically weighted discrepancies, targeted corrections ([arXiv:2602.09945](https://arxiv.org/abs/2602.09945)) | **Verified** | DAG reasoning graphs; clinically weighted graph edit distance; DR-KB + RAG retrieval of corrective instructions (CMU group, Feb 2026) |
| Brookings April 24, 2026 agentic-evaluation article, Krishnan coauthor, deployment-like evaluation etc. | **Verified** | [brookings.edu](https://www.brookings.edu/articles/how-can-we-best-evaluate-agentic-ai/), published April 24, 2026; adds CMU spring-2026 / Berkeley fall-2026 convening detail |

## 3. Ramayya Krishnan biography

| Claim | Verdict | Finding |
| --- | --- | --- |
| "William W. and Ruth F. Cooper Professor" | **Corrected** | Exact chair: **W. W. Cooper and Ruth F. Cooper Professor of Management Science and Information Systems** ([Heinz profile](https://www.heinz.cmu.edu/faculty-research/profiles/krishnan-ramayya)) |
| Dean Emeritus | **Verified + dated** | Dean 2009 – July 1, 2025 (interim 2008); Dean Emeritus thereafter |
| Directs CMU–NIST AIMSEC | **Precision upgraded** | Research Director of AIMSEC, established September 2024 with a $6M NIST award; focus on measurement/evaluation of trustworthy AI in high-stakes sectors |
| Chaired NAIAC AI Futures 2022–2025 | **Verified** | Appointed to NAIAC 2022; chaired AI Futures working group 2022–2025 |
| Chairs DoD CDAO Responsible AI academic council | **Verified** | Role held since 2023 |

## 4. Clinical-evidence claims

| Claim | Verdict | Finding |
| --- | --- | --- |
| AAMC: up to 86,000 physician shortfall by 2036 | **Verified** | March 2024 AAMC report (GlobalData, projections 2021–2036); up to 40,400 primary care, 19,900 surgical |
| HRSA Dec 2025: shortages in 30 of 35 specialties by 2038; worse nonmetro | **Verified + numbers added** | NCHWA December 2025: 141,160 FTE physician shortage by 2038; 30/35 specialties; **58% nonmetro vs 5% metro** shortage |
| WHO ≈ 11M health-worker shortfall by 2030 | **Verified + nuance** | Current figure **11.1M**, revised *upward* from 10.2M (2022 estimate); largest gaps Africa/Eastern Mediterranean; >half nursing |
| NASEM: most people ≥1 diagnostic error; ~5% outpatient adults/yr; ~10% of deaths; 6–17% hospital adverse events | **Verified** | *Improving Diagnosis in Health Care* (2015), ch. summary |
| npj Digital Medicine multi-agent rare-disease study: gains over standalone; peaked at 4 doctor agents; supervisor helped | **Verified + detail** | MAC framework, 302 rare-disease cases; optimal = four doctor agents + supervisory agent on GPT-4; beat CoT/Self-Refine/Self-Consistency ([s41746-025-01550-0](https://www.nature.com/articles/s41746-025-01550-0)). Used to justify the 4-agent POC |
| JAMA Netw Open RCT: physicians + GPT-4 no expected improvement; model alone strong | **Verified** | Goh et al. 2024 ([article 2825395](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2825395)), 50 physicians |
| NEJM AI 2026 automation-bias RCT ([AIoa2501001](https://ai.nejm.org/doi/full/10.1056/AIoa2501001)) | **Verified + numbers added** | 44 physicians, 264 cases, all with 20h AI-literacy training; erroneous LLM advice → adjusted −14.0 pp mean accuracy (73.3% vs 84.9%), −18.3 pp top-choice |
| "2026 evaluation across 21 models: more vulnerable during differential construction than final diagnosis" (uncited in draft) | **Verified + citation supplied** | Mass General Brigham cross-sectional study, 21 LLMs (incl. GPT-5, Gemini 3.0, Grok 4), 29 vignettes, PrIME-LLM score: **>80% failure on differential construction vs <40% on final diagnosis**; premature closure onto single answers. Now anchors §5 Stage A rationale and new RQ8 |
| HealthBench: thousands of conversations, tens of thousands of physician rubric criteria | **Verified + exact** | 5,000 conversations; 48,562 rubric criteria; 262 physicians, 60 countries, 26 specialties ([arXiv:2505.08775](https://arxiv.org/abs/2505.08775)) |
| "HealthBench Professional" exists | **Verified** | [arXiv:2604.27470](https://arxiv.org/abs/2604.27470), real clinician chats; care consult / documentation / research; 3+ physician-adjudicated rubrics |
| Real-POCQi: clinician queries, specialty-matched physician assessment; LLM judges differ systematically from experts | **Verified + detail** | [arXiv:2606.28960](https://arxiv.org/abs/2606.28960): 620 real point-of-care queries (OpenEvidence), 30 specialties, 149 physicians in 36 states; LLM judges systematically differ from expert judges |

## 5. Regulatory and standards claims

| Claim | Verdict | Finding |
| --- | --- | --- |
| USCDI v3 required certification baseline Jan 1, 2026 | **Verified** | Sole USCDI version under 45 CFR 170.213 as of Jan 1, 2026 (HTI-1); added: DSI criterion §170.315(b)(11) replaced (a)(9) end-2024 |
| CDS Hooks 2.0.1 is current published spec | **Verified** | HL7 CDS Hooks v2.0.1 = errata release of 2.0 (STU2), FHIR R4-based |
| FDA CDS guidance "issued January 29, 2026"; "FAQ updated June 29, 2026" | **Partially corrected / replaced** | Verified sequence: updated final guidance **Jan 6, 2026** (replacing Sept 28, 2022), **re-issued Jan 29, 2026**, FDA town hall **Mar 11, 2026**. Revision stresses transparency of data inputs/logic/recommendation basis for AI CDS (criterion 4) and expands enforcement discretion. The "June 29, 2026 FAQ update" could not be verified → removed |
| CMS-0057-F: operational reqs 2026, APIs 2027, faster prior-auth decisions | **Verified** | Jan 2026: 72h expedited / 7 calendar days standard + denial reasons; Jan 2027: Patient/Provider/Payer-to-Payer/Prior Auth APIs |
| HTI-1 transparency & risk management for predictive DSIs | **Verified** | Source attributes + risk-management practices under (b)(11) |
| Section 1557 can apply to patient-care decision support | **Precision upgraded** | 2024 final rule, 45 CFR **§92.210**: covered entities must make reasonable efforts to identify such tools and mitigate discrimination risk |
| NIST AI RMF "organizes work into Govern, Map, Measure, Manage" cited to NIST.AI.600-1 | **Corrected citation** | Govern/Map/Measure/Manage = **AI RMF 1.0 (NIST AI 100-1)**; **AI 600-1** is the Generative AI Profile (July 2024). Both now cited correctly |
| Joint Commission launched Responsible Use of AI certification June 2026, organizational not model-level | **Verified + detail** | RUAIH launched **June 1, 2026**; voluntary; five domains (governance; data management; risk/bias reduction; monitoring/evaluation/validation; transparency/education/training); certifies organizations, not products; follows Sept 2025 JC–CHAI guidance |
| HIPAA safeguards, BAAs, 42 CFR Part 2; telehealth occurs where patient is located; AKS/Stark fair-market-value constraints | **Verified** | Stable authorities; unchanged |
| ONC survey: ~71% of hospitals used predictive AI in 2024; adoption uneven | **Verified + detail** | ASTP/ONC Data Brief 80: 71% (2024) vs 66% (2023); **~50% of critical-access vs 80% of non-critical-access hospitals**; small/rural/independent/government-owned lag |

## 6. Vendor claims

| Claim | Verdict | Finding |
| --- | --- | --- |
| Abridge: >300 health systems; >100M conversations annually | **Verified** | Abridge public materials, July 2026; added: 2026 expansion into CDS (UpToDate/NEJM/JAMA content partnerships) strengthens the §12 positioning |
| Abridge provenance (Linked Evidence), clinician review, staged evaluation | **Verified** | abridge.com/ai and evaluation pages |
| Anthropic July 2026 pricing: Fable 5 & Mythos 5 $10/$50; Opus 4.8 $5/$25; Sonnet 5 intro $2/$10 through Aug 31, 2026 | **Verified** | Anthropic platform docs; added Haiku 4.5 $1/$5 and cache economics (reads ~0.1×, writes 1.25×) |
| "Newer tokenizer may produce ~30% more tokens" | **Precision upgraded** | Fable 5 uses the **same tokenizer as Opus 4.8** (introduced with Opus 4.7) — counts roughly unchanged between them. The ~30% figure applies vs *pre-4.7-tokenizer* models (Sonnet 5 vs Sonnet 4.6 ≈ 30%; vs older models ~1×–1.35×). Budgeting guidance: `count_tokens` per target model, no blanket multiplier |
| "Some Covered Models (Mythos/Fable) have retention conditions incompatible with zero-data-retention; BAA coverage varies" | **Verified and sharpened into an architecture decision** | Fable/Mythos require **30-day retention on every platform**; ZDR orgs receive `400 invalid_request_error` on every request. Anthropic's first-party BAA path = **"HIPAA readiness"** configuration (distinct from ZDR); Messages API is the covered Eligible Service; Console/Workbench/consumer plans and most betas excluded; Bedrock/Vertex retention set by platform. §11 now prescribes: PHI panel on Opus 4.8/Sonnet 5 (HIPAA readiness or platform BAAs); Fable 5 for synthetic research/red-teaming |
| (New in revision) Fable-class safety classifiers can false-positive on benign life-sciences content (`stop_reason: "refusal"`) | **Added from vendor docs** | Clinically material: infection/toxicology/overdose cases sit near classifier boundaries → §6 non-vote protocol; POC acceptance test added |
| OpenAI pricing: "GPT-5.6 Sol ≈ $2.50/M input, $0.25/M cached, $15/M output" | **Corrected** | GPT-5.6 family GA July 9, 2026: **Sol $5.00 / $30.00 / $0.50 cached** (long-context >272K input: $10/$45); the draft's figures are **Terra** ($2.50/$15/$0.25). §15 now costs both configurations: flagship (Sol+Opus) ≈ $2.72 per two-stage case; balanced (Terra+Opus) ≈ $2.01; blended estimate $3.50–$7/case with overheads |

## 7. Structural/formatting repairs

* Broken pseudo-LaTeX `[ ... ]` blocks and corrupted heading-underline artifacts (`====`, stray `#`) in §7/§9/§15 → proper `$$ … $$` math.
* Dead `sandbox:/mnt/data/...` architecture-image links → in-repo Mermaid diagram (§8), which GitHub renders natively.
* All reference URLs re-pointed at verified targets; two citations replaced (see §5 above).

## 8. Material additions (proactive expansions)

1. **Capitulation detector formalized** against the published unfaithful-capitulation phenomenon (2×2 latent/behavioral), with public warrants as the honest latent proxy (§6); new metric (UC rate) and upgraded H4.
2. **Refusal/timeout non-vote protocol** with quorum and fallback-attribution rules (§6), a POC acceptance test, and two new red-team cases (classifier decline mid-panel; correlated provider outage).
3. **Prompt-cache partitioning rule** for blind independence, with ledgered cache breakpoints (§6), answering draft §19 Q14.
4. **Sen divergence grounded** in maximality-vs-optimality over incomplete orderings; "underdetermined = |maximal set| > 1 under admissible aggregation" (§7).
5. **Stage A tied to the documented failure mode** (premature differential closure across 21 models) — new RQ8 and a differential-construction-quality metric (§5, §13, §22).
6. **Anthropic model-selection section rewritten** from "ask Anthropic" to a settled architecture decision with the residual questions sharpened (§11, §19).
7. **Repo grounding table** with file paths and two citable live-run anecdotes, including the safety-veto-overrides-majority-STOP run (§2, Final recommendation).
8. **Escalation-precision economics observation**: specialist honoraria dominate AI cost 6:1 at the illustrative scale, making calibrated abstention the economic as well as scientific endpoint (§15).
9. **AIMSEC-testbed question** added for the Krishnan meeting (§21 Q29).
