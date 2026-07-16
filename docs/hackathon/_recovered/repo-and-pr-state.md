# Repo and PR State — recovery snapshot

Captured: 2026-07-16 ~01:35 local, by read-only recovery agent (session 8375c5a4, workflow recover-paused-session). No git state was mutated. Source repo: `/Users/pablo/Desktop/RAISE Cursor` (github.com/pazare/tribunal).

## 1. AT-RISK WORK (not protected by git)

**Nothing uncommitted, untracked, stashed, or unpushed exists in git.** All at-risk material lives OUTSIDE git in the paused session's volatile scratchpad (`/private/tmp` — wiped on reboot):

| Item | Path | Size | Risk |
|---|---|---|---|
| `agreement_oracles.py` — kappa/agreement oracle code written mid-workflow (01:10:33) | `/private/tmp/claude-501/-Users-pablo-Desktop-RAISE-Cursor/9a6a8f1c-35d9-4bab-b3ca-17e67e7bc645/scratchpad/agreement_oracles.py` | 273 lines / 11,425 B | HIGH — exists nowhere in git (searched all history), nowhere else on disk |
| `q1-human-kappa-baselines.md` — Scopus Q1 notes, TRUNCATED mid-write at interrupt | `.../9a6a8f1c-.../scratchpad/scopus/q1-human-kappa-baselines.md` | 7 lines / 511 B | HIGH — truncated; full source text recoverable only from session transcripts |
| 4 downloaded literature PDFs + rendered page JPGs | `/Users/pablo/.claude/projects/-Users-pablo-Desktop-RAISE-Cursor/9a6a8f1c-35d9-4bab-b3ca-17e67e7bc645/tool-results/` | ~1.8 MB | MEDIUM — not in git, but not in /tmp either |
| Workflow `saturday-hackathon-prep` journal + 13 agent transcripts (agent return values never reported) | `/Users/pablo/.claude/projects/-Users-pablo-Desktop-RAISE-Cursor/9a6a8f1c-35d9-4bab-b3ca-17e67e7bc645/subagents/workflows/wf_931d0571-f34/` | ~6.5 MB | MEDIUM — persistent location, but unextracted |

**Explicitly verified NOT at risk:** the four `docs/clinical/*` files in the paused session's scratchpad (`.../scratchpad/pr2/`) are **byte-identical** to the pushed PR #2 branch tip `f18e15a` (diff -q per file: identical). The PR #2 content is fully safe on the remote.

### Git checks performed (all clean)
- `git status --porcelain=v2 -b`: branch `main` @ 53c62f8, upstream `origin/main`, ab +0 -0, zero file entries (no modified, staged, or untracked files).
- `git stash list`: empty.
- `git diff --stat` / `git diff --cached --stat`: empty.
- `git log --branches --not --remotes --oneline`: empty — **no local branch has unpushed commits.**
- Two linked worktrees exist (see §5); **both fully clean** (`status --porcelain=v2`: zero entries, ab +0 -0).

## 2. PR state (gh authenticated, queried 01:33 local)

### PR #1 — MERGED (safe)
- Title: "Merge all recent Tribunal work" | state MERGED | not draft | head `pazare/merge-tribunal-recent-work-20260715` | mergedAt 2026-07-15T07:15:32Z.
- 75 files: full operator control plane, Decoder Lab (kernel/src/decoder.ts 1574 adds, decoder-service.ts 1027, decoder-components.tsx 1756, operator-components.tsx 1087), 5 run ledgers, docs, tests, screenshots. Body claims 85/85 tests, all validation local.
- Merge commit 53c62f8 == current main == origin/main.

### PR #2 — OPEN DRAFT, UNMERGED, MERGEABLE (content pushed, therefore safe; merge is the pending action)
- Title: "docs: validated Tribunal Clinical research brief + claim-by-claim validation log"
- state OPEN | isDraft true | mergeable MERGEABLE | reviews: none | comments: none | updatedAt 2026-07-15T12:28:52Z
- head `claude/tribunal-clinical-research-lx3fpi` @ `f18e15a` (remote-only branch; exists on origin)
- Two commits not on main:
  - `97f1634` (2026-07-15 12:02:46Z) "docs: add validated Tribunal Clinical research brief and validation log" — adds brief + validation-log
  - `f18e15a` (2026-07-15 12:28:47Z) "docs: Krishnan meeting kit — rebuilt diagram, 5-minute script, briefing slides" — adds script + slides, modifies brief
- Body highlights (verbatim claims from PR body): GPT-5.6 Sol pricing corrected to $5.00/$30.00/$0.50 (draft had Terra's card); Anthropic model selection settled (Opus 4.8/Sonnet 5 for clinical panel, Fable 5 scoped to synthetic research — 30-day retention constraint); FDA CDS guidance dates pinned (Sept 2022 → Jan 6 2026 → Jan 29 2026 reissue → Mar 11 2026 town hall); NIST AI RMF citation fixed; capitulation detector formalized vs arXiv:2605.29087 + arXiv:2602.13093; refusal/timeout non-vote protocol; Sen maximality divergence formalization; Stage A 21-model failure mode (>80% differential vs <40% final dx) → RQ8. NOTE: body says "Two documents" but the PR ships four files (script + slides added by the second commit; body never updated).

## 3. PR #2 file inventory (gh pr diff 2 --name-only + numstat, cross-checked)

| File | Lines added | On main? |
|---|---|---|
| docs/clinical/tribunal-clinical-brief.md | 1572 | NO |
| docs/clinical/krishnan-slides.html | 557 | NO |
| docs/clinical/validation-log.md | 99 | NO |
| docs/clinical/krishnan-script.md | 80 | NO |
| **Total** | **2308** | — |

`git ls-tree -r main --name-only | grep docs/` → main has ONLY: docs/SUBMISSION.md, docs/architecture.md, docs/decoder-design.md, docs/honesty.md, docs/judging.md, docs/media/{ballot-ratified,docket,scorecard-a1-a12}.png. **No docs/clinical/ exists on main.** If PR #2 is never merged, these 2,308 lines remain only on the remote branch (and in the paused session's scratchpad copies).

## 4. History search for prior hackathon material

- `git log --all --diff-filter=A --name-only | grep -iE "hackathon|scopus|kappa|counterfactual"` → **NO MATCHES.** No file matching those terms was ever committed anywhere in history. (The agreement/kappa Python and Scopus notes exist only in the paused session's tmp scratchpad — see §1.)
- `git branch -a | grep -iE "hack|research|claude/"` → only `remotes/origin/claude/tribunal-clinical-research-lx3fpi` (the PR #2 branch).

## 5. Other findings

- **Linked worktrees (context for tonight's resumed session):** `git worktree list` shows two besides main, both created for planned contest work, both at `f18e15a` (== PR #2 tip), both tracking `origin/claude/tribunal-clinical-research-lx3fpi`, both CLEAN with no unique commits:
  - `/private/tmp/tribunal-fable-methods` → branch `pazare/tribunal-contest-methods-fable-20260716`
  - `/private/tmp/tribunal-fable-presentation` → branch `pazare/tribunal-contest-presentation-fable-20260716`
  These live in /private/tmp: the *checkouts* vanish on reboot, but they contain no unique content today. If future commits land there, push promptly.
- `docs/hackathon/` did NOT exist in the repo until tonight's recovery created it (01:33 local); at capture time it contained only `_recovered/` with an empty `scopus/` subdir (a sibling recovery agent's staging area). Nothing in `docs/hackathon/` is tracked by git yet.
- Recent main history (top of `git log --oneline -25`): 53c62f8 merge of PR #1; before it aeb3a5a, 6eec2dd, 03de05c, b13ec50, 117df1c (Decoder/control-plane work) — all pushed.
