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

- Decision 3 supplement: ask whether **documented historical specialist-group decisions** (tumor boards, MDT records, the MIMIC clinician-reviewed referral subset) are an acceptable human comparator alongside recruited raters, given their confounds (information asymmetry, group dynamics, selection).
- Decision 4 supplement: new authenticated Scopus AI capture (verification pending) indicates human-first commitment reduces automation and anchoring bias at a possible cost in accuracy gains from correct advice — ask Rao how to weigh that trade-off; a 2026 scoping review of AI-vs-physician comparisons (Chen et al., with the AIPSC checklist) reports 50.8% of studies fail to enforce time limits and 60.8% use ≤10 physicians.
- Decision 5 supplement: named silent-trial precedents now on file (CHARTwatch; SAFE-WAIT; Kwong et al. silent-trial bridge, where a model's AUC fell 0.90→0.50 in silent testing and was fixed before patient exposure) — offer these as the empirical template for the governance package.
- Worksheet decision 6 (new): should the clinician's evaluation target be the diagnostic assessment, the proposed action, or both separately — and in which order?
- Citation hygiene for this meeting: "unfaithful capitulation" cites arXiv 2605.29087; the DRL paper is cited as a preprint (venue unconfirmed); Rao's apples-to-apples paper is a NIST–CMU collaboration whose demo domain is financial services.

## Leave with written answers

Record Rao's preferred construct, denominator/failure unit, comparator controls, timing design, minimum evidence package, unacceptable failure threshold, and one negative result he considers scientifically valuable. Treat his answers as expert guidance requiring later operationalization—not as empirical validation.
