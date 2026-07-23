# Rao Framework Inventory — FUNDAMENTALS OF OPERATIONALIZING AI (94-879)
**Audit for Tribunal Clinical (repo: /Users/pablo/Desktop/RAISE Cursor, branch pazare/tribunal-hackathon-recovery-20260716)**
Prepared 2026-07-16. Corpus copies used: (A) `/Users/pablo/Desktop/ML TA/canvas_downloads/courses/41355_fundamentals_of_operationalizing_ai/` (canvas download, 340 files) and (B) `/Users/pablo/Downloads/FOAI Woody/` (co-primary module-organized copy, 58 files). All PPTX text was extracted in presentation order to `.../scratchpad/rao_audit/txt/`; slide numbers below are presentation-order indices; PDF anchors are physical page numbers.

---

## 1. Attribution check — VERIFIED

- **Instructor:** "Instructor: Prof. Anand Rao" — syllabus snapshot `page_snapshots/008_assignments_syllabus.txt` line 5: "Course Syllabus 94-879 Fundamentals of Operationalizing AI … Office Hours: Th: 2:00-3:00 PM HBH 2105D … Instructor: Prof. Anand Rao TA: Harshit Nanda … Semester/Year: Fall 2024 Units: 6, Section(s): A1".
- **Course:** CMU Heinz **94-879**, "Fundamentals of Operationalizing AI", Canvas course 41355 (`canvas_download_manifest.json` → course.probed_url `https://canvas.cmu.edu/courses/41355`, probed_body shows global nav "94879-A1"). Fall 2024, MW 9:30–10:50, HBH 1002; recitations Fri.
- **Deck bylines:** every lecture/module deck title slide reads "Dr./Prof. Anand S. Rao, Distinguished Service Professor of Applied Data Science and AI, Heinz College of Information Systems and Public Policy, Carnegie Mellon University, anandr2@andrew.cmu.edu" (e.g., L7-ValueDelivery.pptx slide 1; M9-Trust-Management.pptx slide 1).
- **First-party frameworks:** the syllabus assigns Rao's own Towards Data Science series as required reading (Parts 1–4 of "Towards Responsible AI", "Model Lifecycle", "Model Evolution", "Agile Software 2.0"), and every canvas in `OAI - Canvases Template.pptx` is stamped "Created by Prof. Anand Rao (anandr2@andrew.cmu.edu)".
- Note: the guest deck `11267216__ModelOps Overview CMU_0224.pdf` is PwC-branded ("CMU AI Lecture Series … PwC AI and Emerging Tech", p1); it teaches the identical 9-step/4-phase framework (p27) that Rao's own decks carry, consistent with his prior role leading PwC's AI practice. The required reading `11416062__(Required) OperationalizingAI.pdf` is the HBR Analytic Services research report "Operationalizing Artificial Intelligence: Making the Promise a Reality," sponsored by PwC (sponsor perspective pp. 2, unsigned in the text layer, but written in Rao's exact vocabulary: "model cottages" → "model factories", "end-to-end and top-down management," "agile data science").

**Verdict: this is Anand Rao's course.** Any framework below can be safely attributed to what "Rao teaches" in 94-879.

---

## 2. Corpus map

### 2.1 Rao-authored lecture/module decks (canonical set)
File-name numbering ≠ internal lecture numbering: the file `L7` deck opens "Lecture 6: Value Delivery"; `L8` opens "Lecture 7: Value Stewardship". The L-decks (corpus A top level) are the longer Fall-2024 lecture builds; the M-decks (corpus A `slides_and_readings/M*/`, corpus B `FOAI Woody/M*/`) are the cleaner module builds. Both carry Rao's byline.

| # | Deck (path actually read) | Slides/pages | Covers |
|---|---|---|---|
| 1 | A:`slides_and_readings/11450208__L1-Introduction-OAI.pdf` (M1 twin in B:`M1/M1-Introduction-OAI.pdf`) | 32 pp | Course scope, "what the course is not", course architecture map (L1–L11), programming vs scenario tracks |
| 2 | B/A:`M2/M2-ModelsVsCode-AI-LCM.pptx` (58 sl; longer twin A:`11504150__L2-ModelsVsCode-AI-LCM.pdf`, 52 pp) | 58 sl | Models vs software code, five traps, AI model vs AI system, 4-phase/9-step lifecycle, MLOps tools, MLflow |
| 3 | A:`slides_and_readings/M3/f3ed937cb073__OAI-M3-ValueScoping.pptx` (twins: B M3 pptx/pdf; A:`11583042__L3-ValueScoping.pdf`, 50 pp) | 64 sl | Value Scoping: needs analysis, O*NET task analysis, use-case & ethics, cost-benefit/ROI math, canvases, Stage Gates 1–2 |
| 4 | A:`slides_and_readings/M4/20b735444fd1__M4-Value-Discovery-Data.pptx` (twin A:`11552816__L4-Value-Discovery-Data.pdf`, 25 pp; B M4 pptx) | 34 sl | Data extraction, Kafka, datasheets for datasets, feature stores, FTI pipeline, Stage Gates 3a/3b |
| 5 | A:`slides_and_readings/M5/2c140dbd839a__M5-Value-Discovery-Predictive.pptx` (twin A:`11583031__L5-Value-Discovery-Models.pdf`, 37 pp) | 40 sl | Model selection, metrics & threshold trade-offs, ensembles, model cards, Stage Gate 3c |
| 6 | A:`slides_and_readings/11713459__L7-ValueDelivery.pptx` (77 sl; condensed twin M7, 40 sl) | 77 sl | Deployment: packaging, Docker/K8s, prediction architectures, DoorDash case, AI Deployment Canvas, Stage Gates 4–5 |
| 7 | A:`slides_and_readings/11713462__L8-Value-Stewardship.pptx` (55 sl; condensed twin M8, 35 sl) | 55 sl | Monitoring: failure taxonomy, drift taxonomy, retraining loop, 7 deployment/testing strategies, AI Monitoring Canvas, Stage Gate 6 |
| 8 | B/A:`M9/M9-Trust-Management.pptx` (31 sl) | 31 sl | Risk taxonomies, NIST AI RMF, EU AI Act tiers, AI Bill of Rights, top-down + end-to-end governance, RAI canvas |
| 9 | A:`slides_and_readings/11730941__L9-People-Process-Organization-Governance.pptx` (54 sl; content of M9+M10 combined) | 54 sl | Trust recap + roles, role metrics, Agile Software 2.0, AI CoE models, six-stage-gate master slide |
| 10 | B/A:`M10/M10-Talent-Process-Management.pptx` (25 sl; subset of #9) | 25 sl | Roles/talent, agile, CoE |
| 11 | B/A:`M6/M6-LLMs.pptx` (50 sl) | 50 sl | GenAI/LLMs (syllabus L10): GenAI system lifecycle (3b/4b/5b), adaptation (prompting/RAG/fine-tuning), LLM evaluation |
| 12 | A:`slides_and_readings/11267216__ModelOps Overview CMU_0224.pdf` (PwC guest deck) | 53 pp | ModelOps capabilities, scaling inhibitors, 9-step lifecycle, MLOps components, LLM TCO, multi-agent ops needs |
| 13 | A:`slides_and_readings/3fdf49bfe18e__OAI - Canvases Template.pptx` = B:`OAI - Canvases Template.pptx` | 12 sl | The seven Rao canvases with full field prompts + filled exemplars |

Recitation decks (tooling, not Rao frameworks): R1 Shell/Python (`11479039`), R2 Kafka (`11521761__Recitation_2_09_05_2024.pdf` + `11523571__cli_commands.txt` + producer/consumer .py in `handouts_labs_data/`), R3 Feast (`11363268`), R4 Containers/Docker/K8s (`11359512`), Kubeflow (`11614625`), R5 Evidently (`R5/5d8ae763bbe1__Evidently.pptx`, monitoring patterns: batch / near-real-time / delayed-feedback).

### 2.2 Syllabus, cases, assignments, rubrics
- **Syllabus:** `page_snapshots/008_assignments_syllabus.txt` (full grading scheme: GenAI assignment 3%, participation 7%, 3 quizzes 30%, individual assignment 30%, team project presentation 30%; week-by-week outline; reading list).
- **Case studies (all synthetic companies, Heinz letterhead):** C1 Gammoa (scaling AI; `11416072` + analysis `11432355`), C2 NetSocial (DS vs SWE mindsets; `11422539/11422542`), C3 MidwestFinancial (value scoping/ROI; `11484724/11526959`), C4 HealthPeak (clinical value discovery; `11511828/11545003`) — corpus B swaps C4 for ClipStream recommendations (`M4/...ClipStream...docx`), C5 QuickEats Value Delivery (`11267201`; docx in B `M7/`), C6 QuickEats Value Stewardship (`11267219` + analysis `M8/f68bb7fbec12`).
- **Assignments (titles + points only, bodies not captured):** `page_snapshots/007_assignments.txt` — ungraded case-study assignments (Gammoa, NetSocial, MidwestFinancial); graded "(Case Study) HealthPlus Clinic: Enhancing Diagnostic Accuracy through Machine Learning" (100 pts); "(Programming) Real-Time Traffic Prediction with Kafka" (100 pts); GenAI assignment (30 pts); two final-project tracks, each staged Interim Report → Presentation → Final Report & Video (100 pts each stage): "CS-AI-Driven Expansion: DoorDash's Strategic Integration of Wolt, Scotty Labs, and Lvl5" and "PR-Holistic Traffic Prediction for Smart Cities: A Full-Cycle Approach"; three Respondus-proctored quizzes + per-lecture practice quizzes.
- **Rubrics: ABSENT — EXHAUSTED.** Searches run: `grep -ril "rubric" page_snapshots/` → 0 hits; complete file enumerations `find "/Users/pablo/Downloads/FOAI Woody" -type f` and `ls` of every `slides_and_readings/`, `M1..M10`, `R1..R5`, `handouts_labs_data/`, `external_readings/` directory show no rubric artifact. Canvas rubrics, if any, were not captured by the downloader.
- **Assignment brief bodies (HealthPlus Clinic, both final-project briefs): ABSENT — EXHAUSTED** for this corpus: `ls page_snapshots | grep -iE "healthplus|traffic|doordash|expansion|project"` returns only a reading page and `064_home_starter_notebook_traffic_flow_prediction_py`; `grep -il` for the same terms across all snapshot .txt hits only the list pages (001/003/006/007). Only titles, point values, and the Kafka starter code (`handouts_labs_data/11589381-84__*.py`) survive.

### 2.3 Missing lectures / decks
- **Guest-lecture decks (2 sessions on the syllabus): ABSENT — EXHAUSTED** (complete file enumerations above; no matching deck in either corpus). The PwC ModelOps Overview deck is the only guest-style artifact.
- **Standalone L10 "Agents & Reasoning with LLMs" / L11 "LLMOps" deck: ABSENT — EXHAUSTED**: `find` both corpora `-iname "*L10*" -o -iname "*L11*" -o -iname "*LLMOps*"` → only an external-reading link stub (`external_readings/012__llms_for_enterprise_and_llmops...`) and M5's "(L6.1)"-numbered reading. M6-LLMs covers L10 subject matter; LLMOps content exists only inside ModelOps Overview pp. 36–37, 43–53 and syllabus reading links. Whether a separate L10/L11 deck ever existed on Canvas is HYPOTHESIZED (not in the 71 reconciled downloads).
- **Quiz content: ABSENT — EXHAUSTED** (Respondus LockDown quizzes; only titles in `007_assignments.txt`).
- Recordings: 1 video only (`recordings/11749041__Operationalizing AI Video.mp4`) — noted, not opened per method rules.

---

## 3. Framework inventory

Each entry: **Name — source (file + anchor) — summary — relevance to Tribunal Clinical — incorporation point.** Relevance clause states why in one breath. Incorporation points reference the meeting kit (`docs/hackathon/RAO_*.md`), the methods protocol (`docs/hackathon/RESEARCH_METHODS_PROTOCOL_2026-07-16.md`), and kernel components (`packages/kernel/src/*`).

### F1. Four-phase model lifecycle: Value Scoping → Value Discovery → Value Delivery → Value Stewardship (the signature framework)
**Source:** M2 slides 44–46; identical lifecycle slide recurs as slide 5 of M3/M4/M5/L7/L8/L9; ModelOps Overview p27; Rao, "Model Lifecycle: From ideas to value," TDS (extracted `RAO-TDS-ModelLifecycle.txt` pp2–5).
**Summary:** Rao decomposes an AI system's life into four value phases containing nine numbered steps: (1) Business & Data Understanding, (2) Solution Design [Scoping]; (3) Data Extraction, (4) Pre-Processing, (5) Model Building [Discovery]; (6) Model Deployment, (7) Transition & Execution [Delivery]; (8) Ongoing Monitoring, (9) Evaluation & Check-in [Stewardship]. Steps 1–5 are "linear & experimental," 6–9 "iterative & automated" (ModelOps p27). Each phase has role swimlanes (M2 s46): Scoping = business + DS + DE; Delivery = ModelOps/DataOps/MLE/DevOps; Stewardship = business + ModelOps + **Model Stewards + Data Stewards**.
**Relevance: HIGH** — this is the ordering scheme Rao will impose on everything presented; Tribunal must locate itself on the nine steps.
**Incorporation:** add a one-page "Tribunal on Rao's 9 steps" mapping table to `docs/hackathon/RAO_*.md` (charter authoring = step 2; panel run + E2 harness = step 5; packet emission = step 6; clinician workflow = step 7; ledger/receipt monitoring = steps 8–9).

### F2. Six Stage Gates of AI governance (with sub-gates 3a/3b/3c)
**Source:** master slide L9 s28 (= M9 s28); per-gate checklists: M3 s61 (SG1), M3 s62 (SG2), M4 s32 (SG3a), M4 s33 (SG3b), M5 s40 (SG3c), L7 s75 (SG4), L7 s76 (SG5), L8 s53 (SG6); Rao, "Six stage gates to a successful AI governance," TDS (`RAO-TDS-SixStageGates.txt` pp2–5).
**Summary:** Six go/no-go decisions wrap the nine steps: SG1 "Is it worth having an AI solution or not?"; SG2 "How do we design (build, buy, or rent) the AI solution?"; SG3 "Does the model meet our expectations?" (split 3a data-quality, 3b feature-readiness, 3c model standards for "accuracy, fairness, robustness, and interpretability"); SG4 "Do we deploy the model into production?"; SG5 "Is the model ready to be transitioned for BAU operations?"; SG6 "Should the model continue as-is, retrained, redesigned, or retired? How often do we need to ask this question?" The TDS article adds stage-gate *cards* with a RACI matrix per gate, named decision documents, and escalation to a business ethics board scaled by impact ("the higher the economic impact or greater the potential risk the greater is the need for it to be approved by the business ethics board," p5). L9 s28 also lists the per-phase validation content (data appropriateness/bias/sampling; conceptual soundness; outcomes analysis = predictive power, robustness/sensitivity/stability, bias/fairness, inclusive design; production = load, integration testing; governance & controls = "assessment of model use controls" and "assessment of the model risk and performance monitoring plans").
**Relevance: HIGH** — "Where are the deployment gates?" is literally answered by naming which gate the hackathon demo sits before; the sealed-ballot → ratification flow in the kernel is itself a gate mechanism Rao will recognize.
**Incorporation:** `docs/hackathon/RAO_*.md` decision framing — position the July-18 demo as *pre-SG4 evidence for SG3c*, the silent-mode package (decision 5) as the SG4 entry dossier, and clinician ratification in `packages/kernel/src/panel.ts`/`engine.ts` as an in-workflow micro-gate; cite gate numbers explicitly in the meeting kit.

### F3. Human oversight placement: human-in-the-loop / on-the-loop / out-of-the-loop + risk tiering
**Source:** `RAO-TDS-SixStageGates.txt` p4 (Stage Gate 1, "Model use context": "What is the interaction between humans and the model e.g., human-in-the-loop, human-on-the-loop and human-out-of-the-loop?"; "Risk Assessment: … risk tiers are on a scale of 1–3 or in some cases 1–5 … based on the severity and frequency of the harm"); M9 s21 (EU AI Act: unacceptable/high/limited/minimal risk tiers); M9/L9 AI Bill of Rights slide (L9 s23): "opt out … in favor of a human alternative," "timely human consideration and remedy by a fallback and escalation system," "combat automation bias," "additional human oversight and safeguards for automated systems related to sensitive domains."
**Summary:** Rao requires the human-machine interaction pattern and the risk tier to be fixed at Stage Gate 1, before any build. Clinical decision support is his canonical "sensitive domain" requiring extra oversight and fallback; the Bill-of-Rights slide he teaches demands documented human-alternative, fallback/escalation, and automation-bias countermeasures.
**Relevance: HIGH** — Rao's meeting decision #4 (human-AI timing) will be asked in exactly this vocabulary, and Tribunal's "clinician retains decision authority" is a human-in-the-loop declaration that should also state tier.
**Incorporation:** `docs/hackathon/RAO_*.md` decision-4 section: declare Tribunal Clinical HITL, risk-tier it explicitly (specialist escalation = high-tier under EU-AI-Act-style tiering), and cite the automation-bias countermeasure design (sealed commitments in `packages/kernel/src/panel.ts` resist the panel-count social cue — that *is* an automation-bias control for the panel itself).

### F4. Models vs software code (5-dimension contrast) and the five traps
**Source:** M2 s12 (table: Output deterministic↔probabilistic; Decision space static↔dynamic/ambiguous; Inference deduction↔induction; Development agile↔experimentation; Mindset engineering↔scientific — from Rao's TDS Part 1); traps M2 s22–29 (Data, Scoping, Return, Bias, Decay traps — from Rao's TDS Part 2); ML model performance lifecycle curve M2 s25.
**Summary:** Because models are probabilistic and induced from data, they fail differently from code: inadequate/biased data (Data), unpredictable accuracy trajectories that stall (Scoping), unmeasured or unrealized returns lacking a baseline (Return — "create a common-sense baseline first," M2 s26), bias entering at every pipeline stage (Bias), and unpredictable post-deployment degradation (Decay).
**Relevance: HIGH** — Tribunal's determinism story (deterministic TS kernel around probabilistic panel members) is best told in Rao's own dichotomy; the Return trap motivates the comparator decision (#3).
**Incorporation:** `docs/hackathon/RAO_*.md` opening framing: "the kernel is Software 1.0 discipline wrapped around Software 2.0 components"; E2 analysis in `RESEARCH_METHODS_PROTOCOL_2026-07-16.md` should name its human/naive baseline arm as the "common-sense baseline" answering the Return trap.

### F5. AI Model vs AI System distinction
**Source:** M2 s42 (comparison table), s40–41 (NIST AI RMF system dimensions and AI actors across lifecycle); ModelOps p3.
**Summary:** A model is algorithms+parameters for a task; a *system* adds data pipelines, deployment infrastructure, monitoring/evaluation tools, and multi-disciplinary operation, and is evaluated on system metrics (latency, throughput, reliability) as well as model metrics. Rao grades whether teams have thought at system level.
**Relevance: HIGH** — Tribunal Clinical must present as an AI *system* (charters, registries, ledger, receipts, provider adapters) not a prompt demo.
**Incorporation:** architecture page in `docs/hackathon/RAO_*.md`: label kernel components against the system-dimension table (providers = model layer; `engine.ts`/`feedback.ts` = pipeline; ledger/receipts = monitoring/evaluation; registries = actor governance).

### F6. Model evolution maturity: Standalone model → Prediction service → Model factory
**Source:** ModelOps p31 (maturity staircase incl. "fully integrated end-to-end model lineage tracking, artifact management, and experiment/inference logging throughout the model life cycle"); Rao, "Model Evolution" TDS (`RAO-TDS-ModelEvolution.txt`); HBR report pp2 ("model cottages … to model factories"); M2 s33.
**Summary:** Maturity runs from a notebook model, to a served prediction API with monitoring/versioning, to a factory that mass-produces models with automated CI/CD, retraining, and full lineage. Solution-design obligations grow per stage — at prediction-service stage Rao already demands "ensuring the traceability of data, models, and software" (`RAO-TDS-ModelLifecycle.txt` p5).
**Relevance: MEDIUM-HIGH** — lets the team honestly place the hackathon build (standalone→service boundary) while showing the receipts/lineage design anticipates factory-grade traceability.
**Incorporation:** roadmap slide in `docs/hackathon/RAO_*.md`: "today: deterministic standalone harness; the execution receipts (`packages/kernel/src/engine.ts` receipts + verifier registry) are the lineage layer a prediction service requires."

### F7. Augmentation vs automation, and augmentation ROI via confusion-matrix deltas
**Source:** M3 s33 (value = efficiency/automate vs effectiveness/augment), s16 (augmentation keeps "humans at the center of the decision-making process"; healthcare: "AI assists doctors … enhancing decision-making without replacing the doctor's role"), s34–45 (ROI math), s39–45 (mortgage underwriting worked example: Augmentation Benefit = ΔTP×Benefit-per-TP + ΔTN×Cost-avoidance-per-TN − ΔFP×Cost-per-FP − ΔFN×Cost-per-FN, over Development+Integration+Operational costs; note ground truth may take 10–20 years).
**Summary:** Rao computes automation ROI from time-saved×volume×wage over costs, and *augmentation* ROI from the change in confusion-matrix cells between human-alone and human+AI, each cell priced asymmetrically. He explicitly flags delayed ground truth as the hard problem.
**Relevance: HIGH** — this is the value hypothesis template for Tribunal: escalation packets are augmentation; ΔFN (missed escalations) vs ΔFP (unnecessary specialist referrals) with asymmetric clinical costs is precisely the failure-unit conversation (meeting decision #2) and gives the ROI slide Rao expects.
**Incorporation:** add an "Augmentation ROI skeleton" to `docs/hackathon/RAO_*.md` (define TP/FP/FN/TN for specialist escalation; leave cost cells as clinician-elicited parameters); `RESEARCH_METHODS_PROTOCOL_2026-07-16.md` should state E2's outcome measure in Δ-confusion-matrix terms against the human-alone arm.

### F8. The ROI challenge trio and measurement pitfalls
**Source:** M3 s31 (Measurement / Realization / Maintenance challenges), s32 (stats: 79% have promising POCs, only 24% see positive returns, <39% of deployers even run ROI analysis; pitfalls: "Lack of baseline human performance data to estimate incremental improvement by AI"; "Noise and bias in human judgement making comparison with algorithms challenging"), s47 (hard/soft benefits and costs taxonomy incl. compliance, change & trust management, carbon).
**Summary:** Rao teaches that AI ROI usually fails at measurement: no human baseline, noisy human judgment, soft benefits unquantified, hidden costs (including governance and trust management) uncounted.
**Relevance: HIGH** — the paired five-arm E2 design *is* an answer to "no human baseline / noisy comparison"; Rao's meeting decision #3 (apples-to-apples comparator) is his Measurement Challenge verbatim.
**Incorporation:** `RESEARCH_METHODS_PROTOCOL_2026-07-16.md`: cite the comparator arm as the response to M3 s32's baseline pitfall; the meeting kit's value section should include soft-cost lines (change & trust management) in the cost stack.

### F9. Portfolio approach to AI ROI
**Source:** M3 s48 (Stay-in-business / ROI / Option-creating initiative mix; "treat analytics/AI initiatives as test-and-learn experiments"); AI ROI & Roadmap Canvas (Canvases s6) operationalizes it.
**Summary:** AI investments should be managed as a risk-return portfolio with explicit shares of keep-the-lights-on, near-ROI, and option-creating bets, prioritized on a value-effort matrix.
**Relevance: LOW-MEDIUM** — Tribunal is a single initiative, but framing it as an "option-creating" bet inside a clinical AI portfolio pre-empts "why this project first?"
**Incorporation:** one sentence in `docs/hackathon/RAO_*.md` positioning: option-creating initiative whose exercise price is the silent-mode evidence package.

### F10. Needs analysis / task analysis: O*NET, 52 human abilities, human–machine complementarity
**Source:** M3 s12 (O*NET), s13 (Fleishman 52 abilities), s14 (four workflows quadrant; "Aim for empowerment … Watch for mechanization: When AI overrides human agency, flexibility and fairness suffer"), s15–16 (automation of tasks vs augmentation of decisions), s19 (takeaways: "Distinguish automation vs. augmentation opportunities").
**Summary:** Before building, decompose the occupation's tasks (O*NET), identify which abilities are machine-complementable, and classify each task as automate / augment / hybrid, designing for worker empowerment rather than mechanization.
**Relevance: MEDIUM** — supplies the language for *which clinician task* Tribunal touches (escalation decision support = augmentation of a diagnosis-routing decision, not automation of diagnosis).
**Incorporation:** `docs/hackathon/RAO_*.md` problem statement: one table row decomposing the escalation workflow into tasks with automate/augment labels; strengthens decision #1 (primary construct) by naming the augmented decision precisely.

### F11. The Rao canvas suite (7 canvases, 3 organizational levels)
**Source:** `OAI - Canvases Template.pptx` (path B root / A `3fdf49bfe18e__`), slides 1–12; levels defined M3 s59; deployed in lectures: AI Use Case & Ethics Canvas (M3 s25–26), ML Canvas (M3 s51–52), AI ROI & Roadmap Canvas (M3 s57–58), AI Deployment Canvas (L7 s72), AI Monitoring Canvas (L8 s52), AI Risk Management & Governance Canvas (M9 s30). Field lists (complete):
- **Business Model Canvas** (s1, org level): Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationship, Channel, Customer Segments, Cost Structure, Revenue Stream.
- **AI Use Case & Ethics Canvas** (s2 filled Valencia-COVID exemplar; s9 loan-approval exemplar; program level): Use Case Definition, AI Solution, User Story (Before/After), Ethical Impact, Data & Technical Requirements, Services/Systems/Processes Impacted, Risks & Mitigation, Business Value, Implementation Feasibility. Note the filled exemplar's over-reliance mitigation: "cabinet and epidemiologists retain final policy authority via human-in-the-loop decision-making" (s2).
- **AI Deployment Canvas** (s3, model level; mirrors SG4/SG5): Deployment Objectives (KPIs), Deployment Environment Setup, Prediction Architecture, Validation & Stress Testing, Business Process Integration, Monitoring/Maintenance & Continual Learning, Risk Mitigation & Contingency Plans, Stakeholder Alignment & Training, Transition to BAU & Change Management.
- **AI Risk Management & Governance Canvas** (s4; every field mapped to NIST AI RMF subcategories): AI System Purpose & Use Case (Map 1.1–1.2), Risk Identification/Measurement/Mapping (Measure 6.1, 7.1), Data-Model-Technical System Risks (Map 5.1–5.2; Measure 7.2–7.3), Contextual Impacts & Legal/Regulatory (Map 2.1–2.2; Govern 3.3), Governance/Accountability/Compliance (Govern 3.1–3.3), Control Mechanisms & Risk Mitigation (Manage 9.1–9.2), Continuous Monitoring & Adaptability (Manage 8.1–8.2), Stakeholder Engagement & Ecosystem Collaboration (Govern 4.1–4.2; Manage 6.3), Trustworthiness Characteristics cross-cutting (7.2–7.4).
- **AI Monitoring Canvas** (s5): Monitoring Objectives & Baselines (KPIs incl. fairness thresholds), Real-Time Monitoring Setup, Business Value Alignment, Anomaly Detection & Fairness Monitoring, Continual Learning & Retraining, Drift Detection Setup, Performance Validation (stress/scenario/robustness), Risk & Contingency Planning (rollback, escalation procedures), Ongoing Evaluations & Lifecycle Monitoring.
- **AI Overall ROI & Roadmap Canvas** (s6; s10 Midwest exemplar): Objectives, Timeline & Milestones, Benefits (hard/soft), Costs (hard/soft), Portfolio ROI (SIB/ROI/option shares), Impacts (individual/org/societal), Inputs, Risks (consumer/company/societal/environmental), Capabilities.
- **Machine Learning Canvas** (s7; s11 fraud exemplar; 16 fields): Background, Value Proposition, Objectives, Ethical Considerations, Metrics, Feasibility, Solution, Risks, Evaluation (offline + online), Data, Integration with Existing Systems, Projects (team/timeline), Modeling, Model Maintenance (retraining criteria, drift), Regulatory & Compliance (incl. "maintain audit logs and records to provide regulators with clear evidence"), plus title block.
- **Social Impact Canvas** (s8/s12): Community Need, Anchor Purpose, Unique Value Proposition, Stakeholders, Key Resources, Outreach, Impact, Cost Structure, Sustainable Revenue Streams.
**Summary:** The canvases are Rao's worksheets for every gate; students submit them; he thinks in their fields.
**Relevance: HIGH** — the meeting kit already contains a filled evaluation-scenario worksheet; re-expressing it in his exact canvas fields is the cheapest credibility win available.
**Incorporation:** refactor the Tribunal worksheet in `docs/hackathon/RAO_*.md` into three one-pagers: AI Use Case & Ethics Canvas (filled for specialist escalation), AI Deployment Canvas (filled; prediction architecture = on-demand batch packet), AI Monitoring Canvas (filled; ledger/receipts as the real-time monitoring setup). Use his field names verbatim.

### F12. Evaluation discipline: metric–cost matching, threshold trade-offs, model selection hygiene, model cards (Stage Gate 3c)
**Source:** M5 s10 ("Start with the simplest models; Avoid the state-of-the-art trap; Avoid human biases in selecting models…"), s17–18 (Tradeoff Trio activity: threshold vs accuracy/precision/recall; "Prioritize recall for medical tests (missing a case is costly)"), s19–21 (accuracy valid only when classes balanced and FP/FN costs equal; precision when FP costly; sensitivity when FN costly — "a patient with cancer, predicted as healthy" example), s38–39 (Model Cards, Mitchell et al.; datasheets in M4 s16, Gebru et al.), s40 (SG3c checklist: cross-validation consistency, overfitting check, fairness assessment, robustness under varying inputs/outliers/noise, interpretability, documentation via model cards, explicit metric trade-off balancing, ensemble impact on interpretability, regulatory alignment). Clinical activities: ICU surge prediction / asymptomatic spread detection / long-COVID prognosis (s23–28).
**Summary:** Before deployment talk, Rao demands the metric be justified by error-cost asymmetry, thresholds be treated as tunable policy, validation be cross-validated and robustness-tested, and the model be documented in a model card.
**Relevance: HIGH** — meeting decisions #1 (primary construct) and #2 (failure unit) will be interrogated with exactly this slide's questions; E2's five-arm harness must present cross-run consistency as its "cross-validation."
**Incorporation:** `RESEARCH_METHODS_PROTOCOL_2026-07-16.md`: justify the primary endpoint by FN-cost asymmetry (missed escalation) citing M5 s20; ship a **model card / system card for the Tribunal panel** (new doc `docs/hackathon/TRIBUNAL_SYSTEM_CARD.md`) with assumptions, limitations, intended use — Rao name-checks model cards at SG2 (M3 s62: "datasheets for datasets and model cards for model reporting") and SG3c.

### F13. Discovery→Delivery requirement shift ("nice to have" → "must have")
**Source:** L7 s10 (table: in Delivery phase, Fairness/Interpretability/Robustness and Safety/Security/Privacy become "Must have"; objectives shift from model performance to stakeholder-varying objectives; data becomes dynamic; impact becomes extensive).
**Summary:** The bar changes at deployment: qualities that were optional in experimentation become mandatory, and computational priority flips from training throughput to inference latency.
**Relevance: HIGH** — one-slide rebuttal to "it's just a hackathon demo": Tribunal designed the must-haves (auditability, dissent preservation, determinism) in from the start.
**Incorporation:** `docs/hackathon/RAO_*.md` — a two-column "Rao's Delivery must-haves ↔ Tribunal mechanism" table (fairness→panel diversity + dissent preservation; interpretability→ballots and feedback rounds in ledger; robustness→E2 counterfactual arms; safety→exposure-bound safety packet; security/privacy→charter-scoped provider adapters).

### F14. Deployment mechanics: packaging, prediction architectures, decision matrix
**Source:** L7 s13 (packaging: easy-to-install, reproducible, versioned, documented), s18–19 (VM/container/serverless decision options + tree), s23 (cloud/edge/on-prem), s24–29 (three prediction architectures — batch, online+batch-features, online+streaming-features — with pros/cons and a criteria matrix: latency, data availability, business needs, cost, scalability), s20–22 (MLflow components incl. Registry "focused on the approval, quality assurance, and deployment").
**Summary:** Deployment = packaging + environment + architecture selection justified against latency/cost/business-need criteria, validated in staging under load before production.
**Relevance: MEDIUM** — Rao will ask "what is your prediction architecture?"; Tribunal has an answer (on-demand, human-triggered batch packet generation; latency tolerant) that should be stated in his matrix's terms.
**Incorporation:** AI Deployment Canvas fill (see F11) — Prediction Architecture cell: "on-demand batch with full provenance; latency budget minutes, not ms; no streaming features," citing L7 s29 criteria.

### F15. Stage Gate 4/5 deployment checklists (risk ownership, rollback, adoption)
**Source:** L7 s75 (SG4: KPIs for deployment impact; environment security; architecture validation; "Have the bias tests and fairness checks yielded satisfactory results?"; "Are contingency plans and rollback strategies ready?"; "Who will be responsible for risk monitoring and response during and after deployment?"), s76 (SG5: API/pipeline readiness, monitoring readiness incl. drift detection, maintenance protocols, continual-learning management, stakeholder training, handover document, BAU contingency), s8 (detailed sub-steps incl. Evangelization & Adoption), s77 (takeaways: "a model is considered successfully deployed only when it fully transitions into BAU").
**Summary:** Two production gates demand named risk owners, tested rollback, fairness sign-off, monitoring already stood up, and an organizational handover — deployment is an org event, not a technical push.
**Relevance: HIGH** — "Who owns the model?" comes from this slide pair; Tribunal's authority/verifier registries are a native answer if presented as the ownership/accountability record.
**Incorporation:** `packages/kernel/src/*` registries description in `docs/hackathon/RAO_*.md`: authority registry ⇒ SG4's "who is responsible for risk monitoring and response"; verifier registry ⇒ SG5's monitoring-readiness attestation; add an explicit model-owner field if absent (docs-level commitment, not code change for the demo).

### F16. Why monitor: failure taxonomy (systems fail + models decay)
**Source:** L8 s11 ("Why monitor? Systems Fail / Models Decay"), s12 (Huyen taxonomy: software system failures — dependency, deployment, hardware, downtime/crash — vs ML-specific failures — production data differs from training data, edge cases, **degenerate feedback loops**), s13–14 (Knight Capital $440M; Tesla Autopilot fatal crash as exemplars).
**Summary:** Monitoring is motivated by two distinct failure families; ML-specific failures include the self-reinforcing loop where the model's own outputs corrupt future inputs.
**Relevance: HIGH** — Tribunal's sealed commitments are an *anti-degenerate-feedback-loop* mechanism inside the panel (agents can't herd on each other's outputs), and E2's social-cue arm tests exactly this; say it in Rao's terms.
**Incorporation:** `RESEARCH_METHODS_PROTOCOL_2026-07-16.md` and meeting kit: frame the panel-count social cue as an induced degenerate feedback loop; cite L8 s12.

### F17. Drift taxonomy (probability-decomposition based)
**Source:** L8 s18–20 (drift iff P_t(X,y) ≠ P_{t+w}(X,y); three classes: P(X) covariate shift, P(y|X) concept shift, P(y) prior shift), s21–25 (covariate: virtual drift, local concept drift, feature evolution — each with DoorDash examples), s26–27 (posterior: real concept drift vs actual drift; fickle/intersected/severe), s28–29 (prior: concept evolution / concept deletion), s30 (drift-over-time patterns; Bayram et al., Knowledge-Based Systems 2022).
**Summary:** A mathematically grounded taxonomy of everything that can silently change post-deployment, each type carrying a different detection and retraining implication.
**Relevance: MEDIUM-HIGH** — "What is monitored post-deployment?" should be answered per drift class: for Tribunal, case-mix shift (covariate), guideline changes (real concept drift), new specialty categories (concept evolution).
**Incorporation:** AI Monitoring Canvas fill (F11): Drift Detection cell enumerating the three classes with clinical instantiations; note the ledger (`packages/kernel/src/index.ts` ledger types) already logs the inputs needed to compute drift statistics retrospectively.

### F18. Retraining decision loop + Stage Gate 6
**Source:** L8 s40 (five-node loop: Data Drift Detection → Business Objectives Alignment → Model Retraining Decision → Post-Retraining Performance → Continuous Monitoring; "retraining is not just a technical process but a strategic decision" with cost-benefit), s7/s53 (SG6: continue as-is / retrain / redesign / retire + cadence; BAU KPIs incl. bias and explainability tracking; stakeholder engagement in retraining decisions).
**Summary:** Post-deployment life is a governed loop in which retraining is a business decision with tracked ROI, and retirement is an explicit option reviewed on a set cadence.
**Relevance: MEDIUM** — demonstrates ops-thinking beyond the demo; Tribunal's charter versioning gives a natural "redesign" unit.
**Incorporation:** one paragraph in `docs/hackathon/RAO_*.md` ops section: charter/prompt versions (in `packages/kernel/src/prompt.ts`/`types.ts`) are the retrain/redesign artifact; SG6 cadence proposed = per guideline-update cycle.

### F19. Deployment/testing strategies — including shadow mode (the "silent mode" precedent)
**Source:** L8 s41–51: Recreate, Rolling, Blue-Green, Canary, A/B, Shadow, Multi-Armed Bandits; s46 (A/B vs Shadow), s51 (comparison table: Shadow = "Risk-free testing in real environment; Immediate issue identification" at cost of resources/synchronization); s49–50 (Netflix scenario mapping exercise); notes on s15–17 define blue/green, canary, A/B, shadow formally (Google Cloud Architecture Center reading, also M8 required reading `(L8.2) Application deployment and testing strategies…`).
**Summary:** Rao teaches seven production rollout strategies and when each applies; shadow deployment runs the new system on live inputs, hidden from users, precisely to gather evidence without exposure.
**Relevance: HIGH** — meeting decision #5 (minimum silent-mode evidence package) *is* a shadow deployment design; using the term "shadow mode" and citing the comparison-table trade-offs converts a research request into an ops-standard practice he teaches.
**Incorporation:** `docs/hackathon/RAO_*.md` decision-5 section: title it "Shadow (silent) deployment package," spec = inputs mirrored from live escalation queue, packet generated, clinician decision unaffected, agreement/divergence + receipt completeness logged; cite L8 s41/s46/s51.

### F20. ModelOps capabilities and MLOps component checklist (incl. reproducibility/audit trail)
**Source:** ModelOps Overview p28 (ModelOps = model-centric xOps; 7 capabilities: predictions as products; integrated dev-to-deploy toolkit; continuous monitoring & continuous learning; experiment-driven delivery; **multi-artifact versioning**; defined handoffs between software, engineers, data science; fully integrated model governance; roles: Business team monitors business value, Engineers validate/test/productize, Data Scientists manage pipelines, **Model Governors: auditing and ongoing risk management**), p29 (per-phase capability list incl. Model Canvas, Model Product Owner, experiment tracking, model+data versioning, "Model Trust and Transparency Assets," value tracking, retraining strategy tracking), p30 (9 mature-MLOps components: workflow orchestration; model registry; model monitoring; model serving; model scaling; explainability; **reproducibility — "ability to trace an inference back to the version of model and data used to produce the inference"**; CI/CD; feature store), p39 (ops pipeline diagram with capabilities row incl. **Audit Trail**, logging & monitoring).
**Summary:** The enterprise checklist for "operationalized": versioned artifacts, registries, monitoring, explainability, and inference-level traceability with an audit trail, staffed by defined roles including model governors.
**Relevance: HIGH** — Tribunal's execution receipts are literally ModelOps p30's reproducibility definition, and the verifier/authority registries instantiate "model governors"; this is the strongest "we thought about ops" mapping available.
**Incorporation:** `docs/hackathon/RAO_*.md` ops story: three-row mapping — execution receipts (`packages/kernel/src/engine.ts`) ⇒ reproducibility/audit trail (p30, p39); authority registry ⇒ model governor role (p28); sealed ballots + ledger ⇒ multi-artifact versioning + monitoring hooks (p28–30).

### F21. Top-down + end-to-end RAI governance (6 org levels × 9-step process × 3 lines of defense)
**Source:** L9 s27 (= M9 s27): org levels 1 Strategy (corporate strategy, industry standards & regulations, internal policies) → 2 Planning (portfolio management, program oversight, delivery approach) → 3 Ecosystem (technology roadmap, sourcing/vendor assessment, change management) → 4 Development → 5 Deployment → 6 Monitor & Report (continuous monitoring across lifecycle, compliance reporting), wrapped around the application-level 9-step process; L9 s29/M9 s28-notes + `RAO-TDS-TopDownGovernance.txt` pp5–6: First line = creators/executors/operations; Second line = managers/supervisors/QA (risk assessment, checking first line built to expected practice); Third line = auditors and ethicists; plus a diverse Ethics Board.
**Summary:** Governance must run vertically (board strategy to monitoring) and horizontally (every lifecycle step), with independent second- and third-line review; Rao adapted the IIA three-lines model to AI.
**Relevance: HIGH** — Tribunal's separation of authority registry (who may decide), verifier registry (who checks), and clinician ratification maps cleanly onto the three lines and is the "who audits the auditors" answer.
**Incorporation:** `docs/hackathon/RAO_*.md` governance figure: panel agents = line 1; kernel verifiers/receipt checks = line 2; clinician + external audit of ledger = line 3 + ethics board hook; cite L9 s27–29.

### F22. NIST AI RMF as the risk backbone (+ EU AI Act tiers, AI Bill of Rights, risk taxonomies)
**Source:** M9 s24 (RMF: Govern/Map/Measure/Manage; 19 categories, 72 subcategories; trustworthy-AI characteristics: valid & reliable, safe, secure & resilient, accountable & transparent, explainable & interpretable, privacy-enhanced, fair; "socio-technical approach"), s23 (RAI principles), s21 (EU AI Act risk tiers), s19 (regulatory timeline incl. binding vs voluntary color-coding), s13–17 (MIT AI Risk Repository: causal taxonomy entity/intent/timing + 7-domain taxonomy), L9 s16–17 (Rao's own Five Views of AI Risk: performance, control, security & privacy at application level; economic, societal, alignment at business/national level; five analysis dimensions), s25 (Ten Principles across three layers: strategic / control / performance & security, "three lines of defense" and "mechanisms for traceability and ongoing assessment" under Governance), M9 s26 (RAI Hierarchy of Needs: safety & security → explainability/transparency/fairness → business impact & societal sustainability); required reading NIST.AI.100-1 (B:`M9/(Required) (50m) (L9.2) NIST.AI.100-1.pdf`).
**Summary:** Rao positions NIST AI RMF as *the* operational risk scaffold (his Governance Canvas maps every field to RMF subcategories — see F11), the EU AI Act as the tiering regime, and his Five Views as the risk-scanning taxonomy; maturity is staged (hierarchy of needs), and traceability is a named governance mechanism.
**Relevance: HIGH** — for a clinical system he will expect: declared risk tier, RMF function coverage, and trustworthy-AI characteristics addressed; the safety packet + receipts cover Manage/Measure fragments already.
**Incorporation:** fill his AI Risk Management & Governance Canvas for Tribunal (one page in `docs/hackathon/RAO_*.md`), using the canvas's own NIST anchors; tag each kernel mechanism with its RMF function (receipts → Measure; registries → Govern; escalation packet limits → Manage).

### F23. Roles, skills, and role metrics for operationalized AI
**Source:** L9 s37–38 (core operational roles across Scope→Design→Build→Deploy→Operate: Product Owner, ML Architect, Data Engineer, Data Scientist, ML Engineer, ML Ops — with outputs incl. "model registry/inventory," "monitoring, logging and alerting of model services in production"); s39–41 (strategy/policy/experience: CAIO, AI Policy Advisor, AI Strategy Consultant, Human-AI Interaction Designer; compliance: AI Compliance Officer, AI Audit & Assurance Professional, Data & AI Privacy Officer; responsible practices: AI Ethicist, AI Risk Manager, AI Trust & Safety Manager); s42 (three KPIs per role, e.g., ML Ops: automation pipeline efficiency, model service uptime, incident response time); ModelOps p8 (handoff chain and delay risk).
**Summary:** Rao inventories the org chart of an AI-operating enterprise and insists each role carries measurable KPIs; multi-team handoffs are a primary source of lead-time failure.
**Relevance: MEDIUM** — Rao's "who owns the model?" has a role-name answer; a hackathon team can still assign the hats.
**Incorporation:** `docs/hackathon/RAO_*.md` ops section: a mini-RACI naming which team member holds Product Owner / ML Ops / AI Risk Manager hats for the pilot, and which registry entry encodes each.

### F24. Agile Software 2.0 (interleaved agile for models) and AI CoE operating models
**Source:** L9 s46 (Agile Software 2.0 Manifesto: multi-disciplinary teams over individuals & interactions; insightful actions/decisions over working software; data & model exploration over customer collaboration; innovative & disruptive over responding to change), s47 (interleaved sprint process across the four value phases with per-phase role swimlanes; source: Rao TDS Nov 6 2020), s48–51 (four CoE models: Information Enabler/centralized, Functional/decentralized, Performance Optimizer/hub-spoke, New Value Creator), s44 (Jurney: "Agile software doesn't make Agile Data Science").
**Summary:** Model development needs its own agile variant whose sprint artifact is a decision-improving insight, not just working software, embedded in one of four CoE structures.
**Relevance: LOW-MEDIUM** — process context; useful only if Rao probes team process for the pilot phase.
**Incorporation:** optional line in `SATURDAY_EXECUTION_PLAN_2026-07-18.md` framing the hackathon cadence as an Agile-2.0 sprint whose "finished work" is the silent-mode evidence spec.

### F25. GenAI system lifecycle (the 9-step adapted for foundation models) + LLM evaluation
**Source:** M6 s15 (branches replacing 3/4/5 with **3b Model Selection** ("proprietary or open-source; foundational, sector, task, or private"), **4b Adaptation** ("prompt engineering, fine-tuning, or reinforcement learning"), **5b Evaluation** ("against pre-defined requirements (e.g., truthfulness, creativity) and metrics (e.g., accuracy, bias)") off a PRE-TRAINED FOUNDATIONAL MODEL, then rejoining 6–9); s33 (adaptation choice by external-knowledge need vs model-flexibility need); s34–36 (evaluation: automated / human / task-based methods; LLM evaluation workflow with human-in-the-loop; advanced metric taxonomy across knowledge, alignment, safety incl. domain-specific healthcare metrics); s4–13 (foundation model basics, limitations).
**Summary:** For LLM systems Rao swaps data-extraction/training steps for selection-adaptation-evaluation but keeps the same gates, delivery, and stewardship spine; evaluation must be multi-method and includes truthfulness/bias requirements set in advance.
**Relevance: HIGH** — Tribunal is exactly a 3b/4b/5b system (selected models via provider adapters, prompt-engineered charters, sealed-panel evaluation); presenting the E2 harness as the "5b evaluation against pre-defined requirements" closes the loop in his own diagram.
**Incorporation:** `docs/hackathon/RAO_*.md` architecture: annotate the Tribunal pipeline with 3b/4b/5b labels (providers/`cli.ts`,`openrouter.ts` = 3b; `prompt.ts` charters = 4b; E2 + panel ballots = 5b), then steps 6–9 = packet, clinician workflow, ledger monitoring.

### F26. LLM/GenAI cost structure (TCO) and multi-agent operational needs
**Source:** ModelOps Overview p36 (LLM TCO: Model Dev = training effort + training compute; Model Consume = context storage + inference compute; cloud vs open-source trade-offs), p37 (cost-driver shares by adaptation style; "more cost efficient to scale OS since inference cost is lower fraction"; fine-tuned models lose generality), p52 (plugin/AI-factory architecture with gates: model validation, bias review, code quality, performance check, **cost check**), p53 (**Multi-Agent Systems with LLMs — "Introduces operational needs for: agent memory management, shared environment information, middleware for enterprise service integration, agent communication infrastructure, state management, planning engines, optimized model response times"**).
**Summary:** LLM operationalization adds a token-economics cost model and, for multi-agent systems specifically, a named list of new ops burdens (state, memory, comms, response time).
**Relevance: HIGH** — Rao has a slide *about multi-agent LLM systems' ops needs*; Tribunal should answer that list item-by-item (deterministic kernel = state management; ledger = shared environment record; sealed rounds = communication protocol) and show a per-packet token/cost line.
**Incorporation:** `docs/hackathon/RAO_*.md`: (a) per-packet cost estimate table (tokens × provider price per arm, five-arm E2 cost); (b) "multi-agent ops needs" checklist answered by kernel components; cite ModelOps p53.

### F27. Scaling inhibitors and value decay
**Source:** ModelOps p6 (six inhibitors: technical debt, diverse resources, long lead times, value decay, maintenance costs, transparency — "as models become embedded within mission critical and regulated processes, there will be a need for greater oversight"), p9 (value-decay timeline), p11–12 (decay/maintenance feedback loop), p4 (portfolio scale vs application scale).
**Summary:** Enterprise AI stalls on organizational physics — handoffs, decay, maintenance drag — and regulated embedding raises the transparency bar.
**Relevance: MEDIUM** — supports the "why provenance by construction" argument: transparency debt is cheapest at design time.
**Incorporation:** one line in the meeting kit's motivation section citing p6's transparency inhibitor for regulated (clinical) processes.

### F28. HBR/PwC operationalization evidence base (model cottages → model factories)
**Source:** `11416062__(Required) OperationalizingAI.pdf` p3 (HIGHLIGHTS: only 26% met most AI operationalization goals, 5% all; 80% of those in production say it's worth it; 48% have right skill sets; 76% say deploying AI is critical to strategy), p2 (sponsor perspective: bias/fairness checks, model security, model logging and monitoring, internal auditing of ML models, explanations, robustness checks as marks of "model factories"; "right processes for end-to-end and top-down management"); syllabus deployment-failure statistics (008_assignments_syllabus.txt: only 22% of "revolutionary" initiatives usually reach deployment; 43% say ≥80% of projects never reach production; 32% of models typically deploy).
**Summary:** The course's empirical premise: most AI never operationalizes; the differentiator is process (governance, monitoring, auditing) not modeling skill.
**Relevance: MEDIUM** — quotable statistics for the meeting's "why the ops layer is the product" thesis.
**Incorporation:** meeting kit intro: one stat line (22%/43%/32% from his own syllabus) to motivate why Tribunal ships receipts and registries before scale.

---

## 4. Rao's operationalization lens — the questions he is most likely to ask about Tribunal Clinical

Each traced to a slide he teaches from; suggested answer vector in brackets.

1. **"Which of the nine steps and six gates are you at, and what evidence gets you through the next gate?"** (L9 s28; TDS Six Stage Gates p2) — [Pre-SG4; SG3c evidence = E2 five-arm results; SG4 dossier = shadow-mode package.]
2. **"Is it worth having an AI solution — what decision are you making more effective, and what's the baseline human performance?"** (M3 s61 SG1; M3 s32 measurement pitfalls) — [Escalation decision augmentation; paired human-alone arm is the baseline; answers his "lack of baseline / noisy human judgment" pitfall directly.]
3. **"Human-in-the-loop, on-the-loop, or out-of-the-loop — and what risk tier?"** (TDS Six Stage Gates p4; M9 s21 EU AI Act) — [HITL, high-tier sensitive domain; clinician ratification is a gate, not a rubber stamp — show the ledger field.]
4. **"What are your performance criteria and why that metric — what are the FP and FN costs?"** (M3 s62 SG2; M5 s17–21) — [Failure unit priced per confusion cell; sensitivity-weighted because missed escalation (FN) dominates; threshold is policy, tunable per site.]
5. **"Does the model meet expectations — cross-validated, robust, fair, interpretable, documented in a model card?"** (M5 s40 SG3c) — [E2 arm consistency; dissent-preserving ballots as interpretability; commit to a system card.]
6. **"What is your prediction architecture and its latency/cost profile?"** (L7 s24–29) — [On-demand batch packet; minutes-scale latency budget; per-packet token cost table.]
7. **"Where is the rollback, who owns risk monitoring during and after deployment?"** (L7 s75 SG4) — [Shadow mode has no patient exposure; named owner via authority registry; kill-switch = disable packet delivery.]
8. **"What exactly is monitored post-deployment — which drift types, which fairness metrics, what triggers recalibration?"** (L8 s53 SG6; s20–29 drift taxonomy; AI Monitoring Canvas s5) — [Case-mix covariate shift, guideline concept drift, per-subgroup escalation-rate deltas; ledger already captures the raw stream.]
9. **"How do you know the panel isn't in a degenerate feedback loop / herding?"** (L8 s12; E2's core question) — [Sealed commitments; the social-cue arm is a designed adversarial probe of exactly this failure.]
10. **"Can you trace an inference back to the versions of model, data, and prompts that produced it?"** (ModelOps p30 reproducibility; p39 audit trail; TDS Model Lifecycle p5 traceability) — [Execution receipts + charter/prompt versioning: yes, by construction.]
11. **"Who are your model governors — first, second, third line?"** (ModelOps p28; TDS Top-down pp5–6) — [Agents=1st, kernel verifiers=2nd, clinician+auditors=3rd; registries encode it.]
12. **"What is the value hypothesis and its measurement — automation or augmentation ROI, hard and soft costs included?"** (M3 s33–47) — [Augmentation ROI skeleton with clinician-elicited cell costs; soft costs include change & trust management.]
13. **"What's your shadow/silent evaluation design and its exit criteria to a canary?"** (L8 s41–51) — [Decision 5 spec: mirrored live inputs, agreement/divergence logging, pre-registered exit thresholds → canary with one clinic.]
14. **"What happens at BAU transition — training, handover, adoption?"** (L7 s76 SG5) — [Out of hackathon scope but named: handover doc + clinician training are the SG5 artifacts on the roadmap.]
15. **"For a multi-agent LLM system: state management, agent comms, memory, response time — who handles those?"** (ModelOps p53) — [The deterministic kernel is the state/comms substrate; answer the list line-by-line.]
16. **"Datasheets and model cards — where are they?"** (M4 s16; M5 s38–39; M3 s62) — [Commit: system card + charter datasheet in repo docs.]

---

## 5. Vocabulary map — Rao's terms ↔ Tribunal Clinical terms

| Rao's term (source) | Tribunal Clinical term | Note for the meeting |
|---|---|---|
| Value Scoping / Discovery / Delivery / Stewardship (M2 s44) | charter design / panel+E2 experimentation / packet emission / ledger review | Use his phase names as section headers |
| Stage gate (L9 s28) | ratification checkpoint; go/no-go on packet release | Say "stage gate," not "checkpoint" |
| Stage Gate 3c "model meets expectations" (M5 s40) | E2 five-arm validation | |
| Shadow deployment (L8 s41/s46) | silent mode | Adopt "shadow mode" verbatim |
| Champion/challenger implied by A/B–shadow contrast (L8 s46) | comparator arm / apples-to-apples comparator | Decision #3 language |
| Reproducibility: "trace an inference back to the version of model and data" (ModelOps p30) | execution receipt | Strongest one-to-one match; quote it |
| Audit trail (ModelOps p39) | ledger | |
| Model governors (ModelOps p28) / three lines of defense (TDS Part 3) | authority registry + verifier registry + clinician ratification | |
| Model use controls (L9 s28 governance checkpoint 5) | charter constraints; exposure-bound safety packet | |
| Human-in-the-loop / on-the-loop / out-of-the-loop (TDS Six Gates p4) | clinician retains decision authority | Declare "HITL" explicitly |
| Automation bias countermeasures (AI Bill of Rights slide, L9 s23) | sealed commitments resisting panel-count cue | Also anti-herding for the human reader |
| Degenerate feedback loop (L8 s12) | social-influence contamination; herding | E2's social-cue arm |
| Augmentation ROI: ΔTP/ΔFP/ΔFN/ΔTN with per-cell costs (M3 s44) | failure unit + value hypothesis | Decision #2 in his math |
| Common-sense baseline first (M2 s26) | human-alone / naive comparator arm | |
| Model card (M5 s38) / datasheet for dataset (M4 s16) | (to create) Tribunal system card + charter datasheet | Gap to close before meeting |
| Retrain / redesign / retire (L8 s7 SG6) | charter revision / panel recomposition / decommission | |
| Model drift: covariate, real concept, prior shift (L8 s20) | case-mix shift, guideline change, new specialty categories | |
| Prediction architecture: batch / online / streaming (L7 s24) | on-demand batch packet generation | |
| BAU transition & handover (L7 s76) | clinical workflow integration (future) | |
| GenAI lifecycle 3b Selection / 4b Adaptation / 5b Evaluation (M6 s15) | provider adapters / charters+prompts / sealed-panel eval + E2 | Annotate the pipeline diagram |
| Trust Management (M9 s5) | dissent preservation, provenance, safety packet | His phase name for the whole trust bundle |
| Model factory vs model cottage (HBR p2; ModelOps p31) | single-use panel → repeatable clinical panel service | Roadmap vocabulary |
| Value decay / maintenance costs (ModelOps p6,11) | packet quality degradation as guidelines evolve | |
| Evaluation & Check-in (step 9) (ModelOps p27) | ratification + retrospective ledger audit | |

---

## 6. Limits

**EXHAUSTED (searches enumerated):**
- *Assignment rubrics absent:* `grep -ril "rubric"` over all 162 `page_snapshots/*` files → 0; complete file listings of both corpora (`find "/Users/pablo/Downloads/FOAI Woody" -type f`; `ls` of `slides_and_readings/` root and all M1–M10, R1–R5 subdirs; `handouts_labs_data/`; `external_readings/`) contain no rubric artifact.
- *Assignment brief bodies absent (HealthPlus Clinic case-study assignment, both final-project briefs, GenAI assignment):* `ls page_snapshots | grep -iE "healthplus|traffic|doordash|expansion|generative_ai|project"` → only a reading snapshot and the starter-notebook page; `grep -il "healthplus|traffic prediction|doordash|rubric|interim report"` across snapshot texts → only list pages 001/002/003/005/006/007. Titles + point values (section 2.2) are all that survives.
- *Guest-lecture decks absent* (2 guest sessions on syllabus): same complete file enumerations; only the PwC ModelOps Overview exists.
- *Standalone L10 (Agents & Reasoning with LLMs) / L11 (LLMOps) deck absent:* `find` both corpora `-iname "*L6*" -o -iname "*L10*" -o -iname "*L11*" -o -iname "*LLMOps*"` → only an external-readings link stub and an M5 reading with an "(L6.1)" label. (Note: syllabus-L6 Value Delivery is covered — it is the file named `L7-ValueDelivery.pptx`, internal title "Lecture 6".)
- *Quiz content absent:* Respondus-proctored; only titles in `007_assignments.txt`.
- *M4 module deck in FOAI Woody:* PRESENT (`/Users/pablo/Downloads/FOAI Woody/M4/M4-Value-Discovery-Data.pptx`) — the coordinator's conditional absence flag does not apply; verified by the full `find` listing.

**HYPOTHESIZED (not fully checked):**
- Whether Canvas ever hosted a separate L10/L11 deck, per-assignment rubrics, or guest decks that the downloader missed (manifest reports 71/71 downloads reconciled with 0 errors, so more likely they were never posted as files — but I did not query Canvas).
- Graphics-only content: several slides carry framework diagrams with little extractable text (e.g., L8 s15–16 Evidently metric pyramids, M9 s24 RMF wheel, ModelOps p23/p41 architecture diagrams, M3 s25/51/57 canvas screenshots, all DoorDash case screenshots L7 s32–71). Summaries there rely on titles, notes, and the cited source documents (which are in-corpus); pixel-level detail unverified — I did not render slides to images.
- Videos/recordings not opened (1 mp4 noted; final-project team videos exist only as Canvas attachments named in the home-page probe, not downloaded).
- Third-party readings only skimmed for load-bearing status per method rules (NIST.AI.100-1, Bayram et al., Gebru/Mitchell et al., Huyen chapter links in `external_readings/` — 15 link-stub folders, external URLs not fetched).
- Student PII: none quoted; final-project team video filenames in the Canvas home probe contain team numbers only; no student names appear in this report (TA name appears once, as course staff, from the public syllabus).

**Reading-method note:** decks were text-extracted (XML run extraction for PPTX in presentation order; `pdftotext -layout` for PDFs with page markers). Slide indices for M-decks and L7/L8/L9 are presentation-order; if Rao's live decks renumber (hidden slides), anchors may shift by ±1–2 — spot-checked against internal cross-references (e.g., stage-gate recaps) with no discrepancies found.
