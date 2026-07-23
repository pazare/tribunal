# Tribunal verify worker

Cloudflare Worker that performs edge-compatible WebCrypto hash checks and imports the runtime-portable canonical protocol verifier from `packages/kernel/src/ledger-structure.ts`. Node and edge therefore share one schema/state-machine implementation instead of maintaining divergent ports.

## Endpoints

| Method | Path | Body |
|--------|------|------|
| `POST` | `/verify` or `/api/verify` | `{ "events": LedgerEvent[] }` |
| `GET` | `/` | service metadata |

Response shape matches the Node server's `verify` field:

```json
{
  "verify": {
    "ok": true,
    "events": 86,
    "head": "2456b387…",
    "problems": [],
    "answerConsistent": true
  }
}
```

## Deploy

Requires a Cloudflare account and `wrangler` authentication. **Not deployed during the hackathon event unless a CF token is present.**

From `apps/worker/`:

```bash
npx wrangler deploy
```

From the repo root (uses root `wrangler.jsonc` pointer):

```bash
npx wrangler deploy -c apps/worker/wrangler.jsonc
```

## Local dev

```bash
cd apps/worker
npx wrangler dev
```

Then:

```bash
curl -s -X POST http://localhost:8787/verify \
  -H 'Content-Type: application/json' \
  -d "{\"events\":$(cat ../../runs/<run-id>/ledger.json)}"
```

(Run from `apps/worker/`; adjust the relative path for other working directories.)

## What it checks

1. Each event's `hash` recomputes over `{ seq, runId, spanIndex, ts, kind, payload, prevHash }` with recursively sorted JSON keys (undefined omitted).
2. Each `prevHash` links to the prior event's hash (genesis = 64 zeroes).
3. Exact schemas/kinds, contiguous sequence, one run id, legal span/phase transitions, and one terminal event.
4. Exact committed-prefix and final-answer reconstruction.
5. In protocol v2, strict-majority quorum, mandatory safety participation, and safety coverage of every eligible candidate.

Tamper-evidence is real but **unanchored** unless the head hash is published externally (see `runs/*/meta.json` in the repo).
