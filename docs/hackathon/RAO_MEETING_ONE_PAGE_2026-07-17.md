# Anand Rao decision brief

Meeting: 2026-07-17
Objective: leave with five decisions that make the Tribunal evaluation hospital-governance credible

Bring the filled [evaluation-scenario worksheet](./RAO_EVALUATION_SCENARIO_WORKSHEET_2026-07-17.md) and record changes against its exact fields.

## Opening, 45 seconds

> Professor Rao, Ramayya pushed us to stop treating agreement as clinical truth. We now define Tribunal as a clinician-controlled specialist-escalation system. Its scientific question is whether sealed agents respond to valid evidence, remain stable under irrelevant wording and unsupported panel-count cues, preserve safety-critical dissent, and produce an auditable escalation packet. We are building paired counterfactual tests and an apples-to-apples human comparison. We need your judgment on the construct, failure unit, comparator, human timing, and minimum silent-mode evidence bar.

## System boundary

```text
Point-in-time evidence
        ↓
Independent sealed escalation tuples
        ↓
Controlled update with evidence or panel cue
        ↓
Private revisions + preserved dissent
        ↓
Clinician-facing escalation packet
        ↓
Human clinician owns the decision
```

Primary tuple: escalation action, specialty, urgency, and missing evidence.
Primary E2 endpoint: paired wrong-action adoption under an unsupported panel-count cue versus control among correct sealed baselines.
Independent unit: case; roles from one model are not independent clinicians.

## Five decisions requested

1. **Construct** — Should the primary construct be appropriate escalation, clinician decision benefit, deliberative integrity, or a specified hierarchy? Is the umbrella formative or reflective?
2. **Failure unit** — Is failure best counted per decision point, commitment span, patient episode, or loss of a required safety function when cases share templates and agents share a model?
3. **Apples-to-apples comparator** — Which information, tools, time, action space, calls/tokens, retrieval, and adjudication must be identical for AI and human panels?
4. **Human timing and interface** — Is commit-then-reveal worth its workflow burden, or should the first hospital study be silent mode? Which UI ordering best limits automation bias?
5. **Governance threshold** — Which hazard-analysis method, evidence package, and prespecified stop threshold should govern a bounded silent-mode evaluation?

## Ask him to attack these assumptions

- The case is the correct independent unit.
- A fixed planted escalation action is a legitimate mechanism-fixture reference.
- A neutral `3 of 4 other panelists` cue plus valid/irrelevant evidence controls isolates a useful local effect, even though expert votes may be interpreted as weak evidence.
- Eight synthetic cases are enough for a harness pilot but support no clinical or general model claim.
- Agreement should be a diagnostic/process variable, not the validity endpoint.
- A concise packet plus drill-down ledger is the right clinician surface.

## Evidence ladder

1. exact metric oracles;
2. scripted-provider falsification gate;
3. synthetic paired model mechanism experiment;
4. clinician-reviewed paired fixtures;
5. real de-identified point-in-time cases with independent adjudication;
6. silent-mode comparison;
7. prospective commit-then-reveal workflow study.

## Added 2026-07-16 from the Krishnan notes audit and new evidence

- Decision 2 supplement: the authenticated reliability-engineering literature pass returned a grounded gap — retrieved abstracts were classical reliability methods, with no direct AI/CDSS transfer ([evidence ledger §5b](./SCOPUS_EVIDENCE_LEDGER_2026-07-16.md)). Candidate framing we bring for correlated same-provider agent failures: β-factor/α-factor common-cause-failure models (pending verification). This is a question for Rao to correct or replace, not a settled choice.
- Decision 3 supplement: ask whether **documented historical specialist-group decisions** (tumor boards, MDT records, the MIMIC clinician-reviewed referral subset) are an acceptable human comparator alongside recruited raters, given their confounds (information asymmetry, group dynamics, selection).
- Decision 3 evidence: Chen et al., *IJMI* 212:106346, 2026, DOI `10.1016/j.ijmedinf.2026.106346` (ledger C-01) — scoping review of 120 AI-vs-physician studies (2020–2025): 75.8% retrospective, 20.8% information asymmetry, 60.8% ≤10 physician readers, 50.8% no time limits; proposes the AI vs. Physician Study Checklist (AIPSC). Verified (abstract level); AIPSC item wording pending a full-text pull (paywalled) — use the four percentages as the empirical case for the worksheet's comparator/tools/time controls, and do not paraphrase specific checklist items yet.
- Decision 4 supplement (anchor now checked against the primary record; was "verification pending"): Yin, Ngiam, Tan, Teo, *Management Science* 71(11), 2025, DOI `10.1287/mnsc.2022.01454` (ledger T-01) — randomized timing manipulation with physicians; ex post (clinician-first) advice performed best of the three conditions, including better discrimination of wrong AI advice — verified (direction; Ns/effects paywalled → pending); it contradicts the assumed accuracy trade-off of human-first ordering. Two honest counterweights: Cabitza et al., AAAI-26, DOI `10.1609/aaai.v40i47.41457` (T-05) — >300 professionals, six settings, all human-first: appropriate reliance <50%, disuse dominates misuse, correct advice often ignored (no AI-first arm, so context-only for any ordering claim); and Pesapane et al., *Eur Radiol* 2026, DOI `10.1007/s00330-026-12666-6` (T-07) — ordering shifts the bias form: anchoring/revision bias in 33.9% of wrong-AI cases, and XAI reduced but did not eliminate it. Bottom line: ordering changes the form of bias, not its existence; silent mode remains the only ordering with no exposure risk. Still ask Rao how to weigh commit-then-reveal's measurement value against disuse and residual anchoring.
- Decision 5 supplement: the named silent-trial precedents are now checked against primary records. Flagship: Kwong et al., *Front Digit Health* 2022, DOI `10.3389/fdgth.2022.929508` (ledger S-02) — development AUROC 0.90 fell to 0.50 in a clinician-blinded silent trial (dataset drift), was fixed, then held 0.91–0.92 in a second silent trial before any patient exposure; the collapse was invisible to retrospective validation (verified). Long-phase exemplar: Pou-Prom et al., *Front Digit Health* 2022, DOI `10.3389/fdgth.2022.932123` (S-01) — CHARTwatch ran ~10 months silent and caught pipeline breakages; caveat: the paper set no formal prespecified go/no-go thresholds, so do not imply it did (verified). SAFE-WAIT remains preliminary: Hoang et al., MEDINFO 2025 (SHTI), DOI `10.3233/SHTI250851` (S-03) — verified (design), subgroup numbers pending (paywalled), single-center proceedings-level. Offer the ledger §5b template of what these papers actually did: (1) run silent with outputs hidden for a defined window; (2) compare silent performance against the development benchmark and the incumbent alert, treating material gaps as stop signals; (3) advance only after silent-phase performance is restored and stable and operational issues are resolved.
- Worksheet decision 6 (new): should the clinician's evaluation target be the diagnostic assessment, the proposed action, or both separately — and in which order?
- New question for Rao (methods transfer): should his AI Use Case Worksheet scenario-expansion method generate our E3 twin families (clinical fact, narrative, and resource twins) — tying his own methodology directly to our counterfactual program?
- Citation hygiene for this meeting: "unfaithful capitulation" cites arXiv 2605.29087; the DRL paper is cited as a preprint (venue unconfirmed); Rao's apples-to-apples paper is a NIST–CMU collaboration whose demo domain is financial services.

## Leave with written answers

Record Rao's preferred construct, denominator/failure unit, comparator controls, timing design, minimum evidence package, unacceptable failure threshold, and one negative result he considers scientifically valuable. Treat his answers as expert guidance requiring later operationalization—not as empirical validation.
