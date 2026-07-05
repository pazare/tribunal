# Ledger anchors

Every recorded run's hash-chain **head** is published here and in git history.
To audit a run: `POST /api/verify {"runId": "<id>"}` (or run the offline
verifier) and compare the recomputed head against this table. A ledger whose
chain verifies but whose head does not match its anchored value has been
rewritten wholesale — the exact forgery this table exists to catch.

| run | pack | mode | providers | events | chain | auditability | head (sha256) |
|---|---|---|---|---|---|---|---|
| `run_c49cb4b4453e` | lending-adverse-action | cli | openai+xai | 126 | ✓ | 12/12 | `58692b1f95483f0ecf62c3adb48bd98da81d6995d15a16b67be231ffc1a76e6b` |
| `run_e6c6225c0d49` | lending-adverse-action | offline | offline | 86 | ✓ | 12/12 | `cab65931beccb3b44388ff9fb59212e6132526648476904c78c6a3996229d602` |
