# Tribunal → canonical NUDG: extraction dossier (ancestral layer)

**Document status.** Formal extraction performed 2026-07-19 of the Tribunal system's mechanisms
(this repository, `github.com/pazare/tribunal`) for re-implementation inside the canonical NUDG
companion application. This file is the Tribunal-layer root of a three-generation document
graph whose NUDG-MD-layer root is `docs/integration/DISCOVERIES.md` in `pazare/nudg-md`; the
target-specific mapping (private-repository internals) resides in the private repository at
`docs/NUDG_MD_INTEGRATION_MAP.md` and is not duplicated here.

**Ground truth = the working tree at extraction time**, which materially exceeds HEAD
(`pazare/tribunal-hackathon-recovery-20260716`): the entire structural verifier
`packages/kernel/src/ledger-structure.ts` (881 lines) is **untracked**, and ≥11 cited source
files are modified vs HEAD. Every specification in this directory records modified-vs-HEAD
status per citation. Preservation: a full snapshot (diff patch + untracked archive) was taken
2026-07-19 before any documentation work; committing the working tree to the recovery branch
is a standing recommendation (§4), not an action taken by this dossier.

**Register.** Formal throughout. Series used here: T*n* (subsystems), LIN*n* (lineage),
CT*n* (findings/corrections), DL*n* (design laws — numbering **continues** from DL1–DL6 of
the NUDG-MD dossier), OB*n* (integration obligations — numbering **continues** from OB1–OB10
of the NUDG-MD dossier), K*n* (conjectures — continues K1–K2). Epistemic status per claim:
**[V]** re-derived independently during synthesis (line read or recomputed); **[E]** extracted
by a specification agent with `file:line` citations recorded in the owning spec; **[C]**
conjecture, never used as a premise.

---

## 0. Document graph (Tribunal layer)

| File | Contents | Apparatus |
|---|---|---|
| `SPEC_KERNEL_LEDGER.md` | 8-phase election Φ1–Φ8 as an LTS with information sets; sealing mechanics; identity-hidden feedback; ratification cascade; hash-chained ledger (18-kind event alphabet) + two-layer replay verifier; determinism; surface grammar; 5 worked traces incl. an 8-row tamper matrix | 1,046 lines; ~265 citations; INV1–INV20; 5 lemmas + 7 theorems proved; N1–N9; DK-1–DK-21 |
| `SPEC_PROVIDERS_DECODER_SCORECARD.md` | Provider boundary as interface-with-laws (L1–L14 × 4 implementations); credential confinement; decoder 2/2 election with total re-verification; default-deny operator gate; sealed-ledger invariant; A1–A12 scorecard with process-not-quality theorem; worker/server verifier agreement | 1,000 lines; 31 definitions; INV1–INV12; 6 lemmas + 3 theorems proved; F1–F6; DE-1–DE-10 |
| `SPEC_CLINICAL_EVAL.md` | Execution receipts (run receipt v4 + legacy v3 with version-dispatch replay), exposure-bound safety packet, authority/verifier registries, frozen asymmetric summary rule, five-arm E2 design, 8 estimands + falsification harness, external-observation provenance | 701 lines; 38 definitions / 18 schema shapes; INV-CLAIMS, INV-COMPAT, INV-AUTH, INV-CLIN; 10 lemmas + 4 theorems proved; C1–C2; DF-1–DF-16; 24 validation gates; 3 worked traces; ~50-row test-witness map |

Kernel ground truth: `packages/kernel/src/` (engine 826, types 525, ledger-structure 881
[untracked], prompt 204, ledger 146, feedback 121, panel 109, surface 95, hash 38, ratify 259,
rng 13). Boundary ground truth: `packages/kernel/src/providers/` (5 implementations, 1,815),
`apps/server/src/` (2,653), `packages/scorecard/src/` (441), `apps/worker/src/` (156).
Clinical ground truth: `packages/clinical-eval/src/` (7,011). Intent: `docs/honesty.md`,
`docs/architecture.md`, `docs/hackathon/TRIBUNAL_SYSTEM_CARD.md`.

---

## 1. Subsystem inventory (T1–T10)

**T1 — Hash-chained event-sourced ledger with two-layer replay verification.** Events are
typed records hashed as canonical JSON — key-sorted recursively, `undefined` omitted so it
never perturbs the hash — through SHA-256 (**[V]** `packages/kernel/src/hash.ts`, whole
file); each event's hash covers `{seq, runId, spanIndex, ts, kind, payload, prevHash}` **[E]**,
giving per-event linkage. Layer 1: `verifyLedger()` recomputes the chain. Layer 2 (the
untracked `ledger-structure.ts`): ~15 structural cross-checks — answer cross-check, prefix,
seal, feedback, safety-coverage, veto-bindingness, dissent — which are what defeat
relink forgeries (an adversary who re-hashes a tampered tail still fails structure) **[E]**.
Tamper-evidence theorem proved under SHA-256 collision resistance, with an 8-row tamper
matrix mapping each tamper class to the exact failing check **[E]**. Non-guarantee, stated
as the honesty policy states it: chains are **unanchored**; integrity is relative to the head
hash of the copy verified; publishing the head hash externally is the anchoring act.

**T2 — Eight-phase sealed deliberation (Φ1–Φ8).** Per decision slot: blind proposal under
sealed commitments → identity-hidden aggregate feedback → revision → vote → safety
verdict → ratification → dissent preservation → seal; 16 per-slot event kinds within an
18-kind alphabet **[E]**. Information sets are specified per phase (who can condition on
what, when); the no-conditioning claim for first-round ballots is **procedural at the
provider level** — enforced by prompt construction, not by cryptographic commitment against
a colluding provider — recorded as conjecture K3, not as a theorem **[E→C]**.

**T3 — Fail-closed vote hygiene.** Any provider output with `repaired > 0`, or failing
shape/identity validation, becomes a typed `incomplete` **non-vote** that can never enter
quorum, safety verdicts, or ratification (**[V]** guard sites `engine.ts:193`, `engine.ts:307`:
`attempt.repaired > 0 || !valid…`). Quorum for every gated phase is
`max(2, ⌊panelSize/2⌋ + 1)` **plus** a safety seat (**[V]** `engine.ts:77`, mirrored
`ledger-structure.ts:833`); failure to reach it yields a typed `degraded` outcome, never a
silent verdict **[E]**.

**T4 — Ratification cascade, binding vetoes, STOP as candidate.** Seven ordered ratification
guards, each an exact predicate over vote state **[E]**; vetoes are binding and carry a
public reason; STOP is a first-class electable candidate, not an error path; a cancellation
seals `run_finished.stoppedBy=cancelled` with actor/reason/time and the exact IDs of queued
interventions that never applied, and is **never rendered a verdict** **[E]**. This is the
who-decides-vs-who-acts split: the panel decides; ratification gates action.

**T5 — Decoder 2/2 election with total re-verification.** Two pinned CLI principals emit
surface units over the closed alphabet `span|space|enter|stop`; each unit is elected under a
2/2 quorum with a precommitted tie rule; every prompt, raw CLI receipt, validation, and
selection rule is **re-derivable from the ledger by the same functions that generated them**
(verified-transcript soundness theorem) **[E]**; STOP is never unilateral (lemma) **[E]**;
model drift invalidates replay attempts rather than silently passing **[E]**.

**T6 — Provider boundary as interface-with-laws.** The provider contract is stated as 14
laws L1–L14, each with an executable falsifier, checked across the four implementations
(cli, decoder-cli, offline, openrouter) in a law×implementation matrix **[E]**. Credentials
are read from the environment at call time only; no persistence or logging path carries
them (verified per implementation) **[E]**. The offline provider is deterministic and
always-labeled — the ancestor of NUDG MD's monotone-provenance SCRIPTED lane.

**T7 — Default-deny operator gate and sealed-ledger invariant.** A single-token/session
principal over **exact Host+Origin allowlists** gates all quota-consuming, mutating, and
ledger routes **even on loopback** **[E]**; no endpoint mutates a persisted ledger — the
tamper-demonstration route mutates a clone **[E]**. Residuals stated, not hidden: no rate
limiting; operator-supplied actor labels are unsigned; chains unanchored (T1).

**T8 — A1–A12 process-only scorecard.** Twelve predicates ranging exclusively over the
run's own artifacts, with anti-triviality checks; the process-not-quality theorem is proved
with a constructive witness (a run scoring 12/12 whose answer is wrong) **[E]** — the
scorecard certifies process conformance and can certify nothing else. Ancestor of the
NUDG MD restraint/KPI discipline (ROI dossier §7).

**T9 — Clinical-eval layer.** Four mechanisms, all specified in `SPEC_CLINICAL_EVAL.md`:
(i) **Replay-verifiable run receipts**: every hash recomputable from repository contents
alone, including full semantic re-analysis and prompt-hash re-derivation; the verifier
dispatches on the receipt's **own recorded** schema/template version (run receipt v4 with
legacy v3 dispatch — the d8dc13c mechanism), so committed schema-3 runs remain verifiable
under a newer writer (INV-COMPAT) **[E]**; a claims ceiling pins every external-evidence
field to `NOT_ESTABLISHED` (INV-CLAIMS) **[E]**. (ii) **Exposure-bound safety packet**
(2,710-line assembly): every clinician-facing claim chains
assertion → exact authorized span → derived decision-time availability →
separated-verifier attestations, with **exact-set registry equality** forbidding
relabeling; authority is the non-escalatable singleton `DECISION_SUPPORT_ONLY` (INV-AUTH)
with clinician retention attached at every rendering surface (INV-CLIN) **[E]**.
(iii) **Frozen asymmetric 4-seat summary rule**: escalation at quorum 3/4;
`DO_NOT_ESCALATE` requires 4/4 unanimity; urgent dissent and veto can block
**non-escalation only** — the two error directions are priced differently by construction
**[E]**. (iv) **Deterministic falsification harness**: a 6-policy mechanism simulation
whose known policies the analysis pipeline must recover **exactly** across all 8 estimands
before any real run is analyzed **[E]**.

**T10 — The honesty policy as an artifact.** `docs/honesty.md` is itself a mechanism: a
claim/non-claim table pair with per-claim meaning, a live-decoder claim boundary, and
verbatim never-claims. It is the direct ancestor of the NUDG MD evidence pack's boundary
rules and of `TRIBUNAL_SYSTEM_CARD.md` §3's never-claim discipline. Integration carries the
artifact form, not just its content (OB18).

---

## 2. Lineage map (three generations, one discipline)

Format: mechanism — Tribunal form → NUDG MD descendant → canonical-target disposition
(target file specifics live in the private map; dispositions here are abstract).

- **LIN1 receipts.** Hash-chained ledger + replay verifier (T1) → latency receipts +
  sanitized rolling log (a deliberately degenerate receipt: timing without chaining) →
  target already carries per-turn provenance receipts natively; disposition: one receipt
  algebra (OB11), with `hash.ts` portable as-is [V: pure module, no kernel imports].
- **LIN2 deliberation.** Sealed 8-phase election (T2) + support counts → S6 count-display
  ("Supported: k/n", never averaged confidence) + UNDERDETERMINED refusal → target has an
  honest-count panel/vote module natively; disposition: extend with seal/feedback phases
  where multi-seat depth is requested (OB13, OB14).
- **LIN3 refusal.** STOP as electable candidate + cancellation-never-a-verdict (T4) →
  UNDERDETERMINED as first-class outcome; cancel narrated "no hidden work" → disposition:
  refusal and cancellation as typed outcomes in the gateway metadata contract (OB9, OB14).
- **LIN4 honesty rails.** Claim/non-claim tables (T10) → evidence-pack boundary rules as a
  type system (never-sum; RR↛individual; authority non-transfer; UNVERIFIED fixed) →
  disposition: ship the artifact form — system card + claim boundary — with the companion
  (OB18).
- **LIN5 process scoring.** A1–A12 process-only scorecard (T8) → restraint metrics
  (nudges/encounter < 1, silence rate) + KPI schema → disposition: companion-run scorecard
  scored only from run artifacts (OB18).
- **LIN6 tempo.** NOW/FOCUSED/DEEP/WATCH originated in the Tribunal Clinical master plan →
  adopted as S8 vocabulary (partially realized) → disposition: explicit scheduling-policy
  lattice (OB6).
- **LIN7 authority.** `DECISION_SUPPORT_ONLY` non-escalatable singleton + clinician
  retention at every rendering surface (T9, INV-AUTH/INV-CLIN) → "decision support: you
  decide" footer → disposition: authority registry with the non-escalation invariant
  (OB19).
- **LIN8 provider heterogeneity.** Vendor round-robin across seats, with the explicit
  non-claim of causal error-decorrelation → two-lane claude+codex with labeled modes →
  disposition: provider registry with per-lane provenance metadata (OB9).
- **LIN9 fail-closed parsing.** `repaired>0 ⇒ non-vote` (T3) → **no NUDG MD descendant —
  a regression**: the demo panel trusts parsed seat outputs → disposition: restore the law
  at the gateway boundary (OB12, DL7).
- **LIN10 loopback security.** Default-deny operator gate over Host+Origin allowlists even
  on 127.0.0.1 (T7) → NUDG MD relay had no equivalent (demo posture) → disposition: the
  target's loopback ingest adopts T7's gate pattern (OB15) — directly relevant since the
  chosen transport is loopback HTTP.

---

## 3. Findings and corrections (CT1–CT8)

- **CT1 [V]** With `debateRounds = 0`, a decision whose method is `escalate_for_evidence`
  can commit **without any escalation round having run** — the round is guarded by
  `decision.method === "escalate_for_evidence" && config.flags.debateRounds > 0`
  (`engine.ts:475`; guard confirmed by direct read), contradicting the "never cosmetic"
  design comment. Integration rule: an escalation *method* must entail an escalation
  *round*, or the method label must change.
- **CT2 [E]** The ratifier's synthesized-STOP path produces an uncommittable outcome; the
  engine degrades instead of committing it (DK-10).
- **CT3 [E]** Round-1 vetoes remain sticky across escalation rounds (DK-13) — a veto cast
  against a superseded proposal still binds its successor; defensible (conservative) but
  undocumented.
- **CT4 [E]** Slot exhaustion is mislabeled `max_spans` (DK-9).
- **CT5 [E]** One scorecard conjunct is dead (statically true over reachable artifacts)
  (DE-register).
- **CT6 [E]** Panel-CLI stream parsing has a latent UTF-8 chunk-split defect (multi-byte
  codepoint split across read chunks) (DE-register).
- **CT7 [V]** `ledger-structure.ts` — the entire structural verification layer, 881
  lines — is **untracked**; the strongest tamper-evidence claims of T1 currently rest on a
  file git does not know (confirmed via `git status`). See §4.
- **CT8 [E]** Documentation drift: stale test counts and endpoint claims in intent docs
  vs the working tree (DE-register).

---

## 4. Preservation obligation (standing, urgent)

The working tree exceeds HEAD by: `ledger-structure.ts` (untracked; carries the entire
Layer-2 structural verification), `apps/server/src/request-security.ts` (untracked),
`docs/hackathon/TRIBUNAL_SYSTEM_CARD.md` (untracked), and ≥11 modified sources including
`docs/honesty.md`. (`packages/clinical-eval/` is tracked clean vs HEAD — the clinical layer
is already committed.) Until the rest is committed, the affected [V]/[E] claims in this dossier
is valid **only against a tree that exists on one machine**. Snapshot taken 2026-07-19
(diff patch + untracked archive, session scratchpad). Recommendation R1: commit the working
tree to `pazare/tribunal-hackathon-recovery-20260716` and push. This dossier's own files are
committed independently and do not stage any source file.

---

## 5. Design laws (continuation) and integration obligations

**DL7 — Fail-closed parsing.** A repaired, coerced, or shape-invalid model output is not a
vote, a verdict, or a signal; it is a typed `incomplete` that downstream quorum logic must
count as absence. (T3; regression LIN9 shows the cost of dropping it.)

**DL8 — Process/quality separation.** Any scorecard over agent runs ranges over process
artifacts only and must be accompanied by its process-not-quality statement; a perfect
process score plus a wrong answer is a *satisfiable* configuration and must remain
representable. (T8.)

**DL9 — Verification is replay.** An audit artifact is trustworthy exactly insofar as an
independent party can recompute it from inputs the artifact itself names: hash chains
re-hashed, prompts re-derived, selections re-selected, semantic analyses re-analyzed.
Attestation without recomputation is labeling, not verification. (T1, T5, T9(i).)

**DL10 — Asymmetric conservatism.** Safety-domain decision rules price the two error
directions differently, by construction: the risky-averse direction (escalate) clears at
majority; the risk-accepting direction (stand down) clears only at unanimity; dissent and
veto block only the risk-accepting direction. A symmetric rule in an asymmetric-loss domain
is a modeling error. (T9(iii); coherent with T3's degraded-not-silent and LIN3's refusal
lineage.)

**DL11 — Falsification before analysis.** Every analysis pipeline ships a deterministic
mechanism simulation with known ground-truth policies; the pipeline must recover those
policies exactly before it may touch a real run. An estimator that has never been run
against known truth has no error model, only hope. (T9(iv).)

Obligations (continuing OB1–OB10 of the NUDG-MD dossier):
**OB11** one receipt algebra: ledger events ⊇ execution receipts ⊇ latency receipts, all
over the canonical-JSON/SHA-256 module (`hash.ts` ports verbatim). **OB12** strict-parse
gateway boundary implementing DL7. **OB13** quorum-with-safety gating
(`max(2,⌊n/2⌋+1)` + safety seat; `degraded` as a typed outcome) for every multi-seat
feature. **OB14** ratification cascade with binding public-reason vetoes and STOP/refusal
as typed outcomes gating any side-effectful action. **OB15** default-deny loopback gate
(exact Host+Origin allowlists, single operator principal) on the companion's HTTP ingest.
**OB16** sealed-ledger invariant: persisted audit artifacts are immutable at the API; tamper
demos operate on clones. **OB17** anchoring procedure: publishing the head hash is a
defined, documented operation (what it proves, what it does not). **OB18** ship the honesty
artifacts (claim/non-claim tables, system card, process scorecard) as versioned files in the
companion, not as prose in a README. **OB19** authority registry with the non-escalation
invariant and clinician/user retention attached at every rendering surface (T9(ii),
INV-AUTH/INV-CLIN). **OB20** exposure-bound claim chaining for any user-facing assertion
derived from AI output: assertion → authorized source span → decision-time availability →
verifier attestation, with exact-set registry equality (T9(ii)). **OB21** falsification
harness precedes analysis: DL11 as a merge gate for any metrics/analysis module.

Conjectures (continuing K1–K2): **K3 [C]** first-round ballot independence is procedural
(prompt-level), unenforced against a colluding provider; missing: commitment-scheme
enforcement or a formal trust statement. **K4 [C]** cross-runtime byte-identity of
canonical JSON between Node server and Workers runtime (worker/server verifier agreement is
proved at the function level; byte-level identity across JS engines is asserted by test
coverage only). **K5 [C]** receipt sequentiality beyond transcripts (that recorded call
order equals true wall-clock provider order is transcript-relative). **K6 [C]** fixture
adequacy: the falsification harness's 6 policies span the estimand space actually exercised
by real runs (adequacy is argued, not proved).

---

## 6. Proved-results table (Tribunal layer)

| Result | Status | Where |
|---|---|---|
| Tamper evidence: 8 tamper classes each caught by a named check (chain or structure) | Proved [E]; hash layer read [V] | SPEC_KERNEL_LEDGER |
| Unanchored-chain non-guarantee: third-party conclusions bounded by head-hash provenance | Stated + proved relative form [E] | SPEC_KERNEL_LEDGER |
| Kernel determinism given (inputs, seed, provider transcript); nondeterminism sites enumerated | Proved [E] | SPEC_KERNEL_LEDGER |
| Fail-closed vote hygiene: repaired/invalid ⇒ typed non-vote; quorum+safety else degraded | Guard sites read [V]; full proof [E] | SPEC_KERNEL_LEDGER |
| Veto bindingness; STOP-never-unilateral; cancellation-never-a-verdict | Proved [E] | SPEC_KERNEL_LEDGER / _PROVIDERS_ |
| Verified-transcript soundness: decoder replay re-derives prompts, receipts, selections | Proved [E] | SPEC_PROVIDERS_DECODER_SCORECARD |
| Provider laws L1–L14 × 4 implementations, each with executable falsifier | Matrix [E] | SPEC_PROVIDERS_DECODER_SCORECARD |
| Credential confinement (env at call time; no persist/log path) | Proved per impl [E] | SPEC_PROVIDERS_DECODER_SCORECARD |
| Sealed-ledger invariant; default-deny operator gate incl. loopback | Proved [E] | SPEC_PROVIDERS_DECODER_SCORECARD |
| Process-not-quality with constructive witness (12/12 ∧ wrong) | Proved [E] | SPEC_PROVIDERS_DECODER_SCORECARD |
| Offline-provider determinism; always-labeled invariant | Proved [E] | SPEC_PROVIDERS_DECODER_SCORECARD |
| Receipt replay verifiability incl. legacy version dispatch (INV-COMPAT) and claims ceiling (INV-CLAIMS) | Proved [E] | SPEC_CLINICAL_EVAL |
| Authority non-escalation (INV-AUTH) + clinician retention at every surface (INV-CLIN) | Proved [E] | SPEC_CLINICAL_EVAL |
| Exposure-bound claim chaining with exact-set registry equality (no relabeling) | Proved [E] | SPEC_CLINICAL_EVAL |
| Asymmetric summary rule (3/4 escalate, 4/4 stand-down, dissent blocks stand-down only); 8 estimands recovered exactly by the falsification harness | Proved [E] | SPEC_CLINICAL_EVAL |

Anything not in this table is inventory, lineage, law, obligation, or conjecture, and is
labeled as such at its site.
