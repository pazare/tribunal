# Hackathon submission — fallback checklist

**Deadline:** Sunday, July 5, 2026 — **12:00 PM** (venue local time, Paris).

If the operator is unavailable, an agent (or cron) can run through this list and submit using the artifacts in this repo.

---

## 1. Pre-flight (must pass)

```bash
cd tribunal   # or clone https://github.com/pazare/tribunal
npm install
npm test      # expect 19 kernel + 2 packs + 10 scorecard — all green
npm run demo  # expect VERIFY: OK + tamper FAILED ✓
```

Optional live proof:

```bash
npm run dev   # :5173 UI + :8787 API
curl -s http://localhost:8787/api/panel | jq .
curl -s http://localhost:8787/api/runs | jq .
```

---

## 2. Record the 1-minute demo video

**Preferred (autonomous — Playwright "computer use"):**

```bash
npm install playwright --save-dev   # if not already
npx playwright install chromium
npm run record:demo                 # offline — ~45s, always works
# or
npm run record:demo -- --replay     # replay committed real run from runs/
# or
npm run record:demo -- --live       # live CLI/OpenRouter if keys/CLIs up
```

Output:

- `runs/demo-recording/webm/*.webm` — upload this (trim to ≤60s in QuickTime/iMovie if needed)
- `runs/demo-recording/final-frame.png` — thumbnail / backup still
- `runs/demo-recording/manifest.json` — metadata

**Manual fallback:** follow [`docs/judging.md`](judging.md) and screen-record `npm run dev` on the lending pack.

---

## 3. Upload video

Upload the WebM/MP4 to **YouTube** (unlisted) or **Loom**. Note the public URL.

---

## 4. Submit the form

**URL:** https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit

| Field | Suggested content |
|-------|-------------------|
| **Project name** | Tribunal |
| **Tagline** | Due process for high-stakes AI decisions — cross-provider panel + tamper-evident verdict ledger |
| **Track** | Cursor |
| **GitHub** | https://github.com/pazare/tribunal |
| **Demo video** | *(URL from step 3)* |
| **Description** | Tribunal runs loan denials, claim rejections, benefits flags, and moderation takedowns through a six-seat cross-provider panel with sealed commitments, anonymized Delphi feedback, safety veto, preserved dissent, and a hash-chained ledger scored A1–A12 (baseline single-model: 0/12 by construction). Built during RAISE Hackathon 2026. `npm run demo` proves verification; `runs/` holds replayable recorded ledgers — 4 live cross-vendor CLI runs + 4 scripted offline runs, all anchored. |
| **Built during event** | Yes — all code in public repo; kernel + scorecard + API + UI + recorded runs committed during hackathon window. |

Run the automated opener (opens browser tabs — **does not** auto-submit credentials):

```bash
npm run submit:prep
```

---

## 5. What to say in 60 seconds (script)

1. **Problem (10s):** Denials and flags ship as fluent text with no verifiable record — ECOA, DSA, Robodebt all demand more.
2. **Mechanism (25s):** Six seats, blind propose → seal → reveal → anonymized feedback → revise → safety veto → named ratification → dissent preserved. Show ledger stream.
3. **Proof (15s):** Scorecard 12/12 (committed CLI lending run) vs baseline 0/12. Tamper demo breaks the chain. `verify` passes on the committed run.
4. **Close (10s):** Clone, run `npm run demo`, watch tamper fail. Not claiming better answers — claiming an audit surface regulators are moving toward.

---

## 6. Honesty guardrails (do not overclaim)

- Offline demo = deterministic scripts, **not** model output — always labeled.
- Replays in `runs/` are **recorded** ledgers — 4 real CLI runs + 4 scripted offline runs; the UI labels each mode honestly.
- We do **not** claim legal compliance or answer-quality superiority.
- Cursor CLI auth: if `cursor-agent status` shows logged out, omit cursor seat or use OpenRouter/codex/grok only.

---

## 7. Emergency contacts

- Hackathon email: alex@cv.inc
- Discord: https://discord.com/invite/N26eKqmR42
