# Tribunal Clinical — Saturday execution and demo plan

Event: Abridge × Anthropic × Lightspeed, “The Future of Agentic AI in Healthcare”
Contest date: Saturday, 2026-07-18
Team: Pablo Zavala and Santiago
Public event time: 09:00–22:00 PDT
Status: operational plan; public prompt, date, hours, city, and team-size rule verified 2026-07-16; exact street address, submission deadline, judging rubric, and day-of-code rule must be confirmed from the approval or at check-in

## 1. Outcome

Ship one narrow clinician-facing workflow:

> A complex-case escalation copilot that converts an Abridge-style clinical conversation plus structured facts into independent sealed agent assessments, detects whether apparent consensus is evidence-driven, and gives the clinician a concise, attributable specialist-escalation packet.

The system does not choose a treatment or overrule a clinician. It answers:

- should this case be escalated, or is evidence insufficient?
- to which specialty?
- how urgently?
- what missing evidence should be collected first?
- where did agents disagree, and what evidence changed a vote?

## 2. Rules and provenance boundary

### Confirmed from the public event material

- Prompt: “Build Agents for Healthcare Clinics.”
- Pick one clinical or operational workflow and make it faster, smarter, or safer.
- Focus on real-world clinical impact and saving time or lives.
- Ship something a clinician or patient-facing team could use on Monday.
- Abridge engineers and clinicians are expected on the floor.
- Maximum team size is two and participation is in person in San Francisco.
- Public event hours are 09:00–22:00 PDT on Saturday, July 18.
- The event page promises access to Abridge resources, including clinician feedback, and cross-domain collaboration with ML scientists, healthcare workers, and clinical engineers.
- The entrant retains submission ownership but grants the organizers and partners broad perpetual non-exclusive rights; materials shared at the event are non-confidential.

Public source: [Cerebral Valley event page](https://cerebralvalley.ai/events/~/e/abridge-hackathon), inspected live on 2026-07-16. An organizer's public announcement names SHACK15, while the event page itself exposes only San Francisco; use the approved registration as the authority for the street address. The ownership/non-confidentiality terms came from the recovered application waiver, not the descriptive event page.

### Required but not publicly verified

Pablo reports that only work completed during the event day may be demonstrated as the contest build. The public description and waiver recovered so far do not state that rule. Treat Pablo's instruction as binding and ask the organizer to state the exact boundary before coding.

### Proof of day-of work

At check-in:

1. fetch the remote branch and make sure the tree is clean;
2. create a signed or annotated `hackathon-prestart-20260718` tag at the pre-event commit;
3. record organizer-confirmed start time, rules, allowed data, and submission deadline in `runs/hackathon-20260718/start.json`;
4. create `pazare/hackathon-day-20260718` from the tag;
5. make all contest implementation commits on that branch after the start receipt;
6. produce a final `git diff hackathon-prestart-20260718...HEAD`, run ledger, and screen recording.

The demo must say plainly:

```text
Pre-existing open-source substrate: Tribunal kernel, ledger, generic UI, provider adapters, and tests.
Prepared before the event: research protocol, vocabularies, experiment design, synthetic-case specifications, and runbook.
Built during the event: the chosen clinical pack, permitted Abridge input adapter, clinical tuple/packet surface, live experiment run, clinician feedback changes, and contest presentation.
```

If organizers prohibit use of pre-existing infrastructure, use the fallback thin prototype created from scratch after the start tag and do not demo the older kernel.

## 3. Before Saturday: preparation that is not the contest demo

### Research readiness

- finish the source-verified evidence ledger;
- freeze `RESEARCH_METHODS_PROTOCOL_2026-07-16.md` as the preregistration basis;
- implement and test generic agreement metrics and run receipts;
- prepare synthetic paired-case specifications and expected-direction labels;
- reserve at least one frozen case family that is not used for prompt or interface fixes;
- prepare, but do not populate with restricted data, loaders for MIMIC-IV-Ext CDS and sponsor data;
- conduct pre-event pilot experiments for scientific learning and label them `PRE_EVENT_RESEARCH`, never contest results;
- make the codebook, clinician rating sheet, partner questions, and statistical notebook locally available offline.

### Operational readiness

- clone dependencies and model CLIs; verify exact account/model/effort flags;
- cache permitted public documentation, not restricted clinical rows;
- verify local demo and tests with network disconnected;
- charge both laptops and pack power, hotspot, adapters, headphones, and backup recording device;
- pre-authorize only the accounts and datasets permitted for synthetic/de-identified use;
- print or locally save the one-page clinician labeling sheet and rules checklist.

### Things deliberately not completed before Saturday

- no final sponsor-data adapter against unseen Abridge fields;
- no contest clinical pack based on the sponsor case;
- no contest result table;
- no contest screenshots or video;
- no claim that the pre-event pilot is the hackathon build.

## 4. P0/P1/P2 scope

### P0 — must ship

One case must complete this path live:

```text
permitted transcript + structured facts
  -> attributable evidence spans
  -> four independent sealed assessments
  -> coded escalation tuples
  -> private evidence/majority-signal revision
  -> ratified action or explicit underdetermination
  -> clinician escalation packet
  -> tamper-evident run receipt
```

P0 acceptance tests:

- all four initial votes exist or a non-vote reason is visible;
- every diagnosis/rationale claim links to a case span or named external source;
- every linked claim is labeled `SUPPORTED`, `PARTIAL`, `CONTRADICTED`, or `NO_SUPPORT`, with speaker/experiencer, negation, certainty, temporality, availability time, value, and unit checked where applicable;
- action, specialty, urgency, and missing evidence validate against the frozen codebook;
- cross-field constraints, quorum, tie, veto, non-vote, and `UNDERDETERMINED` rules validate before a packet is rendered;
- original votes remain visible after revision;
- the system can refuse to ratify an underdetermined case;
- a false majority signal without new evidence does not silently count as valid convergence;
- no patient identifier or restricted raw row appears in the public ledger, log, screenshot, or model prompt;
- the final packet names the human decision owner and says it is decision support;
- the demoed changes are in the day-of diff.

### P1 — strong contest evidence

- run the five balanced evidence/majority conditions on every retained sealed state, or run the irrelevant-evidence control as a separately labeled balanced experiment;
- show raw `n/N`, agreement metrics, uncertainty, vote-change taxonomy, latency, and cost;
- obtain at least one independent clinician rating before they see the AI result and one structured usability review afterward; label one rating provisional case feedback, not a gold standard;
- render a compact, budget-matched comparison: single model versus ordinary debate versus Tribunal.

P1 results are a mechanistic pilot. Do not call them clinical validation.

### P2 — only if P0 and P1 are stable

- batch a permitted real de-identified dataset or additional sponsor cases;
- add specialty routing/capacity constraints;
- add a second clinician's independent labels;
- add audio/span provenance if Abridge exposes it;
- add a cost-consequence scenario with transparent assumptions.

Do not sacrifice a reliable P0 demo to chase P2.

## 5. Two-person operating roles

### Pablo — clinical construct, implementation authority, and partner interface

- confirm rules and data terms;
- interview Abridge, Anthropic, and clinicians using the question set below;
- freeze the workflow and codebook with clinician input;
- coordinate independent clinician labels;
- monitor claim boundaries and experiment assignment;
- own clinical schema changes, model prompts, experiment configuration, integration decisions, and the critical-path implementation;
- own the pitch, live explanation, and final submission language.

### Santiago — bounded operations and demo support

- follow the written start-receipt checklist and record organizer answers;
- run named test and verification commands without changing experiment definitions;
- maintain the timebox, screen recording, offline demo file, cable/power checklist, and submission-link checklist;
- export the already-generated run receipt, metrics table, screenshots, and backup video;
- report any failed check to Pablo; Pablo decides and integrates the fix.

### Shared rule

Only one person edits a file at a time. Use short branches or explicit file ownership. Merge at fixed gates rather than continuously rebasing during the final hours.

## 6. Event-day timeline

The visible public event page states 09:00–22:00 PDT. Plan for arrival at 08:15; `T0` is 09:00 unless the approval message gives a different check-in instruction. The schedule leaves a final 30-minute submission buffer before the advertised end.

| Time | Goal | Exit condition |
| --- | --- | --- |
| 08:15–09:00 | Check in, confirm rules/data/IP, connect power/network, make pre-call manifest/start commitment | written organizer answer; clean start proof |
| T0 to T+0:30 | Interview one Abridge engineer and one clinician; choose exactly one case and user | one-sentence workflow; permitted fields; named human decision owner |
| T+0:30 to T+1:15 | Freeze tuple, codebook, case facts, reference questions, and acceptance tests | signed-off P0 specification; no open scope question |
| T+1:15 to T+2:45 | Build and test input/evidence-provenance adapter | one parsed case; span ids; no PHI in logs |
| T+2:45 to T+4:30 | Configure four sealed agent roles and schema-valid votes | complete round-one ledger with disagreement or justified agreement |
| T+4:30 to T+5:30 | Implement private revision, false-majority intervention, and packet | evidence/social conditions are distinguishable in the ledger |
| T+5:30 to T+6:15 | First end-to-end run, meal in shifts, checkpoint commit/push | P0 run receipt validates from a fresh checkout |
| T+6:15 to T+7:45 | Run small factorial pilot and single/debate baselines | machine-readable results plus raw counts/intervals |
| T+7:45 to T+8:45 | Clinician independent label and structured review | pre-AI label preserved; top three usability/safety fixes ranked |
| T+8:45 to T+9:45 | Implement only the highest-value clinician fixes | original development result preserved; second development run passes; changes linked to feedback |
| T+9:45 to T+10:45 | Build four-minute demo and concise deck | story works with live and prerecorded fallback |
| T+10:45 to T+11:45 | Red-team, failure injection, offline rehearsal | timeout/refusal/bad schema/underdetermined cases fail visibly and safely |
| T+11:45 to T+12:30 | Run the frozen hold-out case family, then final metrics, cost receipt, README, and submission | hold-out result distinct from development reruns; clean branch; tests pass; claims audited |
| 21:30–22:00 | Record or finalize upload, verify links, rehearse twice | submission confirmed; backup local copy; no unverified headline |

Checkpoint commits are expected at adapter, first P0, experiment, clinician-fix, and final-submission gates.

## 7. On-floor questions that change the build

### Abridge — ask in the first 30 minutes

1. Which de-identified or synthetic transcript may we use, and exactly what may appear in a public demo or repository?
2. Can we receive stable span or timestamp identifiers connecting a summary claim to transcript/audio evidence?
3. What structured facts accompany the transcript—medications, allergies, vitals, labs, diagnoses, referrals, claims, or FHIR resources?
4. Where would a downstream escalation service sit relative to note generation and clinician sign-off?
5. What is the smallest unresolved clinical workflow Abridge clinicians see repeatedly and would test on Monday?
6. What existing evaluation rubric, failure set, or clinician-feedback schema can we reuse today?
7. What counts as an acceptable latency and review burden for that workflow?
8. Which data must never leave Abridge-controlled infrastructure, and which model paths are authorized?
9. Can a clinician independently label the four-field tuple on one to five cases before seeing our output?
10. What integration artifact would make a post-hackathon pilot conversation concrete: API contract, silent-mode protocol, or design-partner memo?
11. If an encounter lacks a recorded diagnosis, can linked claims/EHR data supply the documented diagnosis-and-treatment choice set for retrospective comparison, and under what de-identification and use terms? (Krishnan meeting note: claims data "gives us the choice" set for counterfactuals.)

### Anthropic — ask before choosing the production model path

1. Which exact models and account configurations may process the provided data, and what retention, BAA, regional, and logging constraints apply?
2. How should we preserve a concise public rationale without collecting hidden chain-of-thought?
3. Which tool-use, structured-output, prompt-caching, batch, citation, and evaluation features are stable enough for a Monday-facing prototype?
4. How would Anthropic instrument the difference between evidence-induced revision and response to a claimed majority?
5. Can provider usage, refusal, timeout, and model-version metadata be exported into an external audit ledger?
6. What failure modes should we inject into a multi-agent clinical demo?
7. Which agent/evaluation artifact would be useful for a joint post-hackathon research project?
8. Clinicians cannot keep up with the journal literature (Krishnan meeting note). Which Claude capabilities — search, citations, dated retrieval, provenance — would keep Tribunal's evidence layer current, and how should evidence currency be audited?

### Clinicians — independent label first

Before showing AI output, ask the clinician to code:

- escalate / do not escalate / insufficient evidence;
- specialty;
- urgency;
- missing evidence;
- confidence;
- one must-not-miss risk;
- one fact that would change the decision.

After showing the packet, ask:

- What action would you take now?
- What is wrong, missing, or dangerously overconfident?
- Did the concise packet or the full ledger change your judgment?
- Which disagreement is useful and which is noise?
- Would this save review time, add burden, or cause automation bias?
- What must change before silent-mode evaluation?

Record role/specialty and years of experience, not identifying patient data. Keep the pre-AI label sealed until after the system run.

## 8. Experiment conducted Saturday

The minimum meaningful evaluation has two distinct parts that must not be pooled.

**Mechanism experiment:** each retained sealed case-agent state receives control, valid evidence, unsupported false-majority count, conflict, and irrelevant evidence in fresh isolated sessions. The count says `3 of 4 other panelists`; it carries no rationale or real votes. Use equal, prespecified replicates per arm when outputs are stochastic. Primary endpoint: adoption of the prespecified wrong action under false-majority versus control among baseline-correct states. Evidence correction is estimated separately among baseline-wrong states. This is a paired stochastic prompt contrast, not design-based exact randomization inference.

**Architecture comparison:** use the same frozen cases, information, model version, retrieval corpus, output schema, calls/tokens, and time budget across:

1. **Single:** one model gives the tuple.
2. **Debate:** agents see preceding recommendations before deciding.
3. **Tribunal:** agents vote independently, then revise privately under matched evidence/social-signal conditions.

Architecture endpoints are descriptive criterion match on the planted/reference action, non-votes, preserved dissent, exact tuple match, latency, and measured model cost. If budgets differ, display the difference and do not attribute the result solely to architecture.

Show every numerator and denominator, including baseline non-votes and post-arm attrition. If the sample is tiny, say “mechanism demonstration on N case families,” not “performance improvement.” A failed or null result remains useful if the ledger makes the mechanism diagnosable; a null social-cue contrast is not evidence of immunity. Preserve the first run before applying clinician feedback and use a frozen hold-out case family after fixes. A same-case improvement is a development demonstration, not unbiased performance evidence.

## 9. Four-minute demo storyboard

### 0:00–0:35 — the real workflow

“A complex conversation reaches a resource-constrained clinician. The hard question is not a full treatment plan; it is whether this needs a specialist, who, how urgently, and what evidence is missing.”

### 0:35–1:15 — attributable case file

Show the transcript/structured facts and click one evidence span. State whether the case is sponsor-provided de-identified or synthetic.

### 1:15–2:05 — independent disagreement

Reveal sealed coded votes together. Highlight one meaningful disagreement and one non-vote/refusal path. Do not show hidden chain-of-thought.

### 2:05–2:45 — evidence versus majority

Show that one condition adds valid evidence and another adds only a claimed majority. Reveal the private post-exposure votes and the evidence-change record.

### 2:45–3:25 — clinician packet

Show action, specialty, urgency, missing evidence, patient/resource constraints, dissent, and human decision owner. Demonstrate underdetermination rather than a fabricated answer.

### 3:25–4:00 — evidence and partnership

Show the day-of diff, run receipt, small pilot counts/intervals, latency/cost, and one clinician correction made that day. Close with the exact next step: a governed retrospective/silent-mode evaluation with Abridge and an agent-safety study with Anthropic.

### Pitch-ready verified evidence lines (evidence ledger §5b; use verbatim, keep the boundary clause)

1. Silent mode first: "In a clinician-blinded silent trial, a model that scored AUROC 0.90 in development collapsed to 0.50 from dataset drift that retrospective validation never surfaced — and was restored to 0.91–0.92 before any clinician saw an output" (Kwong et al., Frontiers in Digital Health 2022, DOI 10.3389/fdgth.2022.929508; verified, open access). Boundary: pediatric-imaging case study, one team.
2. Human-first ordering: "In the only randomized timing comparison we verified, clinicians who committed before seeing AI advice performed best — including better rejection of wrong advice" (Yin, Ngiam, Tan, Teo, Management Science 71(11), 2025, DOI 10.1287/mnsc.2022.01454; direction verified at abstract level, effect sizes paywalled-pending). Boundary: ordering changes the form of bias, not its existence — disuse (AAAI-26, DOI 10.1609/aaai.v40i47.41457) and revision bias (Eur Radiol 2026, DOI 10.1007/s00330-026-12666-6) persist in human-first workflows.
3. Comparator hygiene: "A 2026 scoping review of 120 AI-versus-physician studies found 75.8% retrospective designs, 60.8% with ten or fewer physician readers, 50.8% without time limits, and 20.8% with information asymmetry — our comparator design controls each of these" (Chen et al., IJMI 212:106346, 2026, DOI 10.1016/j.ijmedinf.2026.106346; verified at abstract level; AIPSC item wording pending full text). Boundary: cite the percentages, do not paraphrase unpulled checklist items.

## 10. Stop/go gates and fallbacks

### Gate G0 — authorized data

If data terms or model authorization are unclear, do not ingest the data. Switch to a labeled synthetic case.

### Gate G1 — one trustworthy round trip by T+3

If the adapter is unstable, freeze one permitted case to a local redacted JSON input. Preserve source provenance manually.

### Gate G2 — P0 by T+6

If the multi-provider panel is unstable, use one allowed model in isolated sessions and keep provider diversity as future work. If model calls fail, use the deterministic offline provider and label it a mechanism simulation—not AI performance.

### Gate G3 — experiment by T+8

If batch runs are too slow, run the full factorial on fewer frozen cases and report wide uncertainty. Do not replace missing results with invented examples.

### Gate G4 — clinician review

If no clinician can label cases, obtain workflow critique only and do not claim clinician agreement or validation.

### Demo fallback ladder

1. live sponsor-data run;
2. live synthetic run;
3. prerecorded day-of run plus live ledger verification;
4. local deterministic mechanism run with exact disclosure.

## 11. Submission and claim audit

Before submission:

- [ ] organizer-confirmed rules, deadline, and data terms are in the start receipt;
- [ ] pre-event tag and day-of diff are visible;
- [ ] repository contains no PHI, secrets, restricted rows, or disallowed benchmark examples;
- [ ] README says what pre-existed and what was built that day;
- [ ] one command reproduces the showcased run or verifies its receipt;
- [ ] tests, typecheck, schema validation, and ledger verification pass;
- [ ] every numerical slide includes `N`, comparator, statistic, and uncertainty or raw counts;
- [ ] “agreement” is not called correctness;
- [ ] retrospective concordance is not called a causal counterfactual;
- [ ] measured token/time cost is not called cost-effectiveness;
- [ ] no patient outcome, lives-saved, HIPAA, regulatory, or production-readiness claim exceeds evidence;
- [ ] live and local video/link fallbacks work;
- [ ] every headline claim carries a technical statement, a plain-language restatement, one worked example, one counterexample or failure case, and a direct citation (operator requirement, 2026-07-16);
- [ ] every stated limitation is labeled `EXHAUSTED` (multiple independent documented failed attempts) or `HYPOTHESIZED`; only `EXHAUSTED` limits are presented as real limits (operator rule, 2026-07-16);
- [ ] final branch and commit are pushed and the submission confirmation is captured.

## 12. Monday after the hackathon

The credible Monday artifact is not an autonomous clinical product. It is:

- a reproducible day-of prototype;
- an Abridge integration/data-contract proposal;
- a retrospective and silent-mode evaluation protocol;
- a clinician labeling instrument;
- an Anthropic agent-conformity research proposal;
- a list of exact governance gates for any future clinical exposure;
- future routing tiers (meeting-note idea, not Saturday scope): simple cases get physician documentation plus one lightweight AI rationale; complex cases get the full multi-seat panel; routing thresholds themselves require validation;
- the population-level ambition (meeting note): after authorization, batch retrospective runs across a case population so the evidence is community-level rather than single-patient — Saturday remains a single-case mechanism demo and supports no population claim.

That package is specific enough for Abridge and Anthropic to evaluate a partnership while remaining honest about what one day of evidence can establish.
