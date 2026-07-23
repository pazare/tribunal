# Report C — GenAI Governance & Responsible AI Course Corpus: Framework Inventory for the Rao Meeting

Prepared for the Tribunal Clinical audit (repo `/Users/pablo/Desktop/RAISE Cursor`, branch `pazare/tribunal-hackathon-recovery-20260716`). Corpus root: `/Users/pablo/Desktop/ML TA/canvas_downloads/courses/`. All slide anchors refer to text extracted from the PPTX XML (python-pptx); slide numbers are 1-based physical slide positions. No student is named anywhere in this report.

**Priority note (user correction, relayed mid-task by the orchestrator):** the user corrected the original brief — 94-816 "Generative AI: Applications, Implications and Governance" (both the Spring 2026 and Fall 2024 folders) is taught by **Jordan Usdan, not Rao**, and is context-only here; **94-885 "Responsible AI — Principles, Policies and Practices" (folder 43912) IS Prof. Anand Rao's course and is the primary corpus** of this report. The corpus itself independently confirms both attributions (Section 1). Everything extracted from 94-816 below is labeled "Usdan (94-816), non-Rao."

---

## 1. Attribution check per course

| # | Folder | Course | Instructor | Term | Source line |
|---|--------|--------|-----------|------|-------------|
| 1 | `43912_responsible_ai_principles_policies_and_practices` | **94-885 Responsible AI — Principles, Policies, and Practices** | **Prof Anand Rao** (anandr2@andrew.cmu.edu, HBH 2105D) — **CONFIRMED RAO** | Fall 2024, Mini (Oct 21–Dec 4), 6 units, Section A (nav banner "94885-A2") | `page_snapshots/008_assignments_syllabus.txt`: "Instructor information Name Prof Anand Rao Contact Info anandr2@andrew.cmu.edu Office location HBH 2105D Office hours Tuesday, 2:00-3:00 PM". Every lecture deck's title slide reads "Dr. Anand S. Rao, Distinguished Service Professor of Applied Data Science and AI, Heinz College" (e.g., `slides_and_readings/11810786__L1-ResponsibleAI-AIHarms.pptx` slide 1). |
| 2 | `53201_94816_a4_generative_ai_applications_implications_and_governance_spring_2026` | 94-816-A4 Generative AI: Applications, Implications, and Governance | **Professor Jordan Usdan** (Jusdan@andrew.cmu.edu); TA Pablo Zavala — **NOT RAO** (per user correction; syllabus concurs) | Spring 2026 (Mini 4), Mar 11–Apr 22, 6 units | `handouts_labs_data/14154209__Generative_AI_Syllabus_Spring_2026_FINAL.docx`, instructor table: "Professor Jordan Usdan / Jusdan@andrew.cmu.edu"; TA row "TA Pablo Zavala / pzavalar@andrew.cmu.edu". |
| 3 | `42728_generative_ai_applications_implications_and_governance_fall_2024_mini_1` | 94-816 Generative AI: Applications, Implications, and Governance | **Jordan Usdan** — **NOT RAO** (per user correction; syllabus concurs) | Canvas course is Fall 2024 Mini 1; note the docx's footer table retains a stale "Semester: Fall 2023 (Mini 1)" line (template carryover) | `handouts_labs_data/11443406__Generative AI Course Syllabus Fall 2024 FINAL.docx`, instructor table rows: "Name \| Jordan Usdan", "Contact Info \| Jusdan@andrew.cmu.edu". A folder-wide grep for "usdan\|anand rao" in page snapshots returns nothing (the name lives only inside the docx tables). |
| 4 | `41224_genai_learners_generative_ai_modules_for_learners` | GenAI-Learners: Generative AI Modules for Learners | **No named instructor — NOT attributable to Rao** (EXHAUSTED: `grep -ri "rao"` across the entire folder returns zero hits; manifest course record carries no teacher field). It is a university-wide Fall 2024 research-study module set (announcement text describes exporting completion data to students' own instructors; the lateral-reading section is "adapted with permission from the University of Maryland," CC BY-NC 4.0). | Fall 2024 ("Default Term") | `page_snapshots/001_home.txt` (announcement + module list); `page_snapshots/031_home_responsible_use_lateral_reading.txt` (UMD adaptation credit); `canvas_download_manifest.json` course record. |

**Implication:** frameworks from 43912 are Rao's teaching voice; frameworks from 41224 (decide-verify-cite-rectify, taxonomy of harms, risk-surface) are CMU institutional material he did not author — usable as shared CMU vocabulary but not as "Rao's framework"; 94-816 material is Usdan's and appears only as context.

---

## 2. Corpus map per course

### 2.1 PRIMARY — 43912 / 94-885 Responsible AI (Rao)

**Rao-authored lecture decks** (all in `slides_and_readings/`, all bearing his name on slide 1):

| Deck file | Slides | Session |
|---|---|---|
| `11810786__L1-ResponsibleAI-AIHarms.pptx` | 56 | L1 Introduction & Overview (Oct 21) |
| `11810785__L2-AIRisks-RMF.pptx` | 25 | L2 AI Risk Management (Oct 23) |
| `11865785__L3-Understanding-Mapping-Bias-Fairness.pptx` | 45 | L3 (Oct 28) |
| `11839128__L4-Measuring-Managing-Bias-Fairness.pptx` | 25 | L4 (Oct 31) — note internal title slide says "Lecture 3," a numbering slip |
| `11865801__L5-Understanding-Mapping-ExplainableAI.pptx` | 20 | L5 (Nov 4) |
| `11875724__L6-Measuring-Managing-ExplainableAI.pptx` | 37 | L6 (Nov 6) |
| `11907134__L7-Privacy.pptx` | 31 | L7 (Nov 11) |
| `11932263__L8-Safety.pptx` | 31 | L8 Safety & Security (Nov 13) |
| `12010808__L9-AI-Regulations-Governance.pptx` | 34 | Governance session (syllabus calls it L10, Nov 20) |

**Syllabus:** `page_snapshots/008_assignments_syllabus.txt` and `001_home.txt` (identical full text): course description, 9 learning objectives, textbook (Ammanath, *Trustworthy AI*, Wiley 2022; supplements Masood et al. *Responsible AI in the Enterprise*; Hall et al. *ML for High-Risk Applications*), assessment mix (Participation 10%, Quiz-1 15%, Quiz-2 15%, Team Project 1 20%, Team Project 2 40%), grading/late policies, GenAI-use disclosure policy, full L1–L10 outline with per-session learning outcomes and cases.

**Assignments (as documented in decks/syllabus):**
- Team Project 1 "Judgement by Algorithm" — synthetic three-county recidivism datasets; compare AI risk scores vs judges' decisions; FPR/FNR fairness metrics across racial groups; reflective essay on trade-offs; collaboration log (L1 deck slide 51).
- Team Project 2 "Effective Accelerationists vs Safety-first RAI" — 3–4 page stakeholder position paper + 5-min video; in-class Great Debate; final policy recommendation report "using governance structures and risk management frameworks" (L1 deck slide 52; syllabus outline Nov 25/Dec 4).
- Ungraded quizzes/activities each week; two graded quizzes (L1 slides 50, 53–54).
- Class activities: Google PAIR tool (L3), MIT Tech Review Courtroom Algorithm Game (L3/L4), Aequitas bias audit (L4 slides 19–22), OptiClaim case (L5/L6, case doc `handouts_labs_data/11838086__W3-Explainability-CaseStudy.docx`), Cambridge Analytica case (L7/L8), PwC AI Governance Game (L9 slide 23, aigovernancegame.pwc.com).

**Readings** (~40 PDFs in `slides_and_readings/`, tagged Required/Optional with minute estimates): NIST AI RMF 1.0 (`NIST.AI.100-1.pdf`) + AI RMF Playbook; NIST SP 1270 (bias); NISTIR 8312 (explainable AI); NIST AI 100-2e2023 (adversarial ML); TASRA (Critch & Russell); Five Views of AI Risk; OWASP Top-10 for LLMs; privacy/poisoning attack surveys; Cambridge Analytica press set; Machine Bias (ProPublica); Courtroom Algorithm Game; an HBS-coded case `11775595__(20m) (Required) H087LZ-PDF-ENG.PDF` (the L1/L2 "Responsible AI at tech firms" case); e/acc vs "Need for Responsible AI" debate pre-reads. `external_readings_manifest.json` lists 18 captured external chapters — Ammanath *Trustworthy AI* chapters 1–11 spine plus Hall et al. ch. 5 (Security).

**Student material (PII — inventoried, not quoted, no names):** `page_snapshots/009…019_modules_*` contain the Great Debate artifacts of six stakeholder teams (team names: Davinci Dreamers — tech entrepreneurs; Carnegie Catalysts; Turing's Thinkers — effective accelerationists; Confucius Custodians — RAI ethicists; Manus Mandates — regulators; Paine's Protectors — civil-rights advocates) plus an aggregate `All-Positions.pdf`. File names embed student identities; deliberately not reproduced here.

**MISSING items:**
- Robustness & Reliability deck (syllabus session L9, Nov 18) — **EXHAUSTED**: `find . -iname "*robust*" -o -iname "*reliab*"` over the course tree hits only the textbook chapter link `external_readings/013__chapter_3_robust_and_reliable_…`; manifest `downloads` contains no such pptx; `ls slides_and_readings` shows decks jump from L8-Safety to L9-AI-Regulations-Governance. The session's content is carried by *Trustworthy AI* ch. 3 and by L8's robustness/reliability definitions (L8 slide 6).
- Quiz question banks and grading rubrics — **EXHAUSTED** within this download: no rubric/quiz files appear in the manifest `pages` list (70 entries reviewed), `downloads` (52), or any folder listing; Canvas native quizzes were evidently not exportable. (Whether rubrics exist inside Canvas is a separate question — HYPOTHESIZED that Canvas holds them.)
- Lecture recordings — folder `recordings/` exists but is **empty** (EXHAUSTED: `ls -la` shows zero entries).
- Guest lecture materials (Dec 2/Dec 4, "TBD" in syllabus) — **EXHAUSTED** in this folder (nothing matching); HYPOTHESIZED they were delivered live only.
- L9 agenda item "Regulation to practice — COMPL-AI" (L9 slide 2) has **no corresponding text slide** in the extracted deck — EXHAUSTED via grep "COMPL" across all nine extracted deck texts; the topic evidently lived in an image-only slide or was cut. Same caveat generally: chart-heavy slides (EU AI Act risk pyramid L9 s10–11, RMF core diagrams L2 s14–21, MIT Risk Repository tables L1 s33–37, NISTIR 8312 criteria L6 s27, Hoffman evaluation tables L6 s28–29) carry source citations in text but their diagram contents are images not recoverable as text.

### 2.2 Context-only — 53201 / 94-816-A4 Spring 2026 (Usdan, non-Rao)

Decks in `slides_and_readings/`: Class 1 Final (82 slides), Class 2 (44 slides; plus `14241595__Class 2 deck.pdf` and two identical legacy-format files `14209258/14209262__…Class 2-1/2-2.pptx` — OLE2 .ppt containers mislabeled .pptx, not parseable by python-pptx; both have identical MD5), Class 3 (59), "Societal Impact of AI" Class 4 (46; three duplicate copies), Class 5 (40; filename typo "Spring 2065"), Class 7 (33), `14247029__Final class assignments.pptx` (3). **No Class 6 deck** — EXHAUSTED (16-file `ls` of slides_and_readings; manifest); session 6 materials appear as readings/discussions only. Syllabus: `handouts_labs_data/14154209__Generative_AI_Syllabus_Spring_2026_FINAL.docx` (fully extracted). Assignments (syllabus grading table): Participation 10%, Canvas assignments 35%, Red-Teaming Analysis / Personal Avatar / Deepfake Creation 35%, AI Policy Editorial with AI co-author 20%. Assignment/discussion snapshots include four Session-4 lab stations (political bias, misinformation, deepfake detection, jailbreaking/red-teaming) and a "Class 6 assignment on agentic AI ethics" discussion (`page_snapshots/039_discussion_topics_class_6_assignment_on_agentic_ai_ethics….txt`). Readings of governance interest (syllabus Sessions 5–6): NIST AI RMF + Microsoft 2025 Responsible AI Transparency Report as the Session-5 case (breakout: "Build a Governance Plan" for scenarios *including a hospital triage AI*), Partnership on AI "Decoding AI Governance" toolkit, Anthropic "Claude's New Constitution", EU AI Act implementation / China GenAI content-security standard / EU Code of Practice on deepfake labeling, and AI-agent governance items (AI Agent Ethics arXiv:2509.10289; CIP "When AI Acts For You (Or As You)"). Slide-level readings PDFs: EU AI Act (MIT Tech Review), 2023 US Executive Order (White House), 12 Dangers of AI, Vestager Project Syndicate.

### 2.3 Context-only — 42728 / 94-816 Fall 2024 Mini 1 (Usdan, non-Rao)

Page snapshots only (17 pages) + syllabus docx `handouts_labs_data/11443406__Generative AI Course Syllabus Fall 2024 FINAL.docx` (fully extracted). Assessment: Participation 10%, Canvas assignments 15%, Full-AI in-class writing 10%, AI Productivity Log 10%, Red-teaming analysis OR Deepfake creation 35%, AI Policy Editorial 20%. Seven sessions; Session 5 = "AI governance and responsible release at companies" (KPMG deployment risks; Solaiman release-gradient; OpenAI safety lessons; Microsoft Responsible AI Standard; Crescendo multi-turn jailbreak; optional Schuett et al. "How to design an AI ethics board"); Session 6 = accountability/EU AI Act/copyright + supplementary "Practices for Governing Agentic AI Systems" (OpenAI, Dec 2023). Assignment briefs captured as snapshots 010–016. No deck files exist in this folder (page_snapshots + one docx only — EXHAUSTED via folder listing).

### 2.4 Attribution-unresolved module set — 41224 GenAI-Learners (non-Rao)

29 content pages (plus "skip_to_content" duplicates). Module 1: how GenAI works, training data, web-search comparison, Risks of Hallucinations (016), Attribution for AI-Generated Content (017). Module 2: Framework for Responsible Use (019), Who Stands to be Harmed (020), **A Taxonomy of Harms for Generative AI — page snapshot MISSING** (no `021_*` file exists although the module index lists the page and Canvas module item 5925819 — EXHAUSTED for this download; content partially recoverable from neighbors), Sources of Generative AI Risks (022). Module 3: learning-process pages. Module 4: Decide-Verify-Cite-Rectify (030), Lateral Reading (031), chatbot prompting (029), knowledge check/review quizzes (010/032).

---

## 3. Framework inventory

Legend: **Relevance** to Tribunal Clinical (High/Med/Low) + why; **Incorporate at** = repo doc/component that should cite it. Rao-authored course = R; institutional module = M; Usdan = U.

### 3.1 [R] NIST AI RMF — four functions + seven trustworthiness characteristics
**Source:** `43912/slides_and_readings/11810785__L2-AIRisks-RMF.pptx` slides 13–21 (functions, MAP detail), `11810786__L1…pptx` slide 20 (Safe; Secure & Resilient; Explainable & Interpretable; Privacy-Enhanced; Fair with Harmful Bias Managed; Valid & Reliable; Accountable & Transparent); readings `NIST.AI.100-1.pdf`, `AI_RMF_Playbook.pdf`. Syllabus L10 row: "applying its core functions (Govern, Map, Measure, Manage)."
**Summary:** Rao teaches the RMF as *the* operating system of the whole course — every pillar lecture (bias, XAI, privacy, safety) is structured as Map → Measure → Manage → Govern, and both team projects require applying it. The seven characteristics are the vocabulary he uses for "trustworthy."
**Relevance: HIGH** — it is the frame Rao will reflexively apply to Tribunal Clinical.
**Incorporate at:** docs/hackathon/RAO_* meeting kit — present the kernel pipeline mapped to Govern (charter/authority registry), Map (case intake + risk framing), Measure (E2 five-arm harness metrics), Manage (escalation packet + clinician authority); tag each of the seven characteristics to a concrete artifact (Valid & Reliable → execution receipts; Accountable & Transparent → provenance ledger; Safe → exposure-bound safety packet).

### 3.2 [R] Rao's Map/Measure/Manage/Govern lecture template (his signature analytic move)
**Source:** summary slides `11839128__L4…pptx` slide 23, `11875724__L6…pptx` slide 35, `11907134__L7-Privacy.pptx` slide 30, `11932263__L8-Safety.pptx` slide 31 — each closes with a 4-quadrant Mapping/Measuring/Managing/Governing table.
**Summary:** For every risk pillar Rao decomposes practice into: identify/classify (map), quantify with named metrics (measure), mitigate across lifecycle (manage), and assign accountability/audit/document (govern). The Govern quadrant recurrently demands "document decision rationales to facilitate transparency and allow for external and internal review" (L4 s23) and "maintain thorough records … supporting traceability, especially for external reviews and audits" (L6 s35).
**Relevance: HIGH** — Tribunal's ledger/receipts are literally the Govern quadrant; presenting E2 as the Measure quadrant completes his square.
**Incorporate at:** RAO meeting kit agenda: structure the five open decisions under his four headers; README "clinical research extension" section can adopt the quadrant language.

### 3.3 [R] AI harms — Whom / What / When / How-much dimensional grid
**Source:** `11810786__L1…pptx` slides 23 (Whom: individuals, corporates, groups, society, nation, species — NIST), 24 (What: physical, psychological, economic, environmental, legal — Ammanath ch. 7), 25–27 (When: short/long-term, expert timelines), 18 & 28 (How much: EU AI Act severity tiers via Ada Lovelace), 32 (dimensions: time, stakeholder, sector — "healthcare, financial services" — use case, socio-technical).
**Summary:** Rao's harm anatomy asks four questions of any system — who is harmed, what kind of harm, on what time horizon, and how severe — then adds sector and use-case as analysis axes. Healthcare is his recurring example sector on both the stakeholder and sector axes.
**Relevance: HIGH** — the exposure-bound safety packet should answer exactly these four questions for the escalation use case.
**Incorporate at:** exposure-bound safety packet doc: add a "harms grid" table (whom = patient/clinician/hospital; what = physical (missed escalation), psychological, legal; when = per-encounter; how much = severity bound), each row citing L1 s23–24.

### 3.4 [R] Five Views of AI Risk — six socio-technical risk classes
**Source:** `11810786__L1…pptx` slide 30 (+ reading `11775599__(20m) (Optional) Five Views of AI Risk.pdf`).
**Summary:** Six classes split by level: application-level — Performance risk (errors, bias, opaqueness, **hallucinations**, toxicity), Security & privacy risk (adversarial attacks, deepfakes), Control risk ("lack of human agency in AI processes and accountability," rogue-AI detection); business/national-level — Economic, Societal, Alignment risk.
**Relevance: HIGH** — gives Rao's exact names for the two risks Tribunal targets: performance risk (hallucination → no-overclaim ledger) and control risk (human agency → clinician authority + authority registry).
**Incorporate at:** RAO kit "primary construct" decision page: state which risk class the primary construct lives in; packages/kernel/src/types.ts doc-comment for the safety packet type could cite the class names.

### 3.5 [R] MIT AI Risk Repository — causal + domain taxonomies
**Source:** `11810786__L1…pptx` slides 33–39 (Slattery et al., MIT CSAIL 2024); worked case studies s38–39 tag risks as Entity: Human/AI, Intent: Intentional/Unintentional, Timing: Pre/Post-deployment, plus domain codes (1.1 unfair discrimination; 1.2 toxic content; 6.4 competitive dynamics; 6.5 governance failure; 7.1 AI pursuing goals in conflict with human values; 7.3 lack of capability or robustness).
**Summary:** Rao trains students to classify any incident along a causal triple (who caused it, deliberateness, lifecycle timing) and into a 7-domain hazard catalog. His worked example flags "rushing AI products to market" as Intentional/Post-deployment with domains 6.4/6.5/7.3. (Note: the same repository is Usdan's Session-3 required reading in 94-816 Spring 2026 — shared CMU currency.)
**Relevance: MED-HIGH** — E2's failure taxonomy (evidence-responsiveness vs social-cue capitulation) can be registered against domain 7.3 and the causal triple; also supplies neutral language for the "failure unit" decision.
**Incorporate at:** docs/hackathon/RESEARCH_METHODS_PROTOCOL_2026-07-16.md — classify each E2 arm's failure mode with the causal triple; cite repository domain codes in the failure-unit section.

### 3.6 [R] TASRA — societal-scale risk taxonomy
**Source:** `11810786__L1…pptx` slide 31; required reading `11775602__(50m) (Required) TASRA….pdf` (Critch & Russell, arXiv:2306.06924).
**Summary:** Taxonomy of societal-scale AI risks organized by accountability structure (e.g., diffusion of responsibility, "bigger than expected" impacts), taught as the long-horizon complement to application-level risk.
**Relevance: LOW-MED** — background; useful only if Rao pushes on systemic effects of automating clinical escalation.
**Incorporate at:** none required; optional footnote in the safety packet's scope-limits paragraph.

### 3.7 [R] Healthcare AI risk list (EPRS/STOA 2022) — Rao's clinical risk canon
**Source:** `11810786__L1…pptx` slide 29 ("AI Risks in Healthcare," European Parliamentary Research Service STOA PE 729.512, June 2022): (1) patient harm due to AI errors, (2) misuse of medical AI tools, (3) risk of bias in medical AI and perpetuation of inequities, (4) lack of transparency, (5) privacy and security issues, (6) gaps in AI accountability, (7) obstacles to real-world implementation.
**Summary:** The one slide in the Rao corpus that is squarely clinical: a seven-item risk list for healthcare AI spanning error harm, misuse, bias, opacity, privacy, accountability gaps, and implementation friction. Healthcare also recurs as his high-stakes example in learning objectives (syllabus objectives 2, 4), L8 physical-harm examples ("Medical AI errors impacting treatment," L8 s19), sensitivity/FNR examples (L3 s33–35), and federated-learning-for-hospitals (L7 s25–26).
**Relevance: HIGH** — this is almost certainly the checklist he will run Tribunal Clinical against, item by item.
**Incorporate at:** exposure-bound safety packet: add a seven-row conformance table (STOA item → Tribunal control: patient harm → clinician authority + escalation bound; transparency → provenance ledger + dissent preservation; accountability gap → authority/verifier registries + execution receipts; implementation obstacles → silent-mode evidence package).

### 3.8 [R] "Alternative Futures": Effective Accelerationism vs Safety-first RAI
**Source:** `11810785__L2-AIRisks-RMF.pptx` slides 4–8 (principle lists for both camps), L1 slide 42; readings `11775679__(30m) Effective Accelerationism.pdf`, `11775680__(30m) Need for Responsible AI.pdf`; Team Project 2 (L1 s52).
**Summary:** Rao stages the field as a debate between e/acc (innovation-first, anti-regulation, market-driven) and safety-first RAI, whose principle list includes "Human Oversight: ensure human oversight and intervention in AI decision-making to prevent over-reliance on automated systems," socio-technical integration, continuous monitoring, and transparency/explainability. His discussion prompts (L2 s5–6) ask what safeguards and governance structures allow speed *and* safety.
**Relevance: MED-HIGH** — the hackathon cadence (48-hour build) vs clinical safety is exactly his debate; expect a question of the form "you built fast — show me the safety-first controls."
**Incorporate at:** RAO kit opening framing: one line positioning Tribunal as "safety-first controls at accelerationist build speed," with the L2 s8 oversight clause quoted against the clinician-authority design.

### 3.9 [R] NIST risk-management challenge set — human baseline, risk tolerance, Automated/Augmented/Autonomous
**Source:** `11810785__L2-AIRisks-RMF.pptx` slide 10 (from NIST AI RMF): Risk Measurement (emergent risks, availability of reliable metrics, inscrutability, **human baseline**), Risk Tolerance (contextual, use-case specific), Risk Prioritization (**Automated vs Augmented vs Autonomous**, residual risk), Organizational Integration (accountability).
**Summary:** Rao highlights that measuring AI risk requires a comparison against a human baseline, that tolerance is context-set (not universal), and that priority scales with autonomy level. "Residual risk" names what remains after mitigation.
**Relevance: HIGH** — directly speaks to two of the five meeting decisions: the apples-to-apples comparator (human baseline) and human-AI timing (Automated/Augmented/Autonomous placement of the panel relative to the clinician).
**Incorporate at:** RESEARCH_METHODS_PROTOCOL comparator section — cite "human baseline" as the RMF-sanctioned comparator concept; RAO kit decision page for timing — offer the Automated/Augmented/Autonomous triad as the decision's vocabulary.

### 3.10 [R] NIST SP 1270 bias taxonomy + socio-technical doctrine
**Source:** `11865785__L3…pptx` slides 9 (bias = "systematically inaccurate behavior," NIST; ISO deviation-from-truth), 11 (bias statistical vs fairness social), 12 (disparate treatment vs disparate impact), 15–17 (three families: statistical/computational across lifecycle; systemic/historic/institutional; human-cognitive), 19 (socio-technical approach quote); reading `NIST.SP.1270.pdf`.
**Summary:** Bias comes in three families — statistical, systemic, and human (cognitive) — and legal exposure comes as disparate treatment or disparate impact; AI must be assessed as a socio-technical system including "the humans who interact with them." The Cognitive Bias Codex (s17) covers conformity-type distortions.
**Relevance: HIGH** — E2's unsupported panel-count social cue is a *human/cognitive-bias analogue induced in agents*; describing it as "cognitive-bias family, per SP 1270 as taught in L3 s15–17" puts the experiment in Rao's own taxonomy.
**Incorporate at:** RESEARCH_METHODS_PROTOCOL construct section: name the social-cue arm as testing resistance to cognitive/conformity bias; packages/kernel/src/feedback.ts doc-comment (sealed rounds exist to suppress cascade/conformity channels).

### 3.11 [R] Fairness metric selection & error-cost reasoning (confusion-matrix school)
**Source:** `11865785__L3…pptx` slides 22 (confusion matrix), 32–39 (when accuracy/precision/sensitivity/FOR/FPR/FNR/FDR are the right metric — with clinical exemplars: sensitivity for "patient with cancer predicted healthy," FNR for missed cancer diagnoses, FPR for a healthy patient flagged with rare disease), 38–39 + `11839128__L4…pptx` slide 8 (metric family tree: predictive parity, error-rate balances, statistical parity, calibration, similarity/causal definitions) and L4 slide 25 (statistical parity formula).
**Summary:** Rao's core measurement lesson: the "right" metric is a function of the decision and the asymmetric cost of FP vs FN; fairness is then a comparison of those error rates across groups. He drills students on choosing FNR when missing a true positive is costly — his examples are clinical.
**Relevance: HIGH** — this is the exact grammar for the meeting's "failure unit" decision (is the unit a wrong escalation call (FP-like) or a missed escalation (FN-like), and per-case or per-ballot?).
**Incorporate at:** RESEARCH_METHODS_PROTOCOL failure-unit section: define E2 failure counts in confusion-matrix terms with the FN-costlier asymmetry argument anchored to L3 s33–35.

### 3.12 [R] Courtroom Algorithm Game + threshold ethics (Blackstone's ratio)
**Source:** `11865785__L3…pptx` slides 21–27 (perfect vs imperfect prediction; Blackstone 10:1; race-based vs single thresholds; equality vs equity); activity PDF `11800699__(45m) Lecture-3-Can you make AI fairer than a judge….pdf`.
**Summary:** Students set decision thresholds on real recidivism data and discover no threshold satisfies all fairness definitions at once; explicit value ratios (Blackstone) must be chosen and justified. Speaker notes stress "perfect prediction is an unrealistic benchmark."
**Relevance: MED** — supports the E2 design point that a decision rule must pre-commit its error trade-off rather than tune post hoc.
**Incorporate at:** RESEARCH_METHODS_PROTOCOL analysis-plan: state the pre-registered decision threshold for "responded to evidence" vs "capitulated to cue," referencing threshold-choice ethics (L3 s21–27).

### 3.13 [R] State v. Loomis guardrails — algorithm advises, human decides, warnings attach
**Source:** `11865785__L3…pptx` slides 28–29 (Harvard JOLT "Algorithmic Due Process"): COMPAS could not determine incarceration or sentence length; use "had to be accompanied with an independent rationale," and reports carrying the score required "an elaborate, five-part warning about the algorithm's limited utility."
**Summary:** Rao teaches the leading US precedent on algorithmic decision support: the tool's output may inform but not determine; an independent human rationale is mandatory; and the artifact itself must carry standardized limitation warnings.
**Relevance: HIGH** — a legal-precedent template for Tribunal's clinician-authority + no-overclaim design: the escalation packet parallels the presentence report, the no-overclaim ledger parallels the five-part warning.
**Incorporate at:** no-overclaim ledger doc: cite Loomis-style "limited utility" warnings as design precedent; RAO kit human-AI timing decision: the clinician's "independent rationale" step should be explicit in the workflow diagram.

### 3.14 [R] Bias across the 9-step lifecycle + mitigation ladder + human oversight loops
**Source:** `11839128__L4…pptx` slides 9 (bias catalog per lifecycle stage — framing-effect bias at problem definition; sampling/measurement/label bias; confounding; human evaluation bias incl. confirmation bias; deployment, monitoring, and drift biases incl. **feedback loop bias**; Srinivasan & Chander CACM 2021), 10 (mitigations per stage — pre-/in-/post-processing, fairness tree, adverse impact analysis, bias incident reporting, regular bias audits, "Human oversight with feedback loops"), 17 (governance of bias: algorithmic impact assessment, multi-stakeholder diversity, "system and procedural transparency in human-in-the-loop systems with subject matter experts," HCAI, bias audit).
**Summary:** Every lifecycle stage has named bias modes and named countermeasures; governance adds impact assessment, SME-transparent human-in-the-loop procedure, and recurring audits. "Feedback loop bias" is flagged as a monitoring-stage hazard.
**Relevance: HIGH** — Tribunal's sealed-then-revealed feedback rounds are a concrete anti-feedback-loop, anti-confirmation-bias mechanism; procedural transparency for the human-in-the-loop is what the packet + ledger provide to the clinician SME.
**Incorporate at:** packages/kernel/src/feedback.ts and panel.ts doc-comments (name the bias modes the sealing defeats); safety packet governance section cites L4 s17's HITL-transparency clause.

### 3.15 [R] Algorithmic Impact Assessment + Bias Audit as governance artifacts
**Source:** `11839128__L4…pptx` slides 18 (Ada Lovelace NMIP AIA user guide: assess societal impact *before* use, ongoing monitoring advised, builds public trust and accountability) and 19–22 (Aequitas audit tool + ungraded bias-audit assignment).
**Summary:** Rao teaches two named artifact types: the ex-ante impact assessment documenting risks/mitigations/oversight, and the recurring bias audit producing metric evidence. Both are documents an accountable party signs, not just analyses.
**Relevance: HIGH** — the exposure-bound safety packet is functionally an AIA; the E2 harness is functionally an audit run. Naming them so aligns artifacts with his catalog.
**Incorporate at:** RAO kit "minimum silent-mode evidence package" decision: propose "AIA-style packet + audit-run outputs" as the minimum, citing L4 s18.

### 3.16 [R] XAI concept ladder + interpretability/explainability distinction + 3-ring explainability risks
**Source:** `11865801__L5…pptx` slides 5 (understandability, comprehensibility, interpretability, explainability, transparency → simulatable/decomposable/algorithmically transparent; Barredo Arrieta et al. 2020), 6 (interpretability = model-centric; explainability = decision-centric, end-user audience), 7 (risks in technical / organizational / societal rings — error identification, accountability assignment, regulatory non-compliance, trust erosion).
**Summary:** Precise definitional ladder Rao expects students to use; explainability is about communicating *decisions* to stakeholders, and lack of it creates accountability-assignment failure at the organizational ring.
**Relevance: MED-HIGH** — Tribunal's dissent-preserving packet is a decision-centric explanation artifact; use "explainability (decision-centric)" not "interpretability" when presenting.
**Incorporate at:** RAO kit glossary page; escalation-packet doc description ("a decision-centric explanation object per L5 s6").

### 3.17 [R-authored] Rao's "Five Critical Questions to Explain Explainable AI"
**Source:** `11865801__L5…pptx` slides 8 ("What for? What are the goals of the explanation?" — citing *Five critical questions to explain Explainable AI*, Anand Rao, Towards Data Science, Oct 30 2020) and 19 (OptiClaim case run through "EXPLAIN TO WHOM? / WHY EXPLAIN?"); `11875724__L6…pptx` slide 31 ("HOW TO EXPLAIN? Graphical / Natural Language / Technical (Neural Network) / Technical (Functional)").
**Summary:** Rao's own published XAI framework: What for (goal), To whom (stakeholder), Why (driver: trust, compliance, recourse), How (format/medium), When (pre- vs post-modeling). He applies it as the case-analysis lens in his own course.
**Relevance: HIGH** — it is *his* framework; answering the five questions for the escalation packet (to whom = attending clinician; what for = escalate/hold decision support; how = structured packet w/ dissent; when = post-decision, pre-action) will land as fluent.
**Incorporate at:** RAO kit: one slide/section answering the five questions for Tribunal's packet; escalation-packet template header could name the five fields.

### 3.18 [R] NISTIR 8312 — Four Principles of Explainable AI
**Source:** `11865801__L5…pptx` slide 13 (how-to-explain dimensions: level of detail sparse↔extensive; interaction declarative/one-way/two-way; format) and `11875724__L6…pptx` slide 27 "Criteria for Explainable AI Evaluation" (both citing Phillips et al., NISTIR 8312, 2021 — the four principles: Explanation, Meaningful, Explanation Accuracy, Knowledge Limits; the criteria table itself is an image slide — text not extractable, flagged in Limits).
**Summary:** NIST's evaluation criteria for explanations: a system should provide explanations, meaningful to the recipient, accurate about its own process, and — critically — operate only within its knowledge limits, declaring when it is outside them.
**Relevance: HIGH** — "Knowledge Limits" is a NIST-canonical hook for the no-overclaim ledger (declared claim boundary) and the exposure-bound packet (declared operating envelope).
**Incorporate at:** no-overclaim ledger doc: cite Knowledge Limits (NISTIR 8312 via L6 s27) as the principle the ledger operationalizes.

### 3.19 [R] Post-hoc explanation toolset — LIME, SHAP, counterfactual explanations + explanation-evaluation metrics
**Source:** `11875724__L6…pptx` slides 8–15 (LIME 5-step), 17–21 (SHAP/Shapley), 22–26 (counterfactuals per Wachter et al.: minimal change to flip a decision; GDPR-relevant; step 7 "avoid suggesting changes to protected attributes"), 27–29 (evaluation: NISTIR criteria; Hoffman et al. metrics — goodness, satisfaction), 33 (lifecycle management incl. "conduct continuous monitoring and audits of explanations," "transparent incident reporting for explainability issues"), 34 (accuracy-interpretability trade-off "isn't universal" — contrarian view).
**Summary:** The measurement half of XAI: feature-attribution (LIME/SHAP) and counterfactual "minimal flip" explanations, plus the insistence that explanations themselves be evaluated (fidelity, comprehensibility) and audited over time.
**Relevance: MED** — Tribunal explains via structured deliberation records rather than feature attribution, but "counterfactual explanation" is the shared term with E2's counterfactual harness — worth a deliberate disambiguation in the meeting.
**Incorporate at:** RESEARCH_METHODS_PROTOCOL: one paragraph distinguishing E2's *counterfactual experimental arms* from Wachter-style *counterfactual explanations* (L6 s22) to preempt vocabulary collision.

### 3.20 [R] Privacy risk canon — attack taxonomy, CHI-24 AI privacy taxonomy, PETs, DPIA
**Source:** `11907134__L7-Privacy.pptx` slides 11–12 (Lee et al. CHI 2024 taxonomy of AI privacy risks; "when/why to use"), 16 (privacy attack taxonomy per Rigaki & Garcia + NIST AI 100-2e2023), 17–18 (data reconstruction/de-anonymization; Strava), 20–26 (differential privacy global/local; homomorphic encryption FHE/PHE; federated learning cross-device/cross-silo with hospital example), 28–29 (privacy across 9-step lifecycle; DPIA), 30 (summary with named trade-offs privacy-vs-utility etc. and "restricted sectors like healthcare").
**Summary:** Map privacy risks with an attack taxonomy (reconstruction, membership inference, model extraction), measure/mitigate with PETs chosen by trade-off, and govern via DPIA + audits; healthcare is repeatedly the exemplar high-sensitivity sector (FHE "ideal for healthcare," cross-silo FL for hospitals).
**Relevance: MED-HIGH** — expect Rao to ask what patient data enters prompts, what the panel providers retain, and where the DPIA-equivalent lives; the exposure-bound packet should carry a data-flow note.
**Incorporate at:** exposure-bound safety packet: add "data exposure map + DPIA-style note" subsection (cite L7 s28–29); packages/kernel/src/providers/* doc-comments on what leaves the process boundary.

### 3.21 [R] AI safety goals & adversarial threat canon (incl. OWASP LLM Top-10 with metrics)
**Source:** `11932263__L8-Safety.pptx` slides 6 (goals: Do No Harm, Aligned, Robust to OOD, Resilient/graceful degradation, Reliable/no drift), 7 (NIST AI 100-2e2023 attack motivations: integrity, availability, privacy), 10 (training vs inference-stage vulnerabilities), 14 (AI01–AI10 traditional threats), 15–16 & 22 (OWASP Top-10 for LLMs with per-risk metrics — LLM01 prompt injection … **LLM08 Excessive Agency: "instances where the model performs actions beyond its intended scope without proper authorization"; LLM09 Overreliance: "frequency of critical decisions made based solely on the model's outputs without human oversight"**), 21 (layered safety metrics per NIST workshop), 24 (safety practices across Rao's 9-step lifecycle — threat modeling & risk register; "Automate Model Integrity Verification: use cryptographic hashes to confirm model integrity post-deployment and maintain an audit trail of updates for accountability"; real-time monitoring; AI-specific incident response), 30 (Ammanath leading practices).
**Summary:** Rao's safety lecture fuses classical adversarial-ML taxonomy with the LLM-specific OWASP list, each with a measurable indicator, then distributes controls across his lifecycle — including cryptographic integrity verification and audit trails as *safety* controls.
**Relevance: HIGH** — three direct hits: LLM09 Overreliance is the metric-form of Tribunal's clinician-authority guarantee; LLM08 Excessive Agency is what the authority/verifier registries bound; and the cryptographic-hash + audit-trail practice is exactly the sealed-ballot/execution-receipt mechanism.
**Incorporate at:** packages/kernel execution-receipt docs: cite L8 s24's hash/audit-trail practice; safety packet: include an OWASP-LLM checklist row set with LLM08/LLM09 marked "mitigated by design," anchored to L8 s22.

### 3.22 [R] Jailbreak & defense taxonomy — including multi-agent attacks and vote-based response evaluation
**Source:** `11932263__L8-Safety.pptx` slides 26 (jailbreak families: gradient-, evolutionary-, demonstration-, rule-based, and **"Multi-Agent-Based Jailbreaks: collaboration between multiple LLMs to iteratively refine and improve jailbreak prompts through feedback mechanisms"**), 27 (defenses: prompt detection, prompt perturbation, demonstration/self-reminder, generation intervention, **"Response Evaluation-based Defenses: evaluate the safety of responses post-generation, using an auxiliary model or iterative refinement"**, fine-tuning), 28–29 (worked examples incl. **majority-vote** perturbation defense).
**Summary:** Rao teaches that multi-LLM feedback loops are *both* an attack vector (agents jointly refining harmful outputs) and a defense pattern (auxiliary-model response evaluation; majority voting over perturbed generations).
**Relevance: HIGH** — this is his closest brush with multi-agent governance: Tribunal must be ready to argue why its multi-agent feedback rounds are the *defense* pattern (sealed commitments, independent evaluation, dissent preserved) and not the attack pattern (mutual drift).
**Incorporate at:** RAO kit anticipated-questions page; packages/kernel/src/panel.ts doc-comment: sealed ballots prevent inter-agent prompt contamination (cite L8 s26 vs s27 contrast).

### 3.23 [R] Rao's 9-step AI lifecycle (Value Scoping → Discovery → Delivery → Stewardship)
**Source:** recurring canvas in `11839128__L4…pptx` s9–10, `11875724__L6…pptx` s33, `11907134__L7…pptx` s28, `11932263__L8…pptx` s24, `12010808__L9…pptx` s32: stages 1–2 Business & Data Understanding / Solution Design (Value Scoping); 3–5 Data Extraction / Pre-Processing / Model Building (Value Discovery); 6–7 Deployment / Transition & Execution (Value Delivery); 8–9 Ongoing Monitoring / Evaluation & Check-in (Value Stewardship). Speaker notes across decks repeatedly define "value scoping" as evaluating "feasibility, ethical soundness, and strategic alignment."
**Summary:** Rao's own lifecycle chassis, onto which every pillar's controls are pinned; L9 s32 pins governance controls per stage — "Transparent Documentation: maintain detailed, traceable records of data sources, preprocessing methods, and algorithmic choices to support accountability," "Governance Compliance Checks," "Continuous Monitoring," "Proactive Incident Management," "Regular Audits."
**Relevance: HIGH** — mapping the Tribunal pipeline (charter → sealed ballots → feedback rounds → ratification → receipts → packet) onto his 9 steps shows lifecycle completeness in his own diagram language; also exposes what Tribunal deliberately lacks (steps 8–9 ongoing monitoring — silent-mode is precisely a Stewardship-stage proposal).
**Incorporate at:** RAO kit architecture page: draw the kernel pipeline over the 9-step canvas; the "minimum silent-mode evidence package" decision framed as "what does Value Stewardship require before Value Delivery?"

### 3.24 [R] Definitional ladder — Principles / Practices / Policies / Frameworks / Toolkits / Standards / Regulations
**Source:** `12010808__L9-AI-Regulations-Governance.pptx` slide 5 (seven definitions, from high-level values to legally binding rules).
**Summary:** Rao insists on separating aspirational principles, engineering practices, organizational policies, structured frameworks, software toolkits, norm-setting standards, and binding regulations — the course title itself ("Principles, Policies, Practices") comes from this ladder.
**Relevance: HIGH (vocabulary)** — misusing these words in front of him is a credibility risk; Tribunal artifacts should be introduced with the right rung (charters = policy objects; kernel = toolkit; sealed-ballot procedure = practice; NIST RMF = framework; EU AI Act = regulation).
**Incorporate at:** RAO kit glossary; README terminology block.

### 3.25 [R] Global regulatory timeline & instrument catalog
**Source:** `12010808__L9…pptx` slides 6 (timeline: Asilomar 2017, IEEE EAD 2016-17, GDPR 2018, Toronto Declaration 2018, CCPA 2019, OECD 2019, EU AI Act 2020 proposal, Singapore Model AI Governance 2021, US AI Bill of Rights 2022, Algorithmic Accountability Act 2019/22/23, Executive Order 2023, **AI Safety Institute 2023 (NIST, from the EO)**), 9 (GDPR obligations incl. DPO, 72-hour breach, risk analysis), 10–11 (EU AI Act risk-based approach; high-risk systems — image slides, Edwards/Ada Lovelace and EC sources), 12–13 (Singapore Model AI Governance), 14 (AI Bill of Rights — see 3.26), 15 (Algorithmic Accountability Act: mandatory impact assessments of automated critical decisions, FTC reporting, public repository incl. "how to contest decisions"), 16 (EO 2023 eight pillars + dated deliverables incl. content authentication/synthetic-content detection guidance), 17–18 (state laws; ISO/IEC TR 24027/24028/24029-1/24030/24372, ISO/IEC 38507), 20 (EU vs Singapore vs US comparison table: binding vs voluntary vs non-binding; risk management, transparency, accountability rows).
**Summary:** A compressed regulatory atlas. As taught: EU = binding, risk-tiered, conformity-assessed; Singapore = voluntary, human-centric with AI Verify; US = principles + sectoral enforcement, with the EO tasking NIST and the AAA proposing impact-assessment mandates.
**Relevance: MED-HIGH** — a clinical decision-support panel is a high-risk-category system under the EU AI Act taxonomy as taught (L9 s10–11); the safety packet should say which regime's obligations it is *shaped for*, even if not legally required at hackathon stage.
**Incorporate at:** safety packet "regulatory posture" paragraph (one line each: EU AI Act high-risk analogy, AAA-style impact assessment, EO content-authentication ethos → provenance ledger).

### 3.26 [R] US AI Bill of Rights — five principles with fallback/escalation and automation-bias language
**Source:** `12010808__L9…pptx` slide 14 = `11810786__L1…pptx` slide 19 (Blueprint for an AI Bill of Rights, White House 2022): safe & effective systems; algorithmic-discrimination protections; data privacy; notice & explanation ("provide explanations as to how and why a decision was made"); human alternatives, consideration & fallback — "provide timely human consideration and remedy by a **fallback and escalation system** if an automated system fails, produces error, or you would like to appeal or contest its impacts"; "institute training, assessment, and oversight to **combat automation bias**"; "implement additional human oversight and safeguards for automated systems related to **sensitive domains**."
**Summary:** The five-principle US charter, taught twice (L1 and L9), whose fifth principle is nearly a specification of Tribunal Clinical: escalation systems, human fallback, automation-bias countermeasures, extra oversight in sensitive domains (health explicitly among them in the Blueprint).
**Relevance: HIGH** — the single most quotable governance text in the Rao corpus for this project; "fallback and escalation system" is his slide's own phrase for what Tribunal builds.
**Incorporate at:** RAO kit cover framing + README: quote the fallback/escalation clause (with L1 s19 / L9 s14 anchor); clinician-authority design section cites the automation-bias oversight clause.

### 3.27 [R] Asilomar + IEEE EAD accountability principles (auditable rationale, competence)
**Source:** `12010808__L9…pptx` slide 7 speaker notes (Asilomar: "Failure Transparency: if an AI system causes harm, it should be possible to ascertain why"; "Judicial Transparency: any involvement by an autonomous system in judicial decision-making should provide a satisfactory explanation **auditable by a competent human authority**"; "Human Control: humans should choose how and whether to delegate decisions"; Responsibility; Value Alignment) and slide 8 notes (IEEE EAD: "Transparency — the basis of a particular A/IS decision should always be discoverable"; "Accountability — unambiguous rationale for all decisions"; "Effectiveness — evidence of the effectiveness and fitness for purpose"; "Competence — creators shall specify and operators shall adhere to the knowledge and skill required").
**Summary:** The two principle sets Rao opens regulation with; both demand discoverable decision bases, auditable explanations to competent human authorities, human-chosen delegation, and evidence of fitness for purpose.
**Relevance: HIGH** — "auditable by a competent human authority" is a principle-level statement of the clinician-authority + provenance-ledger pairing; "evidence of effectiveness" is the E2 harness's mandate.
**Incorporate at:** provenance/audit ledger doc: epigraph-level citation of Failure Transparency and Judicial Transparency (L9 s7 notes); RAO kit evidence-package decision cites IEEE "Effectiveness."

### 3.28 [R] Enterprise AI governance stack — Masood 12 aspects, board toolkits, PwC ten principles, three lines of defense
**Source:** `12010808__L9…pptx` slides 25 (governance definition), 26 (Masood et al. framework: security, transparency, explainability, privacy, safety, fairness, **Oversight = "an internal AI board with SMEs"**, reliability, workforce, AI CoE, regulations, diversity), 27–28 (WEF board oversight toolkit 2019; Harvard Law Forum board questions — NIST RMF discussions at board level, generative-AI policy oversight), 29 (PwC "Ten principles of Responsible AI" in Strategic / Performance & Security / Control tiers — governance = "clear roles and responsibilities, articulated requirements across **three lines of defense**, and mechanisms for **traceability and ongoing assessment**"), 30–31 (policy-to-practice map incl. Validation, Monitoring, Problem Formulation; enterprise levels: strategy / portfolio / application 9-step), 33 (socio-technical governance).
**Summary:** How organizations operationalize RAI: a standing SME oversight board, tiered principles, three-lines-of-defense role separation, and traceability mechanisms — Rao's consulting-era (PwC) frameworks feature explicitly.
**Relevance: MED-HIGH** — Tribunal's authority registry + verifier registry + ratification is a miniature three-lines-of-defense (proposer panel / verifier / ratifying human authority); saying so in these terms will resonate with his enterprise lens.
**Incorporate at:** packages/kernel/src (authority/verifier registry docs): describe the registries as lines-of-defense role separation (cite L9 s29); RAO kit governance page reuses "traceability and ongoing assessment."

### 3.29 [R] Standards / certifications / accreditations triad
**Source:** `12010808__L9…pptx` slides 18–19 (ISO/IEC TR 24027 bias, 24028 trustworthiness, 24029-1 robustness of neural networks, 38507 governance implications; standards vs certifications vs accreditation; ForHumanity certified auditors for the EU AI Act & NYC AEDT; EU ALTAI assessment list).
**Summary:** Rao distinguishes norms (standards), attestations about products/people (certification), and attestations about attesters (accreditation) — third-party assurance as a maturing market.
**Relevance: MED** — anticipates the question "who verifies the verifier?"; Tribunal's verifier registry is an in-protocol seed of this triad.
**Incorporate at:** verifier-registry doc-comment: note the standard/certification/accreditation analogy (L9 s19).

### 3.30 [M — non-Rao, CMU institutional] Risk = probability × severity; risk surface; four screening questions
**Source:** `41224/page_snapshots/019_home_a_framework_for_responsible_use_of_generative_ai.txt`: "Risk is broadly defined as the probability of an occurrence of harm and the severity of that harm"; "the risk surface of generative AI as a technology is vast"; four questions — who benefits & how, who stands to be harmed, what are the potential harms, how likely; decision = proceed / change application / forgo.
**Summary:** A compact application-screening protocol: enumerate beneficiaries, harmed parties, harm types, and likelihoods, then make a tri-valued deployment decision. Well-scoped applications shrink the risk surface.
**Relevance: MED-HIGH** — clean, CMU-shared language for the exposure-bound packet's opening ("exposure bound" ≈ deliberately narrowed risk surface).
**Incorporate at:** exposure-bound safety packet intro: define the bound as risk-surface narrowing and answer the four questions for the escalation use case (label the source as CMU GenAI-Learners module, not Rao).

### 3.31 [M — non-Rao] NIST harm classes (people / organization / ecosystem)
**Source:** `41224/page_snapshots/020_home_who_stands_to_be_harmed.txt` (harm to people — individual/community/societal; to organizations; to ecosystems; per NIST AI RMF). Mirrors Rao's L1 s23 "whom" slide (which extends to nation/species).
**Summary:** Stakeholder-of-harm classification used to answer screening question 2.
**Relevance: MED** — feeds the harms grid (3.3).
**Incorporate at:** safety packet harms grid rows.

### 3.32 [M — non-Rao] Sources of GenAI risk: malfunction vs malicious use; conditions-of-release overclaiming; accountability gap
**Source:** `41224/page_snapshots/022_home_sources_of_generative_ai_risks.txt`: malfunction risks amplified by low-quality data, **"inadequate evaluations — the science of AI evaluations is still in its infancy … urgent need to develop new human-centered evaluation methodologies,"** inadequate safeguards (jailbreaking), and **"conditions of release — developers … are economically incentivized to overstate the capabilities of their products,"** vs malicious use (malware, misinformation, NCII/CSAM); plus "questions surrounding who should be responsible for foreseeing, documenting, and managing AI harms are largely open."
**Summary:** A causal split of GenAI risk into malfunction and malicious use, with four malfunction amplifiers; explicitly names capability overstatement at release and the open accountability question.
**Relevance: HIGH** — the no-overclaim ledger is a direct counter to the named "overstate the capabilities" failure; the "inadequate evaluations" clause motivates E2's bespoke harness.
**Incorporate at:** no-overclaim ledger doc: cite the conditions-of-release clause (CMU module source, file above); RESEARCH_METHODS_PROTOCOL motivation paragraph cites the inadequate-evaluations clause.

### 3.33 [M — non-Rao] Hallucination typology + remediation ladder + LLM-task suitability criteria
**Source:** `41224/page_snapshots/016_home_risks_of_hallucinations.txt`: types (factual errors, fictitious references, common-sense failures, mathematical failures); remediation (better data, "more rigorous evaluations," guardrails, "improved transparency: clearly establish and document the intended uses of the model and its limitations," user prompt training, "Review and verify! Human review is ultimately the only reliable approach"); suitability criteria — good LLM tasks are "relatively well-structured" and "allow for relatively low-cost human verification."
**Summary:** Institutional hallucination canon: enumerate failure types, then a mitigation ladder that terminates in mandatory human verification; tasks qualify for LLM use only when human verification is cheap.
**Relevance: HIGH** — the escalation-packet design (structured output + clinician verification) satisfies the two suitability criteria by construction; "document intended uses and limitations" is again the no-overclaim ledger.
**Incorporate at:** README design-rationale: cite the two suitability criteria; safety packet limitations section mirrors the "intended uses and limitations" documentation demand.

### 3.34 [M — non-Rao] Decide–Verify–Cite–Rectify + lateral reading (fractionation)
**Source:** `41224/page_snapshots/030_home_responsible_use_decide_verify_cite_rectify.txt` (Decide: policy/privacy/IP/tool-fit questions; Verify: fact-check outputs, links, bias; Cite: disclose prompts and responses, MLA/APA/Chicago/IEEE patterns, "submit your prompts and the tool's responses as an appendix"; Rectify: "no use of generative AI should go unvetted" — correct and adapt) and `031_home_responsible_use_lateral_reading.txt` (fractionate output into checkable claims; corroborate outside the tool — "instead of asking 'who's behind this information?' we have to ask 'who can confirm this information?'"; perspective/omission-bias pass).
**Summary:** CMU's individual-level responsible-use protocol: a four-step loop around any AI output, with lateral reading as the verification method — decompose the output into atomic claims and seek independent confirmation for each.
**Relevance: HIGH** — structurally parallel to Tribunal's pipeline at the system level (Decide = charter/authority registry; Verify = verifier registry + E2 evidence; Cite = provenance ledger + receipts; Rectify = feedback rounds + clinician override), and fractionation ≈ claim-level entries in the no-overclaim ledger. Label it CMU-institutional, not Rao's.
**Incorporate at:** RAO kit one-slide analogy table "DVCR ↔ Tribunal pipeline" (sourced to the module pages); no-overclaim ledger doc cites fractionation as the claim-granularity precedent.

### 3.35 [U — Usdan (94-816), non-Rao; context only] Session-5 governance unit and agentic-AI governance readings
**Source:** `53201/handouts_labs_data/14154209__…Syllabus…docx` Session 5 (NIST AI RMF "Govern, Map, Measure, Manage" lecture with Microsoft 2025 Responsible AI Transparency Report case; breakout "Build a Governance Plan" for scenarios explicitly including a **hospital triage AI**; Partnership on AI toolkit; Anthropic "Claude's New Constitution") and Session 6 (EU AI Act implementation; China GenAI content standard; **AI Agent Ethics arXiv:2509.10289; CIP "When AI Acts For You (Or As You)"**; policy-memo workshop); 42728 syllabus Session 5 (Solaiman release gradient; Microsoft Responsible AI Standard; red-teaming; optional AI-ethics-board design) and Session 6 supplementary (OpenAI "Practices for Governing Agentic AI Systems," Dec 2023); AI-use policy: "cite your AI use, describe your prompting approach, and distinguish your original thinking from AI-generated content."
**Summary (context only):** The course the user TAs already rehearses NIST-RMF-based governance planning for a hospital-triage scenario and carries the only explicit *agentic-AI governance* readings in the whole corpus. Not Rao's material; useful solely as evidence that the CMU teaching environment around this meeting already frames hospital triage + agent governance in NIST terms.
**Relevance: MED (context)** — anticipate that Rao's questions and the user's shared context both default to NIST RMF vocabulary.
**Incorporate at:** no repo changes on Usdan's authority; optionally a one-line "adjacent coursework context" note in the RAO kit labeled Usdan (94-816), non-Rao.

---

## 4. Rao's governance lens — questions he is most likely to ask about Tribunal Clinical

Each question is phrased as he plausibly would, with its slide/page trace.

1. **"Walk me through Govern–Map–Measure–Manage for this system."** (L2 s13–21; syllabus L10 row; every pillar-deck summary slide.) Expect him to test whether E2 is the Measure function and where Govern lives when the deploying org is a hackathon team.
2. **"Who exactly is harmed if this fails — and on your slide, which STOA risk is it?"** Patient harm from AI errors, accountability gaps, transparency, implementation obstacles (L1 s29; L1 s23–24; L8 s19 "Medical AI errors impacting treatment").
3. **"What is your human baseline, and is the comparison apples-to-apples?"** (L2 s10 "human baseline" under risk-measurement challenges; L1 s51 Team Project 1 is literally AI-vs-judges comparison with FPR/FNR by group.) This is meeting decision #3 in his native terms.
4. **"Is the panel automated, augmented, or autonomous relative to the clinician — and when does the human enter?"** (L2 s10 risk prioritization triad; AI Bill of Rights fallback/escalation + automation-bias clauses, L1 s19 / L9 s14; Loomis "independent rationale," L3 s28–29.) Meeting decision #4.
5. **"What's your failure unit and which error rate do you privilege — FN or FP — and why?"** (L3 s22, s32–35 with clinical FNR/FPR examples; Courtroom Game threshold ethics L3 s21–27.) Meeting decision #2.
6. **"How do you know the agents respond to evidence and not to each other? Multi-agent feedback is an attack pattern too."** (L8 s26 multi-agent jailbreaks vs s27 response-evaluation/majority-vote defenses; L4 s9 feedback-loop bias and confirmation bias; SP 1270 cognitive-bias family L3 s15–17.) This is E2's thesis — he has the exact frames to interrogate it.
7. **"Where is the documented, traceable record an auditor — a competent human authority — could reconstruct the decision from?"** (Asilomar Failure/Judicial Transparency, L9 s7 notes; IEEE EAD discoverable basis/unambiguous rationale, L9 s8 notes; L9 s32 "Transparent Documentation"; L4 s42 audit-trails example; L8 s24 cryptographic hashes + audit trail.)
8. **"What are the knowledge limits — where does the system say 'I don't know / out of scope'?"** (NISTIR 8312 four principles via L5 s13 & L6 s27; module page "document the intended uses and limitations," 41224/016.) Direct probe of the no-overclaim ledger.
9. **"Which regulatory regime are you shaping this for — under the EU AI Act this is high-risk; what obligations follow?"** (L9 s10–11 risk tiers; s20 EU/SG/US comparison — risk management, audits, conformity assessment rows; s15 AAA impact assessments.)
10. **"What does the impact assessment look like, and who signed it?"** (L4 s17–18 algorithmic impact assessment; Ada Lovelace AIA guide; L9 s28 board accountability.) Bears on meeting decision #5 (minimum silent-mode evidence package) — his floor will likely be an AIA-style document plus audit-run metrics plus monitoring plan (L9 s32 Stewardship).
11. **"Overreliance: what stops the clinician from rubber-stamping the packet?"** (OWASP LLM09 metric — "critical decisions made based solely on the model's outputs without human oversight," L8 s22; automation-bias clause L1 s19.) Expect a design answer (dissent preservation forces engagement) plus a measurement answer.
12. **"You built this in 48 hours — argue you're not the AI-arms-race case study."** (L2 s3–8 e/acc vs safety-first; L1 s39 case tagging "rushing AI products to market" as Intentional/6.4 competitive dynamics/6.5 governance failure.)

---

## 5. Vocabulary map — Rao's terms ↔ Tribunal Clinical's terms

| Rao's term (anchor) | Project term | Note for the meeting |
|---|---|---|
| Govern / Map / Measure / Manage (L2 s13–21) | charter+registries / case intake+risk framing / E2 harness / packet+escalation flow | Present pipeline in his order |
| Trustworthy characteristics: "Accountable & Transparent," "Valid & Reliable," "Safe" (L1 s20) | provenance ledger; execution receipts; exposure-bound packet | Use the seven adjectives as artifact labels |
| "Human baseline" (L2 s10) | apples-to-apples comparator (decision #3) | Adopt his phrase verbatim |
| "Automated vs Augmented vs Autonomous" (L2 s10) | human-AI timing (decision #4) | Say "augmented, clinician-in-command" |
| "Fallback and escalation system"; "combat automation bias"; "sensitive domains" (L1 s19 / L9 s14) | specialist-escalation packet; dissent preservation; clinical domain | His slides' own words for the product category |
| "Independent rationale" + limitation warnings (Loomis, L3 s28–29) | clinician authority + no-overclaim ledger | Legal-precedent framing |
| "Knowledge limits" (NISTIR 8312 via L6 s27) | no-overclaim ledger | NIST-canonical hook |
| "Failure Transparency" / "auditable by a competent human authority" (L9 s7 notes) | audit/provenance ledger + ratification | Quote when asked "why a ledger?" |
| FPR/FNR, sensitivity, error-cost asymmetry (L3 s22–35) | failure unit (decision #2) | Define failure in confusion-matrix grammar |
| Cognitive/human bias family; confirmation bias; feedback-loop bias (L3 s15–17; L4 s9) | social-cue arm; sealed commitments; feedback rounds | E2 = cognitive-bias resistance test for agents |
| Counterfactual fairness / counterfactual explanation (L3 s41; L6 s22–26) | E2 paired counterfactual arms | Disambiguate explicitly — same word, different object |
| "Excessive Agency" LLM08; "Overreliance" LLM09 (L8 s22) | authority/verifier registries; clinician authority | Answer overreliance with a metric, not only design |
| Cryptographic hashes + "audit trail of updates for accountability" (L8 s24) | sealed ballots; execution receipts | His safety-lecture practice = kernel mechanism |
| Multi-agent jailbreak vs response-evaluation/majority-vote defense (L8 s26–29) | panel deliberation risk vs sealed-ballot design | Position Tribunal on the defense side |
| Algorithmic Impact Assessment; bias audit (L4 s17–21) | exposure-bound safety packet; E2 audit run | Name the packet an AIA-style artifact |
| Three lines of defense; "traceability and ongoing assessment" (L9 s29) | panel / verifier registry / ratifying authority | Enterprise-governance framing of the registries |
| Principles→…→Regulations ladder (L9 s5) | charter=policy; kernel=toolkit; sealed ballots=practice | Get the rungs right |
| Risk surface; probability × severity; proceed/change/forgo (41224/019 — CMU module, non-Rao) | exposure bound | Shared-campus vocabulary, label source honestly |
| Decide–Verify–Cite–Rectify; fractionation (41224/030–031 — CMU module, non-Rao) | pipeline stages; claim-level ledger entries | Analogy slide only, with attribution |
| Value Scoping … Value Stewardship 9-step (L4/L6/L7/L8/L9 lifecycle canvas) | build phases; silent-mode = Stewardship gate | Frame decision #5 as "Stewardship before Delivery" |

---

## 6. Limits — what was not read, and why

**EXHAUSTED (verified absent/unreadable, method stated):**
1. 41224 "A Taxonomy of Harms for Generative AI" page — no `021_*` snapshot exists (`ls page_snapshots` shows 020 → 022 gap) although the module index lists it; content approximated only via neighboring pages.
2. Any Rao attribution in 41224 — `grep -ri "rao"` over the whole folder: zero matches.
3. 43912 robustness/reliability deck, rubrics, quiz banks, recordings, guest-lecture materials — see §2.1 MISSING (find/ls/manifest sweeps listed there); `recordings/` empty.
4. COMPL-AI content in L9 — grep "COMPL" across all nine extracted deck texts hits only the agenda line (L9 s2).
5. 53201 Class 6 deck — 16-file listing of `slides_and_readings` + manifest contain no Class 6 deck; `14209258/14209262__…Class 2-1/2-2.pptx` are legacy OLE2 .ppt files (authored by Jordan Usdan per file metadata), unparseable by python-pptx — their content presumably ≈ `14241595__Class 2 deck.pdf` (not text-extracted; Usdan material, out of deep-scope per the correction).
6. Image-only slide content in Rao decks — EU AI Act pyramid (L9 s10–11), RMF core-function diagrams (L2 s14–21), MIT Risk Repository taxonomy tables (L1 s33–37), NISTIR 8312 criteria table (L6 s27), Hoffman explanation-evaluation tables (L6 s28–29), Singapore framework diagrams (L9 s12–13), Masood framework graphic (L9 s26), "Related terms" map (L1 s13), fairness tree (L4 s11): the slides carry titles + source citations in text, but the diagrams themselves are raster/vector images; summaries above rely only on extractable text plus the cited public sources' identities, and are labeled accordingly.
7. Speaker-notes contamination: several Rao decks reuse a boilerplate "value scoping" note on section headers (e.g., L1 s6/s22/s40) and L8 reuses poisoning-technique notes across s21–29 — noted so nobody mistakes notes for slide content.

**HYPOTHESIZED (not fully checked):**
1. The ~40 third-party PDFs in 43912 (NIST 100-1, SP 1270, IR 8312, 100-2e2023, TASRA, OWASP deck, surveys, cases incl. the HBS-coded `H087LZ` case) were inventoried by title/role but not page-read — their in-course meaning was taken from Rao's slides that cite them. Framework summaries could deepen if the PDFs were read directly.
2. Canvas-internal items that this download could not capture (native quizzes, gradebook rubrics, discussion threads beyond snapshots) are presumed to exist in Canvas but are unverifiable here.
3. 43912 nav banner reads "94885-A2" while the syllabus says "Section(s): A" — presumed a section-label artifact, not checked against the registrar.
4. Usdan Spring-2026 deck contents (Classes 1–5, 7) were text-extracted but deliberately not framework-inventoried per the user correction; if the meeting scope changes, `scratchpad/decks_53201/*.txt` already contain the extracted text.
5. Whether Rao has newer (post-Fall-2024) Responsible AI course materials — this corpus contains only the Fall 2024 run; HYPOTHESIZED that any 2025/2026 iteration exists outside this download.

*Report generated 2026-07-16. Extraction artifacts: `scratchpad/decks_43912/*.txt`, `scratchpad/decks_53201/*.txt`, `scratchpad/syllabus_53201.txt`, `scratchpad/syllabus_42728.txt`, `scratchpad/genai_learners_pages.txt` (same scratchpad root as this report).*
