# Decoder flow baseline audit

## Step 1 - Find a live-prompt decoder

Health: blocked.

- Strength: the current Tribunal docket is visually coherent and clearly presents governed case packs.
- UX blocker: there is no free-form prompt field or Decoder Lab entry point. The only primary action starts a fixed case pack, so the requested task cannot begin.
- Trust risk: the page describes every span as elected, but this screen offers no way to distinguish the existing six-seat governed workflow from the requested two-provider decoder.
- Accessibility evidence: headings, regions, labels, and disabled downstream navigation are exposed in the DOM. Keyboard order, focus styling, live announcements, and contrast still require interaction testing.
- Evidence: `01-current-docket-no-live-prompt.png`.

## Required post-build flow

1. Enter an arbitrary prompt.
2. Confirm exactly two requested CLI principals and medium effort.
3. Start a run and see an immediate in-flight state.
4. Watch exactly one committed unit appear per completed round.
5. Inspect exact public prompts, raw responses, validation, revisions, ballots, selection, and dissent.
6. Distinguish model STOP, cancellation, provider failure, and round-budget exhaustion.
7. Export and verify the complete observed transcript.

## Post-build audit

Health: passed.

- The unqualified root URL opens Decoder Lab; `?mode=offline` still opens the
  legacy docket for existing smoke coverage.
- A browser-driven live run (`decoder_mrfvnqh8_bd09667aac644aa5`) moved from
  `running` with a connected event stream to `stopped`, kept quorum at 2/2,
  committed exactly one STOP unit, and opened no second round.
- The chronological record exposed exact prompts, raw stdout/stderr, parsed
  proposals and revisions, validation, safe argv/environment, timing, model
  receipts, selection rule, exact unit, terminal receipt, and every event hash.
- The roster showed Codex `gpt-5.6-sol` medium and only
  `claude-opus-4-8` in Claude's provider-reported model list. A prior observed
  Haiku auxiliary call was eliminated by pinning Claude Code's small/fast model
  to the same Opus model and disabling nonessential traffic.
- UI verification returned `VALID`, with exact output binding passed and head
  `6f9a3d48a114961b858f90f40d52163b301ef209c45551502e0482075c2943a8`.
- An API-driven two-round run (`decoder_mrfvgg7h_988b515044bfb917`)
  independently proved visible SPAN `OK` followed by elected STOP; its 30-event
  ledger also verified exactly.
- Empty output after a first-round STOP is labeled explicitly, rather than
  incorrectly saying no unit was committed.
- Browser console audit found no runtime errors.

Visual evidence:

- `02-decoder-lab-ready.png` — idle prompt, roster, output, transcript, verify.
- `04-live-stop-summary-viewport.png` — stopped state, one exact STOP unit.
- `05-public-transcript-viewport.png` — full-transcript boundary and event list.
- `06-provider-receipt-viewport.png` — parsed receipt, validation, pinned argv.

## Hardened post-review rerun

- Browser run `decoder_mrfwo3pa_b6da4a715be2f268` stayed connected while the
  operator navigated to Docket and back, then completed with one exact STOP.
- The revised quorum chip reported only the latest successful
  `phase_completed` quorum, not mere provider-call presence.
- Transcript state was `full`; Claude reported only `claude-opus-4-8` in both
  phases; exact protocol verification passed with head
  `a0e2d1fca0ee44c92ee5bd79ec14d44337ca7052f3aa1432649767d60579f432`.
- A six-round nonterminal response independently ended as `budget_exhausted`,
  not synthetic STOP, and its 86-event state-machine ledger verified.
- `07-hardened-live-summary.png` and `08-hardened-transcript-full.png` are the
  final same-viewport visual checks. Comparison against the baseline confirms
  the existing Tribunal typography, spacing, borders, and color system were
  preserved while adding the live path.

## Final adversarial verification

- The strengthened verifier still accepts the completed hardened STOP run
  (`a0e2d1fca0ee44c92ee5bd79ec14d44337ca7052f3aa1432649767d60579f432`)
  and the six-round budget run
  (`d4975650c82750bebd7f3b6698ebb1c439dc7ab11cc714ccf7e6fe5e5e2ce0f0`).
- A new browser-started run on the final build failed closed when the Codex CLI
  reported an account usage limit. The ledger preserved both failed Codex
  attempts, Claude's real Opus receipt, the 1/2 proposal quorum, and the
  terminal provider failure; its 11-event ledger verified exactly with head
  `8676a4be8278a9f287b72b59039d298b0be3865ac5f9b6918946d6a0eb5e2d48`.
- The final production build renders at `http://localhost:8787/`. The browser
  tab was left on the ready Decoder Lab screen.
