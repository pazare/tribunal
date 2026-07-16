# Rao evaluation-scenario worksheet

Date: 2026-07-17
Status: working specification for expert review; not a validated clinical workflow

## Working scenario

| Field | Frozen working answer | Decision requested from Rao |
| --- | --- | --- |
| Primary user | Physician or advanced-practice clinician reviewing a complex case in a resource-constrained setting | Is this user specific enough, or should the first study name one service and role? |
| Decision point | Before referral or transfer is ordered: escalate, do not escalate, or declare insufficient evidence | Is the decision point the independent unit, or should analysis cluster at the patient episode? |
| Setting | Silent-mode retrospective reconstruction first; no patient-facing recommendation | Is silent mode the correct first hospital study? (Evidence note 3.) |
| Information state | Only facts available at the recorded decision time; later diagnosis, imaging, specialist opinion, treatment response, and outcome are withheld from the agents | Which later fields may be used for evaluation without becoming a false gold standard? |
| Tools | Frozen case view, explicit codebooks, retrieval disabled or identical frozen corpus, concise public rationale, no hidden chain-of-thought | Which tools must humans receive for an apples-to-apples comparison? (Evidence note 1.) |
| Time budget | Same prespecified review window for each compared condition; record actual time separately | Should time be fixed, observed, or both? (Evidence note 1: 50.8% of reviewed studies set no time limits.) |
| Comparator | One model, visible debate, Tribunal, and independent clinician rating, with matched information, model, calls/tokens, retrieval, schema, and time where feasible | Which comparator is necessary for a governance committee rather than only a publication? (Evidence note 1.) |
| Action space | `ESCALATE`, `DO_NOT_ESCALATE`, `INSUFFICIENT_EVIDENCE`; if escalating, specialty plus `U0-U4`; missing evidence always explicit | Are the action states exhaustive and mutually intelligible to clinicians? |
| Reference | At least two qualified clinicians rate independently, followed by preserved adjudication; ambiguous cases remain underdetermined | What qualifications, training cases, and adjudication rule are minimally credible? |
| False-negative consequence | Delayed specialty review, missed time-sensitive deterioration, or false reassurance | Which must-not-miss failures require an immediate stop regardless of average performance? |
| False-positive consequence | Unnecessary transfer/referral, patient burden, capacity use, cost, alert fatigue, or anchoring | Which burden measures should be co-primary rather than secondary? |
| Degraded safe state | No ratified recommendation; show `UNDERDETERMINED`, preserve dissent and any U0/U1 safety flag, display missing evidence, and route to the human owner | Is this safe state sufficient, or must the product force an explicit escalation path? |
| Deployment mode | Retrospective harness → silent mode → controlled commit-then-reveal study; no autonomous action | What evidence and stop rule are required at each transition? (Evidence notes 3–4.) |
| Primary mechanism endpoint | Wrong-action adoption under an unsupported false-majority count versus control among baseline-correct sealed states | Does this measure a useful governance risk, or only prompt sensitivity? |
| Evidence-response endpoint | Correction under valid evidence versus control among baseline-wrong sealed states | What makes planted evidence clinically credible rather than answer-revealing? |
| Human-factor endpoint | Clinician error detection, decision change, time, override, workload, and ordering effects | Which UI order best limits automation bias? (Evidence note 2: ordering changes the form of bias, not its existence.) |
| Cost endpoint | Measured tokens, latency, clinician review time, and resource-use scenarios | Which downstream utilization should be measured before any cost-effectiveness claim? |

## Evidence notes for the contested rows (checked against primary records 2026-07-16; full rows in the [evidence ledger §5b](./SCOPUS_EVIDENCE_LEDGER_2026-07-16.md))

1. Comparator/tools/time — Chen et al., *IJMI* 212:106346, 2026, DOI `10.1016/j.ijmedinf.2026.106346` (C-01): scoping review of 120 AI-vs-physician studies (2020–2025) — 75.8% retrospective, 20.8% information asymmetry, 60.8% ≤10 physician readers, 50.8% no time limits; proposes the AI vs. Physician Study Checklist (AIPSC). Verified (abstract level); AIPSC item wording pending a full-text pull (paywalled) — do not paraphrase checklist items yet. This is the empirical justification for the comparator, tools, and time-budget rows.
2. Ordering and automation bias — anchor: Yin, Ngiam, Tan, Teo, *Management Science* 71(11), 2025, DOI `10.1287/mnsc.2022.01454` (T-01): randomized timing manipulation with physicians; ex post (clinician-first) advice performed best of the three conditions, with better discrimination of wrong AI advice — verified (direction; Ns/effects paywalled → pending). Counterweights: Cabitza et al., AAAI-26, DOI `10.1609/aaai.v40i47.41457` (T-05): all human-first, appropriate reliance <50%, disuse dominates misuse (no AI-first arm; context-only for any ordering claim); Pesapane et al., *Eur Radiol* 2026, DOI `10.1007/s00330-026-12666-6` (T-07): anchoring/revision bias in 33.9% of wrong-AI cases, and XAI reduced but did not eliminate it. Bottom line: ordering changes the form of bias, not its existence; silent mode is the only ordering with no exposure risk.
3. Silent mode — flagship: Kwong et al., *Front Digit Health* 2022, DOI `10.3389/fdgth.2022.929508` (S-02): development AUROC 0.90 fell to 0.50 in a clinician-blinded silent trial (dataset drift) and was restored to 0.91–0.92 in a second silent trial before any patient exposure; the collapse was invisible to retrospective validation (verified). Pou-Prom et al., *Front Digit Health* 2022, DOI `10.3389/fdgth.2022.932123` (S-01): CHARTwatch ~10-month silent phase caught pipeline breakages; caveat: the paper set no formal prespecified go/no-go thresholds (verified). Template from what these papers actually did: (1) run silent with outputs hidden for a defined window; (2) compare silent performance against the development benchmark and the incumbent alert, treating material gaps as stop signals; (3) advance only after performance is restored and stable and operational issues are resolved.
4. Failure unit / hazard analysis — the authenticated reliability-engineering pass returned a grounded gap: retrieved abstracts were classical reliability methods, with no direct AI/CDSS transfer. Candidate framing brought for Rao to correct or replace (pending verification): β-factor/α-factor common-cause-failure models for correlated same-provider agent failures. A question, not a settled choice.

## Frozen safety summary rule for the four-seat demo

- Quorum: three schema-valid votes.
- Summary action: at least three votes agree on `escalation_action`.
- Safety exception: any valid U0/U1 escalation vote or activated veto is preserved and prevents an automatic `DO_NOT_ESCALATE` summary.
- Tie, no quorum, schema failure, or veto conflict: `UNDERDETERMINED` and human review.
- The summary is decision support, not authorization.

## Six decisions to record verbatim

1. Is the proposed deliberative-adequacy construct formative or reflective?
2. What is the correct independent unit when cases share templates and agents share a model? (Evidence note 4: correct or replace our common-cause-failure candidate framing.)
3. Which hazard-analysis method and stop threshold should govern silent mode? (Evidence notes 3–4.)
4. Which UI ordering best limits automation bias while preserving measurable human judgment? (Evidence note 2.)
5. Which compute, information, tool, and time controls make the human/AI comparator apples-to-apples? (Evidence note 1.)
6. Should the clinician's evaluation target be the diagnostic assessment, the proposed action, or both separately — and in which order? (Added 2026-07-16: the meeting notes treat diagnosis and treatment as distinct evaluation loci.)

## Post-meeting disposition

Record each answer as `ADOPT`, `TEST`, `DEFER`, or `REJECT`, with the exact protocol section affected. Rao's guidance is expert design input; it is not empirical validation.
