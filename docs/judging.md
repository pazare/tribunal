# Judging demo script (~3 minutes)

Beat-by-beat guide for live presentation. Assume `npm run dev` is running (UI `:5173`, API `:8787`).

## 0:00 — Hook (15 s)

> "When AI denies your loan or claim, you get a paragraph and no record of what was checked, who objected, or what was overruled. Tribunal runs the decision through a cross-provider panel and leaves a hash-chained ledger anyone can verify."

## 0:15 — Docket (20 s)

1. Open the UI landing / case picker.
2. Select the **lending** pack.
3. Read the one-line problem (ECOA / adverse action) from the docket card.
4. Point at the six seats: evidence, adversary, law, affected party, **safety (veto)**, concision.

## 0:35 — Live run (60 s)

1. Start a run — prefer **`openrouter`** if its key is valid, else **`cli`** if the operator's explicit real-probe action succeeds, else **`offline`** and **say so out loud**. `GET /api/panel` is detection-only; quota-using probes require `POST /api/panel/probe`.
2. SSE stream: call out ledger events as they appear:
   - `blind_commitment` before `proposals_revealed`
   - anonymized `feedback_issued`
   - `revision_received`
   - `safety_review`
   - `ratification` with **named rule**
   - `dissent_preserved`
3. Land on `run_finished` + final answer text.

## 1:35 — Human veto (25 s)

1. If still on a live run, inject a human **veto** via the auditor panel (`POST /api/runs/:id/intervene` or UI control).
2. Show `human_intervention` event in the stream.
3. Note safety re-ratification if outcome shifts.

*(If replaying a recorded run, skip live veto and say interventions are supported on live runs.)*

## 2:00 — Verdict + scorecard face-off (40 s)

1. Open scorecard view for the finished run.
2. Show **12/12** (or actual score) on the Tribunal ledger.
3. Show **baseline 0/12** — single-model answer with no ledger, labeled "by construction."
4. One sentence: "We are not claiming better answers; we are claiming an audit surface the baseline cannot produce."

## 2:40 — Tamper theater (15 s)

1. `GET /api/runs/:id/tampered` (or UI tamper button if present).
2. Show `verify.ok: false`, first problem `bad_hash` on edited ratification reason.
3. "Post-hoc rewrite of the reason is detectable."

## 2:55 — Verify (20 s)

```bash
curl -s -X POST http://localhost:8787/api/verify \
  -H 'Content-Type: application/json' \
  -d '{"runId":"<id>"}'
```

Or paste `events[]` from `runs/<id>/ledger.json`.

Mention **head hash** in `meta.json` and the anchoring caveat: verify proves internal consistency; anchoring requires publishing the head externally.

Optional: "Same check deploys to Cloudflare Workers" — show `apps/worker` README, do not claim deployed unless it is.

## 3:15 — Close (10 s)

> "Decision text plus a verifiable ledger. Clone the repo, run `npm run demo`, tamper the chain, watch it fail."

---

## Q&A cheat sheet

| Question | Short answer |
|----------|--------------|
| What's live vs recorded? | Live runs stream SSE with `status: running`. `runs/` replays are labeled `replay` / `recorded`. Offline demo is deterministic, not models. |
| How does veto work? | Safety seat + human auditor can veto a candidate key; ratification picks best non-vetoed per public rules. Veto reason is ledgered. |
| Why cross-provider? | Decorrelation — one vendor's shared blind spot is less likely across OpenAI, xAI, Anthropic, Microsoft, NVIDIA, etc. |
| Does this improve accuracy? | **No claim.** Auditability only. |
| Can you forge the ledger? | You can forge a *new* self-consistent chain if you hold the only copy. Publish the head hash (`meta.json`) to anchor. |
| What fails the scorecard? | Missing phases, repairs/back-fill, trivial warrants, tampered chain. |
| Where are keys? | Env at call time only. CLIs use existing local auth; OpenRouter uses `OPENROUTER_API_KEY`. |
| Is this legal compliance? | No — a technical demo of richer artifacts regulators are moving toward. |

## Fallback paths

| Failure | Fallback |
|---------|----------|
| OpenRouter rate limit | Switch to offline run; show committed run in `runs/` |
| CLI missing | Show panel health JSON; replay recorded real run |
| UI not built | `npm run demo` in terminal + curl verify |
| No network | Offline demo + local verify |

## Pre-demo checklist

- [ ] `npm test` green (30 kernel + 2 packs + 14 scorecard)
- [ ] `npm run demo` prints `VERIFY: OK`
- [ ] `GET /api/panel` reflects actual CLI/key availability
- [ ] At least one run in `runs/` with `meta.json` head (if committed)
- [ ] Know which mode you will run live and label it honestly
