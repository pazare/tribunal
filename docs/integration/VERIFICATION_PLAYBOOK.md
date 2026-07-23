# Verification playbook — MVP test protocol per reconciliation step

**Document status.** Companion to `TRIBUNAL_EXTRACTION.md` and (in `pazare/nudg-md`)
`docs/integration/DISCOVERIES.md`. Standing rule adopted 2026-07-22: **every reconciliation
step ships with a test card before it executes**, and every command printed in a card is
either **EXECUTED** (run against the stated tree, observed output quoted) or explicitly
marked **PRESCRIPTIVE-UNTESTED**. A playbook of unexecuted commands is theater; this file
contains none. All EXECUTED results below were obtained 2026-07-22 against the tribunal
working tree at HEAD `6f08344` + 51 uncommitted files, and the nudg-md tree at HEAD
`e2dcdb9` + 18 uncommitted files.

**Didactic contract.** Each gate and card states (i) the **property** it certifies, formally;
(ii) the **concept** it exemplifies, named as used in production, clinical, and banking
practice. Rigor and instruction are the same artifact.

---

## §1 Foundations

**D1 (Verification vs validation).** Verification: the artifact satisfies its specification
(`build the thing right`). Validation: the specification satisfies the need (`build the
right thing`). Automated gates below are verification; the live scenario battery (G7) is
validation. Clinical-software practice (IEC 62304 vocabulary) keeps these as distinct,
separately-evidenced activities; conflating them is a category error.

**D2 (Reconciliation).** Two derivations D₁, D₂ of the same quantity from independent
routes; the reconciliation predicate is D₁ = D₂. A **break** is D₁ ≠ D₂. Banking discipline,
adopted here verbatim: a break is *investigated before either side is overwritten* — the
break report names the failing check, and the resolution is recorded. Instances in this
codebase: stored `receiptSha256` vs recomputed `computedReceiptSha256` (G3); committed
ledger head vs published anchor in `runs/ANCHORS.md` (G2); stored patient age vs age
recomputed from DOB (G6); rig behavior vs canonical behavior under σ-renaming
(DISCOVERIES S9).

**D3 (The three frontiers).** A repository has three simultaneously-live states:
working tree W, local HEAD H, remote R. Full reconciliation is W = H = R. Current status:
tribunal W ≠ H (51 files, incl. the **untracked 881-line `ledger-structure.ts`** — CT7),
H ≠ R (ahead 12, behind 5); nudg-md W ≠ H (18 files), H = R. Every test card states which
frontier its evidence binds: a green gate on W certifies W, not H — after any commit or
merge, the battery re-runs.

**D4 (Grade requirement sets).** *Production-grade:* deterministic, exit-coded, loggable,
CI-gateable, rollback-defined. *Clinical-grade:* labeled claim boundaries, fail-closed
parsing (DL7), audit trail, synthetic-data discipline, authority invariants (INV-AUTH,
INV-CLIN). *Bank-grade:* dual computation (D2), published anchors (OB17), tamper evidence
with named failing checks (T1), sealed immutable records (OB16), break-before-overwrite.
The gate battery instantiates all three sets.

---

## §2 The MVP gate battery (G1–G7) — all EXECUTED 2026-07-22

Run G1–G5 from the tribunal root, G6–G7 from the nudg-md root. Shell hygiene first:

**Exit-code law.** Capture `$?` on the *next line* after the command under test — never
after a pipe (`cmd | tail; echo $?` reports `tail`'s status, not `cmd`'s). Two real defects
in this session's own tooling demonstrated it: a summary-grep that filtered away the pass
counts (a green pipeline you cannot read is not evidence), and a `$?` captured after `tail`
that printed `EXIT=0` over an npm exit 1. Pattern used throughout:
`cmd > log 2>&1; RC=$?; echo "EXIT=$RC"; grep <expectations> log`.

**G1 — Unit/contract suites.**
`npm test` → EXECUTED: exit 0; per-workspace tests/fail = clinical-eval 87/0, kernel 64/0,
packs 2/0, scorecard 14/0, server 11/0, web 9/0; **total 187/0**.
*Property:* the executable falsifiers of the specs hold — provider laws L1–L14, quorum and
fail-closed vote hygiene (T3), receipt round-trips, auth gating, scorecard predicates
(≈50-row test-witness map, SPEC_CLINICAL_EVAL).
*Concept:* a law without a falsifier is a comment. The suites are the laws' falsifiers.

**G2 — Anchor reconciliation of all committed ledgers.**
`npx tsx scripts/check_anchors.ts` → EXECUTED: exit 0; `all 13 committed run(s) verify and
match their anchors`, per-run event counts + head-hash prefixes printed.
*Property:* for every committed run: `verifyLedger` passes ∧ recomputed head = the anchor
published in `runs/ANCHORS.md`. Catches the two auditor-relevant failure modes the script
documents: tamper/corruption, and rewrite-without-re-anchor ("indistinguishable from
forgery to an auditor, so both fail").
*Concept:* **anchoring** discharges the unanchored-chain non-guarantee (T1/N): a hash chain
proves integrity only relative to a head; publishing the head elsewhere is what makes it
evidence. This is D2 with the anchor table as the second ledger.

**G3 — Receipt replay (positive control).**
`npm run experiment:clinical:verify -- runs/clinical-eval/mechanism-simulator-v0.1-seed18
packages/clinical-eval/fixtures/mechanism-fixtures-v0.1.json`
→ EXECUTED: exit 0; `"valid": true`, `receiptSha256` = `computedReceiptSha256` =
`cc25cb94…a015`.
*Property:* DL9 (verification is replay): every hash and the semantic analysis are
recomputable from repository contents alone; the verifier dispatches on the receipt's own
recorded schema version (INV-COMPAT — the d8dc13c mechanism).
*Concept:* attestation without recomputation is labeling, not verification. The displayed
pair IS the reconciliation (D2) made visible.

**G4 — Tamper drills (negative controls; clones only, never committed artifacts — OB16).**
Procedure: copy a committed run directory to a scratch path, mutate one field, re-verify.
EXECUTED twice:
- G4a: single digit flipped in the clone's `assignments.json` → exit 1, hashes still
  **equal**, failure named by the semantic layer: `duplicate case x agent x replicate
  matrix cell across sealed states`.
- G4b: first numeric leaf of the clone's `results.json` incremented → exit 1, **two** named
  failures: `result hash mismatch` ∧ `results artifact does not match semantic replay`.
*Property:* the verifier is falsified in both check families — per-artifact hashing and
semantic replay — matching the two-layer design (T1: chain + structure); a tamper outside
any hash preimage is still caught by structure (G4a exhibits exactly the relink-forgery
defense class).
*Concept:* **defense in depth**, and: a verifier you have never seen fail is unfalsified —
negative controls are part of the battery, permanently. Note the break reports *name the
failing check* (diagnostic, not boolean) — bank-grade break-report practice.

**G5 — Typecheck.** `npm run typecheck` → EXECUTED: exit 0, zero `error TS`.
*Property:* the workspace type discipline holds over W. *Concept:* types are the cheapest
proof layer — machine-checked invariants purchased at compile time.

**G6 — nudg-md static reconciliation.** (from nudg-md root)
`node scripts/check.mjs` → EXECUTED: `Checks passed: 5 patient ages, 3 weekday labels, and
critical static safety contracts.` Plus `node --check` on
`shared/{nudges,bus,buddy}.js ehr/app.js scribe/app.js` → all pass.
*Property:* stored values equal independently recomputed values (age from DOB, weekday from
ISO date), and the structural safety contracts (handoff queue, ack handling) are present.
*Concept:* the same reconciliation algebra as G2 at document scale — derived-vs-stored dual
computation. Redundant stored data is only safe when a gate recomputes it.

**G7 — nudg-md live scenario battery (validation, manual).** Canonical walkthrough:
`docs/TESTING.md` (authoritative; do not fork it here). Condensed order: `./scripts/serve.sh`
from a terminal holding `ANTHROPIC_API_KEY`; hard-reload both tabs (⌘⇧R); Reset Demo once;
then R-01 (typed impression → cross-app card), R-04 (4 distinct tab clicks in 40 s →
wayfinding card; programmatic jumps must NOT count — DL1), R-09 (rest on Summary → depth
card; rest mid-document → silence — DL2), R-12 (simulated send → WATCH), relay
`curl 127.0.0.1:4809/health` (note: `"ready"` certifies key *presence*, not validity —
CR5), panel refusal on Holloway (UNDERDETERMINED ⇔ ∃ insufficient seat — CR3), Shift+B
cancel (scripted label must remain — monotone provenance).
*Concept:* G7 is validation (D1): it exercises the design laws as a user would experience
them; the automated gates cannot substitute for it, nor it for them.

---

## §3 Reconciliation step cards

**Template TC.** Objective · Frontier bound (D3) · Preconditions · Procedure (numbered) ·
Expected observations · Break interpretation (per named failure, what it means, what NOT to
overwrite) · Rollback · Teaches.

### R1 — Tribunal three-frontier reconciliation (URGENT; standing per dossier §4)
*Objective:* W = H = R for `pazare/tribunal-hackathon-recovery-20260716`. CT7 makes this
urgent: the Layer-2 verifier (`ledger-structure.ts`, 881 lines) is untracked — the strongest
tamper-evidence claims currently rest on one machine's disk.
*Preconditions:* G1–G5 green on W (EXECUTED — they are). Snapshot exists (2026-07-19 diff
patch + untracked archive).
*Procedure* (PRESCRIPTIVE-UNTESTED; execution on operator order because it adjudicates
uncommitted work):
1. `git add -A && git commit -m "feat: working-tree reconciliation — structural verifier, request security, system card, honesty/docs deltas"` — W→H.
2. `git fetch origin` and inspect both sides:
   `git log --oneline HEAD..origin/pazare/tribunal-hackathon-recovery-20260716` (5 remote-only, docs-titled) and `...origin/pazare/tribunal-hackathon-recovery-20260716..HEAD` (now 13+).
3. `git merge origin/pazare/tribunal-hackathon-recovery-20260716` — expected: clean or
   doc-file conflicts only (remote side is docs-titled; verify, don't assume, at step 2).
4. **Re-run G1–G5.** The battery is the post-merge gate: a behavior-preserving merge is
   *defined* as battery-green before and after.
5. `git push origin HEAD`.
6. Re-run G2 once more post-push from a fresh `git clone` if bank-grade evidence is wanted
   (reconciliation from a second copy — the auditor's view).
*Break interpretation:* G2 fails post-merge with `anchor mismatch` ⇒ a committed run or the
anchor table was altered by the merge — investigate the merge diff on `runs/**`; never
re-anchor to silence it (re-anchoring without investigation is the forgery-indistinguishable
mode the gate exists to catch). G1 fails ⇒ identify the workspace, bisect the merge.
*Rollback:* `git merge --abort` (step 3) or `git reset --hard <pre-merge-sha>` before push;
after push, revert commits — never rewrite the pushed recovery branch.
*Teaches:* commit-before-merge (dirty-tree merges convolve two adjudications); the battery
as merge oracle; break-before-overwrite on anchors.

### R2 — nudg-md dirty-tree adjudication (18 files)
*Objective:* W = H on nudg-md main. *Preconditions:* G6 green on W (EXECUTED).
*Procedure* (PRESCRIPTIVE-UNTESTED): 1. `git diff --stat` and per-file review — these are
post-dossier developments (UI/apps/relay/data; engine and bus untouched). 2. Partition:
commit / discard per file. 3. Commit with a message naming what changed behaviorally.
4. Re-run G6 + `node --check` set + G7 (the tree changed; the battery binds the new W).
5. Push (public provenance repo — pushes are the norm there).
*Teaches:* the frontier rule (D3) — G6's current green binds the dirty W; after commit it
must be re-established, cheaply, every time.

### R3 — Receipt algebra + strict-parse gateway (OB11, OB12, OB13)
*Objective:* one receipt algebra in the target (ledger events ⊇ execution receipts ⊇
latency receipts) over the canonical-JSON/SHA-256 module; DL7 at the gateway; quorum
`max(2,⌊n/2⌋+1)`+safety with typed `degraded`.
*Test protocol* (PRESCRIPTIVE-UNTESTED, to be executed at the step):
1. Port `packages/kernel/src/hash.ts` verbatim (pure module, no kernel imports — LIN1) and
   pin golden vectors: hash the three fixture events captured from a committed run and
   assert byte-equal digests against the values recorded here at porting time (guards K4's
   cross-runtime canonical-JSON risk with evidence rather than assumption).
2. Property-based strict-parse tests: fuzz malformed/repaired provider outputs into the
   gateway; assert every one becomes a typed `incomplete` non-vote and **no** quorum,
   verdict, or render path consumes it (DL7; regression LIN9 is the cost of skipping this).
3. Quorum table test: for n ∈ {2..8}, enumerate vote multisets on the boundary; assert
   `degraded` (typed) below threshold, never a silent verdict (T3).
*Teaches:* golden vectors as cross-runtime reconciliation; fuzzing as falsifier
manufacturing; boundary enumeration over trust in arithmetic.

### R4 — Loopback gate + sealed ledger + anchoring op (OB15, OB16, OB17)
*Test protocol* (PRESCRIPTIVE-UNTESTED):
1. Allowlist matrix test on the companion ingest: {allowed host+origin, wrong origin, absent
   origin, loopback-but-unlisted} × {quota route, mutating route, ledger route} — assert
   default-deny everywhere except the exact allowlisted cell (T7: deny **even on
   loopback**; loopback is a place, not a principal).
2. Immutability test: attempt mutation of a persisted audit artifact via every API route;
   assert rejection; assert the tamper-demo route operates on a clone (OB16 — G4's
   clone-only discipline as an API invariant).
3. Anchoring runbook: define the publish-head operation; test = fresh-clone re-verification
   against the published anchor (G2's algebra, new home); document what the anchor proves
   (integrity relative to publication time) and does not (authorship, wall-clock order —
   K5).
*Teaches:* default-deny as a matrix, not a sentence; immutability as an API property you
test, not a database setting you trust.

### R5 — Authority, exposure bounds, falsification-first (OB19, OB20, OB21)
*Test protocol* (PRESCRIPTIVE-UNTESTED):
1. Authority non-escalation negative test: attempt to construct/render any packet at an
   authority above `DECISION_SUPPORT_ONLY`; assert type-level or gate-level rejection
   (INV-AUTH), and assert the clinician/user-retention line is present at **every** render
   surface by DOM/snapshot enumeration (INV-CLIN).
2. Exposure-bound chain test: for a sample assertion, assert the full chain
   assertion → authorized span → decision-time availability → verifier attestation exists
   with exact-set registry equality; then break each link in a clone and assert the packet
   assembler fails closed (OB20).
3. Falsification-before-analysis as a merge gate: CI job runs the mechanism simulation with
   known policies and requires exact recovery across all estimands before any
   metrics/analysis module change merges (DL11; K6 bounds what "exact recovery" certifies —
   fixture adequacy remains a stated conjecture).
*Teaches:* negative tests as the only proof of "cannot"; fail-closed demonstrated by
severing links, not asserted; estimator error models earned on known truth (DL11) — "an
estimator that has never been run against known truth has no error model, only hope."

---

## §4 Standing rule (restated for future steps)

Before any reconciliation step executes: write its TC card; mark every command EXECUTED or
PRESCRIPTIVE-UNTESTED; after execution, promote commands to EXECUTED with observed output
quoted, and record any break + resolution in the card itself. The card ledger is
append-preferring: superseded cards are marked, not deleted — same discipline as the event
ledger it protects.
