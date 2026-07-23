# Architecture

Tribunal is an npm-workspaces monorepo. The **kernel** owns the due-process engine and hash-chained ledger; everything else consumes its frozen types.

## Package map

| Package / app | Role |
|---------------|------|
| `@tribunal/kernel` | Engine, ledger, panel adapters (CLI, OpenRouter, offline), `verifyLedger()` |
| `@tribunal/scorecard` | A1–A12 auditability checklist with limited anti-triviality checks |
| `@tribunal/packs` | Domain case files — lending, insurance, benefits, moderation (all implemented) |
| `@tribunal/server` | Node HTTP + SSE API, exact seat assignment, intervention queue, safe cancellation, run persistence |
| `@tribunal/web` | Vite React deliberation-theater UI |
| `apps/worker` | Cloudflare Worker: WebCrypto hash checks plus the shared canonical protocol state verifier |
| `runs/` | Committed replayable run ledgers (live CLI + scripted offline) + `meta.json` head hashes |

## Event kinds (verdict ledger)

Every phase emits a typed, hash-chained event. Kinds are defined in `packages/kernel/src/types.ts`:

| Kind | When |
|------|------|
| `run_started` | Protocol version, panel roster, config, offline vs live note |
| `decision_opened` | New decision slot begins |
| `case_presented` | Full case file shown to the engine |
| `blind_commitment` | SHA-256 seal of each round-1 proposal **before** reveal |
| `proposals_revealed` | Proposals + hash recomputation checks |
| `feedback_issued` | Anonymized packet or identity-visible control-arm packet |
| `feedback_view_assigned` | Per-recipient candidate order (position-bias control) |
| `revision_received` | Seat answers strongest objection, steelmans rival |
| `safety_review` | Dedicated safety-seat verdict for every eligible candidate; veto power |
| `escalation_triggered` | Evidence escalation path fired |
| `ratification` | Named constitutional rule + public reason |
| `dissent_preserved` | Material minority dissent on the record |
| `span_committed` | Ratified span appended (or STOP) |
| `human_intervention` | Auditor objection / veto / question / affirm |
| `memory_updated` | Role / deliberation memory writes |
| `provider_call` | Provenance: provider, model, latency, transport |
| `decision_closed` | Slot finished |
| `run_finished` | Final answer + stop reason + totals |

## Phase diagram (per decision slot)

```
┌─────────────┐
│ case_presented
└──────┬──────┘
       ▼
┌──────────────────────────────────────┐
│ Round 1: blind proposals (parallel)   │
│  each seat → provider_call            │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ blind_commitment (sealed hashes)      │  ← ledgered BEFORE reveal
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ proposals_revealed + hashChecks       │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ feedback_issued (anonymous/control)   │
│ feedback_view_assigned (order perm)   │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ revision_received (debate round)      │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ candidate-level safety calls/review   │
│ (+ separately attributed human veto)  │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ ratification + dissent_preserved      │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ span_committed → decision_closed      │
└──────┬───────────────────────────────┘
       ▼
   (next slot or run_finished)
```

Between slots, `memory_updated` may carry unresolved objections forward. Protocol v2 requires a strict-majority quorum (four of six in the default panel), valid safety-seat participation, and a dedicated safety verdict for every eligible candidate. Any proposal, revision, or safety response that required repair is an `incomplete` non-vote. Quorum or safety loss terminates as `degraded`; it cannot ratify from one survivor.

`run_finished` closes the chain. `verifyLedger()` checks exact event envelopes and payload schemas, known kinds, one consistent run id, legal span/phase transitions, quorum and safety coverage, terminal uniqueness, prefix evolution, hash linkage, and exact `finalAnswer` reconstruction. Immutable unversioned ledgers are verified under the legacy v1 contract; new runs declare `protocolVersion: 2`.

## Hash chain

Each event body (excluding `hash`) is canonicalized JSON (keys sorted recursively, `undefined` omitted) and SHA-256 hashed. Fields: `seq`, `runId`, `spanIndex`, `ts`, `kind`, `payload`, `prevHash`. Genesis `prevHash` is 64 zeroes.

Implementation: `packages/kernel/src/hash.ts`, `packages/kernel/src/ledger.ts`. Edge port: `apps/worker/src/index.ts`.

## Panel modes

| Mode | Transport | Use |
|------|-----------|-----|
| `offline` | Deterministic scripted panel | CI, `npm run demo`, tests — **not model output** |
| `cli` | Spawn locally installed CLIs using their existing local authentication | OpenAI Codex, xAI Grok, Anthropic Claude, Cursor agent |
| `openrouter` | HTTP via `OPENROUTER_API_KEY` | One key, five vendor models on the default roster |

Default seat societies: `evidence`, `adversary`, `law_policy`, `affected_party`, `safety` (veto), `concision`.
Live runs accept either a CLI provider pool or an exact six-society assignment. CLI seats choose the authenticated provider only; OpenRouter seats choose both vendor and model slug.

## Verification surfaces

| Surface | Path |
|---------|------|
| Node API | `POST /api/verify` with `{ events }` or `{ runId }` |
| CLI | `npm run demo` prints verify result |
| Cloudflare Worker | `POST /verify` on deployed worker |
| Scorecard | Returned alongside verify on the API |

## Data flow (live run)

```
Browser / CLI
    → POST /api/run (pack, mode, controls, pool or exact assignment)
    → runTribunal() in kernel
    → SSE /api/runs/:id/events (ledger events)
    → optional POST /api/runs/:id/intervene, queue removal, or receipt-bearing /api/runs/:id/cancel
    → persist runs/:id/ledger.json + meta.json (head hash)
    → POST /api/verify
```

Recorded runs under `runs/` replay over SSE with `status: replay` so the UI never confuses them with a live panel.

## Tests

- `packages/kernel/test/*.test.ts` — 52 tests (determinism, tamper, veto, dissent, ablations, assignment, provider provenance, cancellation, strict decoder protocol and canonical verification)
- `packages/packs/test/packs.test.ts` — 2 tests (pack integrity)
- `packages/scorecard/test/scorecard.test.ts` — 14 tests (A1–A12, spoof guards, baseline 0/12, cancellation receipts)
- `apps/server/test/*.test.ts` — 8 tests (decoder sessions, network policy, HTTP auth, persistence, cancellation, leases, recovery, and SSE replay)
- `apps/web/test/*.unit.test.ts` — 9 tests (strict decoder rendering, transcript completeness, conflict handling, provider identity, and verification state)

See [honesty.md](./honesty.md) for claims boundaries and [judging.md](./judging.md) for the demo script.
