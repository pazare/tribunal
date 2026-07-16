# Tribunal Clinical recovery and orchestration plan

Date: 2026-07-16

Owner: Pablo Zavala

Orchestrator: Codex
Status: active recovery; first bounded Claude CLI task running after the account gate reopened

## Objective

Recover all useful work from the stopped Tribunal clinical-research sessions, especially Scopus-backed research, integrate only source-verifiable contributions, and produce one coherent research-methods package and one Saturday hackathon package. Preserve every useful artifact while preventing another unbounded or misrouted agent run.

## Account-specific model allowlist

- Codex: `gpt-5.6-sol`, effort `ultra` (the highest available effort) only.
- Claude CLI authenticated as `pablozavalareina@gmail.com`: `claude-fable-5`, Sonnet 5, or Opus 4.8, each at `max` effort only. The exact CLI model identifier must be verified before each invocation.
- Claude Desktop authenticated as `pablomzavalapz@gmail.com` in the last verified UI capture: `claude-fable-5`, effort `max` only. Pablo referred to `pablomzavala@gmail.com` in a later message; verify the exact visible login before any invocation rather than assuming these are the same account.
- Pablo's independently operated Claude sessions are not to be stopped, modified, or messaged.
- No fallback model. An unavailable allowed model means the task does not run.
- A model name in prose is not proof. Every invocation must record the requested model, requested effort, account/surface, session id, start time, and terminal status.

## Account gates

1. `pablozavalareina@gmail.com` Claude CLI account:
   - Gate reopened by Pablo at 02:14 America/New_York on 2026-07-16 after he identified the earlier failure as a bug.
   - Begin with one bounded task and require a clean terminal ACK before increasing concurrency.
2. `pablomzavalapz@gmail.com` Claude Desktop account:
   - Credits are expected to reset around 05:10 America/New_York on 2026-07-16; verify the live UI before use.
   - After reset, invoke only Fable 5 Max and only after the preflight below passes.
3. Passwords and OTPs are always entered by Pablo, never read or entered by the orchestrator.

## Quota observability and refresh rule

- Maintain `CLAUDE_QUOTA_STATUS.json` as the machine-readable quota snapshot and keep a visible, read-only terminal monitor running with `scripts/tribunal_quota_watch.command`.
- Track the two accounts separately. Never infer that one account's quota applies to the other.
- Record the five-hour window, weekly window, and Fable-specific limit only when the authenticated account UI exposes them. `unknown` means unobserved, not exhausted.
- A session-limit error may establish that a request was blocked and may expose a reset time; it does not identify which quota bucket was exhausted unless the UI says so.
- Refresh quota status before every Claude invocation and immediately after every Claude task. A quota probe may not send a model prompt.
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

1. Main Claude session transcripts under:
   - `/Users/pablo/.claude/projects/-Users-pablo-Desktop-RAISE-Cursor/*.jsonl`
2. Claude workflow/subagent transcripts under each session's `subagents/` tree.
3. Claude Desktop session records under:
   - `/Users/pablo/Library/Application Support/Claude/claude-code-sessions/`
4. Agent-coordination raw captures and audit log under:
   - `/Users/pablo/agent-coordination/logs/`
5. Git branches, PR #1, PR #2, worktrees, untracked recovery files, and commits.
6. Shared Google Drive folder `Abridge & Anthropic Hackaton` and its Scopus-generated `Problem Research.pdf`.
7. Existing recovered files under `docs/hackathon/_recovered/`.

For every recovered source, record: source path/id, originating session, model/effort if known, timestamp, artifact type, claim/source content, completeness, duplicate group, and integration disposition.

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

### Phase D — controlled Claude collaboration under account-specific gates

- Start with one targeted Fable 5 Max task on the reopened CLI account.
- Use recovered gaps, not broad prompts.
- Require one artifact, direct citations, validation, and ACK.
- Review and integrate before launching the next Fable task.
- Later tasks on that CLI account may use an explicitly verified allowlisted Sonnet 5 or Opus 4.8 model at `max`; the second account remains Fable-only.
- Increase Claude concurrency to two only after two consecutive fully validated completions.

### Phase E — final products

Produce and validate:

1. Research protocol: construct validity, explicit clinical vocabularies, golden-set design, reliability metrics, same- versus cross-specialty comparisons, convergence-versus-conformity experiment, counterfactual evaluation, and health economics.
2. Saturday build protocol: official rules, prework/day-of boundary, one narrow clinical workflow, acceptance tests, failure injection, provenance, and fallback demo.
3. Contest presentation and speaker script: plain-language and technical layers, evidence/counterexamples, partner value for Abridge and Anthropic, and honest claim boundaries.
4. Recovery ledger: what was recovered, verified, corrected, rejected, and integrated.

## Proposed targeted Claude tasks

Run sequentially unless the concurrency gate has opened:

1. **Fable citation resolver (running):** map recovered Scopus claims to underlying papers/DOIs; no new narrative.
2. **Clinical measurement reviewer:** audit the formal vocabulary, golden set, and reliability design.
3. **Causal-methods reviewer:** attack the counterfactual and silent-mode design for leakage and non-identification.
4. **Clinical safety reviewer:** attack the workflow, escalation criteria, and failure-mode coverage.
5. **Presentation reviewer:** judge the final deck against the official prompt and day-of-build rule.

Each task gets only the smallest relevant evidence packet and may not spawn subagents.

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
