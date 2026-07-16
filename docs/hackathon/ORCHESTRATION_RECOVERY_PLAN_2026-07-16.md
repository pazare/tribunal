# Tribunal Clinical recovery and orchestration plan

Date: 2026-07-16

Owner: Pablo Zavala

Orchestrator: Codex
Status: active recovery; Claude CLI disabled by operator; app work is operator-owned and canonical

## Objective

Recover all useful work from the stopped Tribunal clinical-research sessions, especially Scopus-backed research, integrate only source-verifiable contributions, and produce one coherent research-methods package and one Saturday hackathon package. Preserve every useful artifact while preventing another unbounded or misrouted agent run.

## Account-specific model allowlist

- Codex: `gpt-5.6-sol`, effort `ultra` (the highest available effort) only.
- Claude CLI: disabled by the operator on 2026-07-16. No new invocation, resume, or message is permitted on that surface.
- App-based Claude work is operator-owned and canonical. The orchestrator does not invoke, stop, modify, or message those sessions.
- Existing completed Fable review artifacts remain attributable inputs and must still pass independent source and method review before integration.
- No fallback model. An unavailable allowed model means the task does not run.
- A model name in prose is not proof. Every invocation must record the requested model, requested effort, account/surface, session id, start time, and terminal status.

## Account gates

1. Claude CLI is closed to the orchestrator. A later change would require a new explicit operator instruction.
2. App-based Claude work remains under Pablo's direct control and is not an orchestrator execution surface.
3. Passwords and OTPs are always entered by Pablo, never read or entered by the orchestrator.

## Quota observability and refresh rule

- Maintain `.local-data/tribunal/CLAUDE_QUOTA_STATUS.json` as a gitignored machine-readable quota snapshot and keep a visible, read-only terminal monitor running with `scripts/tribunal_quota_watch.command`.
- Track the two accounts separately. Never infer that one account's quota applies to the other.
- Record the five-hour window, weekly window, and Fable-specific limit only when the authenticated account UI exposes them. `unknown` means unobserved, not exhausted.
- A session-limit error may establish that a request was blocked and may expose a reset time; it does not identify which quota bucket was exhausted unless the UI says so.
- No orchestrator Claude invocation is currently authorized. Quota monitoring is read-only and may not trigger a model prompt.
- If the requested Fable model is unavailable, stop. Do not probe by falling back, switching models, or sending a cheaper prompt.

## Commit and push cadence

- Work on `pazare/tribunal-hackathon-recovery-20260716`; do not write directly to `main`.
- Commit and push each validated checkpoint: recovery inventory, PR disposition, Scopus evidence ledger, methods protocol, Saturday plan, presentation, and verification fixes.
- Never commit raw account tokens, browser state, private hidden reasoning, or unsanitized transcript dumps.
- Before each checkpoint: inspect the staged diff, run the smallest relevant validation, and record unresolved limitations in the recovery ledger.
- A pushed checkpoint is preservation, not scientific validation. Claim status changes to `integrated` only after source and method review.

## Fail-closed invocation preflight

Every new agent task must pass all checks before a prompt is sent:

1. **Need:** the task has a bounded question and a named output artifact.
2. **Deduplication:** transcript and artifact inventory shows the work does not already exist.
3. **Model:** exact account-specific allowlisted model and `max` effort are visible in the target surface or explicit CLI arguments.
4. **Fallback:** no fallback option is present.
5. **Account:** the intended account is visible and has sufficient credits.
6. **Concurrency:** at most one Claude task at a time until two consecutive tasks complete normally; thereafter at most two. Sol concurrency is capped at two.
7. **Budget:** one task, one deliverable, one maximum runtime. Default Claude runtime ceiling: 20 minutes. No nested fan-out unless Pablo explicitly approves a written fan-out table.
8. **Write scope:** write tasks use a dedicated worktree and a unique branch. Shared `main` stays read-only to agents.
9. **Checkpoint:** the target branch starts clean and its base commit is recorded.
10. **Acceptance:** the task prompt specifies source requirements, validation commands, and a terminal ACK token.

If any check fails, do not send the prompt.

## Completion and delivery rule

An agent task is complete only when all of the following exist:

- sender acceptance;
- exact prompt visible in the target session;
- attributable agent response ending with the expected ACK;
- output artifact on disk or captured response text;
- raw capture/transcript path;
- validation result;
- audit entry linking task, model, account, session, branch, artifact, and status.

`accepted`, `visible`, `acknowledged`, `validated`, and `integrated` are distinct states. A timeout, session-limit error, or visible prompt without an ACK is not completed work.

## Automatic stop conditions

Stop the specific orchestrator-owned task immediately if any condition occurs:

- model or effort differs from the allowlist;
- account is not the intended account;
- fallback or downgrade appears;
- session-limit, rate-limit, credit, or repeated retry message appears;
- no meaningful progress for five minutes;
- the task spawns subagents without written authorization;
- the task writes outside its worktree or named paths;
- the working tree develops unexplained changes;
- two materially identical tool calls fail;
- source claims are produced without traceable citations.

Never stop Pablo's independently operated sessions under this rule.

## Recovery inventory

Recover before generating anything new:

1. Main Claude session transcripts in the user's private local Claude project store.
2. Claude workflow/subagent transcripts under each private local session record.
3. Claude Desktop session records in the private local application-support store.
4. Agent-coordination raw captures and audit log in the private local coordination store.
5. Git branches, PR #1, PR #2, worktrees, untracked recovery files, and commits.
6. Shared Google Drive folder `Abridge & Anthropic Hackaton` and its Scopus-generated `Problem Research.pdf`.
7. Existing recovered files under `docs/hackathon/_recovered/`.

For every recovered source, record in the private ledger: source path or id, originating session, model/effort if known, timestamp, artifact type, claim/source content, completeness, duplicate group, and integration disposition. Publish only non-sensitive provenance and source-verifiable conclusions.

## Limit-claim rule (operator instruction, 2026-07-16)

Any stated limitation — in a plan, brief, deck, or agent report — is labeled `EXHAUSTED` (multiple independent, documented failed attempts) or `HYPOTHESIZED`. Only `EXHAUSTED` limits may be presented as real limits. Canonical example: the Sol brief's claim that authenticated Scopus AI was unreachable was hypothesized; an actual attempt through the operator's Chrome session succeeded the same day.

## Evidence tiers and experiment requirement

Every empirical claim must identify its evidence tier:

1. **Real de-identified clinical data:** preferred when lawful access, provenance, and data-use terms are documented. Observed diagnoses, dispositions, or referrals are comparison labels, not automatically a gold standard for correct care.
2. **Clinician-adjudicated cases:** preferred reference standard for the bounded escalation tuple. Use independent ratings, explicit codebooks, non-votes, adjudication records, and uncertainty.
3. **Synthetic paired cases:** appropriate for controlled interventions such as changing one evidence item or exposing an agent to a false majority signal. Synthetic cases support internal causal tests of agent behavior, not population-level clinical effectiveness.
4. **Toy statistical panels:** appropriate for executable metric oracles and edge cases, never for clinical-performance claims.

Before Saturday, run real executable experiments even if only synthetic data are available for a particular causal manipulation. Every run must have a versioned dataset, preregistered hypothesis and exclusion rule, deterministic configuration where possible, negative control, uncertainty interval, machine-readable output, and immutable run receipt. Prefer real data for external-validity questions and synthetic data for controlled mechanism questions; never pool the two as if they estimate the same construct.

## Recovery phases

### Phase A — freeze and inventory

- No Claude invocation.
- Stop only orchestrator-owned disallowed or wasteful processes.
- Preserve current disk state.
- Hash and inventory every relevant transcript and artifact.
- Extract final assistant messages, citations, files written, commands run, errors, and unfinished work.

### Phase B — Scopus and methods extraction

- Extract every Scopus query, answer, cited paper, DOI, methodology, statistic, limitation, and suggested follow-up.
- Separate Scopus AI synthesis from the underlying papers.
- Verify decisive claims against the cited paper or authoritative primary source.
- Build a claim ledger with `verified`, `corrected`, `unsupported`, or `duplicate` status.

### Phase C — PR and artifact reconciliation

- Audit merged PR #1 and draft PR #2.
- Compare recovered work against `docs/clinical/` and `docs/hackathon/`.
- Preserve useful unique material; reject stale meeting scripts, duplicated prose, and unsupported efficacy claims.
- Integrate through reviewed commits, never by blindly merging an agent branch.

### Phase D — preserved Claude inputs; no new orchestrator invocation

- Preserve the two completed Fable review artifacts as attributable inputs.
- Launch no new Claude CLI task and do not interact with operator-owned app sessions.
- Close remaining gaps with the authorized Sol workstreams and independent source verification.
- If the operator later changes this boundary, revise the on-disk plan before any invocation.

### Phase E — final products

Produce and validate:

1. Research protocol: construct validity, explicit clinical vocabularies, golden-set design, reliability metrics, same- versus cross-specialty comparisons, convergence-versus-conformity experiment, counterfactual evaluation, and health economics.
2. Saturday build protocol: official rules, prework/day-of boundary, one narrow clinical workflow, acceptance tests, failure injection, provenance, and fallback demo.
3. Contest presentation and speaker script: plain-language and technical layers, evidence/counterexamples, partner value for Abridge and Anthropic, and honest claim boundaries.
4. Recovery ledger: what was recovered, verified, corrected, rejected, and integrated.

## Proposed targeted Claude tasks

Historical queue retained for provenance; all not-yet-run Claude tasks are suspended:

1. **Fable citation resolver (completed):** map recovered Scopus claims to underlying papers/DOIs; no new narrative.
2. **Clinical measurement reviewer:** audit the formal vocabulary, golden set, and reliability design.
3. **Causal-methods reviewer:** attack the counterfactual and silent-mode design for leakage and non-identification.
4. **Clinical safety reviewer:** attack the workflow, escalation criteria, and failure-mode coverage.
5. **Presentation reviewer:** judge the final deck against the official prompt and day-of-build rule.

No suspended task may be sent without a new explicit operator instruction and an updated preflight.

## Current known failures to preserve

- Two isolated Fable writer invocations ended with a session-limit error and produced no acknowledged result.
- Two bridge prompts to Fable sessions were accepted and visible but timed out without receiver ACK; they are not completed work.
- Eight Sol Ultra runs were started before the fail-closed safeguards were written and were later stopped by the orchestrator. Ultra is now the approved highest Sol effort, but those broad runs remain recovery inputs rather than automatically trusted conclusions.
- Unbounded parallelism and nested agent fan-out consumed substantial credits and obscured which outputs were complete. This plan forbids both by default.

## Done criteria

Recovery is done only when:

- every relevant stopped session is inventoried;
- all unique Scopus material is extracted and mapped to sources;
- both PRs have a documented disposition;
- useful work is integrated into reviewed repo artifacts;
- tests, type checks, links, citations, and presentation rendering pass;
- no unsupported clinical-benefit or causal claim remains;
- the final recovery ledger makes omissions and unresolved gaps explicit.
