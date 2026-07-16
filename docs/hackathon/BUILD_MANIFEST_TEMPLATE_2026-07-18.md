# Saturday build manifest and start receipt — copy-ready templates

Date prepared: 2026-07-16 (pre-event; this file is preparation, not contest work)
Purpose: make the day-of provenance boundary mechanical. At check-in, copy the two templates below into their target paths, fill every `<...>`, and commit them as the first day-of commit.

## Check-in command sequence (verbatim)

```bash
# 1. clean tree + fresh remote state
git fetch origin && git status --short   # must be empty
# 2. annotated prestart tag at the pre-event commit
git tag -a hackathon-prestart-20260718 -m "Pre-event substrate boundary, $(date -u +%FT%TZ)"
# 3. day-of branch
git checkout -b pazare/hackathon-day-20260718 hackathon-prestart-20260718
# 4. record the start receipt (template below) BEFORE any implementation commit
mkdir -p runs/hackathon-20260718
$EDITOR runs/hackathon-20260718/start.json
git add runs/hackathon-20260718/start.json BUILD_MANIFEST.md && git commit -m "hackathon: start receipt and build manifest"
git push -u origin pazare/hackathon-day-20260718 --tags
# 5. at submission time
git diff hackathon-prestart-20260718...HEAD --stat > runs/hackathon-20260718/day-of-diff.txt
```

## `runs/hackathon-20260718/start.json` template

```json
{
  "event": "Abridge x Anthropic x Lightspeed — The Future of Agentic AI in Healthcare",
  "date": "2026-07-18",
  "checkinAtLocal": "<HH:MM PDT, as witnessed>",
  "organizerConfirmations": {
    "confirmedBy": "<name/role of the organizer who answered>",
    "dayOfCodeBoundary": "<their exact words on what may be pre-built vs day-of>",
    "preExistingOssAllowed": "<yes/no/conditions, their words>",
    "allowedData": "<which sponsor/synthetic data may be used, demoed, and published>",
    "modelPaths": "<which model accounts/endpoints are authorized for sponsor data>",
    "submissionDeadline": "<time + mechanism>",
    "judgingFormat": "<what they state>"
  },
  "prestartTag": "hackathon-prestart-20260718",
  "prestartCommit": "<sha at tag>",
  "dayOfBranch": "pazare/hackathon-day-20260718",
  "team": ["Pablo Zavala", "Santiago <surname>"],
  "recordedAtUtc": "<ISO timestamp>"
}
```

Rule: if an organizer answer is not obtained, record `"unanswered"` — never fill a guess.

## `BUILD_MANIFEST.md` template (repo root, day-of branch)

```markdown
# Build manifest — hackathon day 2026-07-18

## Pre-existing (public, before `hackathon-prestart-20260718`)
- Tribunal kernel, ledger, verification, scorecard, packs, server, web UI, worker (PR #1, merged 2026-07-15)
- packages/clinical-eval evaluation harness incl. receipted scripted-provider falsification gate (PR #3 tree)
- docs/hackathon research protocol, codebooks, meeting kits, evidence ledgers (PR #3 tree)
- Verification: `git log --oneline main..hackathon-prestart-20260718`

## Prepared before the event, disclosed as preparation (not demoed as contest work)
- research protocol + preregistered E2 design; synthetic case fixtures v0.1; Scopus/evidence ledgers; this template

## Built during the event (all commits after the start receipt, on the day-of branch)
- <clinical pack for the chosen case>
- <permitted sponsor-data/transcript input adapter>
- <clinical tuple/escalation packet surface>
- <live experiment run + receipts>
- <clinician-feedback changes>
- Verification: `git diff hackathon-prestart-20260718...HEAD --stat`

## External resources used
- Libraries: <list, with licenses>
- Sponsor resources: <exact artifacts + authorization>
- Data provenance: <synthetic | sponsor de-identified, terms as recorded in start.json>
- Models/endpoints: <exact model ids as receipted in run ledgers>

## Reproduce / verify
- Tests: `npm test`; receipts: `npm run experiment:clinical:verify -- <run dir>`; ledger: `POST /api/verify`
- Commit window: <first day-of sha> .. <final sha>, all timestamped after start receipt
```

## Claim boundary reminders for the manifest author

- The scripted falsification gate is analyzer behavior, never model performance.
- Pre-event pilot results are labeled `PRE_EVENT_RESEARCH` and are not contest results.
- Every limitation stated in the submission is labeled `EXHAUSTED` or `HYPOTHESIZED` (operator rule, 2026-07-16).
