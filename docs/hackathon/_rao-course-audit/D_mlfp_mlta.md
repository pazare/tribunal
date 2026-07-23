# D: Rao NLX/LLM course + ML TA context

Framework inventory for the Rao meeting audit. Primary corpus: Prof. Anand Rao's CMU 95-820 "Applications of NL(X) and LLM — Science, Engineering and Applications" (Fall 2025) Canvas download. Secondary context (demoted per re-brief): 90-803 MLFP (Collier), backers-folder meeting intelligence. All paths absolute; every corpus claim carries file + slide/page anchor. Digest-derived claims are marked as such. Date: 2026-07-16.

---

## 1. Attribution verdict

### 1a. The NLX/LLM course (48275) IS Rao's — verbatim syllabus line

`/Users/pablo/Desktop/ML TA/canvas_downloads/courses/48275_applications_of_nl_x_and_llm_science_engineering_and_applications/page_snapshots/008_assignments_syllabus.txt` (line 5, one continuous Canvas body line):

> "95-820 Applications of NL(X) and LLM Lecture Days, Times, Location: TR – 5:00-6:20PM; HBH 1202 … Semester/Year: Fall 2025 Units: 6, Section(s): A1 Instructor information Name **Prof Anand S Rao** Contact Info anandr2@andrew.cmu.edu Office location Hamburg Hall 2105D Office hours Wednesday – 3PM-4PM"

Sole instructor; no co-instructor appears anywhere in the syllabus snapshot. Course number is **95-820** (not 90-803). Title page (snapshot line 2): "Syllabus for Applications of NL(X) and LLM - Science, Engineering and Applications". The user's claim that Rao has since renamed the course (~"Model Development …") is **HYPOTHESIZED** — greps for `95-820`, `rao`, `model development` over `/Users/pablo/Desktop/ML TA/canvas_downloads/canvas-courses-all.{raw,summary}.json` and `canvas-courses-active.summary.json` returned no renamed listing.

### 1b. MLFP 90-803 is NOT Rao's — verbatim lines for both sections

- **Section B (52229, Spring 2026 — the section the user TAs; manifest `course.enrollment_types: "ta"`):** instructor is **Ben Collier**. Two anchors:
  - `52229…/page_snapshots/001_home.txt` line 5: "Professor: Ben Collier, PhD Office Hours: Monday, Wednesday, Friday 1:30pm to 3:30pm … Email: bcollier@cmu.edu Office: Tepper Quad 5135" (identical text in `005_wiki.txt` line 5).
  - Official syllabus PDF `52229…/files/14389793__ML Foundations Spring 2026.pdf` p.1: "Instructor: Ben Collier, PhD / Email: bcollier@cmu.edu / Office: Tepper Quad 5135". Sole instructor.
- **Section A (45133, Spring 2025 — the user was a student; manifest `enrollment_types: "student"`):** instructor **not named anywhere in the local corpus** — EXHAUSTED: grep -ri over all 22 snapshot files in `45133…/page_snapshots/` for `rao|instructor|professor|Dr\.|PhD|taught|office hours|@cmu.edu|@andrew.cmu.edu` returned zero instructor identifications (announcements and wiki pages are "disabled for this course"; the syllabus itself is an un-downloaded Google Drive link, `001_home.txt` line 32). Who taught 90-803 A is therefore UNRESOLVED in-corpus; content signals (DSSG-style "Project Scoping guide", KDD water-main-breaks case study, `010_home_readings.txt` line 5) suggest the Ghani/ML-for-public-policy lineage — **HYPOTHESIZED**, not asserted.
- The only "Rao" string in the entire MLFP snapshot set is a Google-Docs URL ID coincidence (`…gOhX2Rao_9YyRHSA`, `52229…/page_snapshots/003_modules.txt` line 108) — not a person.

### 1c. Consequence for the audit

- Everything under `canvas_downloads/courses/48275_…` is **Rao-authored teaching material** — his taxonomy, his vocabulary, his rigor bar. This is the material the meeting artifact must be mapped against.
- Everything MLFP (90-803 decks, lectureforge mlfp digests, Applied-LLM/Classification project rubrics) is **Collier/other-instructor material** — adjacent-course context for the user's TA fluency, NOT evidence of Rao's frameworks. It must not be cited to Rao in the meeting.
- A third, unexplored Rao corpus exists: `~/Desktop/Agentic AI/Lectures/` — verified by ls: `L4-Designing-Single-Agents.pdf`, `L5-Memory-Tool-Agents.pdf`, `L6-Designing-MA-Systems.pdf`, `L7-Evaluating-Benchmarking-Agents.pdf` (his Agentic Technologies course; the backers app already grounds a Rao profile in it). Outside this report's brief; flagged as the obvious next audit target since Tribunal Clinical is a multi-agent system.

---

## 2. Corpus map

### 2a. Rao 95-820 corpus (primary) — `…/courses/48275_applications_of_nl_x_and_llm_science_engineering_and_applications/`

- **Manifest** (`canvas_download_manifest.json`): 60 pages captured (0 errors), 41/41 downloads reconciled, 173 external links, 0 privacy-review downloads. Total 265 MB.
- **Decks present** (`slides_and_readings/`, 9 pptx): L1-Introduction-ALLM (13115248), L2-Neurons2Narratives (13115254), L3-Bottlenecks2Bridges (13136276), L4-Inside-Language-Models (13136286), L5-Prompt-Context-Engineering (13181513), L6-Fine-Tuning-1 (13236993), L7-Fine-Tuning-2 (13241097), L8-From-Benchmarks-to-Alignment-Measures (13272012; byte-identical duplicate 13272018, cksum 953213078).
- **Decks MISSING from download — EXHAUSTED** (`find … -iname "*.pptx"` returns exactly the 9 above; manifest `downloads` enumerated): L9-Extending-LLMs-Tools-Agents-Memory-Reasoning.pptx, L10-LLMs-in-SE-Coding.pptx, guest deck "(Kevin) 2025-Applications-of-LLMs-CMUSep-30.pptx" — all three are *listed* on the modules page (`page_snapshots/003_modules.txt`) but the crawl terminated at the L8 duplicate (snapshot 060). Syllabus sessions L11–L14 (Agents & Coding; Evaluation/Safety/Ethics; two guest lectures) have no decks on the modules page at all — whether they were ever posted is HYPOTHESIZED.
- **Assignments/handouts** (`handouts_labs_data/`): M2-A1.docx (TensorFlow Playground activity), M2-A2.docx (word-embedding demo activity), NanoGPT Instructions.docx (recitation tuning ladder). **IA-1/2/3 handouts and rubrics: ABSENT-FROM-DOWNLOAD — EXHAUSTED** (find for `*rubric*|*assignment*|*ia-*|*quiz*` → only the two assignment/syllabus snapshots; manifest keyword scan → 0 hits; the three assignment detail pages exist only as links in `007_assignments.txt`). The syllabus proves rubrics exist ("Each individual assignment will have a rubric associated with it", 008 snapshot line 5) — they live on un-crawled Canvas pages.
- **Readings**: 30 PDFs in `slides_and_readings/` (Required/Optional encoded in filenames), 38 O'Reilly-chapter captures in `external_readings/` + `external_readings_manifest.json`. Evaluation cluster verified by title page (section 3c).
- **Quizzes**: content absent (LockDown-browser quizzes; no /quizzes snapshot). Announcements page disabled on Canvas (002 snapshot is a home-page fallback).

### 2b. MLFP / ML TA context (demoted to one paragraph, per re-brief)

The MLFP corpus is: 90-803 B (52229, S26) Canvas download — 5 files incl. the Collier syllabus PDF; 90-803 A (45133, S25) snapshots only (all content on Google Drive, 0 downloads, 28 page errors); and 13 machine-generated module digests under `/Users/pablo/Desktop/ML TA/lectureforge-books/mlfp/<module>/out/notes.json` (all attributed "Prof. Ben Collier"; automated validity: V_det 100%, 1073/1073 groundedness checks — `lectureforge-books/mlfp/validity-summary.md`; source decks sit in each module's `slides/`). A digest sweep (three subagents, launched pre-re-brief) confirmed the course teaches solid classical rigor — honest-evaluation/leakage taxonomy (14_cv_case S2), A/B testing with power analysis (14_cv_case S1, slide 18), cost-asymmetric metrics rooted in medical screening (05_classification S5), temporal CV "shuffling leaks the future" (07_time_series cheatsheet), "Reproducible ≠ correct" (02_clustering S4) — but **zero kappa/inter-rater content, zero preregistration, zero paired-contrast designs anywhere in the 13 modules** (regex-swept; EXHAUSTED at digest level, HYPOTHESIZED for raw decks). Note the task brief's "~5.4GB slides_and_readings" for 52229 does not match disk: that folder holds one 344K PDF; the real MLFP decks live under lectureforge-books (480MB). Digest-trust caveat: a deck spot-check pass found the module-8 digest cheatsheet contradicting its own section-4 numbers on the Cookie Cats outcome direction (cheatsheet blocks carry `src: None` and sit outside the groundedness checks) — treat unanchored digest blocks as secondary. **Label for anything MLFP in the meeting: Collier (90-803), non-Rao.**

### 2c. Assessment artifacts + backers (context corpora)

- `/Users/pablo/Desktop/ML TA/LLM Project/solutions and rubric/applied_llm_project_rubric.md` + `LLM Project/README.md` — Collier's Applied-LLM project rubric (section 4c note). Student group folders NOT opened (per PII rule); `lenient_final_grades.csv` not opened.
- `/Users/pablo/Desktop/ML TA/Classification Project/` — contains only team folders + grading notebooks; no standalone rubric/readme found at top level (EXHAUSTED: ls of the directory; team folders not entered).
- `/Users/pablo/Desktop/ML TA/backers/` — 7 files, section 5.

---

## 3. Framework inventory — Rao material

Ratings: relevance to Tribunal Clinical (deterministic kernel + sealed panel + E2 five-arm counterfactual harness + Fleiss-kappa process measures). Anchors are deck slide numbers from XML text extraction (no rendering); L8 = `slides_and_readings/13272012__L8-From-Benchmarks-to-Alignment-Measures.pptx` (38 slides).

### 3a. L8 "From Benchmarks to Alignment: Measuring what matters in LLMs and RAG" — the load-bearing deck

Rao's top-level taxonomy (S2 agenda): **(A) LLM Evaluation & Benchmarks → (B) RAG Evaluation → (C) LLM-as-a-Judge.** "Alignment" here means the alignment-evaluation pillar (ethics/bias/toxicity/truthfulness), NOT RLHF training; RLHF, HELM, G-Eval, BIG-bench never appear in the deck.

| # | Framework | Anchor | What Rao teaches | Rel. | Incorporation point |
|---|---|---|---|---|---|
| 1 | Three evaluation methods: Automated / Human / Task-based | L8 S5 (+notes) | Automated = perplexity, BLEU, ROUGE, METEOR, F1; Human = coherence/relevance/creativity/fluency/empathy; Task-based = QA (EM/F1, SQuAD), summarization, translation, sentiment. | med | Name which of the three each Tribunal metric is; the packet mixes automated (kappa) + human (specialist spot-check). |
| 2 | Benchmark families + contamination | L8 S6, S8–S9, S17–S19 | General-capability / domain-specific / target-specific families (MMLU, GSM8K, HumanEval pass@k, MT-Bench, Chatbot Arena); recurring warning: contamination & staleness; "Benchmarks are lenses, not truth" (S19). | med | Position Tribunal's vignette suite as a *target-specific* benchmark; inherit his contamination language for held-out vignettes. |
| 3 | Guo-survey three pillars: **Capability / Alignment / Safety** | L8 S10–S16 | S10 "Three pillars, distinct goals"; Capability = QA/knowledge/reasoning/tool use (S11–12); Alignment = ethics, societal bias, toxicity, truthfulness (S13–14); Safety = robustness + risk incl. LLMs-as-agents, red-teaming (S15–16). Sourced from Required reading 2310.19736. | **high** | The meeting's shared map: state which pillar E2 tests (a capability/alignment hybrid: evidence-responsiveness vs sycophancy-adjacent social cue) and which the charter/authority registries govern (safety). |
| 4 | Deployment-grade eval hygiene | L8 S17–S18 | "calibrate LLM judges to humans, version prompts/models, log seeds and **provenance**, and audit regularly" (S17); S18: freeze versions/prompts/seeds; mean ± 95% CI, treat within-CI diffs as noise; leakage prevention/disclosure; report slices+latency+cost; "make it auditable (configs, hashes, changelog, artifact pack)". | **high** | This IS Tribunal's kernel pitch in Rao's own words — ledger/receipts = his "artifact pack"; cite S17's literal "provenance". |
| 5 | RAG evaluation stage model | L8 S20–S25 | Evaluate retrieval (Recall@k, nDCG, reranking) and generation (faithfulness, relevancy) separately against Evaluable-Output/Ground-Truth pairs (S22, from 2405.07437); RAGAS metrics (S23–24); study-design blueprint: IV/DV, vanilla-LLM baseline, failure-analysis loop, holdout (S21/S25). | med | E2's five-arm design maps onto his IV/DV + baseline blueprint; borrow "component-wise evaluation" for panel-stage vs packet-stage metrics. |
| 6 | Exam-based eval + IRT | L8 S26–S27 (+long notes) | Auto-generated exams with Bloom's-taxonomy coverage; Item Response Theory information curves; iterative pruning of low-discrimination items. | med | A Rao-native upgrade path for the vignette bank: IRT-prune low-discrimination clinical vignettes. |
| 7 | LLM-as-a-Judge: three judging modes | L8 S31 | Pairwise comparison / Single-score with rubric / Reference-guided, motivated by open-ended outputs + human-eval cost (MT-Bench, Chatbot Arena; from 2306.05685). | **high** | Tribunal's sealed ballots are single-score-with-rubric mode; say so in his vocabulary. |
| 8 | Judge–human agreement calibration | L8 S32 (+notes), S3/S30 | "reliability—not accuracy," with CIs and slices; human–LLM Cohen's kappa typically ~0.35–0.5; **high model–model agreement can signal shared bias, not validity**; "Prefer panel judges, prompt randomization, and periodic human audits." | **high** | The single best slide for the meeting: it legitimizes panels AND warns that inter-agent agreement ≠ correctness — exactly the dissent-preservation thesis. |
| 9 | Agreement-metrics cheat sheet | L8 S33 (appendix), S37 | Percent agreement, Cohen's kappa (Landis–Koch-style bands), Spearman's rho, **Krippendorff's alpha** (≥.80 reliable, .67–.80 tentative), always with CIs + slices; S37 "Measure agreement rigorously": kappa for label match, rho for ranking, alpha for multi-rater. | **high** | **Fleiss' kappa is never named**; Rao's taught multi-rater statistic is Krippendorff's alpha. Prepare the answer to "why generalized Fleiss rather than Krippendorff's alpha?" (or report both from the same ballots). |
| 10 | Judge-bias taxonomy + mitigations | L8 S34 (from Galileo eBook) | Biases: nepotism/self-preference, verbosity, beauty/formatting, authority, position; mitigations: randomize order, anonymize sources, limit verbosity, require evidence-based explanations; audit via A/B counterbalancing + reliability metrics; "LLMs are not neutral judges." | **high** | Sealed ballots + anonymized panel + paired counterfactual arms are mechanized versions of his mitigation list; E2's unsupported panel-count cue is an *authority/majority* bias probe in his taxonomy. |
| 11 | ARES: calibrated judges with CIs | L8 S35–S36 | Fine-tuned lightweight domain judges for context relevance/faithfulness/answer quality; ~150 human labels + Prediction-Powered Inference give confidence intervals; beats RAGAS on human alignment; component-wise and auditable. | **high** | The course-sanctioned template for the "minimum silent-mode evidence package" decision: small human-labeled anchor set + PPI-style CIs on top of agent judgments. |
| 12 | High-stakes doctrine | L8 S37 | "Use **panel judges and human spot checks for high-stakes decisions**"; audit bias/drift (randomize, allow ties, ordering tests); document everything. | **high** | Verbatim course authority for Tribunal's existence: a panel-judge system with human escalation for a high-stakes clinical decision. Quote it. |

Reading-to-deck crosswalk (how Rao positions each Required/Optional reading): Evaluating LLMs 2310.19736 → source of S10–S16 pillars; Judging LLM-as-a-Judge 2306.05685 → S31 modes + S6/S14; Galileo Mastering LLM-as-a-Judge eBook → S34 biases; RAG-eval survey 2405.07437 → S22; ARES 2311.09476 → S35–36; MMLU 2009.03300 → S9; AI Alignment 2310.19852 → **not cited in L8** (it is an M6/fine-tuning reading; see 3c). All also in S38 bibliography (16 items).

### 3b. Rao's stated learning objective for evaluation (syllabus)

`008_assignments_syllabus.txt` line 5, Learning Objective 3: "**Evaluate Reasoning, Alignment, and Model Behavior**: Students will assess LLMs using benchmark datasets (e.g., MMLU, GSM8K), alignment criteria, and output diagnostics to identify failure modes and propose techniques to improve factual accuracy and safety." L8 session row (Th: Sep 18): "Survey perplexity, MMLU, GSM-8K, pass@k, toxicity metrics and map reinforcement-learning-from-human-feedback pipeline to improve helpfulness, truthfulness, safety." L12 row (Th: Oct 2): "Develop robust, **contamination-resistant evaluation suites**; explore AI safety, bias mitigation, privacy" — L12 deck not in download (see 2a), so this framing exists only at syllabus granularity.

### 3c. The evaluation-cluster readings — verified from local title pages, with Rao's positioning

| Reading (file) | Framework (1–2 lines) | Rao's positioning |
|---|---|---|
| (Required) Evaluating Large Language Models-2310.19736v3.pdf — Guo et al., Tianjin U. | Panoramic survey; categorizes LLM evaluation into **knowledge & capability, alignment, and safety evaluation**, plus specialized domains and eval platforms (abstract, p.1). | Backbone of L8 S10–S16; M8 module "Required" (003_modules.txt). His pillar vocabulary comes from here. |
| (Optional) Judging-LLM-as-a-Judge-2306.05685v4.pdf — Zheng et al., NeurIPS 2023 | LLM judges (MT-Bench, Chatbot Arena); usage + limits: **position, verbosity, self-enhancement biases, limited reasoning**; GPT-4 judge reaches >80% agreement with humans — "the same level of agreement between humans" (abstract, p.1). | L8 S31 judging modes; the judge-agreement-as-reliability frame Tribunal's kappa measures extend. |
| Mastering LLM-as-a-Judge eBook.pdf — Galileo (Mastering GenAI series) | Practitioner playbook for high-precision LLM-judge evaluation; preface (p.3) names the clinical stake: an LLM "helping doctors make treatment decisions—where hallucinations could impact someone's life," and the humans-can't-review-everything scale problem. | Optional in M8; source of L8 S34 bias taxonomy. Its clinical framing is a ready-made meeting bridge. |
| (Required) Evaluation of Retrieval-Augmented Generation-2405.07437v2.pdf — Yu et al. | RAG-eval survey; "A Unified Evaluation Process of RAG (Auepora)": target–dataset–metric analysis across Retrieval (relevance/accuracy) and Generation (faithfulness/correctness) (abstract, p.1). | L8 S22 stage model; Required in M8. |
| (Required) ARES-2311.09476v2.pdf — Saad-Falcon, Khattab, Potts, Zaharia | Automated RAG Evaluation: fine-tuned lightweight LM judges per component + **prediction-powered inference over a small human-annotated set → confidence intervals** (abstract, p.1). | Two dedicated slides (L8 S35–36); Required. The strongest single citation for E2's human-anchored statistics. |
| (Optional) MEASURING MASSIVE MULTITASK LANGUAGE UNDERSTANDING-2009.03300v3.pdf — Hendrycks et al., ICLR 2021 | 57-subject knowledge/problem-solving benchmark; models "frequently do not know when they are wrong"; near-random on some socially important subjects (law, morality) (abstract, p.1). | L8 S9; syllabus LO3 exemplar benchmark. |
| (Optional) A Methodology for Evaluating RAG Systems-2410.08801v1.pdf — Simon et al., Leipzig | Reusable methodological blueprint for sound RAG evaluation: appropriate baselines/metrics, systematic refinement from qualitative failure analysis, replication-grade reporting (abstract, p.1). | Optional in M8; matches L8 S21/S25 study-design blueprint. |
| AI Alignment-2310.19852v6.pdf — Ji et al. | Alignment survey: **RICE** objectives (Robustness, Interpretability, Controllability, Ethicality); forward alignment (RLHF, scalable oversight) vs backward alignment (assurance: safety evaluation, interpretability; governance) (abstract, p.1). | Positioned as an **M6 fine-tuning/alignment reading** (003_modules.txt M6 articles; snapshot 043 sits in the L6 range), not an L8 citation. Use for governance vocabulary (assurance, scalable oversight), attributed to the reading rather than his deck. |

### 3d. L5 "Prompt & Context Engineering" — prompt-design principles

Deck: `slides_and_readings/13181513__L5-Prompt-Context-Engineering.pptx`, 60 slides (image-only: s4, 5, 15, 16, 27, 41, 42, 56, 57 — the two worked prompt-optimization examples s15–16 are not text-extractable). Agenda: prompt engineering → RAG → context retrieval/processing/management.

| # | Principle / framework | Anchor | What Rao teaches | Rel. | Incorporation point |
|---|---|---|---|---|---|
| 13 | Prompt anatomy: Instruction / Context / Input Data / Output Indicator (+ extended: Persona, Format, Audience/tone, Data) | L5 s8, s9, s48 | Core four elements (after Ozdemir); richer six-element version; element interdependencies "requiring iterative prompt testing to balance specificity with flexibility" (s9). | **high** | Structure `prompt.ts` ballot prompts in these named sections; panelist role = his "Persona". |
| 14 | **CLEAR principles** | L5 s48 (verbatim: "CLEAR - Concise, Logical, Explicit, Adaptive, Reflective") | The deck's one named prompt-design principle set, embedded in his "PE & context generation framework" alongside zero/few-shot, CoT/ToT/GoT, and cognitive-architecture ops (goal clarification, decomposition, filtering, abstraction, pattern recognition). | **high** | A CLEAR-conformance pass over the sealed-ballot prompt is a one-slide Rao-native audit of prompt.ts. |
| 15 | Prompt templates + locked patterns for A/B | L5 s12 | LangChain PromptTemplate: reusable structure, runtime variables, prompt/logic separation; "Reproducible testing — **Lock in prompt patterns for controlled A/B comparisons and quality audits**." | **high** | The single most on-point L5 line for E2: paired stochastic prompt contrasts ARE locked patterns under controlled A/B. |
| 16 | Context engineering as a stateful discipline | L5 s44–s47 | CE = "dynamic, structured assembly of multiple context elements" vs PE's static string; stateful memory; modular composition; "systematic evaluation and debugging of individual context components" (s45 table incl. State and Error Analysis rows). | **high** | The kernel's round-by-round assembly of commitments + structured feedback is context engineering in his exact sense; name it that. |
| 17 | Zero/one/few-shot + context-window budgeting | L5 s10–s11, s14 | GPT-3 shot taxonomy; token trade-off between examples and instructions (Brown 2020); context curation rules — keep aligned, avoid conflict, prioritize impactful evidence within token limits (s14). | med | Governs what dissent/feedback is carried into revision-round context. |
| 18 | Chain-of-thought / self-consistency / ToT | L5 s49, s50, s51 | Standard vs CoT; self-consistency = same prompt sampled at varied temperature/top-p, **majority vote**, cost linear in samples; ToT with DFS/BFS + backtracking (Yao 2023). | **high** | Self-consistency is the course-native cousin of sealed-vote aggregation across panelists — and its deliberate use of sampling variance is the mirror image of Tribunal's determinism stance; contrast them explicitly. |
| 19 | Dynamic context assembly incl. **multi-agent context distribution** | L5 s54 | Template-based formatting, priority-based selection, and explicitly multi-agent: "agent selection, context distribution, integration flow control in MAS"; plus APE and Self-Refine (iterative self-critique/revision). | **high** | The one L1–L8 slide that names MAS context flow — Tribunal's feedback rounds are Self-Refine made auditable; cite s54 as his own bridge to multi-agent. |
| 20 | RAG-as-context + RAG evaluation preview | L5 s17–s42 (LLM-as-judge s38; RAGAs s39) | Vanilla → advanced (pre-retrieval/retrieval/post-retrieval) → modular RAG; s38 LLM-as-a-Judge scoring correctness/comprehensiveness/readability; s39 RAGAs metric family. | low/med | Only if panels later ground in external evidence; s38–39 shows he seeds judge-eval a full lecture before L8. |

**Gap flags (both EXHAUSTED at extracted-text level):** (a) determinism — temperature/top-p appear only in s50 and there as a deliberate variance *source*; no seeds, temperature-0, greedy-decode, or structured-output-mode content anywhere in L5 ("reproducibility" is named as a goal, s7/s12, but no mechanism) — Tribunal's decoder-side determinism fills a gap the course leaves open; (b) no JSON/schema mention anywhere in L5 (structured output exists only as "Output Indicator"/"Format"), and no prompt-injection/robustness content ("Context Injection", s13, is benign evidence integration).

### 3e. L1–L4, L6–L7 — course-arc frameworks (inventory level)

282 slides across the six decks (L1: 43, L2: 50, L3: 54, L4: 53, L6: 39, L7: 43); fixed template (Agenda → numbered LOs Lx.y → sections → Key Takeaways → sources); L2–L3 heavily image/animation-driven; L6–L7 fully scripted speaker notes. Inventory of meeting-relevant frameworks only:

- **L1 Introduction** — Course frame "Science, Engineering, and Applications of LLM" (S1); six course objectives incl. LO "Evaluate Reasoning, Alignment, and Model Behavior" with MMLU/GSM8K/failure modes (S9); 12-lecture architecture in three bands with TWO evaluation lectures (L8, L12) (S12); four-quadrant scope naming "Model Evaluation, Benchmarks, Agents" under Technical Insights (S20); **healthcare NLP taxonomy incl. Clinical Documentation & Decision Support, Clinical Decision Support, Adverse Drug Reaction Detection, Clinical Trial Eligibility Screening, de-identification** (S39) [high — the course's own clinical column; Tribunal's escalation packet slots under his Clinical Decision Support pillar]; GenAI policy = exact prompt + full response appendix (S16) [high — the ledger mechanizes his own provenance policy]; NLP evolution eras (S27–32); Schopf taxonomy (S34).
- **L2 Neurons2Narratives** — mechanism intuition (activations, embeddings, distributional hypothesis, RNN/LSTM gates, vanishing gradients); recurring "What X solves / What X can't" paired-takeaway pattern (S34, S46). No eval content. [low; borrow the paired-takeaway rhetorical form for the meeting kit.]
- **L3 Bottlenecks2Bridges** — Q-K-V attention framework via 5-team role-play (S9–16); Karim 7-step self-attention walkthrough (S25–33); full transformer anatomy (S40–49). No eval content; no sparse/linear-attention variants despite the syllabus row. [low]
- **L4 Inside Language Models** — foundation-model characteristics (S5); autoencoding vs autoregressive taxonomy (S8–10); BERT family incl. BioBERT (S24) [med, healthcare]; "Generation is a feedback loop" autoregressive loop (S30); context window as memory (S33); alignment lineage GPT→InstructGPT→ChatGPT with InstructGPT "less toxic, hallucinated less, was more truthful and preferred by humans" (S34–36) [med]; **human-preference-ranking class activity simulating reward modeling** (S37–38) [high — he makes students BE a human preference panel; Tribunal's sealed panel is this activity, formalized]; RLHF pipeline (S39); **decoding-strategy framework: "Greedy and beam are deterministic; top-k and top-p introduce randomness" (S43), temperature/top-p tuning (S44), coherence↔creativity 2×2 (S45), takeaway "Tuning Parameters Balance Determinism and Diversity" (S49)** [high — the course's canonical determinism anchor; Tribunal's decoder-side determinism + E2's controlled stochastic contrasts are the two poles of his S49 dial]; nanoGPT validation-loss auditing (S48) [med].
- **L6 Fine-Tuning 1** — three-stage build (S8); when-to-use-what adaptation quadrant (prompting vs RAG vs SFT, S10); instruction-tuning eval challenges: safety–performance trade-off, negation failures, adversarial vulnerability (S23) [med]; **RICE principles (Robustness, Interpretability, Controllability, Ethicality) as evaluation criteria for alignment methods (S26–27, S34)** [high — from the Ji et al. survey he assigns in this module; score Tribunal against RICE in one row]; **forward vs backward alignment — assurance via safety tests, interpretability tools, red-teaming; governance via audits (S27, S36)** [high — "backward alignment/assurance" is the Rao-native category for Tribunal's charters, authority/verifier registries, receipts]; RLHF/RLAIF/DPO/Constitutional-AI debate activity (S25, S28–32); scalable oversight via RLAIF/Debate/CIRL (S35) [med — Debate is a multi-agent eval pattern adjacent to the panel]. 
- **L7 Fine-Tuning 2** — PEFT taxonomy + comparison table (S6–14); distillation taxonomies (S19–23); DistilBERT/Alpaca/Vicuna cases (S24–25); SLM landscape incl. **healthcare SLMs BioMedLM, Hippocrates (S32), BioGPT (S36)** [med]; benchmark literacy (Phi-3 vs GPT-3.5 on MMLU; HumanEval/MBPP) (S33, S36); on-device privacy-preserving inference (S37) [med — clinical-privacy hook]; **SLM–LLM synergies: SLMs as lightweight evaluators that "calibrate LLM confidence and detect hallucinations" in safety-critical deployments (S38)** [high — the closest L1–L7 slide to a verifier architecture; Tribunal's verifier registry is S38 made concrete].
- **Cross-deck negatives (EXHAUSTED at extracted-text level):** no multi-agent/agentic workflow content anywhere in L1–L7 (only forward references to L11 and the L5 s54 MAS line; the agents lecture L9/L11 decks are not in the download); no scaling-laws slide; no sealed/structured decision-workflow content. Rao's multi-agent teaching lives in the OTHER corpus (`~/Desktop/Agentic AI/Lectures/L6-Designing-MA-Systems.pdf`, `L7-Evaluating-Benchmarking-Agents.pdf` — unaudited here).

### 3f. What Rao makes students build (assignments as frameworks)

Source: `page_snapshots/007_assignments.txt` + `008_assignments_syllabus.txt` + `handouts_labs_data/*.docx` (text-extracted; instructor-authored, no student content).

- **IA-1 "Prompt the Domain — Comparing LLMs for Real-World Tasks"** (due Sep 19, 100 pts): a comparative prompting study across LLMs — the course's own paired-contrast exercise. Relevance high: E2's paired prompt contrasts are IA-1's design pattern, hardened (preregistration, sealed arms).
- **IA-2 "Ground the Domain — From Naive RAG to Production Patterns"** (Oct 3, 100 pts): naive→production RAG progression.
- **IA-3 "Build a Personal Learning Portal"** (Oct 12, 100 pts): capstone domain-adapted LLM system "answering questions, citing sources, and integrating tools" (syllabus course description) — source-citing = provenance-adjacent.
- **Final exam** (20%): project-based, open-book, "free use of LLMs and coding assistants" (syllabus).
- **Class activities** (M2-A1/A2, NanoGPT): ungraded structured-exploration sheets — hypothesis→observe→record→discuss ladders (e.g., "record the minimum configuration that learns XOR"). No rubrics inside; IA rubrics exist per syllabus but are absent from the download (2a).

---

## 4. The course's rigor bar

### 4a. Rao's bar (95-820) — what he demands, itemized, vs Tribunal Clinical

From the syllabus GenAI policy + L8 S17–S18/S32–S37 + ARES slides. Verdicts on the build as described in the task brief only; unknowns flagged.

| Rao's demand (anchor) | Tribunal Clinical today |
|---|---|
| Freeze/version prompts, models, seeds; log provenance (L8 S17–S18) | **SATISFIES by design** — deterministic kernel, charters, ledger, execution receipts, provider adapters pin model config. |
| "Artifact pack": configs, hashes, changelog, auditable (L8 S18) | **SATISFIES** (ledger + receipts + sealed ballots); say "artifact pack" in the meeting. |
| Quantify uncertainty: mean ± 95% CI; within-CI = noise (L8 S18) | **PARTIAL/UNKNOWN** — kappa is computed as a process measure; whether E2 reports CIs on kappa and arm contrasts is not stated in the brief. If absent, add bootstrap CIs before the meeting. |
| Calibrate judges to humans; periodic human audits; human spot checks for high-stakes (L8 S17, S32, S37) | **GAP/OPEN** — this is exactly the human-AI timing decision (#4) the meeting must resolve; ARES's ~150-label + PPI pattern (S35–36) is the course-sanctioned minimum-evidence answer for decision #5. |
| Measure agreement rigorously — kappa/rho/alpha with CIs and slices (L8 S33, S37) | **PARTIAL** — generalized Fleiss kappa is in place; Rao teaches Krippendorff's alpha for multi-rater. Compute alpha alongside Fleiss (same ballots) to close the vocabulary gap. |
| Judge-bias controls: randomize order, anonymize, counterbalance, allow ties, ordering tests (L8 S34, S37) | **SATISFIES in architecture** (sealed anonymous ballots; paired counterfactual arms are literal A/B counterbalancing). Whether ties are representable in ballots: UNKNOWN — check charter/ballot schema. |
| Vanilla baseline + IV/DV + failure analysis + holdout (L8 S21/S25) | **SATISFIES for E2** (five-arm design has control arms; preregistered contrasts). Failure-analysis loop on dissent cases: UNKNOWN — make dissent review an explicit failure-analysis artifact. |
| Contamination-resistant, fresh test sets (L8 S6/S17–S19; syllabus L12 row) | **PARTIAL/UNKNOWN** — vignettes are project-authored (low leak risk) but no stated freshness/rotation policy. |
| Cite AI use with exact prompt + full response appendix (syllabus GenAI policy) | **SATISFIES trivially** — the kernel's ledger IS that appendix, mechanized. Meeting line: "the course's GenAI appendix requirement, as infrastructure." |
| Benchmarks are lenses, not truth; report slices, latency, cost (L8 S18–S19) | **PARTIAL** — process-measure framing matches; latency/cost reporting UNKNOWN. |

### 4b. Bottom-line fit

Tribunal Clinical is, in Rao's own taught terms, a **panel-judge evaluation system with an artifact pack** (S32+S18) probing an **authority-bias analog** (S34) in the **alignment pillar** (S13) — with two honest gaps to concede in the meeting: judge–human calibration not yet run (his S32 core), and agreement statistic chosen (Fleiss) differs from his taught multi-rater default (Krippendorff's alpha, S33).

### 4c. Demoted note — Collier (90-803), non-Rao

Collier's Applied-LLM project rubric (`LLM Project/solutions and rubric/applied_llm_project_rubric.md`, 30 pts, C1–C6) independently demands much of the same rigor: two LLM models compared on the same items, **Cohen's kappa** (C2, line 67) and **quadratic-weighted kappa for ordinal severity** (C3, line 98), confusion matrices, disagreement adjudication ("Did they do anything with disagreements besides list them?", line 85), structured JSON outputs (C2), anchored ordinal scales (C3), reproducible notebooks (C6). Tribunal Clinical would satisfy C2/C3-style demands (multi-model agreement + adjudication is its native mode) — but cite this only as "the 90-803 course I TA under Ben Collier grades LLM work on inter-model kappa and disagreement adjudication," never as Rao material.

---

## 5. Backers-folder findings

### 5a. Does anything target Rao? YES — two artifacts

1. **`/Users/pablo/Desktop/ML TA/backers/MEETING_BRIEF_panel.md`** — full Rao profile (lines 37–40): "Anand Rao — Distinguished Service Professor of Applied Data Science & AI; your *Agentic Technologies* professor; pioneer of BDI agent architecture; ex-PwC global AI lead. *Grades on evaluation, assurance, and augmentation over autonomy; trust earned over time rather than demos.*" Predicted Rao questions (line 38): system-level evaluation, held-out evals, failure rate, drift, unintended multi-agent behavior, augmentation-vs-replacement, human-in-the-loop, accountability, red-teaming against gaming/hallucinated proof. Win conditions (line 39): augmentation framing, system-level behavioral assurance beyond unit tests, "the mechanism is the trust," earned-trust ("air-safety") rollout. Red lines: "'It works, look at the demo' with no held-out evals/failure analysis → loses Rao + Usdan" (line 61); "Autonomy… → loses Rao instantly. Augmentation." (line 64). Logistics line 71 notes a **Rao catch-up already happened** ("Rao past").
2. **`backers/README.md`** (lines 35–41) — the BACKABLE panel app includes Rao with a profile "grounded in his real syllabus **L4–L7** (single agents → memory/tools → multi-agent → eval/benchmarking; source material confirmed readable at `~/Desktop/Agentic AI/Lectures/`…)". So the existing Rao-targeting work is grounded in his **Agentic Technologies** course, NOT 95-820 — this report adds the 95-820 layer.

Nothing in the backers folder maps Tribunal Clinical (all artifacts predate it / target NUDG-AEGIS-aval assets); the CAULKINS_METHOD_MAP pattern has not yet been executed for Rao. That is the artifact to build.

### 5b. The CAULKINS_METHOD_MAP pattern — replication recipe for a RAO_METHOD_MAP

From `backers/CAULKINS_METHOD_MAP.md` (+ `CAULKINS_INDEX_CARD.md`, `MEETING_BRIEF_caulkins.md`), the pattern is:

1. **The spine** — compress the professor's career into ONE canonical problem, then show your project is that problem "with one substitution" (Caulkins: budget allocation under uncertainty; substitution: verification replaces treatment dollars). *For Rao: candidate spine = "from BDI commitments to measurable agent trust: evaluate the system, not the demo"; Tribunal = his panel-judge + artifact-pack doctrine (L8 S32/S18) applied to clinical escalation, with sealed BDI-style commitments.*
2. **Honesty-tiered correspondences** — three explicit tiers: "Real isomorphisms — the math is literally the same. Lead here." / "Structural matches — same shape, sibling branch. Use if he leans in." / "Metaphor rather than isomorphism — say it as a metaphor or he'll catch the overclaim." Each entry: project-artifact ≡ professor-method, in his vocabulary, with verified numbers. *(Rao real-isomorphism candidates: sealed ballots ≡ S34 order-randomization/anonymization; five-arm harness ≡ S34 A/B counterbalancing + S25 IV/DV blueprint; ledger ≡ S18 artifact pack; kappa process measures ≡ S33 cheat sheet — with the Fleiss-vs-alpha caveat pre-tiered as honesty.)*
3. **Hard questions → crisp answers** — anticipated probes with 2–3-sentence prepared replies (the Caulkins file has six; the panel brief already drafts Rao's: system-level eval, drift, gaming, accountability, augmentation).
4. **The yes-able ask** — "support" concretized as judgment-first collaboration phrased inside his research language, funding offstage.
5. **The proof, verified cold** — one runnable command + exact expected output, dated (Caulkins: `run_all.py → V_det 11/11`). *Rao equivalent: replay a sealed E2 run from the ledger and show receipts verify deterministically.*
6. **Companion index card** — one-glance: the one sentence, a whiteboard-able worked example in HIS notation (Rao: a 2×2 of judge-bias mitigations vs Tribunal mechanisms, or a live kappa/alpha computation on one sealed round), a "never blank" trio, a 30-min arc.

---

## 6. Vocabulary map + Limits

### 6a. Vocabulary map — say it in Rao's words

| Tribunal Clinical term | Rao's term (anchor) |
|---|---|
| Sealed panel of agent specialists | "panel judges" (L8 S32, S37) |
| Sealed ballot, single-score with charter rubric | "Single-score (rubric)" judging mode (L8 S31) |
| Panel-count social cue (E2 manipulation) | authority/position bias of judges (L8 S34); "LLMs are not neutral judges" |
| Paired five-arm counterfactual harness | A/B counterbalancing + IV/DV/baseline/holdout blueprint (L8 S34, S21/S25) |
| Ledger + execution receipts + charters | "artifact pack… configs, hashes, changelog"; "log seeds and provenance" (L8 S18, S17) |
| Generalized Fleiss kappa process measure | "Measure agreement rigorously" — kappa/rho/**Krippendorff's alpha** with CIs + slices (L8 S33, S37) — prepare the Fleiss-vs-alpha answer |
| Dissent preservation | high model–model agreement can be shared bias, not validity (L8 S32) |
| Specialist escalation packet (human handoff) | "human spot checks for high-stakes decisions" (L8 S37); calibrate judges to humans (S17, S32) |
| Minimum silent-mode evidence package (decision #5) | ARES: ~150 human labels + PPI → CIs (L8 S35–36) |
| Evidence-responsiveness construct (decision #1) | capability vs alignment pillar placement (L8 S10–S13); "reliability—not accuracy" (S32) |
| Vignette bank quality | contamination-resistant suites (syllabus L12 row); IRT item discrimination (L8 S26–27) |
| Ballot prompt construction | prompt anatomy Instruction/Context/Input/Output Indicator + Persona (L5 s8–s9); CLEAR — "Concise, Logical, Explicit, Adaptive, Reflective" (L5 s48) |
| Paired stochastic prompt contrasts | "Lock in prompt patterns for controlled A/B comparisons and quality audits" (L5 s12) |
| Kernel's round-wise context assembly | context engineering — "dynamic, structured assembly," stateful, component-level evaluation (L5 s44–s46); MAS "context distribution, integration flow control" (L5 s54) |
| Panel aggregation across sealed votes | self-consistency majority vote over samples (L5 s50); human-preference ranking activity → reward modeling (L4 S37–38) |
| Deterministic kernel vs stochastic agents | "Greedy and beam are deterministic; top-k and top-p introduce randomness" (L4 S43); "Tuning Parameters Balance Determinism and Diversity" (L4 S49) |
| Charters, authority/verifier registries, receipts | backward alignment = **assurance** (safety tests, interpretability, red-teaming) + governance/audits (L6 S27/S36); RICE criteria (L6 S26–27) |
| Verifier registry / independent checker agents | "SLMs act as calibrators and hallucination detectors" in safety-critical deployments (L7 S38) |
| Clinical placement of the packet | Clinical Decision Support pillar of his healthcare-NLP taxonomy (L1 S39); Galileo eBook preface's doctors-treatment-decisions stake (p.3) |
| Ledger as AI-use disclosure | his own GenAI policy: exact prompt + full response appendix (syllabus; L1 S16) — "the ledger is this policy, mechanized" |

### 6b. Limits

**EXHAUSTED (searches listed):**
- 90-803 A instructor unnamed in corpus — grep sweep over all 22 snapshots in `45133…/page_snapshots/` (`rao|instructor|professor|Dr\.|PhD|taught|office hours|@cmu.edu`); announcements/wiki disabled; syllabus is an un-downloaded Drive link.
- No Rao co-instructorship of 90-803 in-corpus — same sweep + `52229…` sweep; only "Rao" hit is a Docs URL ID (`52229…/003_modules.txt:108`).
- 95-820 decks beyond L8 absent locally — `find …48275… -iname "*.pptx"` → exactly 9 files (L1–L8 + L8 dup); manifest `downloads` (41) fully enumerated; L9/L10/guest decks are listed in `003_modules.txt` but not crawled.
- IA-1/2/3 handouts & rubrics, quiz content absent locally — `find` for `*rubric*|*assignment*|*ia-*|*quiz*` + manifest keyword scan (0 hits) + snapshot URL audit (assignment detail pages never captured).
- No Fleiss kappa, RLHF, HELM, G-Eval, BIG-bench, honesty-as-term in L8 — full-deck XML text + notes keyword check by extraction agent.
- No announcements for 95-820 — 002 snapshot is a home-page fallback ("That page has been disabled").
- MLFP digests contain no kappa/inter-rater/preregistration/paired-contrast content — regex sweep across all 13 `notes.json` (digest level).
- Backers folder targets Rao via Agentic-Technologies material only — all 5 md files read in full; no 95-820-grounded artifact exists there.
- L5 contains no seeds/temperature-0/greedy-for-reproducibility, no JSON/schema, no prompt-injection/robustness content — keyword sweep over all 60 slides' extracted text + notes.
- L1–L7 contain no multi-agent/agentic-workflow teaching and no scaling-laws slide — per-deck text extraction of all 282 slides (forward references to L11 and L5 s54's one MAS line are the only mentions).

**HYPOTHESIZED (not fully checked):**
- The course rename ("Model Development …") — not present in any local catalog; take from the user, verify at the meeting.
- Whether L11–L14 content (incl. L12 "contamination-resistant evaluation suites" session) was ever posted to Canvas; whether the live Canvas now has more than the Jun-23 crawl captured.
- 90-803 A instructor identity (content style suggests Ghani-lineage public-policy ML; unverified).
- Raw MLFP source decks could contain agreement-statistics content the digests missed (digest groundedness is machine-verified V_det 100%, but coverage ≠ completeness).
- Rao's speaker-notes framing beyond the 8 slides with substantive notes in L8; image-only slides in any deck carry uncaptured diagrams (text-extraction method).
- What the live IA rubrics grade on (exist per syllabus; contents unknown).

### 6c. Provenance note on method

Deck claims come from XML text extraction of the pptx files (slide + notes streams; no rendering); digest claims (MLFP only) are labeled machine-generated with their own validity reports; reading claims verified against local PDF title pages via 1-page reads; syllabus/module claims from Canvas page snapshots. Subagent extraction reports were commissioned for L8, L5, L1–L7, assignments, and MLFP; their slide anchors are reproduced as reported and spot-checkable against the named files.
