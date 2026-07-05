# Tribunal

**Due process for high-stakes AI decisions.**

When a single model denies your loan, rejects your insurance claim, flags your benefits, or takes down your post, you usually get fluent text and no verifiable record of what was checked, who could have objected, or whether a safety concern was overruled. Post-hoc explanations are known-unfaithful. Tribunal runs each decision through a **cross-provider panel** and emits the answer **plus** a hash-chained, tamper-evident **verdict ledger** you can re-verify yourself.

- **Six chartered seats** (evidence, adversary, law/policy, affected party, safety with veto, concision) deliberate in structured phases with sealed commitments and preserved dissent.
- **Event-sourced ledger** — every phase is a typed event; edit anything and the chain breaks (`POST /api/verify`, or `npm run demo`).
- **A1–A12 auditability scorecard** scored from the run's own artifacts; a plain single-model baseline scores **0/12 by construction** (that asymmetry is the honest point).

Tests: **17** kernel · **10** scorecard (`npm test`).

Built at [RAISE Summit Hackathon 2026](https://github.com/pazare/tribunal) (Cursor track). License: MIT.

---

## The problem is documented

High-stakes automated decisions already face scrutiny; the audit surface has not kept up.

| Domain | Documented gap | Anchors |
|--------|----------------|---------|
| **Credit / lending** | Adverse actions must be explained; opaque models struggle to produce inspectable reasons | ECOA (15 U.S.C. §1691); Reg B (12 CFR Part 1002); [CFPB Circular 2022-03](https://www.consumerfinance.gov/compliance/circulars/circular-2022-03-adverse-action-notification-requirements-in-connection-with-credit-decisions-based-on-complex-algorithms/) on complex-algorithm adverse action |
| **Insurance** | Automated claim denials with weak human review | [ProPublica reporting on Cigna's PxDx program](https://www.propublica.org/article/cigna-pxdx-medical-health-insurance-rejection); *nH Predict* litigation over algorithmic denials; California **SB 1120** (2024, utilization-review transparency) |
| **Benefits / welfare** | False fraud flags at scale, reversed only after harm | Australian **Robodebt** Royal Commission; Dutch **toeslagenaffaire**; Michigan **MiDAS** unemployment fraud system |
| **Content moderation** | Platforms must give specific statements of reasons | EU **Digital Services Act** Article 17 |
| **Cross-cutting** | Logging, oversight, and rights on automated decisions | EU **AI Act** high-risk logging and human-oversight duties; **GDPR** Article 22 |

Tribunal does not certify compliance. It demonstrates a richer **audit artifact**: a ledger generated during deliberation, not reconstructed afterward.

---

## How it works

Eight phases per decision slot, each emitting ledger events:

1. **Blind proposal** — each seat proposes without peer material.
2. **Sealed commitment** — SHA-256 hash of each proposal ledgered **before** reveal.
3. **Anonymized Delphi feedback** — critiques with authorship hidden; candidate order shuffled per recipient.
4. **Revision** — answer the strongest objection; steelman the best rival; state what would change your mind.
5. **Safety review** — safety seat may **veto** with a public reason.
6. **Constitutional ratification** — a **named** rule selects the span; public reason on record.
7. **Dissent preserved** — material minority objections kept forever.
8. **Span committed** — ratified text appended, or **STOP/abstain** as first-class.

```
  [case] → blind propose → SEAL hashes → reveal
              ↓
         anon feedback (shuffled order)
              ↓
         revise → safety (+ human veto?) → ratify → commit span
              ↓
         next slot ──→ run_finished → verify(head)
```

Full event-kind list and package map: [`docs/architecture.md`](docs/architecture.md).

---

## Quickstart

```bash
git clone https://github.com/pazare/tribunal.git
cd tribunal
npm install
npm test                 # 17 kernel + 10 scorecard tests
npm run demo             # offline deterministic run + tamper demo (no API keys)
npm run dev              # API :8787 + web UI :5173
```

`npm run demo` ends with `VERIFY: OK` and a tamper demo that **must** fail verification.

Copy [`.env.example`](.env.example) to `.env` when you need live panels.

---

## Run a REAL cross-provider panel

### CLI mode (zero new credentials)

Uses locally authenticated agent CLIs — keys read at call time, never stored:

| Provider | CLI | Notes |
|----------|-----|-------|
| OpenAI | `codex` | ChatGPT-authenticated Codex |
| xAI | `~/.grok/bin/agent` | Grok agent (explicit path avoids binary shadowing) |
| Anthropic | `claude` | Pin model via env |
| Cursor | `cursor-agent` | Optional model override |

```bash
export TRIBUNAL_CLAUDE_MODEL=sonnet   # pinned alias, not the default
# export TRIBUNAL_CURSOR_MODEL=...    # optional

npm run demo:real                     # smoke test across available CLIs
# or POST /api/run  { "packId": "lending_adverse_v1", "mode": "cli" }
```

Probe availability: `GET http://localhost:8787/api/panel`

### OpenRouter mode (one key, five vendors)

```bash
export OPENROUTER_API_KEY=sk-or-...
# POST /api/run  { "packId": "lending_adverse_v1", "mode": "openrouter" }
```

Default model slugs (override per seat in code via `packages/kernel/src/panel.ts`):

| Seat society | Provider label | OpenRouter model slug |
|--------------|----------------|------------------------|
| evidence | microsoft | `microsoft/phi-4` |
| adversary | nvidia | `nvidia/llama-3.1-nemotron-70b-instruct` |
| law_policy | meta | `meta-llama/llama-3.3-70b-instruct` |
| affected_party | deepseek | `deepseek/deepseek-chat` |
| safety | mistral | `mistralai/mistral-large` |
| concision | microsoft | `microsoft/phi-4` |

Meta models are often served via Nebius on OpenRouter; the ledger records the vendor label, not the host.

### Offline mode (CI / tests only)

```bash
npm run demo
# or  { "mode": "offline" }
```

Deterministic scripted panel — **not model output**. Always labeled in `run_started.note`.

---

## Verify a run yourself

**Node API** (local server or Docker):

```bash
curl -s -X POST http://localhost:8787/api/verify \
  -H 'Content-Type: application/json' \
  -d '{"runId":"<id>"}'
# or  -d '{"events":[...]}'   # full ledger JSON
```

Returns `verify` (hash chain + answer cross-check) and `audit` (A1–A12).

**Cloudflare Worker** (edge port, no kernel imports): see [`apps/worker/README.md`](apps/worker/README.md). Deploy with `npx wrangler deploy -c apps/worker/wrangler.jsonc` when you have a CF account.

**Anchoring caveat:** verification proves the bytes you supply are internally consistent. An adversary with the only copy can forge a new consistent chain. Publish the **head hash** externally to anchor — committed real runs store `head` in `runs/<runId>/meta.json`.

Checks performed:

1. Recompute SHA-256 over each event body (`seq`, `runId`, `spanIndex`, `ts`, `kind`, `payload`, `prevHash`).
2. Verify `prevHash` linkage from genesis (64 zeroes).
3. Contiguous `seq` from 0.
4. Concatenation of non-STOP `span_committed` text equals `run_finished.finalAnswer` (whitespace-normalized).

---

## What we claim / what we do NOT claim

| We claim | We do **not** claim |
|----------|---------------------|
| Structured due process with cross-provider panel | Better answer quality or accuracy |
| Tamper-evident hash-chained ledger during the run | Faithful single-model chain-of-thought |
| Safety veto and preserved dissent on the record | Perfect peer anonymization (identity fields removed, not style) |
| A1–A12 scorecard from real artifacts | Legal/regulatory compliance |
| Human auditor interventions as ledger events | Anchored provenance without publishing the head hash |

Details: [`docs/honesty.md`](docs/honesty.md).

---

## Architecture

| Path | Role |
|------|------|
| `packages/kernel` | Engine, ledger, panel adapters, `verifyLedger()` |
| `packages/scorecard` | A1–A12 checklist + baseline 0/12 |
| `packages/packs` | Domain cases (lending live; insurance, benefits, moderation landing) |
| `apps/server` | Node SSE API, human intervention, persistence |
| `apps/web` | Vite React deliberation-theater UI |
| `apps/worker` | Cloudflare Worker verify endpoint (ready to deploy) |
| `runs/` | Replayable real-run ledgers + anchored head hashes |

---

## Sponsor tech (honest labels)

| Technology | Status in this repo |
|------------|---------------------|
| **Cursor** | Project built with Cursor; optional `cursor-agent` CLI seat |
| **OpenRouter** | Supported — one-key multi-vendor panel (Microsoft, NVIDIA, Meta, DeepSeek, Mistral slugs above) |
| **Cloudflare Workers** | Verify worker implemented in `apps/worker/`; deploy-ready, not deployed during the event unless a CF token is present |
| **SUSE BCI** | `Dockerfile` uses `registry.suse.com/bci/nodejs:22` |

Nothing above implies a specific sponsor runtime was exercised in a given demo unless `provider_call` events in that run show it.

---

## Docker

```bash
docker build -t tribunal .
docker run -p 8787:8787 -e OPENROUTER_API_KEY tribunal
```

Serves the API on port 8787. Web static assets included only if `@tribunal/web` built successfully.

---

## Demo video

> **[Placeholder]** 3-minute walkthrough: docket → live panel → human veto → scorecard 12/12 vs baseline 0/12 → tamper fail → verify.  
> Script: [`docs/judging.md`](docs/judging.md).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Honesty invariants are mandatory.

---

## License

MIT — Copyright (c) 2026 Pablo Zavala. See [LICENSE](LICENSE).
