# Ledger anchors

Every recorded run's hash-chain **head** is published here and in git history.
To audit a run: `POST /api/verify {"runId": "<id>"}` (or run the offline
verifier) and compare the recomputed head against this table. A ledger whose
chain verifies but whose head does not match its anchored value has been
rewritten wholesale — the exact forgery this table exists to catch.

| run | pack | mode | providers | events | chain | auditability | head (sha256) |
|---|---|---|---|---|---|---|---|
| `run_2a4de0a8156f` | benefits-fraud-flag | offline | offline | 86 | ✓ | 12/12 | `102a421d0759e9d5ff3137571041396b1a9da7c75cf267d264ad66a68e52bb3b` |
| `run_51a72ff0232f` | insurance-utilization-review | offline | offline | 86 | ✓ | 12/12 | `79f396a3a0c974a57095cef6a470bdbc45bc601c3ddea74f2a9a604c02fd26fd` |
| `run_b51538e11c68` | insurance-utilization-review | cli | openai+xai+anthropic | 201 | ✓ | 11/12 | `49557764560d2eb91b70080ede45e4aa5222ed352ba311bb033972ccae83ab40` |
| `run_c49cb4b4453e` | lending-adverse-action | cli | openai+xai | 126 | ✓ | 12/12 | `58692b1f95483f0ecf62c3adb48bd98da81d6995d15a16b67be231ffc1a76e6b` |
| `run_e6c6225c0d49` | lending-adverse-action | offline | offline | 86 | ✓ | 12/12 | `cc375a6e3823e1e0d2e0eb6658201346b448b00c6a217c937c0f639dfac3760d` |
| `run_ea6e1e4d6150` | moderation-statement-of-reasons | offline | offline | 86 | ✓ | 12/12 | `b5f023483c367544571f84f07c4595b88ea89955645dd9f99178038986a4c71c` |
