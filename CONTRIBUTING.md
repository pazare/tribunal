# Contributing to Tribunal

Thank you for helping make high-stakes AI decisions auditable. Tribunal is a hackathon project (RAISE Summit 2026, Cursor track); contributions should preserve its honesty invariants.

## Dev setup

```bash
git clone https://github.com/pazare/tribunal.git
cd tribunal
npm install
cp .env.example .env   # fill OPENROUTER_API_KEY only if you want live OpenRouter panels
```

Requirements: Node.js 20+ (CI uses 22). Local CLIs (`codex`, `claude`, `~/.grok/bin/agent`, `cursor-agent`) are optional and probed at runtime.

## Commands

| Command | Purpose |
|---------|---------|
| `npm test` | All workspace tests |
| `npx tsx --test packages/kernel/test/kernel.test.ts` | Kernel suite (17 tests) |
| `npx tsx --test packages/scorecard/test/scorecard.test.ts` | Scorecard suite (10 tests) |
| `npm run demo` | Offline deterministic smoke run + tamper demo |
| `npm run demo:real` | Live multi-provider smoke (needs CLIs or OpenRouter key) |
| `npm run dev` | API on `:8787` + web dev server on `:5173` |
| `npx tsc -p packages/kernel/tsconfig.json --noEmit` | Kernel typecheck (CI) |

## Where to change things

| Area | Path | Notes |
|------|------|-------|
| Engine + ledger | `packages/kernel/` | Frozen public contract in `types.ts` |
| A1–A12 scorecard | `packages/scorecard/` | Anti-spoof guards are intentional |
| Domain cases | `packages/packs/` | Lending live; other domains landing |
| API / SSE | `apps/server/` | Human intervention, verify, persistence |
| UI | `apps/web/` | Deliberation theater |
| Edge verify | `apps/worker/` | Port of `verifyLedger`; keep in sync |

This hygiene pass only touches docs, Docker, CI, worker, and env templates. Do not commit secrets (`.env`, API keys).

## Honesty invariants (non-negotiable)

Contributors must preserve these in all code, copy, and demos:

1. **Claim auditability, not answer quality.** Tribunal adds due process and a verifiable ledger; it does not claim better decisions than a single model.

2. **Tamper-evidence is real but unanchored** unless the ledger head hash is published outside the copy being verified. We publish head hashes in `runs/*/meta.json` for committed real runs.

3. **Offline mode is never model output.** The deterministic panel exists for CI/tests only and must always be labeled.

4. **Credentials are env-only.** CLI auth and `OPENROUTER_API_KEY` are read at call time; Tribunal does not store keys.

5. **Baseline asymmetry is honest.** A plain single-model answer scores 0/12 on the A1–A12 scorecard by construction. Do not frame that as a rigged comparison.

6. **Anonymization removes identity fields, not writing style.** Peers are hidden by type design; stylometry is out of scope.

7. **Repairs and trivial rationale fail the scorecard.** Back-filled warrants or one-word junk fail A2/A5 even if the ledger structure looks fine.

8. **Worker verify is a port.** If you change `packages/kernel/src/ledger.ts` or `hash.ts`, update `apps/worker/src/index.ts` in the same PR.

## Pull requests

- Run `npm test` and kernel typecheck before opening a PR.
- One logical change per PR when possible.
- Link the issue or hackathon task if applicable.
- Do not add marketing claims the code cannot support.

## License

MIT — see [LICENSE](LICENSE).
