# Tribunal

**An explainable decoder: high-stakes verdicts are generated span by span, and every span is elected.**

**Authorship:** Tribunal is the original idea and work of **Pablo Zavala** of **Carnegie Mellon University (CMU)**. Pablo Zavala is the author, originator, and project lead for the concept, mechanism, implementation, demo, and public repository.

When a single model denies your loan, rejects your insurance claim, flags your benefits, or takes down your post, you get fluent text and no verifiable record of what was checked, who could have objected, or whether a safety concern was overruled. Post-hoc explanations are known-unfaithful.

Tribunal replaces sampling with **election**. The output is decoded in atomic surface spans (the disposition, the required disclosure, …), and each span goes through electoral mechanisms adapted from human institutions — **secret ballots** (sealed commitments before reveal), **anonymized cross-examination** with ballot-order rotation, on-the-record vote changes, a binding **safety veto**, ratification under a **named constitutional rule**, and **minority reports** (preserved dissent). Every step lands in a hash-chained, tamper-evident **verdict ledger** you can re-verify yourself. The explanation is not attached to the generation — it *is* the generation.

- **Six chartered seats** (evidence, adversary, law/policy, affected party, safety with veto, concision) — rival AI vendors in live modes, scripted stand-ins offline; cross-vendor seating can reduce correlated failure.
- **Event-sourced ledger** — every phase is a typed event; edit anything and the chain breaks (`POST /api/verify`, or `npm run demo`).
- **A1–A12 auditability scorecard** scored from the run's own artifacts; a plain single-model baseline scores **0/12 by construction** (that asymmetry is the honest point). Three committed live runs score an honest **11/12** — the panel refused to ratify STOP, and [the ledger shows exactly why](docs/honesty.md#the-scorecard-fails-our-own-live-runs--on-purpose).

Tests: **52** kernel · **6** decoder server · **9** decoder UI · **14** scorecard · **2** packs (`npm test`).

Built at [RAISE Summit Hackathon 2026](https://github.com/pazare/tribunal) (Cursor track). License: MIT.

---

## The 60-second tour

[![Watch the 53-second demo — a benefits verdict decoded as an election](docs/media/docket.png)](runs/demo-recording/demo.mp4)

**[▶ Watch the demo (53s, captioned)](runs/demo-recording/demo.mp4)** — or re-record it yourself: `npm run record:demo` drives the UI end-to-end on your machine.

| Every span is elected — RATIFIED on the record | Verified: 12/12 vs single-model 0/12 |
|---|---|
| ![Candidate ballot with a RATIFIED stamp and public reason](docs/media/ballot-ratified.png) | ![A1–A12 auditability scorecard, hash chain VALID](docs/media/scorecard-a1-a12.png) |

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

## "Couldn't you just use SHAP or LIME?"

No — different question. Feature attribution explains a **score**; Tribunal makes the **decision procedure** contestable. They are complements, not substitutes.

| | Feature attribution (SHAP / LIME) | Tribunal (deliberative decoding) |
|---|---|---|
| **Question answered** | Which input features moved this model's score | Whether the decision survives adversarial scrutiny, and on what recorded grounds |
| **When it runs** | Post-hoc, on a decision already made | During decoding — every span is contested and elected before it ships |
| **Artifact produced** | Feature weights (Shapley values / local surrogate coefficients) | Hash-chained ledger: sealed ballots, anonymous critique, vetoes, named decision rule, preserved dissent |
| **Free-text / LLM decisions** | Not designed for them (no feature vector over a generated paragraph) | Native — the unit of explanation is an argued, cross-examined span of text |
| **Gaming resistance** | Adversarial models can fool attribution audits ([Slack et al., AIES 2020](https://dl.acm.org/doi/10.1145/3375627.3375830)) | The record is tamper-evident; editing any event breaks the chain; spoof guards fail trivial rationale (A2/A5) |
| **Regulator-ready reasons** | Weights must be translated into the "specific reasons" notices require | The verdict ships with verbatim public reasons and the losing arguments — the notice writes itself |

Honest footnote: SHAP/LIME remain the right tool for debugging feature-based scoring models. Tribunal governs the decision *procedure* and can sit on top of any underlying scorer.

---

## How it works

The verdict is decoded one atomic surface span at a time. Each span is an election with eight phases, each emitting ledger events:

1. **Secret ballot** — each seat drafts its candidate span in isolation, without peer material.
2. **Sealed commitment** — SHA-256 hash of each ballot ledgered **before** reveal (no rewriting after seeing the room).
3. **Anonymized cross-examination** — critiques with authorship hidden; candidate order rotated per recipient (ballot-order/position-bias control).
4. **Revision** — answer the strongest objection; steelman the best rival; state what would change your vote — all on the record.
5. **Safety review** — safety seat may **veto** any candidate with a public reason.
6. **Election** — a **named** constitutional rule elects the span; public reason on record.
7. **Minority report** — material dissent preserved forever, never deleted.
8. **Span committed** — elected text appended to the verdict, or **STOP/abstain** as a first-class winner.

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
npm test                 # 52 kernel + 6 server + 9 web + 2 packs + 14 scorecard tests
npm run smoke --workspace @tribunal/web  # isolated offline UI/API browser gate
npm run demo             # offline deterministic run + tamper demo (no API keys)
npm run dev              # API :8787 + web UI :5173
```

`npm run demo` ends with `VERIFY: OK` and a tamper demo that **must** fail verification.

Copy [`.env.example`](.env.example) to `.env` when you need live panels.

---

## Run the live two-agent decoder

The default UI at `http://localhost:5173/` accepts an arbitrary prompt and
decodes its answer one exact surface unit per fresh deliberation round. This
path uses exactly:

- Codex `gpt-5.6-sol`, effort `medium`, through `codex exec`;
- Claude `claude-opus-4-8`, effort `medium`, through `claude -p`.

Claude Code's small/fast auxiliary-model setting is pinned to the same Opus 4.8
model and nonessential traffic is disabled; the ledger still shows every model
name reported by the CLI.

Both locally authenticated CLIs must be present. There is no scripted or
one-provider fallback. Every prompt, public CLI response, validation result,
ballot, dissent, selected unit, and raw stdout/stderr receipt streams into the
Decoder Lab. After completion, the UI verifies the persisted run and labels it
**VERIFIED FULL** only when the canonical state-machine replay passes. This is
the full observable decoder transcript; provider computation not emitted
through its CLI is outside the observable interface.

The decoder server binds to loopback by default, admits one two-agent run at a
time, and stores private decoder artifacts under ignored, owner-only
`runs/decoder/` paths.

```bash
npm run dev

curl -s -X POST http://localhost:8787/api/decoder/runs \
  -H 'Content-Type: application/json' \
  -d '{"userPrompt":"Respond with exactly OK and then STOP.","maxRounds":2}'
```

Latency is not used to select or skip work: each unit always receives two
proposals, two cross-revisions, and, when needed, two judge ballots. Exact
provider calls have no wall-clock deadline and wait for completion or explicit
operator cancellation. Exact protocol and honesty boundaries:
[`docs/decoder-design.md`](docs/decoder-design.md).

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
# or POST /api/run  { "packId": "lending-adverse-action", "mode": "cli" }
```

Probe availability: `GET http://localhost:8787/api/panel`

### OpenRouter mode (one key, five vendors)

```bash
export OPENROUTER_API_KEY=sk-or-...
# POST /api/run  { "packId": "lending-adverse-action", "mode": "openrouter" }
```

Default model slugs (override every seat in the operator UI or `assignment{}` API field):

| Seat society | Provider label | OpenRouter model slug |
|--------------|----------------|------------------------|
| evidence | microsoft | `microsoft/phi-4` |
| adversary | nvidia | `nvidia/nemotron-3-super-120b-a12b` |
| law_policy | meta | `meta-llama/llama-3.3-70b-instruct` |
| affected_party | deepseek | `deepseek/deepseek-chat` |
| safety | mistral | `mistralai/mistral-large` |
| concision | microsoft | `microsoft/phi-4` |

The ledger records the selected model vendor and requested slug. When OpenRouter reports a resolved model or serving host, `provider_call.usage` records those too.

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
| Exact six-seat assignment plus receipt-bearing stop and queue control | That cancellation erases earlier ratified spans or proves answer quality |

Details: [`docs/honesty.md`](docs/honesty.md).

---

## Architecture

| Path | Role |
|------|------|
| `packages/kernel` | Engine, ledger, panel adapters, `verifyLedger()` |
| `packages/scorecard` | A1–A12 checklist + baseline 0/12 |
| `packages/packs` | Four live domain cases: lending, insurance, benefits, moderation — each with a planted trap |
| `apps/server` | Node SSE API, exact seating, intervention queue, safe cancellation, persistence |
| `apps/web` | Vite React deliberation-theater UI |
| `apps/worker` | Cloudflare Worker verify endpoint (ready to deploy) |
| `runs/` | Replayable real-run ledgers + head hashes for anchoring |

---

## Future plans: impact at scale

Tribunal's next step is to make contested AI decisions reviewable wherever they touch ordinary people. A bank denial, an insurer's "no," a locked marketplace account, a moderation takedown, a refund dispute, a benefit flag, a workplace screen, or a school eligibility call should not end as a private paragraph from a model; it should leave a record people can inspect, challenge, and hand to someone else.

- **Adapt the seats, not one generic judge.** Each role should become sharper at its duty while the ledger still exposes every move. Technically, we plan to adapt or fine-tune frontier models such as GPT-5.6 Sol and Claude Fable 5, if provider-supported tuning or adapter access is available, into seat-specific specialists for evidence checking, adversarial objection, law and policy, affected-party impact, safety veto review, and concise drafting.
- **Prove the process before claiming the outcome.** Progress only counts when reviewers can inspect the artifact that produced it. Technically, each tuning loop will run locked eval packs against single-model baselines and untuned panels, measuring A1-A12 deltas, trap detection, objection quality, veto calibration, tamper resistance, latency, cost, and human-review usefulness.
- **Turn use cases into packs.** A person, company, agency, school, platform, or support team should be able to bring a real decision workflow without rewriting the engine. Technically, versioned domain packs will define facts, citations, planted traps, required notices, allowed outcomes, STOP rules, and seat templates while preserving the same hash-chained event schema.
- **Make the record portable.** The output should be a decision record that travels: what was checked, who objected, what changed, what was vetoed, what dissent survived, and whether the ledger still verifies. Technically, the SDK/API roadmap includes run creation, event streaming, ledger verification, head-hash anchoring, signed replay bundles, webhook export, and read-only auditor links.
- **Make relevance broad, not merely industrial.** Tribunal matters anywhere AI closes a door: money, care, work, speech, housing, benefits, education, commerce, or account access. Technically, the same ledger primitive can attach to consumer appeals, internal review queues, public-service oversight, marketplace trust teams, case-management systems, and personal evidence packets without changing the core verification model.

This roadmap stays narrow: stronger auditability first. Accuracy, safety, or compliance claims require controlled studies, external review, and replayable run artifacts.

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

Autonomous recording (Playwright computer-use — no operator present):

```bash
npm run record:demo              # offline scripted demo (labeled; not model output)
npm run record:demo -- --replay  # replay the committed 12/12 CLI lending run
```

Output: `runs/demo-recording/webm/*.webm` + `final-frame.png` + `manifest.json`.

Upload the WebM to YouTube/Loom (≤60s), then follow [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

Fallback if you are away at deadline: `npm run submit:prep` (runs tests, opens submission form).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Honesty invariants are mandatory.

---

## License

MIT — Copyright (c) 2026 Pablo Zavala. See [LICENSE](LICENSE).
