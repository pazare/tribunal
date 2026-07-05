# Tribunal verify worker

Standalone Cloudflare Worker that re-implements ledger verification with **zero imports** from `@tribunal/kernel`. The canonical logic lives in `packages/kernel/src/ledger.ts` and `packages/kernel/src/hash.ts`; this file is a faithful port for edge deployment.

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

(From repo root, or adjust the path to your recorded run under `runs/`.)

## What it checks

1. Each event's `hash` recomputes over `{ seq, runId, spanIndex, ts, kind, payload, prevHash }` with recursively sorted JSON keys (undefined omitted).
2. Each `prevHash` links to the prior event's hash (genesis = 64 zeroes).
3. `seq` is contiguous from 0.
4. Concatenation of non-STOP `span_committed` payload text (whitespace-normalized) equals `run_finished.finalAnswer`.

Tamper-evidence is real but **unanchored** unless the head hash is published externally (see `runs/*/meta.json` in the repo).
