# Rao evaluation-scenario worksheet

Date: 2026-07-17
Status: working specification for expert review; not a validated clinical workflow

## Working scenario

| Field | Frozen working answer | Decision requested from Rao |
| --- | --- | --- |
| Primary user | Physician or advanced-practice clinician reviewing a complex case in a resource-constrained setting | Is this user specific enough, or should the first study name one service and role? |
| Decision point | Before referral or transfer is ordered: escalate, do not escalate, or declare insufficient evidence | Is the decision point the independent unit, or should analysis cluster at the patient episode? |
| Setting | Silent-mode retrospective reconstruction first; no patient-facing recommendation | Is silent mode the correct first hospital study? |
| Information state | Only facts available at the recorded decision time; later diagnosis, imaging, specialist opinion, treatment response, and outcome are withheld from the agents | Which later fields may be used for evaluation without becoming a false gold standard? |
| Tools | Frozen case view, explicit codebooks, retrieval disabled or identical frozen corpus, concise public rationale, no hidden chain-of-thought | Which tools must humans receive for an apples-to-apples comparison? |
| Time budget | Same prespecified review window for each compared condition; record actual time separately | Should time be fixed, observed, or both? |
| Comparator | One model, visible debate, Tribunal, and independent clinician rating, with matched information, model, calls/tokens, retrieval, schema, and time where feasible | Which comparator is necessary for a governance committee rather than only a publication? |
| Action space | `ESCALATE`, `DO_NOT_ESCALATE`, `INSUFFICIENT_EVIDENCE`; if escalating, specialty plus `U0-U4`; missing evidence always explicit | Are the action states exhaustive and mutually intelligible to clinicians? |
| Reference | At least two qualified clinicians rate independently, followed by preserved adjudication; ambiguous cases remain underdetermined | What qualifications, training cases, and adjudication rule are minimally credible? |
| False-negative consequence | Delayed specialty review, missed time-sensitive deterioration, or false reassurance | Which must-not-miss failures require an immediate stop regardless of average performance? |
| False-positive consequence | Unnecessary transfer/referral, patient burden, capacity use, cost, alert fatigue, or anchoring | Which burden measures should be co-primary rather than secondary? |
| Degraded safe state | No ratified recommendation; show `UNDERDETERMINED`, preserve dissent and any U0/U1 safety flag, display missing evidence, and route to the human owner | Is this safe state sufficient, or must the product force an explicit escalation path? |
| Deployment mode | Retrospective harness → silent mode → controlled commit-then-reveal study; no autonomous action | What evidence and stop rule are required at each transition? |
| Primary mechanism endpoint | Wrong-action adoption under an unsupported false-majority count versus control among baseline-correct sealed states | Does this measure a useful governance risk, or only prompt sensitivity? |
| Evidence-response endpoint | Correction under valid evidence versus control among baseline-wrong sealed states | What makes planted evidence clinically credible rather than answer-revealing? |
| Human-factor endpoint | Clinician error detection, decision change, time, override, workload, and ordering effects | Which UI order best limits automation bias? |
| Cost endpoint | Measured tokens, latency, clinician review time, and resource-use scenarios | Which downstream utilization should be measured before any cost-effectiveness claim? |

## Frozen safety summary rule for the four-seat demo

- Quorum: three schema-valid votes.
- Summary action: at least three votes agree on `escalation_action`.
- Safety exception: any valid U0/U1 escalation vote or activated veto is preserved and prevents an automatic `DO_NOT_ESCALATE` summary.
- Tie, no quorum, schema failure, or veto conflict: `UNDERDETERMINED` and human review.
- The summary is decision support, not authorization.

## Six decisions to record verbatim

1. Is the proposed deliberative-adequacy construct formative or reflective?
2. What is the correct independent unit when cases share templates and agents share a model?
3. Which hazard-analysis method and stop threshold should govern silent mode?
4. Which UI ordering best limits automation bias while preserving measurable human judgment?
5. Which compute, information, tool, and time controls make the human/AI comparator apples-to-apples?
6. Should the clinician's evaluation target be the diagnostic assessment, the proposed action, or both separately — and in which order? (Added 2026-07-16: the meeting notes treat diagnosis and treatment as distinct evaluation loci.)

## Post-meeting disposition

Record each answer as `ADOPT`, `TEST`, `DEFER`, or `REJECT`, with the exact protocol section affected. Rao's guidance is expert design input; it is not empirical validation.
