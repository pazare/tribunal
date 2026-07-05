# Ledger anchors

Every recorded run's hash-chain **head** is published here and in git history.
To audit a run: `POST /api/verify {"runId": "<id>"}` (or run the offline
verifier) and compare the recomputed head against this table. A ledger whose
chain verifies but whose head does not match its anchored value has been
rewritten wholesale — the exact forgery this table exists to catch.

| run | pack | mode | providers | events | chain | auditability | head (sha256) |
|---|---|---|---|---|---|---|---|
| `run_c49cb4b4453e` | lending-adverse-action | cli | openai+xai | 138 | ✓ | 12/12 | `f853abc1aea9459163e0b21c956695a7d51e44dcd233c067de05127f0f68ed53` |
