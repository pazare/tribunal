# Continuity plan — operating without Fable 5

Date: 2026-07-16
Trigger: Fable 5 (Claude app or CLI) becomes unavailable — quota, session limit, outage, or operator decision — at any point before or during Saturday.
Design rule: no plan step may have Fable 5 as a single point of failure. Every delegated task must be specified on disk (bounded prompt + expected artifact + verification command) so any capable executor can run it.

## 1. What already does NOT depend on Fable

- **The Saturday demo path.** Panel seats are pinned to Opus 4.8 / Sonnet 5 by standing rule (Fable never sits on a Tribunal seat); the decoder pins Codex `gpt-5.6-sol` + Claude `claude-opus-4-8`; the offline deterministic provider needs no model at all. Gate G2 in the Saturday plan already covers provider loss down to the labeled mechanism simulation.
- **All verification.** `npm test` (125 tests), `npm run typecheck`, `scripts/check_anchors.ts`, `packages/clinical-eval/scripts/verify-run.ts`, and `run-mechanism-simulation.ts` (the 240-assignment scripted falsification gate) are model-free. Anyone can re-establish the trust state of the tree with these commands.
- **The evidence base.** Ledgers (`SCOPUS_EVIDENCE_LEDGER`, `RECOVERY_LEDGER`, `NOTES_COVERAGE_AUDIT`), the methods protocol, the Rao kit, and the Saturday plan are complete documents, not model outputs in flight. Raw sources are preserved in `_recovered/` (meetings, sol, scopus, fable).
- **Scopus AI research.** Requires only the operator's authenticated Chrome session plus the prompt library at `prompts/SCOPUS_AI_PROMPTS_2026-07-17.md` — executable by the operator alone.

## 2. Executor ladder (in order)

1. **Fable 5 (Claude app)** — current orchestrator for bounded review/audit agents.
2. **GPT-5.6 Sol `ultra` via Codex CLI** — already the authorized orchestration alternative in `ORCHESTRATION_RECOVERY_PLAN` (allowlist + fail-closed preflight apply unchanged).
3. **Opus 4.8 / Sonnet 5 via Claude CLI** — only if the operator re-enables the Claude CLI surface (it is disabled by standing instruction; a new explicit operator instruction is required).
4. **Operator + Santiago manually** — every remaining pre-Saturday task below is human-executable.

The allowlist discipline survives the ladder: no silent model substitution; each artifact records which executor produced it; an unavailable executor means the task waits or moves DOWN the ladder with a provenance note, never to an unlisted model.

## 3. Task cards (model-agnostic, ready to hand to any executor)

| Task | Input on disk | Expected artifact | Verification |
| --- | --- | --- | --- |
| Verify Rao-prep Scopus leads | `_recovered/scopus/scopus-ai-2026-07-16-q-*.md`, evidence-ledger §7 items 7–9 | Ledger rows promoted to `verified`/`context-only`/`reject` with DOIs | Every promoted row carries population/N/statistic/design/source/boundary |
| Post-Rao decision addendum | `RAO_MEETING_ONE_PAGE` (answers recorded in-meeting), `RAO_EVALUATION_SCENARIO_WORKSHEET` disposition codes | Dated addendum file; protocol sections updated by reference, never silently rewritten | Each answer tagged ADOPT/TEST/DEFER/REJECT with affected section |
| Freeze preregistration | `RESEARCH_METHODS_PROTOCOL` v0.2 + §13 queue | v1.0 with §13 items either promoted or explicitly deferred | Hash recorded in run receipts; no post-freeze silent edits |
| PR #3 clean replacement | `PR_AUDIT_2026-07-16.md` remediation steps; repo-audit findings in `RECOVERY_LEDGER` addendum | Single squashed commit from `main`; force-with-lease; fresh CI | Privacy scan on final tree; `npm test`+build+smoke green in CI; PR #2 closed as superseded after |
| Saturday start receipt | `SATURDAY_EXECUTION_PLAN` §2 checklist | `hackathon-prestart-20260718` tag + `runs/hackathon-20260718/start.json` | Organizer answers recorded verbatim; day-of branch created from tag |
| Krishnan follow-ups | `NOTES_COVERAGE_AUDIT` (second-paper question), `SCOPUS_EVIDENCE_LEDGER` §6 | Email confirming the DRL venue and the second (hallucination) paper | Ledger updated with his answer; citation labels adjusted |

## 4. If Fable becomes unavailable mid-task

1. Check `RECOVERY_LEDGER` (this file's addendum lists every in-flight artifact and its state) — nothing below `method_checked` is trusted anyway.
2. Any incomplete agent output is a **partial**: preserve it under `_recovered/`, mark it `recovered partials only`, never label it completed (existing ledger rule).
3. Re-run the model-free verification suite to re-establish the tree state.
4. Resume from the task cards above on the next executor in the ladder.
5. Log the unavailability event with time and surface in the private local ledger; per the limit-claim rule, "Fable unavailable" is `EXHAUSTED` only after the documented failed attempts, not on the first error.

## 5. Standing honesty invariants (unchanged by executor)

Agreement is not correctness; scripted gates are not LLM results; mechanism is not clinical validation; a decision counterfactual is not an outcome counterfactual; limits are `EXHAUSTED` or `HYPOTHESIZED`; every quantitative claim carries its ledger fields. These bind any executor, human or model.
