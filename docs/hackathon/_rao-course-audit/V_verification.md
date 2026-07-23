# V. Adversarial verification — RAO_COURSE_COVERAGE_LEDGER_2026-07-16.md + TRIBUNAL_SYSTEM_CARD.md

Verifier: Fable 5 adversarial pass, 2026-07-16. Sources of truth: the five reports in `docs/hackathon/_rao-course-audit/` (A/B/C/D/E) and the repo **as on disk at verification time** (tree mid-edit by another session; mid-edit-caused mismatches are marked). Course PPTX/PDF corpora were NOT re-read, per brief. All ledger/card line numbers refer to the files as read this pass.

Abbreviations: LEDGER = `docs/hackathon/RAO_COURSE_COVERAGE_LEDGER_2026-07-16.md`; CARD = `docs/hackathon/TRIBUNAL_SYSTEM_CARD.md`; A/B/C/D/E = the five audit reports.

---

## Discrepancies

### BLOCKERS (wrong fact / overclaim / misattribution)

**1. BLOCKER — CARD:47 falsely states all live CLI runs score 11/12.**
- Card line 47: "live CLI runs deliberately kept at 11/12 (A11 miss documented in honesty.md)".
- Disk: `runs/ANCHORS.md:17` — `run_c49cb4b4453e | lending-adverse-action | cli | openai+xai | 126 | ✓ | 12/12`. `docs/honesty.md:80` says "**Three** committed live cli runs score 11/12" (the three openai+xai+anthropic runs). E §1.4 had it right: "3 live CLI runs at 11/12 …, 1 live 12/12 two-vendor lending run, 9 offline 12/12."
- Fix: "three live three-vendor CLI runs deliberately kept at 11/12 (A11 miss documented in honesty.md); one live two-vendor CLI run and nine offline runs at 12/12."

**2. BLOCKER — LEDGER:54 splices auditor gloss into a quoted Rao slide line (misattributed quote).**
- Ledger line 54 (decision 3): `"always compare to a vanilla LLM baseline… same model/tools/token budget" (95-820 L8 s21/s25; A-F69)`.
- Source: A F69's reported slide text is "always compare to a vanilla LLM baseline. Without this, it's unclear whether the system adds value or introduces avoidable complexity." The "same model, tools, and token budget" wording is A's own incorporation/relevance clause ("the comparator must be a single unstructured agent with the same model, tools, and token budget") — not reported slide text. Same in A §5 vocab map (project-term column) and D item 5.
- Fix: quote only "always compare to a vanilla LLM baseline" (L8 s21/s25); state the matching condition outside quotes, e.g. "— comparator matched on model, tools, and token budget (A-F69 incorporation guidance)". This line is meeting-facing; a spliced quote here is exactly what Rao would catch.

**3. BLOCKER — Fleiss/α status is inverted against the current disk (stale vs mid-edit tree); affects CARD:57, LEDGER:102, LEDGER:113.**
- Card line 57: "Krippendorff α implemented but not yet reported alongside generalized Fleiss in E2 outputs". Ledger line 102: "ACTION (closed in code, open in reporting) — … report α alongside generalized Fleiss from the same ballots, and carry the prepared answer for 'why generalized Fleiss?'". Ledger line 113: "reporting change only, no new statistics code."
- Disk RIGHT NOW: `packages/clinical-eval/src/analysis.ts:297-309` — the analyzer output already includes `krippendorffAlphaNominal`, `krippendorffAlphaCaseClusterBootstrap95`, and `gwetAc1`; `analysis.ts:5-10` imports `gwetAc1, krippendorffAlpha, unanimityDistribution` and does **not** import a Fleiss function. `RESEARCH_METHODS_PROTOCOL_2026-07-16.md:245` (mid-edit): "the analyzer presently emits action-level raw agreement, unanimity, nominal Krippendorff alpha with a case-cluster bootstrap, and Gwet AC1."
- So on the current tree, Rao's taught statistic (α) is already the emitted E2 statistic with cluster-bootstrap CIs, and generalized Fleiss is a tested metric oracle (`metrics.ts`) that is NOT an integrated analyzer output. Both docs (and D §4a, which explicitly graded "the build as described in the task brief only") describe the pre-edit snapshot and would have the user tell Rao the exact opposite of what the code does.
- Fix: card item 6 → "Krippendorff α (nominal + case-cluster bootstrap 95%) and Gwet AC1 are already emitted by the analyzer (analysis.ts); Cohen/weighted kappa, Jaccard, and generalized Fleiss exist as tested oracles (metrics.ts) not yet integrated as outputs (PROTOCOL §7.1)". Ledger row → replace "closed in code, open in reporting" with "already reported (α with bootstrap CI); the prepared answer flips: 'we report your taught α; Fleiss is available as a sensitivity.'" Re-sync both docs when the tree settles.

### MAJORS (wrong anchor / wrong status label)

**4. MAJOR — LEDGER:24 and LEDGER:112 claim Rao teaches model cards in 94-815 via L7 s21; report A does not support it.**
- Ledger line 24: "model cards/datasheets (94-879 M5 s38–39, M3 s62; **94-815 via L7 project table**)". Line 112: "the 'model cards at SG2/SG3c' gap he teaches in **two courses** (94-879 M5 s38–39, M3 s62; **94-815 L7 s21**)".
- Source: A §2.2 and F54 record L7 s21's project table as: eval dataset 20–50 labeled traces, code evaluators, calibrated LLM judges, CLASSic Report, weekly manual trace review — **no model-card item**. A's only model-card mentions are the other-course decks (§2.4) and the user's own CO2 `MODEL_CARD.md` (§2.6, user artifact, not taught content). Model cards as taught = 94-879 only (B F12: M5 s38–39, M3 s62; datasheets M4 s16). The CARD's own header (line 3) cites this correctly — 94-879 + Mitchell et al. only.
- Fix: drop the 94-815 anchor and "two courses"; cite 94-879 M5 s38–39 / M3 s62 (SG2+SG3c). If a second-course echo is wanted, the defensible one is "documentation-as-deliverable" (A F52/F68), not model cards.

**5. MAJOR — LEDGER:47 "(EXHAUSTED in C)" asserts a documented absence search that report C never ran.**
- Ledger line 47 (decision 2, β-factor row): "his RAI risk canon (NIST AI 100-2, OWASP) does NOT teach β-factor CCF (**EXHAUSTED in C**)".
- Source: C's Limits (§6) enumerate its EXHAUSTED items (missing taxonomy page, no "rao" in 41224, robustness deck, COMPL-AI grep, Class 6 deck, image-only slides, notes contamination). There is **no** documented search for β-factor/common-cause-failure anywhere in C; C never mentions CCF at all. Under the kit's own O8 rule (E §5.2: EXHAUSTED requires multiple documented failed attempts), this label is unearned.
- Fix: relabel "absent from C's inventory; no targeted search documented (HYPOTHESIZED absence)" — or actually run and record the keyword sweep over C's extraction artifacts before keeping EXHAUSTED.

**6. MAJOR — LEDGER:102 and LEDGER:176 overgeneralize the Fleiss-absence EXHAUSTED label to all Rao decks.**
- Ledger line 102: "**Fleiss never named in his decks (EXHAUSTED)**"; line 176 (§9): "Fleiss' kappa absent from his taught statistics".
- Source: D's documented check covers **95-820 L8 only** ("No Fleiss kappa … in L8 — full-deck XML text + notes keyword check", D §6b) plus MLFP digests (Collier, non-Rao). No report documents a Fleiss sweep of the 94-815, 94-879, or 94-885 decks (A F44/F71 discuss κ/ρ/α in 94-815 L7/L8-ALIGN without asserting Fleiss absence).
- Fix: "Fleiss never named in 95-820 L8, his evaluation-statistics deck (EXHAUSTED, D §6b); other course decks not keyword-swept for Fleiss (HYPOTHESIZED)."

**7. MAJOR — LEDGER:35 wrong internal anchor: the agreement-as-process rule is not INTEGRATION correction 5.**
- Ledger line 35 (decision 1, row 2, build-surface cell): "agreement-as-process-measure rule (INTEGRATION correction 5)".
- Source (disk): `RAO_AND_ATTACHMENT_INTEGRATION_2026-07-16.md:50` — correction 5 is the E2 locality correction ("does not establish general immunity to social conformity…"). The agreement rule lives at line 8 ("Agreement remains a process measurement, never the primary validity construct") and the no-overclaim ledger, line 103 ("Agreement is not correctness").
- Fix: cite "INTEGRATION Decision §, and no-overclaim ledger ('Agreement is not correctness')".

**8. MAJOR — LEDGER:160 proposes as proof a replay of "one sealed E2 run"; no E2 run exists on disk, and none can exist before the meeting.**
- Ledger line 160: "Proof, verified cold (candidate): replay one sealed E2 run from its ledger + receipts, deterministically, in front of him; the falsification-gate run … is the backup demo."
- Disk: `runs/clinical-eval/` contains only `mechanism-simulator-v0.1-seed18` (scripted, 240 assignments) and `private/precommit-falsification-20260716T0345`. CARD:39-40 itself says E2 is "(designed, preregistered draft)" and "Not yet run: E3 … any clinician-labeled evaluation". Real E2 LLM runs are planned for Saturday 07-18 — after the 07-17 meeting. The "candidate" hedge does not cure it: the primary proof as written is unexecutable, only the backup exists.
- Fix: "Proof, verified cold: replay the scripted falsification-gate run (`runs/clinical-eval/mechanism-simulator-v0.1-seed18`) — labeled analyzer-behavior evidence only; if a PRE_EVENT_RESEARCH E2 pilot lands before Friday, replay that sealed run instead."

### MINORS (imprecision / wording)

**9. MINOR — LEDGER:93 quote drift (L6 s15).** Ledger: "transparent and auditable decision process… reduces bias and single-point failure". A F37: "creates a transparent and auditable decision process... **reduces the risk of** bias **or** single-point failure". Fix: restore "the risk of … or", or paraphrase outside quotes.

**10. MINOR — LEDGER:94 quote drops a word (L6 s14).** Ledger: "disagreement is not a failure mode — it is a design feature". A F36: "disagreement is not a failure mode **here** — it is a design feature". Fix: add "here" or an ellipsis. (This is an explicitly-named epigraph candidate; make it exact.)

**11. MINOR — LEDGER:100 quote drift (95-820 L4 S43).** Ledger: "Greedy and beam are deterministic; top-k/top-p introduce randomness". D §3e: "top-k **and** top-p". Fix: "and".

**12. MINOR — constructed "artifact pack" quote (LEDGER:96, LEDGER:156; CARD:48).** Both docs quote "Artifact pack (configs, hashes, changelog)" / "artifact pack… configs, hashes, changelog". Neither report records that exact string: D item 4 has "make it auditable (configs, hashes, changelog, artifact pack)"; A F68 has "save configs, hashes, model/dataset IDs; changelog; … bundle an artifact pack for exact reproduction". Fix: quote D's actual string or drop the quote marks.

**13. MINOR — LEDGER:55 pitfall quote truncated without ellipses (M3 s32).** Ledger: "lack of baseline human performance data; noise and bias in human judgement". B F8's recorded lines continue "…to estimate incremental improvement by AI" and "…making comparison with algorithms challenging". Fix: add ellipses or complete the lines.

**14. MINOR — LEDGER:14 corpus row undercounts FOAI Woody ("M1–M9 + canvases").** B §2.1 lists `B/A:M10/M10-Talent-Process-Management.pptx` — FOAI Woody holds M10 too. Fix: "M1–M10 + canvases".

**15. MINOR — LEDGER:24 anchors the 7 trustworthiness characteristics at "94-885 L2 s13–21".** C 3.1 anchors the seven characteristics at **L1 s20**; L2 s13–21 carry the four functions. (The 94-879 M9 s24 anchor does cover both, per B F22.) Fix: "94-885 L2 s13–21 (functions) + L1 s20 (characteristics); 94-879 M9 s24".

**16. MINOR — LEDGER:5 "D_mlfp_mlta.md (46)" count not derivable from D.** A=71, B=28, C=35 verified by numbering (grep counts 71/28/35). D numbers only items 1–20; its L1–L7/assignment inventories are unnumbered. Fix: state D's count method or drop the number.

**17. MINOR — LEDGER:117 mislabels canvas rows.** "incl. ACCEPT 'traceability over brevity / accuracy over speed' rows" — per A F23 those are **PRIORITY 1/2** rows; the ACCEPT row is "higher latency justified by reflection and verification passes". Fix: rename to "PRIORITY/ACCEPT trade-off rows" with the right pairing.

**18. MINOR — CARD:32 unsourced absence claim: "No real patient data anywhere in the repo."** No repo doc states this and no documented sweep is cited (grep for "real patient" hits only a HealthBench note, PROTOCOL:141). Almost certainly true (fixtures carry `AUTHOR_DEFINED_MECHANISM_FIXTURE_NOT_CLINICIAN_VALIDATED`, types.ts:90; packs are constructed), but under the kit's own O8 rule an absence claim in a system card needs a basis. Fix: "All clinical fixtures are author-defined synthetic (types.ts:90); demo packs are constructed cases; no clinical dataset is present (author attestation; Tier-A real-data access is a plan, PROTOCOL §5)."

**19. MINOR — CARD:20 never-claims compressed vs disk under a "(verbatim discipline)" header.** SANTIAGO §19.6 on disk (line 1985-1995): "reduced mortality **or morbidity**", "HIPAA compliance **as a complete product**", "regulatory **approval**/readiness". Card: "mortality reduction; … HIPAA compliance; regulatory readiness" (matches E's record, which had the same compression). Fix: add "or morbidity" and restore the two qualifiers, or drop "verbatim" from the header.

**20. MINOR — CARD:64 "no persistent agent memory; per-case session state" has no doc anchor and needs scoping.** Grep of SANTIAGO/README finds no such phrase; the claim originates in A F26's build description. Within-run deliberation memory exists and is scored (A9 "Deliberation memory persisted across spans", honesty.md:71). Fix: "no cross-run/cross-case agent memory; within-run deliberation memory is ledgered (scorecard A9)".

**21. MINOR — LEDGER:47 bare anchor "(L8 s32)" resolves to the wrong course in context.** In "degenerate feedback loops (94-879 L8 s12) and shared-bias judge panels (L8 s32)", the second anchor reads as 94-879 L8 s32 (a Value Stewardship slide); shared-bias judges are 95-820 L8 S32 (D item 8). Fix: "(95-820 L8 s32)".

**22. MINOR — LEDGER:153 spine wording can misattribute the mechanism.** "with sealed commitments you formalized" — D §5b's spine says "sealed **BDI-style** commitments"; Rao formalized intention-commitment semantics (A F32), not Tribunal's sealing. Fix: "with sealed, BDI-style commitments built on the commitment semantics you formalized".

**23. MINOR — LEDGER:56 drops B's hedge on champion/challenger.** B's vocab map: champion/challenger "**implied by** A/B–shadow contrast (L8 s46)". Ledger states it as taught content. Fix: "champion/challenger (implied by his A/B-vs-shadow contrast, L8 s46)".

---

## Checks that passed (evidence)

1. **Attribution table (check 1): PASS except items 14 above.** All eight rows match A §1 (53289 / Spring 2026 / A4 / PRS-BDI self-cites Ingrand-Georgeff-Rao 1993 / page-identical L4–L7 PDFs), B §1 (41355 / Fall 2024 / canvases stamped "Created by Prof. Anand Rao" / 4 required TDS articles), C §1 (43912 Rao Fall 2024, 9 decks; 53201+42728 Usdan; 41224 EXHAUSTED grep, UMD-adapted), D §1a (48275 / 95-820 / Fall 2025 / sole instructor / rename HYPOTHESIZED) and D §1b (Collier syllabus PDF p.1; 45133 instructor EXHAUSTED), A §2.6 (Loewenstein 90-822 title page). Citation rule matches the reports' quarantine instructions.
2. **Anchor spot-check (check 2): 30+ anchors traced; PASS except items 2, 4, 9–13, 15, 21.** Verified exact (report anchor in parentheses): L7 s23–24 "the gate is the compensating control" (A F48, verbatim substring); L6 s8 BDI commitment line (A F32, correct ellipsis splice); L8 s37 "use panel judges and human spot checks for high-stakes decisions" (D#12/A F71, verbatim); L8 s18 five hygiene headers (A F68); ModelOps p30 reproducibility "trace an inference back to the version of model and data" (B F20, verbatim substring) + p39 audit trail; shadow deployment L8 s41–51 + s46/s51 (B F19); six stage gates L9 s28 + ethics board TDS p5 (B F2); HITL/tiering TDS p4 + M9 s21 (B F3); CLASSic L7 s11/s19 incl. "zero hallucinated citations" and σ<0.15 (A F47); ARES ~150 labels + PPI L8 s35–36 Required (D#11); L7 s21 deliverable table items (A §2.2/F54); four facets + "unsafe behavior is a specification failure" L4 s15 (A F19); "Who decides? Who acts?" L3 s11 (A F8); human baseline + Automated/Augmented/Autonomous L2 s10 (C 3.9); Loomis L3 s28–29 (C 3.13); Bill of Rights L1 s19 = L9 s14 + 94-879 L9 s23 with all three quoted clauses (C 3.26, B F3); STOA seven risks L1 s29 (C 3.7); Knowledge Limits L6 s27 (C 3.18); DPIA L7 s28–29 (C 3.20); LLM08/LLM09 L8 s22 + hashes/audit-trail L8 s24 (C 3.21); "randomize order, anonymize sources" L8 s34 (D#10, verbatim); κ/ρ/α cheat sheet L8 s33/s37 (D#9); locked prompt patterns L5 s12 (D#15, verbatim); Self-Refine/MAS context L5 s54 (D#19); context-failure taxonomy L8 s15 (A F60); differential understanding L2 s13–14 (A F4); ToM L6 s9–10 (A F33); Pass^k L7 s13 (A F49); "scaffolding substitutes for coordination" L8 s9/s12 (A F57, verbatim); NoAct "safety ≠ inaction" L7 s9 (A F45's own gloss, quoted as such); pillars L8 s10–16 (D#3); "mirroring academic peer review" L7 s16 (A F51, verbatim); CONFLICT → present both interpretations L4 s16–18 (A F20); §5 question bank Q1–Q20 all resolve to the cited report entries (incl. A §4 doctrines 1–11 and C §4 / B §4 question lists); meta-rule = A §4.11.
3. **Repo claims (check 3): PASS except items 1, 3, 18–20.** `metrics.ts:174` krippendorffAlpha + `:240` gwetAc1; `feedback.ts:92` orderFor; `charters.ts:19-74` exactly six seats with safety "the ONLY seat that may VETO" (:60) + public reason; scorecard A4 = "Per-recipient order randomized (position-bias control)" (`scorecard/src/index.ts:137,343`); `clinical-eval/src/types.ts:20-26` EXPERIMENT_CONDITIONS = exactly the card §6 five arms; `runs/ANCHORS.md` = 13 anchored rows; falsification run = assignments.json length 240, receipt `design.assignmentCount=240`, `dataset.rowCount=8`, `simulator.ts:13-20` six programmed policies (8×6×5=240 consistent); A11-miss-on-purpose = honesty.md:78-86; `receipt.ts:38-39` claim-boundary wording matches card §7 paraphrase, `:174-177` the four NOT_ESTABLISHED claims; also verified: eight-phase election documented README.md:68 (engine.ts implements; no "phase" string in engine.ts itself — cite README:68 alongside if pedantry matters), `apps/server/src/index.ts:1104` intervene route, `providers/cli-environment.ts` present, `prompt.ts:21` UNTRUSTED_DATA_RULES, `base.ts:122` extractStrictJSON (moved from E's :104 — mid-edit), `safety-packet.ts:15` DECISION_SUPPORT_ONLY, four packs on disk, `types.ts:90` fixtureBoundary label, `analysis.ts:232` sign-flip assumption constant, PROTOCOL:299 no-leakage NOT_ESTABLISHED, PROTOCOL §8 prerequisite list, PROTOCOL:118-146 Tier A–D incl. MIMIC-IV-Ext CDS.
4. **Status-label audit (check 4): PASS except items 5–6.** Every INCORPORATED row has a disk artifact (feedback.ts orderFor + scorecard A4; ledger.ts/receipt.ts + ANCHORS; charters/ratify/safety-packet; types.ts arms + SATURDAY §8 per E §2.1; NON_VOTE/typed failure events per types.ts). Other EXHAUSTED claims trace: 94-815 L10/L11 (A §2.3), 95-820 L9/L10/guest decks (D §2a), 94-885 robustness deck (C §2.1), rubric bodies in all four courses (A §2.2, B §2.2, C §2.1, D §2a), pre-audit course-number absence (E §3). HYPOTHESIZED list matches the reports' own labels.
5. **Claim-discipline audit (check 5): PASS except the stale item 3 and wording items 18–20.** Neither doc claims clinical validity, effectiveness, safety, general conformity resistance, or peer-reviewed status for course material; both carry explicit boundary language (LEDGER:7, 149, 158, 184; CARD:20, 38-40, 69) and the "as taught in 94-8xx" provenance rule (LEDGER:184). Card §3 covers all 11 never-claims as recorded in E §5.9; "estimates local cue susceptibility … not general conformity" is correctly stated (CARD:39).
6. **Internal consistency (check 6): PASS except items 3 and 8.** Six-decision numbering matches E §2.3 exactly (construct / failure unit / comparator / timing / governance threshold / clinician target, with decision 6 riding the worksheet); `_rao-course-audit/` filenames resolve; card↔ledger cross-links resolve (CARD:3↔LEDGER §4.2; CARD:57→"coverage ledger §3" ✓); LEDGER §2 β-factor row and §6 metaphor tier agree ("kit's own transfer", "for Rao to correct or replace" vs "not his canon" — no contradiction; consistent with E §3.2/gap 2).
7. **Attribution-quarantine leak check (check 7): PASS.** In the LEDGER, Usdan/Collier/GenAI-Learners/Loewenstein appear only in explicitly labeled non-Rao rows (lines 17-22) and labeled corrections (lines 168-171), plus the labeled "(CMU module, non-Rao — label it)" at line 105. The CARD contains zero occurrences (grep). No non-Rao material is presented as Rao's in either doc.

---

## Verdict

**PASS-WITH-FIXES.**

The synthesis is substantially faithful: the attribution table, ~30 sampled anchors, the six-decision numbering, the quarantine discipline, and nearly all repo claims verify against the reports and current disk. The 3 BLOCKERs are each one-sentence fixes but must land before the docs are used (one false fact about the anchored evidence base, one spliced quote attributed to a Rao slide, one capability description inverted against the mid-edit tree). The 5 MAJORs are anchor/label corrections (two of them violations of the kit's own EXHAUSTED rule). The 15 MINORs are quote-fidelity and scoping polish, worth doing because these exact lines are designed to be spoken to the professor who wrote the slides.
