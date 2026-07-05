# Architecture

Tribunal is an npm-workspaces monorepo. The **kernel** owns the due-process engine and hash-chained ledger; everything else consumes its frozen types.

## Package map

| Package / app | Role |
|---------------|------|
| `@tribunal/kernel` | Engine, ledger, panel adapters (CLI, OpenRouter, offline), `verifyLedger()` |
| `@tribunal/scorecard` | A1–A12 auditability checklist with anti-spoof guards |
| `@tribunal/packs` | Domain case files (lending live; insurance, benefits, moderation planned) |
| `@tribunal/server` | Node HTTP + SSE API, human intervention, run persistence |
| `@tribunal/web` | Vite React deliberation-theater UI |
| `apps/worker` | Cloudflare Worker port of `verifyLedger()` (no kernel imports) |
| `runs/` | Committed replayable real-run ledgers + `meta.json` head hashes |

## Event kinds (verdict ledger)

Every phase emits a typed, hash-chained event. Kinds are defined in `packages/kernel/src/types.ts`:

| Kind | When |
|------|------|
| `run_started` | Panel roster, config, offline vs live note |
| `decision_opened` | New decision slot begins |
| `case_presented` | Full case file shown to the engine |
| `blind_commitment` | SHA-256 seal of each round-1 proposal **before** reveal |
| `proposals_revealed` | Proposals + hash recomputation checks |
| `feedback_issued` | Anonymized Delphi feedback packet |
| `feedback_view_assigned` | Per-recipient candidate order (position-bias control) |
| `revision_received` | Seat answers strongest objection, steelmans rival |
| `safety_review` | Safety seat verdicts; veto power |
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
│ feedback_issued (anonymous)           │
│ feedback_view_assigned (order perm)   │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ revision_received (debate round)      │
└──────┬───────────────────────────────┘
       ▼
┌──────────────────────────────────────┐
│ safety_review (+ human veto inject)   │
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

Between slots, `memory_updated` may carry unresolved objections forward. `run_finished` closes the chain; `verifyLedger()` checks hash linkage and that committed spans concatenate to `finalAnswer`.

## Hash chain

Each event body (excluding `hash`) is canonicalized JSON (keys sorted recursively, `undefined` omitted) and SHA-256 hashed. Fields: `seq`, `runId`, `spanIndex`, `ts`, `kind`, `payload`, `prevHash`. Genesis `prevHash` is 64 zeroes.

Implementation: `packages/kernel/src/hash.ts`, `packages/kernel/src/ledger.ts`. Edge port: `apps/worker/src/index.ts`.

## Panel modes

| Mode | Transport | Use |
|------|-----------|-----|
| `offline` | Deterministic scripted panel | CI, `npm run demo`, tests — **not model output** |
| `cli` | Spawn local authenticated CLIs | OpenAI Codex, xAI Grok, Anthropic Claude, Cursor agent |
| `openrouter` | HTTP via `OPENROUTER_API_KEY` | One key, five vendor models on the default roster |

Default seat societies: `evidence`, `adversary`, `law_policy`, `affected_party`, `safety` (veto), `concision`.

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
    → POST /api/run (pack, mode)
    → runTribunal() in kernel
    → SSE /api/runs/:id/events (ledger events)
    → persist runs/:id/ledger.json + meta.json (head hash)
    → POST /api/verify
```

Recorded runs under `runs/` replay over SSE with `status: replay` so the UI never confuses them with a live panel.

## Tests

- `packages/kernel/test/kernel.test.ts` — 17 tests (determinism, tamper, veto, dissent, ablations)
- `packages/scorecard/test/scorecard.test.ts` — 10 tests (A1–A12, spoof guards, baseline 0/12)

See [honesty.md](./honesty.md) for claims boundaries and [judging.md](./judging.md) for the demo script.
