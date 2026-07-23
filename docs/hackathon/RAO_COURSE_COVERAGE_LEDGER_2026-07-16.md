# Rao course-material coverage ledger

Date: 2026-07-16
Status: complete first-pass audit; verification pass pending (see §9)
Method: five parallel Fable 5 audit agents — four over Prof. Anand Rao's verified course corpora, one over this repo — followed by orchestrator synthesis. Full per-course inventories with slide-level anchors are preserved verbatim in [`_rao-course-audit/`](_rao-course-audit/): `A_agentic_course.md` (71 frameworks), `B_operationalizing_ai.md` (28), `C_genai_rai_governance.md` (35), `D_mlfp_mlta.md` (20 numbered entries plus course-arc and assignment inventories), `E_build_inventory.md` (build surface). Slide anchors below are abbreviated `A-F32` style (report letter + framework number) or `deck sNN`; every entry resolves to a file+slide anchor in those reports.

Purpose: record, decision by decision and mechanism by mechanism, whether Rao's taught frameworks are incorporated into Tribunal Clinical — and close or name every gap. This ledger is design-language mapping and meeting preparation. Per the no-overclaim ledger, speaking Rao's vocabulary does not validate the system; nothing here upgrades any claim's evidence status.

## 1. Attribution map (verified)

| Corpus | Course | Instructor | Verification |
| --- | --- | --- | --- |
| `canvas 53289` + `~/Desktop/Agentic AI/Lectures` (L4–L7 PDFs, page-identical) | **94-815 Agentic Technologies**, Spring 2026, A4 | **Rao** | syllabus snapshot names him; every deck byline; he self-cites PRS (Ingrand/Georgeff/Rao 1993) — he is the BDI Rao (A §1) |
| `canvas 41355` + `~/Downloads/FOAI Woody` (M1–M10 + canvases) | **94-879 Fundamentals of Operationalizing AI**, Fall 2024 | **Rao** | syllabus line; deck bylines; canvases stamped "Created by Prof. Anand Rao"; his 4 TDS articles are required reading (B §1) |
| `canvas 43912` | **94-885 Responsible AI — Principles, Policies and Practices**, Fall 2024 | **Rao** | syllabus instructor block; all 9 deck title slides (C §1) |
| `canvas 48275` | **95-820 Applications of NL(X) and LLM**, Fall 2025 (user reports a rename toward "Model Development…" — HYPOTHESIZED, no catalog evidence) | **Rao** (sole) | syllabus snapshot line 5 (D §1a) |
| `canvas 53201`, `canvas 42728` | 94-816 GenAI Applications/Implications/Governance (S26, F24) | **Usdan — NOT Rao** | user correction + both syllabus instructor tables (C §1) |
| `canvas 45133`, `canvas 52229`, `lectureforge-books/mlfp` | 90-803 ML Foundations with Python | **Collier — NOT Rao** (section A instructor unnamed in corpus, EXHAUSTED) | user correction + Collier syllabus PDF p.1 (D §1b) |
| `canvas 41224` GenAI-Learners modules | CMU institutional (UMD-adapted) | **Not attributable to Rao** (EXHAUSTED grep) | C §1 |
| `~/Desktop/Agentic AI/execution_gap_essay.pdf` | 90-822 Behavioral Economics (Loewenstein) | **NOT Rao** — user-authored essay | title page (A §2.6) |

Citation rule: anything from the last four rows is cited as "Usdan (94-816)", "Collier (90-803)", "CMU GenAI-Learners module", or "user coursework (90-822)" — never as Rao material.

Cross-course canon (taught in ≥2 Rao courses; safest meeting anchors): NIST AI RMF Govern/Map/Measure/Manage + 7 trustworthiness characteristics (functions: 94-885 L2 s13–21; characteristics: 94-885 L1 s20; both: 94-879 M9 s24); US AI Bill of Rights slide with "fallback and escalation system" / "combat automation bias" / "sensitive domains" (94-885 L1 s19 = L9 s14; 94-879 L9 s23); Value Scoping→Discovery→Delivery→Stewardship 9-step lifecycle (94-879 M2 s44–46; 94-885 pillar decks; 94-815 L4 s5); three-lines-of-defense governance (94-885 L9 s29; 94-879 L9 s27–29 + TDS); model cards/datasheets (94-879 as taught: M5 s38–39, M3 s62, datasheets M4 s16; 94-815 L7 s21 demands documentation deliverables — eval dataset, CLASSic report — but not model cards); the L8 "From Benchmarks to Alignment Measures" deck itself (95-820 L8; also present in the 94-815 folder), incl. the eval-hygiene checklist and κ/ρ/α cheat sheet.

## 2. Coverage by meeting decision (the six canonical decisions)

Status vocabulary: **INCORPORATED** (already in kit/kernel, anchor given) · **PARTIAL** (present, but not yet surfaced in Rao's instrument/vocabulary) · **ACTION** (gap; concrete close named). "Suggested insertion" lines are NOT yet applied — the target docs are mid-edit in another working session today; apply when the tree settles.

### Decision 1 — primary construct (formative vs reflective)

| Rao instrument | Build surface | Status |
| --- | --- | --- |
| Guo-survey three pillars Capability / Alignment / Safety as construct placement (95-820 L8 s10–16; D-3) | construct discussion, PROTOCOL §2.4 | **PARTIAL** — state that evidence-responsiveness is a truthfulness-style alignment measure and cue-resistance an alignment-robustness measure, in his pillar terms (D-3, A-F66/67) |
| "Reliability—not accuracy" judge framing (L8 s32) + Five Views performance/control risk classes (94-885 L1 s30) | agreement-as-process-measure rule (INTEGRATION line 8 "Agreement remains a process measurement" + no-overclaim ledger "Agreement is not correctness") | **INCORPORATED** — same claim discipline; now name the risk class the construct lives in (control risk: human agency) |
| Theory-of-Mind first/second order (94-815 L6 s9–10) | E2 social-cue arm | **PARTIAL** — one sentence in construct framing: E2 tests whether ToM-mediated social evidence overrides object-level evidence (A-F33) |
| Process-vs-outcome progress rate (94-815 L7 s8/s12 AgentBoard) | analyzer arm contrasts | **ACTION** — define a per-round evidence-uptake (progress) measure so "wrong final answer, correct evidence handling" is distinguishable; candidate secondary endpoint post-Rao |

### Decision 2 — failure unit

| Rao instrument | Build surface | Status |
| --- | --- | --- |
| FPR/FNR error-cost grammar with clinical exemplars; metric follows cost asymmetry (94-885 L3 s22–35; 94-879 M5 s17–21) | failure-event definitions (PROTOCOL §2; kit decision 2) | **PARTIAL** — restate the failure unit in confusion-matrix grammar: missed escalation = FN-dominant asymmetric cost, citing his own clinical examples |
| Augmentation ROI = Δ confusion-matrix cells with per-cell prices (94-879 M3 s34–45) | value hypothesis (none yet) | **ACTION** — add the ROI skeleton table (cells named, prices marked "clinician-elicited, blank") to the kit when tree settles; it is also the decision-2 math |
| "Unsafe behavior is a specification failure" + four evaluation facets (94-815 L4 s15) | escalation tuple + packet audit codes | **INCORPORATED** in substance (typed failure events, non-votes); cite the slide when defending the unit choice |
| CR-Bench precision/recall/signal-to-noise operating point; alert fatigue (94-815 L8 s14) | failure-unit trade-off discussion | **PARTIAL** — pitch decision 2 as choosing Tribunal's recall-vs-noise operating point (A-F59) |
| β-factor common-cause supplement — kit's own candidate (ONE_PAGE:61) | SANTIAGO §13.3 | **PARTIAL, clarified** — β-factor CCF is absent from C's 94-885 inventory, but no targeted search was documented, so the absence is **HYPOTHESIZED, not EXHAUSTED**; the CCF analogy remains the kit's own transfer from arXiv 2411.08981 and stays labeled "for Rao to correct or replace." His nearest taught concepts: degenerate feedback loops (94-879 L8 s12) and shared-bias judge panels (95-820 L8 s32) — use those as the taught-canon bridge |

### Decision 3 — apples-to-apples comparator

| Rao instrument | Build surface | Status |
| --- | --- | --- |
| "Human baseline" as the named RMF risk-measurement challenge (94-885 L2 s10) | comparator decision ask | **PARTIAL** — adopt the phrase verbatim; it is the RMF-sanctioned name for the thing decision 3 fixes |
| Vanilla-baseline doctrine: "always compare to a vanilla LLM baseline" (95-820 L8 s21/s25) — comparator matched on model, tools, and token budget per A-F69's incorporation guidance (matching conditions are the audit's gloss, not slide text) | E2 arms; architecture-comparison plan (SATURDAY §8) | **INCORPORATED** in design (control arms; matched prompts); **ACTION** — say "vanilla baseline, cost-matched" and confirm the single-agent comparator is resourced identically |
| Baseline measurement pitfalls: "lack of baseline human performance data […]; noise and bias in human judgement […]" (94-879 M3 s32) | paired five-arm design rationale | **PARTIAL** — cite his own pitfall slide as what the paired design answers |
| Champion/challenger (implied by his A/B-vs-shadow contrast, 94-879 L8 s46 — B's hedge kept) | comparator vocabulary | **PARTIAL** — comparator talk in his rollout-strategy terms |

### Decision 4 — human timing and interface

| Rao instrument | Build surface | Status |
| --- | --- | --- |
| "Who decides? Who acts?" split (94-815 L3 s11) | panel decides / clinician ratifies split | **INCORPORATED** structurally; **relabel** the decision-4 section in exactly these words (A-F8) |
| HITL / on-the-loop / out-of-the-loop + risk tiering at Stage Gate 1 (94-879 TDS Six Gates p4; M9 s21) | clinician-authority declaration | **PARTIAL** — declare "HITL, high tier, sensitive domain" explicitly |
| Automated / Augmented / Autonomous triad (94-885 L2 s10) | timing options | **PARTIAL** — offer the triad as the decision's vocabulary ("augmented, clinician-in-command") |
| Loomis: independent human rationale + limitation warnings (94-885 L3 s28–29) | clinician-authority + no-overclaim ledger | **PARTIAL** — cite as legal-precedent template; the packet parallels the presentence report, the no-overclaim ledger parallels the five-part warning |
| Hospital SOC answer key: gated hierarchical MAS wins; "the gate is the compensating control"; latency invisible to asynchronous reviewer (94-815 L7 s23–24) | ratification gate; deliberation latency | **PARTIAL — the single strongest quote-back in the corpus.** Use his own answer key when defending the gate and the latency budget |
| Bill of Rights "fallback and escalation system" / "combat automation bias" (94-885 L1 s19 = L9 s14; 94-879 L9 s23) | product category framing | **PARTIAL** — his slides' own words for what Tribunal builds; cover-line candidate |

### Decision 5 — governance threshold and minimum silent-mode evidence package

| Rao instrument | Build surface | Status |
| --- | --- | --- |
| **Shadow deployment** — his taught name for silent mode, with trade-off table (94-879 L8 s41–51) | "silent mode" everywhere in kit | **ACTION (rename/alias)** — title the decision-5 package "shadow (silent) deployment package"; cite s46/s51. Converts a research ask into an ops practice he teaches |
| Six Stage Gates; demo = pre-SG4 evidence for SG3c; SG4 dossier = the shadow package (94-879 L9 s28 + per-gate checklists) | Saturday demo positioning | **ACTION** — one status line in the kit: "we are at SG3c; this meeting scopes the SG4 dossier" |
| CLASSic profile (Cost/Latency/Accuracy/Security/Stability) as the unified evaluation profile; worked example incl. "zero hallucinated citations", σ<0.15 stability (94-815 L7 s11/s19) | evidence-package format | **ACTION** — present the decision-5 package as a filled CLASSic table; instrument cost/latency/stability capture in the harness (SATURDAY P-scope) |
| ARES: ~150 human labels + prediction-powered inference → CIs (95-820 L8 s35–36, Required reading) | clinician-label budget question | **ACTION** — propose the ARES/PPI pattern as the label-efficient minimum evidence answer; strongest single citation for affordable clinician anchoring |
| L7 project-deliverable table: 20–50 labeled traces, code evaluators every run, calibrated judges, weekly manual trace review (94-815 L7 s21) | evidence-package checklist | **ACTION** — copy the checklist into the decision-5 discussion; it is his own de-facto rubric |
| AIA + bias-audit artifact pair (94-885 L4 s17–22) | exposure-bound safety packet | **PARTIAL** — name the packet "AIA-style"; the E2 run is functionally the audit run |
| Stage-gate escalation to an ethics board scaled by impact (94-879 TDS Six Gates p5) | governance threshold | **PARTIAL** — his taught answer to "who approves": impact-scaled ethics-board review |

### Decision 6 — clinician evaluation target

| Rao instrument | Build surface | Status |
| --- | --- | --- |
| Four evaluation facets: task success / action quality / output quality / escalation behavior (94-815 L4 s15) | assessment-vs-action question | **PARTIAL** — his facet split supports "both, separately"; assessment ≈ output quality, action tuple ≈ escalation behavior |
| Agent-as-a-Judge + grader calibration; "evaluate the evaluator"; κ/α vs expert labels (94-815 L7 s15–16; 95-820 L8 s32–33) | clinician rating design | **PARTIAL** — the clinician is the calibration anchor for panel graders; cite when framing what their rating is *for* |

## 3. Mechanism ↔ Rao vocabulary (kernel and artifacts)

| Kernel/artifact | Rao's term (anchor) | Status |
| --- | --- | --- |
| Sealed ballots (`blind_commitment`) | **BDI intention commitment** — "Intentions commit the agent… limit reconsideration" (94-815 L6 s8); his own theory (Rao & Georgeff) | **PARTIAL** — highest-leverage framing available: "sealed commit / reveal-revise = BDI commitment with auditable reconsideration points." Say it in the opening |
| Panel + ratification | Voting-based cooperation: "creates a transparent and auditable decision process… reduces the risk of bias or single-point failure" (L6 s15); "use panel judges and human spot checks for high-stakes decisions" (95-820 L8 s37) | **PARTIAL** — identity claim: debate+voting hybrid; Agent-as-a-Judge panel for escalation decisions |
| Feedback rounds | Debate-based cooperation — "disagreement is not a failure mode here — it is a design feature" (L6 s14); Self-Refine made auditable (95-820 L5 s54) | **PARTIAL** — epigraph candidate |
| Dissent preservation | His own Spec Canvas escalation rule: "CONFLICT → present both interpretations" (94-815 L4 s16–18); shared-bias warning — high model–model agreement can signal shared bias, not validity (L8 s32) | **PARTIAL** — his canvas already mandates it; cite both |
| Ledger + execution receipts | "make it auditable (configs, hashes, changelog, artifact pack)"; "log seeds and provenance" (95-820 L8 s17–18); traces with spans, weekly manual review (94-815 L7 s17); ModelOps reproducibility: "trace an inference back to the version of model and data" + audit trail (94-879 ModelOps p30/p39); cryptographic-hash integrity + audit trail as a *safety* control (94-885 L8 s24); execution-based final-state evaluation (94-815 L9 s5) | **INCORPORATED** — the mechanisms exist; **surface the five vocabulary equivalences** (this is the densest match in the audit) |
| Authority + verifier registries | Model governors (ModelOps p28); three lines of defense (94-885 L9 s29, 94-879 TDS); SG4 "who is responsible for risk monitoring"; OWASP LLM08 Excessive Agency bound (94-885 L8 s22); SLMs as hallucination-detecting evaluators (95-820 L7 s38); standards/certification/accreditation triad = "who verifies the verifier" (94-885 L9 s19) | **PARTIAL** — describe registries as lines-of-defense role separation |
| Clinician authority (DECISION_SUPPORT_ONLY) | OWASP LLM09 Overreliance metric (94-885 L8 s22); Bill of Rights automation-bias clause; Loomis independent rationale | **INCORPORATED** in design; add the *measurement* answer (an overreliance metric) to the roadmap |
| Per-recipient ballot-order rotation (`feedback.ts orderFor`, scorecard A4) | Judge position-bias mitigation: "randomize order, anonymize sources" (95-820 L8 s34) | **INCORPORATED — name it.** The kernel already implements his taught mitigation; say "A4 is L8 s34, mechanized" |
| Deterministic kernel wrapping stochastic panelists | Programmed vs emergent behavior (94-815 L2 s5–8); "Greedy and beam are deterministic; top-k and top-p introduce randomness" (95-820 L4 s43/s49); orchestration as the architectural core (94-815 L4 s34) | **PARTIAL** — "programmed shell, emergent deliberation, audited boundary" |
| E2 five-arm harness | A/B counterbalancing + IV/DV/baseline/holdout blueprint (L8 s34, s21/s25); locked prompt patterns for controlled A/B (95-820 L5 s12); context-failure taxonomy — the cue as poisoning/distraction probe (94-815 L8 s15); differential-understanding instrument (94-815 L2 s13–14) | **INCORPORATED** in design; **ACTION** — adopt the five eval-hygiene headers (lock the setup / quantify uncertainty / prevent+disclose leakage / report beyond one score / make it auditable — L8 s18) as PROTOCOL section names when the tree settles |
| Agreement statistics | κ/ρ/**Krippendorff's α** cheat sheet with bands + CIs (95-820 L8 s33/s37); Fleiss never named in 95-820 L8, his evaluation-statistics deck (EXHAUSTED, D §6b); other Rao decks not keyword-swept for Fleiss (HYPOTHESIZED) | **INCORPORATED (verified on current tree 2026-07-16)** — the analyzer already emits his taught default: nominal Krippendorff α with a case-cluster bootstrap 95% CI, plus Gwet AC1 (`packages/clinical-eval/src/analysis.ts:297-309`; PROTOCOL §7.1). Generalized Fleiss and Cohen/weighted kappa exist as tested oracles (`metrics.ts`) not yet integrated as outputs. Meeting answer: "we report your taught α with cluster-bootstrap CIs; Fleiss is available as a sensitivity" |
| Pass^k decision stability | "Pass@k rewards stochastic luck"; Pass^8 ≥ 80% for mission-critical (94-815 L7 s13) | **ACTION** — report Pass^k-style consistency of escalation decisions across replicates per arm (post-Rao analyzer addition; candidate secondary endpoint) |
| Charters / prompts | Prompt anatomy + Persona; CLEAR principles (95-820 L5 s8–9, s48); Operating Rules HARD/SOFT rows (94-815 L4 canvas) | **PARTIAL** — one CLEAR-conformance pass over ballot prompts is a cheap credibility line |
| Exposure-bound safety packet | Harms grid whom/what/when/how-much (94-885 L1 s23–28); STOA healthcare seven-risk list (L1 s29); risk-surface narrowing + four screening questions (CMU module, non-Rao — label it); DPIA-style data-exposure note (94-885 L7 s28–29); NISTIR 8312 "Knowledge Limits" (L6 s27) | **ACTION** — add a seven-row STOA conformance table and a harms-grid to the packet docs; cite Knowledge Limits as the principle the no-overclaim ledger operationalizes |
| "Why not one agent?" | Least-complex-archetype rule + five criteria (94-815 L3 s39–45); "scaffolding substitutes for coordination" (L8 s9/s12); NoAct corner — "safety ≠ inaction" (L7 s9) | **ACTION** — prepare the criterion-based answer: verification burden + human oversight + (E2-tested) failure decorrelation; concede the E2 null branch honestly |

## 4. Gap-closure actions (ranked)

Done in this pass:
1. This ledger + the five full inventories under `_rao-course-audit/` (the material itself, incorporated durably).
2. `TRIBUNAL_SYSTEM_CARD.md` (draft v0) — closes the "model cards at SG2/SG3c" gap he teaches in 94-879 (M5 s38–39, M3 s62; datasheets M4 s16).
3. Verified on the current tree that the analyzer already emits Krippendorff α (nominal + case-cluster bootstrap 95% CI) and Gwet AC1 (`analysis.ts:297-309`) — his taught multi-rater default is the emitted statistic; generalized Fleiss remains an oracle-only sensitivity.

Pre-meeting (small, high value; apply to kit docs when the concurrent editing session settles):
4. One-pager supplement lines per decision from §2 (esp. hospital-SOC quote-back, shadow-deployment rename, CLASSic evidence-package format, ARES/PPI label budget, BDI framing).
5. Fill Rao's own canvases for Tribunal Clinical as a worksheet appendix: Agent System Spec Canvas + Architecture Canvas (94-815 L4 s16–18/s36–37, incl. the PRIORITY rows "Accuracy over speed" / "Traceability over brevity" and the ACCEPT row "higher latency justified by reflection and verification passes"), MA Spec+Arch Canvas (L6 s19/s22), AI Use Case & Ethics / Deployment / Monitoring canvases (94-879 canvas template). His worked exemplar already contains the human-authority mitigation sentence.
6. "Why not single-agent" subsection keyed to his five criteria (addendum prep; expect the question in his first five minutes).
7. Prepared answers: α-vs-Fleiss (α is emitted; Fleiss oracle-only sensitivity); "who grades the graders" (grader calibration plan, κ vs clinician spot-checks); "which CLASSic dimension did you sacrifice, and what compensates" (latency; the gate).

Post-meeting / analyzer roadmap (do not preregister silently — route through the decision addendum):
8. Per-round progress-rate measure; Pass^k stability; CIs framed as "within-CI = noise"; cluster intervals for raw agreement/unanimity/AC1 plus kappa/Jaccard output integration (the PROTOCOL §7.1 delta).
9. STOA seven-risk conformance table + harms grid + DPIA-style data-exposure note in the safety-packet docs.
10. CLASSic instrumentation (cost/latency/stability) in the harness before any shadow-package conversation.

## 5. Consolidated predicted-question bank (deduplicated across A/B/C/D; each traced)

1. Where does Tribunal sit on the autonomy spectrum, and who decides vs who acts? (94-815 L3 s9–11)
2. Why five sealed agents instead of one agent with reflection — which of my five criteria forces multi-agent? (L3 s39–45; L8 s9/s12)
3. Walk me through Govern–Map–Measure–Manage for this system. (94-885 L2; every pillar deck)
4. What is your human baseline, and is the comparison apples-to-apples — same information, tools, budget? (94-885 L2 s10; 95-820 L8 s21/s25; 94-879 M3 s32)
5. HITL, on-the-loop, or out-of-the-loop — and what risk tier? Under the EU AI Act this is high-risk; what obligations follow? (94-879 TDS p4; 94-885 L9 s10–11)
6. What is your failure unit; which error rate do you privilege, FN or FP, and at what cost asymmetry? (94-885 L3 s22–35; 94-879 M5 s17–21)
7. How do you know the agents respond to evidence and not to each other — multi-agent feedback is an attack pattern too? (94-885 L8 s26–29; 94-879 L8 s12; 94-815 L6 s7)
8. When the panel splits 3–2, what exactly does the clinician see, and how do you prevent the majority from erasing the minority's evidence? (94-815 L6 s14–15)
9. What are the packet's cost per case, latency, stability σ across runs, and failure-severity distribution — not just accuracy? (94-815 L7 s11/s19)
10. How many seeds/trials per arm; is the arm difference outside the CI; is the sealed-vs-unsealed gap a noisy tie? (95-820 L8 s18)
11. Who grades E2 outcomes, how were graders calibrated against clinicians, and what is the inter-rater κ/α? (94-815 L7 s16; 95-820 L8 s32–33)
12. Can I re-run a packet from its ledger alone? Show me one failure you found by reading traces and what you changed. (94-815 L7 s17; 95-820 L8 s18)
13. Which of the nine steps and six gates are you at, and what evidence gets you through the next gate? (94-879 L9 s28)
14. What is monitored post-deployment — which drift classes, which fairness metrics, what triggers recalibration or retirement? (94-879 L8 s18–29, s53)
15. What stops the clinician from rubber-stamping the packet — what is your overreliance metric? (94-885 L8 s22 LLM09; L1 s19)
16. Where is the impact assessment, and who signed it? What does the ethics-board escalation look like? (94-885 L4 s17–18; 94-879 TDS p5)
17. What are the knowledge limits — where does the system say "out of scope"? (NISTIR 8312 via 94-885 L6 s27)
18. What patient data enters prompts, what do providers retain, where is the DPIA-equivalent? (94-885 L7 s28–29)
19. You built this fast — show me the safety-first controls; argue you're not the arms-race case study. (94-885 L2 s3–8; L1 s39)
20. At deployment scale, what feedback loop does Tribunal create in the hospital — alert fatigue, automation bias — and how would you model it? (94-815 L2; 94-879 L8 s12)

Rao-lens meta-rule (A §4.11): he rewards one plainly-stated negative result. The CO2 coursework precedent (calibration≠triage reported as a loss) and the E2 null branch are the honesty tokens to spend.

## 6. Rao-native framing kit (method-map essence)

Spine (one sentence): *From BDI commitments to measurable agent trust — Tribunal applies your panel-judge + artifact-pack doctrine to clinical escalation, with sealed, BDI-style commitments built on the commitment semantics you formalized.*

Tiered correspondences (honesty tiers per the Caulkins method-map pattern, D §5b):
- **Real isomorphisms (lead here):** sealed ballots ≡ intention commitment limiting reconsideration (L6 s8) and ≡ his judge-bias mitigations "randomize order, anonymize sources" (L8 s34 — implemented as scorecard A3/A4); ledger+receipts ≡ his "make it auditable (configs, hashes, changelog, artifact pack)" bundle (95-820 L8 s18) and ≡ ModelOps inference-traceability (p30); five-arm E2 ≡ A/B counterbalancing + IV/DV/baseline blueprint (L8 s34, s21/s25); ratification gate ≡ "the gate is the compensating control" (L7 s23–24).
- **Structural matches (if he leans in):** panel = Agent-as-a-Judge consensus "mirroring academic peer review" (L7 s16); silent mode = shadow deployment (94-879 L8 s41–51); registries = three lines of defense (two courses); packet = AIA-style artifact (94-885 L4 s18).
- **Metaphor — say so or he catches the overclaim:** β-factor CCF (kit's own transfer, not his canon); Delphi-inspired (never classical Delphi); "24 seats of institutional memory" style lines stay out.

Proof, verified cold: replay the scripted falsification-gate run (`runs/clinical-eval/mechanism-simulator-v0.1-seed18`) from its artifacts — labeled analyzer-behavior evidence only; no E2 run exists on disk yet, so this IS the demo, not the backup. If a `PRE_EVENT_RESEARCH`-labeled E2 pilot lands before Friday, replay that sealed run instead. Verify the command works the morning of the meeting.

## 7. What was checked and NOT re-added (already incorporated pre-audit)

Rao's two research instruments were already load-bearing in the kit before this audit (E §3): the AI Use Case Worksheet (arXiv 2605.07986) fully operationalized in the evaluation-scenario worksheet including the scenario-expansion ask, and the reliability/trustworthy-AI framing (arXiv 2411.08981) behind the decision-2 β-factor candidate. This audit adds the *course* layer; it does not duplicate those rows.

## 8. Corrections this audit forces

1. 94-816 content (incl. its hospital-triage governance breakout) is **Usdan's** — context only, labeled.
2. 90-803 rigor norms and the applied-LLM rubric are **Collier's** — the "our own course's bar" argument must cite Collier, or be dropped from Rao framing.
3. `execution_gap_essay.pdf` is **Loewenstein 90-822** coursework — conceptually adjacent to commitment devices but never citable as Rao-course lineage.
4. Decide-verify-cite-rectify + risk-surface screening are **CMU-institutional modules** (UMD-adapted), not Rao's authorship — usable as shared campus vocabulary with that label.
5. The course rename ("Model Development…") is user-reported and catalog-unverified — say "your NL(X)/LLM course" in the meeting, not the new name.

## 9. Audit limits

**EXHAUSTED (searches documented in the per-report Limits sections):** 94-815 L10 (Safety/Governance) and L11 (AgentOps) decks absent from corpus; 95-820 decks beyond L8 (L9/L10/guest) listed on modules page but not crawled; 94-885 robustness/reliability session deck absent (carried by textbook ch. 3); assignment rubric bodies absent in all four courses (titles/weights only); Fleiss' kappa absent from 95-820 L8, the evaluation-statistics deck (other Rao decks not keyword-swept for Fleiss — HYPOTHESIZED); course-numbered references absent from this repo pre-audit.

**HYPOTHESIZED:** whether L10/L11/L12+ decks were ever posted; live-Canvas state after the June/July crawls; image-only slide content (RMF wheels, EU-pyramid, canvas screenshots) reconstructed from titles+notes+cited sources only; the 95-820 rename.

**Verification pass (2026-07-16): completed — PASS-WITH-FIXES, corrections applied same day.** An adversarial Fable pass checked the attribution table, 30+ sampled anchors, repo claims at path:line on the live tree, status labels, claim discipline, and the non-Rao quarantine. Findings: 3 blockers (a false all-runs-11/12 fact, one spliced slide quote, and a stale Fleiss/α status that the concurrently-edited tree had inverted — the analyzer already emits α with cluster bootstrap), 5 majors (anchor/label fixes, two unearned EXHAUSTED labels), 15 minors (quote fidelity, scoping). All corrected in this document and the system card. Full report: [`_rao-course-audit/V_verification.md`](_rao-course-audit/V_verification.md).

## 10. No-overclaim compliance

This ledger changes *language and preparation*, not evidence. Speaking in Rao's frameworks does not make the construct validated, the panel clinically safe, or the E2 result general; the falsification gate remains analyzer-behavior evidence only; every never-claim in SANTIAGO §19.6 and the INTEGRATION no-overclaim ledger stands unchanged. Course-material citations are teaching-material provenance ("as taught in 94-8xx Lx sNN"), not peer-reviewed literature; where a slide cites an external source (NIST, OWASP, STOA, ARES), cite the source and may add "as taught in his course."
