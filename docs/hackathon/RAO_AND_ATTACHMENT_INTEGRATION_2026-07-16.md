# Rao and attached research-plan integration

Date: 2026-07-16
Status: integrated design input; citations quarantined until source verification

## Decision

The attached `Tribunal Clinical: Rao Meeting Brief and Hackathon Research Plan` materially strengthens the project, but it is not itself an evidence ledger. Its best contribution is a coherent research program around **safe, evidence-responsive specialist escalation under uncertainty**. Agreement remains a process measurement, never the primary validity construct.

The Saturday product remains bounded:

> Tribunal Clinical produces an auditable specialist-escalation packet, preserves material dissent, and tests whether sealed agent decisions respond to valid evidence while resisting an unsupported panel-count cue. A clinician retains decision authority.

The phrase **Clinical Deliberative Adequacy** may be used as a proposed umbrella construct, not as a validated scale. Its candidate dimensions are evidence support, safety, uncertainty, feasibility, dissent preservation, provenance, and human reviewability. Establishing a composite score would first require content validation and an explicit formative-versus-reflective measurement model, followed by methods appropriate to that model and external criterion studies. Factor analysis is relevant only if a defensible reflective model is established. Saturday will report the dimensions separately.

## Contributions accepted into the research program

1. **Four counterfactual families**
   - clinical fact twins: a prespecified clinically material fact changes;
   - narrative twins: wording changes while observable facts remain fixed;
   - unsupported panel-count cues: social information changes without patient evidence;
   - resource twins: feasible action changes while the factual interpretation should remain stable.

   These are different estimands and must not be pooled. The current E2 harness covers the third family plus valid- and irrelevant-evidence arms. Clinical, narrative, and resource twins remain separate preregistered experiments.

2. **Point-in-time reconstruction**
   Freeze only information available before the target decision. Later diagnoses, imaging, specialist opinions, treatment response, and outcomes are excluded from the agent input and retained only for separately defined evaluation where justified.

3. **Human timing as an intervention**
   Distinguish silent mode, human commit-then-reveal, AI-first, and concurrent deliberation. Human-first independent commitment is the cleanest way to estimate AI-induced correction and AI-induced error, but it may add workflow burden and must be evaluated rather than assumed.

4. **Two-stage long-term architecture**
   - epistemic stage: facts, hypotheses, uncertainty, missing evidence, and must-not-miss alternatives;
   - action stage: safest feasible next step under patient, resource, and authority constraints.

   Saturday should demonstrate the interface between those stages, not implement an unrestricted treatment optimizer.

5. **Clinical Opinion Object as a future schema**
   The full research object should eventually include actor/model provenance, point-in-time snapshot, problem representation, ranked differential, public evidence graph, proposed action, patient implications, feasibility, uncertainty, and cited evidence. The Saturday minimum remains the tested escalation tuple plus provenance and a concise public warrant.

6. **Rao framing**
   The Rao meeting should resolve the construct, failure unit, apples-to-apples comparator, human-AI timing, and minimum silent-mode evidence package. These are decisions, not general discussion topics.

## Corrections and quarantines

1. The attachment's claim that the public repository had zero pull requests is stale/incorrect. Current evidence: PR #1 is merged; PR #2 and recovery PR #3 are open drafts. PR #3 contains PR #2 and is the integration surface.
2. The exact contest start time and the claim that all demonstrated code must be written after 09:00 Pacific are not yet verified against an organizer ruling. Use a prestart tag and build manifest, but do not present an inferred rule as official.
3. All quantitative claims and 2026 paper descriptions in the attachment remain **citation candidates** until the underlying paper, venue/status, sample, statistic, and limitations are checked. A URL or preprint identifier is not peer-reviewed Scopus confirmation.
4. A vote-change certificate records an agent's public explanation; it does not establish the causal reason for the change. Causal mechanism claims come from randomized assignment and matched prompts.
5. The current E2 does not establish general immunity to social conformity. It estimates susceptibility to a neutral, unsupported report that `3 of 4 members of a separate comparison panel` selected an action, in these fixtures, roles, prompts, and served models. The count is fabricated by the experiment, is not produced by Tribunal's four-seat safety panel, and contains no real votes or rationales.
6. Independent retrieval bundles are useful for product deliberation but would confound the controlled E2 mechanism experiment. E2 uses retrieval disabled or a frozen, hashed corpus.
7. The full illustrative tuple is not treated as invariant truth across information states. The E2 scored reference is one fixed planted escalation action; urgency, specialty, and missing-evidence fields are reported as outputs and agreement measures unless separately adjudicated.
8. The attachment's repository test counts are historical. Test totals are snapshot-specific and must be reported only from the same clean commit and CI run being presented.
9. Because every sealed state receives every E2 arm and only execution order is randomized, a case-level sign-flip calculation is not design-based exact randomization inference. Saturday reports paired stochastic prompt contrasts; any sign-flip p-value is labeled as a symmetry-assumption test.
10. A cited span is not automatically support. Evidence assertions now require speaker/source, experiencer, polarity, certainty, temporality, decision-time availability, value/unit, and an entailment label.
11. A single clinician rating on Saturday is provisional case feedback. It is not a gold standard, and any future clinician experiment requires an explicit ethics/consent determination.
12. The authenticated targeted Scopus AI search found no direct matching 2020–2026 empirical study in the retrieved abstracts. This is a bounded search-gap result, not proof of absence; adjacent papers remain primary-source verification leads.
13. Krishnan cautioned that classical Delphi protocols address a different setup than AI-agent medical decision-making (meeting note). Describe Tribunal as a Delphi-inspired sealed-commitment/revision protocol, never as a classical Delphi implementation.
14. Citation verification (2026-07-16, `_recovered/fable/FABLE_SOL_BRIEF_VERIFICATION_2026-07-16.md`): 12 of 13 attachment citation candidates verified against primary sources, zero fabricated. Two corrections bind: "unfaithful capitulation" is defined in arXiv 2605.29087, not 2602.13093; and only the generalized-Fleiss (Behavior Research Methods 2025) and pathology automation-bias (MELBA) items are peer-reviewed/accepted — label the rest preprints. The DRL "KDD" label remains unverified (see evidence ledger §6).
15. The attachment's claim that no authenticated browser channel to Scopus AI existed was a hypothesized limit, not an exhausted one: an actual attempt through the operator's authenticated Chrome session succeeded on 2026-07-16 (three grounded captures). Per the operator's rule, only limits exhausted by multiple documented attempts may be stated as real limits.

## Research-program map

| Question | Design | Current status | Honest claim |
| --- | --- | --- | --- |
| Does the analyzer implement named statistics? | exact toy oracles | executable | implementation behavior only |
| Does an unsupported count cue change a sealed action? | paired five-arm E2 | harness implemented; scripted providers only | local mechanism susceptibility |
| Does a clinically material fact change action appropriately? | clinician-authored paired E3 twins | protocol only | none yet |
| Does biased wording change action without evidence change? | matched narrative twins with blind clinician review | protocol candidate | none yet |
| Do resource limits alter feasibility without rewriting facts? | paired resource twins with separate fact/action endpoints | protocol candidate | none yet |
| Are AI panels reliable relative to clinicians? | same cases, information, codebook, and statistic | no construct-matched human data | none yet |
| Does Tribunal improve clinician decisions or time? | prospective commit-then-reveal or silent-mode study | future human-subject work | none yet |
| Is Tribunal cost-effective? | micro-costing now; outcome study later | protocol only | cost per run only |

## Integration sequence

### Before Rao

- use the one-page decision brief;
- verify the highest-value attachment citations through Scopus AI and primary records;
- bring the paired E2 design and ask whether the case or decision point is the correct independent unit;
- bring the filled evaluation-scenario worksheet covering user, decision point, setting, information/tools/time, comparator, action space, error consequences, degraded safe state, and deployment mode;
- ask which negative result would still justify a silent-mode research pilot.

### After Rao

- issue a dated decision addendum rather than silently rewriting the preregistration;
- update the failure taxonomy and governance evidence ladder;
- freeze the Saturday issue set, build boundary, and demo claim card.

### Saturday

- tag the disclosed pre-existing substrate;
- build the clinical workflow and interface on the day-of branch;
- use sponsor data only after authorization and provenance checks;
- keep deterministic simulation visibly labeled;
- report raw case counts, non-votes, intervals, costs, latency, and failures;
- show a clinician-facing escalation packet and a separate research audit panel.

## No-overclaim ledger

- Proposed construct is not a validated scale.
- Agreement is not correctness.
- Public rationale is not hidden chain-of-thought.
- A scripted-provider gate is not an LLM experiment.
- An LLM mechanism experiment is not clinical validation.
- A decision counterfactual is not a patient-outcome counterfactual.
- One clinician's feedback is workflow critique, not effectiveness evidence.
- Cost accounting is not cost-effectiveness.
