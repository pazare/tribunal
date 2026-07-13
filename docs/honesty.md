# Honesty policy

Tribunal's value proposition is **auditability**, not better answers. Every public statement, UI label, and scorecard comparison must respect the hierarchy below.

## What we claim

| Claim | Meaning |
|-------|---------|
| Due-process structure | Blind proposal, sealed commitments, anonymized feedback, revision, safety veto, named ratification, preserved dissent, STOP as first-class |
| Cross-provider panel | Different vendors' models on different seats can reduce correlated failure modes — committed live runs used two vendors (openai+xai) and three vendors (openai+xai+anthropic) round-robined across six seats |
| Event-sourced verdict ledger | Hash-chained, schema-typed events emitted **during** the run |
| Tamper detection | Any field edit, reorder, or deletion breaks hash linkage or the answer cross-check |
| Human auditor in the loop | Typed or voice interventions become real `human_intervention` events; vetoes bind outcomes |
| Safe cancellation | A stop seals `run_finished.stoppedBy=cancelled` with actor, reason, time, and exact IDs for queued interventions that never applied; it is never labeled a verdict |
| A1–A12 scorecard | Twelve checklist items scored only from the run's own artifacts, with anti-spoof guards |
| Independent verify | Anyone can re-run `verifyLedger()` on exported events (`POST /api/verify`, `npm run demo`, or the Cloudflare Worker) |

## What we do NOT claim

| Non-claim | Why |
|-----------|-----|
| Better decision quality | No controlled study here; fluent text can still be wrong |
| Faithful "chain of thought" | Post-hoc rationales are unreliable; we record cross-examined public warrants instead |
| Cryptographic proof to third parties | Chains are **unanchored** unless the head hash is published outside the copy you are verifying |
| Perfect anonymization | We strip identity/provider/seat fields by type; we do not claim stylometric anonymity |
| Offline panel as AI | Deterministic offline mode is scripted for CI/tests and is always labeled |
| Stored credentials | Keys and CLI auth are read from the environment at call time only |

## Live decoder claim boundary

Decoder Lab may say **complete observed public provider exchange** when its
ledger contains every prompt sent by the decoder and every public CLI response
and process receipt received. It must not shorten that to "complete reasoning"
or "full chain-of-thought." Provider-hidden reasoning, system text, policies,
logits, and internal execution traces are unavailable. Public warrants and
critiques are auditable statements produced for the protocol, not measurements
of hidden cognition.

The live decoder also distinguishes requested configuration from served-model
evidence. `gpt-5.6-sol` / `medium` and `claude-opus-4-8` / `medium` are command
pins. A binary version probe proves only local availability. Served identity is
reported only when the CLI itself supplies it in the live receipt; any reported
model outside the pinned pair is rejected from quorum and left visible as a
failed attempt.

## Invariants (copy-paste for contributors)

1. Never claim answer-quality improvement. The claim is auditability.
2. Tamper-evidence is real but unanchored without external head-hash publication (`runs/*/meta.json` for committed runs).
3. Offline mode is never presented as model output.
4. CLI keys and `OPENROUTER_API_KEY` are env-only, never stored.
5. Single-model baseline scores **0/12 by construction** on A1–A12. That asymmetry is the honest point, not a stacked deck.
6. Anonymization removes identity fields, not writing style.
7. Back-filled or trivial rationale **fails** scorecard items even when structure passes.
8. If kernel ledger logic changes, update `apps/worker/src/index.ts` in the same change.
9. Cancellation preserves already-ratified spans, records aborted calls as `cancelled`, and never implies that queued interventions applied.

## Scorecard honesty

`@tribunal/scorecard` evaluates A1–A12 only against ledger artifacts:

- **A1** — Blind commitments precede reveal; sealed hash matches proposal.
- **A2** — Public warrant on every candidate; repairs fail.
- **A3** — Feedback anonymized (no identity fields).
- **A4** — Per-recipient candidate order randomized.
- **A5** — Revision round with substantive objection answer + steelman (non-trivial).
- **A6** — Safety veto exercised as real code path when enabled.
- **A7** — Named ratification rule + public reason.
- **A8** — Material dissent preserved.
- **A9** — Deliberation memory persisted across spans.
- **A10** — Hash chain verifies (with unanchored caveat in evidence text).
- **A11** — STOP ratified explicitly when chosen.
- **A12** — Typed, schema-validatable event log.

`baselineReport()` returns 0/12 for a hypothetical single-model answer with an explicit explanation that no ledger exists. The UI and docs must present that contrast as structural, not as proof Tribunal "wins" on merit.

## The scorecard fails our own live runs — on purpose

Three committed live cli runs score **11/12**, missing only A11 ("STOP ratified explicitly"), and the ledgers show exactly why:

- `run_a25a5165e3a7` (insurance, openai+xai+anthropic, 346 events): on both completion spans every seat proposed STOP first — then, after anonymous cross-examination, the panel ratified text naming an unsupported physician-review attestation instead of declaring the verdict whole.
- `run_5467a5efcf9c` (lending, openai+xai+anthropic, 306 events): on the completion retry span STOP won majority support 3–2 — and the safety seat's binding veto (`safety_gate`) overrode it, electing a scope-limitation clause instead.
- `run_b51538e11c68` (insurance, openai+xai+anthropic, 201 events): the earliest of the three; the completion span committed notice text and the run ended by slot exhaustion — the miss that motivated the completion-retry mechanism.

We could tune the election so A11 always passes on our own demos. We won't: a panel that refuses to call an incomplete verdict "whole" — or whose safety seat vetoes STOP over a residual risk — is the mechanism working. The refusal is on the ledger with a named rule and a public reason, and the scorecard reports what happened, not what markets well.

## Anchoring caveat (important)

An adversary who holds the **only** copy of a ledger can recompute a self-consistent forged chain. Detection requires either:

- an independently kept copy, or
- a **published head hash** (we store `head` in `runs/<runId>/meta.json` for committed real runs).

Verification proves internal consistency of the bytes you provide; it does not prove provenance unless anchored.

## Sponsor and infra phrasing

Use **supported / ready / available in repo** unless a run artifact proves use:

- OpenRouter multi-vendor panel — ready when `OPENROUTER_API_KEY` is set
- Cloudflare Worker verify — code deployable; not deployed during the event without a CF account
- SUSE BCI container — `Dockerfile` uses `registry.suse.com/bci/nodejs:22`
- Cursor — project built with Cursor; CLI seat uses locally installed `cursor-agent`

Do not state that NVIDIA hardware, Azure, or Cloudflare edge was used in a specific demo unless the run's `provider_call` events show it.

## Regulatory context (why audit surfaces matter)

Tribunal does not provide legal advice. The product addresses a documented gap: high-stakes automated decisions often ship as fluent text with weak or unfaithful post-hoc explanation. Regulators and courts increasingly expect **reasons you can inspect**:

- US fair lending: Equal Credit Opportunity Act (ECOA), Regulation B adverse-action notice requirements; CFPB Circular 2022-03 on black-box credit models
- Insurance: public reporting on automated claim denials (e.g. ProPublica on Cigna's PxDx program), litigation such as *nH Predict* class actions, California SB 1120 (utilization review transparency)
- Benefits: Royal Commission into Robodebt (Australia), Dutch *toeslagenaffaire*, Michigan MiDAS false fraud flags
- Content moderation: EU Digital Services Act Article 17 statement-of-reasons obligations
- EU AI Act: logging and human-oversight duties for high-risk systems; GDPR Article 22 on automated decisions with legal/significant effects

Tribunal is a **technical demonstration** of a richer audit artifact, not a compliance certification.
