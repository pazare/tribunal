# Tribunal system card

Status: DRAFT v0 (2026-07-16) — assembled from documented claim boundaries during the Rao course-material audit; review before external use. Format follows the model-card practice Rao teaches at Stage Gates 2 and 3c (94-879 M3 s62, M5 s38–39; Mitchell et al.) adapted to a multi-agent system. Companion: [`RAO_COURSE_COVERAGE_LEDGER_2026-07-16.md`](RAO_COURSE_COVERAGE_LEDGER_2026-07-16.md).

## 1. System identity

- **Name:** Tribunal — an explainable decoder: verdicts generated span by span, every span elected (README).
- **Author/owner:** Pablo Zavala, CMU. Built at RAISE Summit Hackathon 2026, Cursor track; MIT license.
- **Three sibling systems, not one architecture** (SANTIAGO §1.9): (a) six-seat general deliberation engine → elected text spans with A1–A12 auditability scorecard; (b) Decoder Lab — two pinned CLI principals, exact `span|space|enter|stop` surface units, 2/2 quorum; (c) Tribunal Clinical — four clinical-role seats, coded escalation tuples, five-arm E2 revision experiment, exposure-bound safety packet.
- **This card covers all three; clinical rows are marked.**

## 2. Intended use

- Research and demonstration of **auditable multi-agent deliberation**: sealed commitments, identity-hidden critique, on-record vote changes, safety veto, named ratification rules, minority reports, hash-chained verdict ledger.
- **Clinical scope (bounded):** a research/safety-evaluation layer for one clinician-controlled question — does this case warrant specialist escalation, or is named evidence insufficient? Authority level: `DECISION_SUPPORT_ONLY`; a clinician retains decision authority (safety-packet.ts).
- Primary users: the project team, hackathon judges, research collaborators; clinician-facing packets are prototypes for feedback, not deployed tools.

## 3. Out of scope / never-claims (verbatim discipline)

Not an autonomous diagnostic, treatment, referral, or medical-advice system (README). Never claimed: lives saved; reduced mortality or morbidity; safer than clinicians; specialist equivalence; clinical validity or utility; cost-effectiveness; HIPAA compliance as a complete product; regulatory approval or readiness; general conformity resistance; independent multispecialty expertise from role prompts alone (SANTIAGO §19.6). Agreement is a process measure, never correctness (RAO_AND_ATTACHMENT_INTEGRATION no-overclaim ledger).

## 4. Architecture and autonomy posture

- Deterministic TypeScript kernel orchestrates an 8-phase election per decision slot (`packages/kernel/src/engine.ts`); providers are stochastic panelists behind a typed boundary (`providers/`). In Rao's terms: a programmed shell around emergent components; voting-based + debate-based cooperation with sealed first-round ballots (94-815 L6 s14–15); "who decides vs who acts" split — panel decides, ratification gates action (L3 s11).
- Autonomy: no autonomous external action. Human intervention endpoint (`POST /api/runs/:id/intervene`), safety-seat veto with public reason, explicit STOP as electable candidate. HITL, sensitive-domain posture.
- Seat constitutions (`charters.ts`): evidence, adversary, law_policy, affected_party, safety (sole veto), concision. Clinical variant uses four clinical-role seats with a frozen asymmetric summary rule (quorum 3; DO_NOT_ESCALATE requires 4/4; U0/U1 dissent or veto blocks non-escalation; ties → UNDERDETERMINED).
- Providers: offline deterministic (tests/demos, always labeled), local authenticated CLIs (codex/claude/xai with per-provider isolation postures; xAI and Cursor fail closed on protected data), OpenRouter multi-vendor. Provider child processes receive a minimal environment allowlist (`providers/cli-environment.ts`).

## 5. Data

- Demo packs: four constructed cases with planted traps (lending, insurance utilization review, benefits fraud flag, moderation statement-of-reasons), each with statutory constraint ids.
- Clinical fixtures: 8 author-defined mechanism fixture families, labeled `AUTHOR_DEFINED_MECHANISM_FIXTURE_NOT_CLINICIAN_VALIDATED` (clinical-eval types.ts). All clinical fixtures are author-defined synthetic (`fixtureBoundary` label, clinical-eval types.ts:90) and the demo packs are constructed cases; no clinical dataset is present (author attestation — the data-tier ladder A–D, incl. MIMIC-IV-Ext CDS, is a plan, not a current capability; PROTOCOL §5).
- Contamination posture: vignettes are project-authored (target-specific, low leak risk); freshness/rotation policy not yet defined — open item.

## 6. Evaluation status (evidence ladder position)

- **Metric oracles:** deterministic agreement statistics implemented and tested — raw agreement, Cohen/weighted kappa, Fleiss, **Krippendorff α, Gwet AC1** (`packages/clinical-eval/src/metrics.ts`). The E2 analyzer currently **emits** raw agreement, unanimity, nominal Krippendorff α with a case-cluster bootstrap 95% CI, and Gwet AC1 (`analysis.ts:297-309`); Cohen/weighted kappa, Jaccard, and generalized Fleiss are tested oracles not yet integrated as outputs (PROTOCOL §7.1).
- **Falsification gate (completed):** 240 scripted assignments (8 fixture families × 6 programmed adversarial policies × 5 arms); analyzer recovered every programmed effect exactly (`runs/clinical-eval/mechanism-simulator-v0.1-seed18/`). **Analyzer-behavior evidence only — not an LLM, clinician, or clinical result.**
- **E2 (designed, preregistered draft):** paired five-arm counterfactual harness — CONTROL / VALID_EVIDENCE / FALSE_MAJORITY / EVIDENCE_VS_FALSE_MAJORITY / IRRELEVANT_EVIDENCE — testing evidence-responsiveness vs an unsupported panel-count cue on sealed states. Estimates local cue susceptibility in these fixtures/models; not general conformity.
- **Not yet run:** E3 twin families, E4/E5/E6, any clinician-labeled evaluation, any human-baseline comparison. Sign-flip p-values are labeled symmetry-assumption tests, not randomization inference (analysis.ts).
- In Rao's lifecycle terms: behavior-calibration stage (94-815 L4 s5); pre-SG4; the demo is SG3c evidence. CLASSic instrumentation (cost/latency/stability σ) — planned, not yet captured.

## 7. Traceability and audit

- Hash-chained append-only ledger; `verifyLedger()` recomputation + linkage + span cross-check; tamper evidence is real but **unanchored without a published head hash**; 13 anchored run heads in `runs/ANCHORS.md`.
- Execution receipts: pre-call manifests, per-call receipts, replay verification; receipt claims enum fixes independent preregistration/time/tamper/issuance evidence at `NOT_ESTABLISHED` without external anchors (receipt.ts).
- A1–A12 auditability scorecard computed from run artifacts; single-model baseline scores 0/12 by construction; three live three-vendor CLI runs deliberately kept at 11/12 (A11 STOP-ratification miss documented in honesty.md); one live two-vendor lending run and nine offline runs verify 12/12 (runs/ANCHORS.md).
- Equivalences (as taught): ledger+receipts = his "make it auditable (configs, hashes, changelog, artifact pack)" bundle (95-820 L8 s18); ModelOps inference-traceability (94-879 ModelOps p30); structured traces with spans (94-815 L7 s17).

## 8. Known limitations and open gaps

1. No human baseline data; no clinician labels; single-clinician feedback would be workflow critique only.
2. 8 author-defined fixtures, 1 replicate; no power analysis yet (PROTOCOL §8 lists prerequisites).
3. No-leakage status `NOT_ESTABLISHED` for system prompts/tools/filenames (PROTOCOL §9).
4. Preregistered secondary endpoints (tuple components, cluster intervals) not all implemented in the analyzer (PROTOCOL §7.1).
5. External terminology mappings (SNOMED/ICD-10/LOINC/RxNorm/CPT/FHIR) are a plan, not implemented.
6. Cluster intervals for raw agreement/unanimity/AC1 and output integration of Cohen/weighted kappa, Jaccard, and generalized Fleiss remain open (PROTOCOL §7.1); nominal Krippendorff α + case-cluster bootstrap and Gwet AC1 are already emitted.
7. Post-deployment monitoring, drift detection, retraining/retirement cadence: designed vocabulary only; nothing stood up.

## 9. Safety and governance

- Exposure-bound safety packet binds clinician-facing content to authorized E2 exposure records via hashes; authority/verifier registries separate who may decide, who checks, and who ratifies (three-lines-of-defense shape).
- Prompt-injection boundary: case documents serialized as untrusted JSON data, never instructions (`prompt.ts` UNTRUSTED_DATA_RULES); strict-JSON extraction for voting paths.
- Privacy posture: no cross-run/cross-case agent memory (within-run deliberation memory is ledgered and scored — scorecard A9); per-case session state; minimal provider environments; protected-data paths fail closed where isolation is not established. DPIA-style data-exposure map: not yet written (open item).
- Governance change control: preregistration changes only via the dated decision addendum; expert answers recorded ADOPT/TEST/DEFER/REJECT.

## 10. Provenance of this card

Sources: repo docs and code as inventoried in `_rao-course-audit/E_build_inventory.md` (anchors therein); course-material equivalences from the four Rao-course audit reports. This card asserts no new capability or result; where it conflicts with README/PROTOCOL/SANTIAGO, those documents govern.
