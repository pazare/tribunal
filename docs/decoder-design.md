# Live explainable decoder protocol

Tribunal can answer an arbitrary prompt through exactly two fresh CLI agents,
one elected surface unit at a time:

| Principal | Requested model | Effort | Transport |
|---|---|---|---|
| Codex | `gpt-5.6-sol` | `medium` | `codex exec`, prompt on stdin |
| Claude | `claude-opus-4-8` | `medium` | `claude -p`, prompt on stdin |

There is no offline, cached, single-provider, or scripted fallback in this path.
Binary presence is only a readiness check. A live receipt separately records the
requested model and any model identity the provider CLI reports.
The Claude process also pins `ANTHROPIC_SMALL_FAST_MODEL=claude-opus-4-8` and
disables nonessential traffic so Claude Code cannot silently use a different
small/fast model for auxiliary work. Every provider-reported model remains
visible in the receipt and roster.

## Exact output alphabet

Each round may commit exactly one tagged unit:

```ts
{ kind: "span",  text: string } // nonempty and contains no whitespace
{ kind: "space", text: " " }
{ kind: "enter", text: "\n" }
{ kind: "stop",  text: "" }
```

The validator does not trim, normalize, split, join, truncate, repair, or infer
controls from magic strings. For example, the span text `STOP` is ordinary
visible text; only `{kind:"stop",text:""}` terminates. The final output is the
byte-exact concatenation of committed non-STOP units.

## Fresh deliberation for every unit

Latency is deliberately not an optimization objective. There is no lookahead,
speculative draft, cache, or multi-unit acceptance. Every unit gets a complete
new round over the exact prefix and the complete prior public history. The
kernel imposes no wall-clock deadline; the local service applies a generous
finite per-call backstop (30 min by default, operator-decided, tunable via
`TRIBUNAL_DECODER_TIMEOUT_MS`) so a slow-but-real deliberation finishes
untouched while a hung or unreachable provider trips the deadline and ends as an
*invalid run* (`status "timeout"` → `failed`), never a fabricated STOP. Operator
cancellation remains a separate terminal state.

1. **Independent proposals.** Both principals propose one valid unit and a
   concise, contradictable public warrant.
2. **Cross-revision.** Each sees both label-blinded proposals, critiques the
   rival option, and returns one final revised unit plus public warrant.
3. **Selection.** Exact revision agreement commits immediately. If the two
   revisions differ, both principals cast a fresh judge ballot over finalists
   `0` and `1`.
4. **Disagreement rule.** Matching judge ballots select that finalist. A split
   ballot cannot make STOP unilateral, so a sole non-STOP finalist continues.
   A persistent split between two non-STOP finalists uses a coordinator bit
   committed before any provider call in the round.
5. **Commit.** The selected exact unit and rule are hash-chained, streamed, and
   added to the next round's prefix and public history.

The tie commitment prevents the coordinator from choosing its bit after seeing
the candidates. The nonce and bit are revealed only when used. This is auditable
coordinator randomness, not externally anchored or trustless randomness.

Both providers are required in every phase. An invalid response gets one
transparent retry with the validation errors. Missing quorum after that fails
closed; one provider never impersonates two.

Provider-reported model drift also invalidates that attempt. JSON responses
with duplicate keys, whitespace-only warrants, invisible control spans, or
lone surrogate code points fail validation rather than being repaired.

## Termination

- A selected STOP commits once, ends the run immediately, and opens no new
  deliberation round.
- Operator cancellation is a separate terminal state with actor and reason.
- Provider failure is a separate terminal state with its receipts.
- Reaching `maxRounds` is `budget_exhausted`, never a fabricated STOP.
- Partial output remains visible for cancellation, failure, and exhausted
  budgets, but it is not labeled a completed answer.

## Public transcript boundary

The ledger records every observable decoder action:

- every exact prompt sent to each CLI;
- raw stdout and stderr;
- the structured public response and validation result;
- requested model and effort, CLI version, provider-reported model when present,
  command fingerprint, exit status, signal, and timing;
- proposals, revisions, critiques, judge ballots, selection rule, tie evidence,
  dissent, exact unit, and prefixes before and after commitment.

This is the complete **observed public provider exchange**. It is not private
chain-of-thought, hidden system text, undisclosed platform policy, logits, or a
provider-side execution trace. Tribunal never claims access to those unavailable
artifacts. Public warrants are inspectable claims, not proof of hidden cognition.

## Ledger and verifier

Canonical events are:

`decoder_started`, `round_started`, `tie_committed`,
`provider_call_started`, `provider_attempt`, `phase_completed`,
`unit_selected`, `dissent_preserved`, `unit_committed`, and
`decoder_finished`.

`verifyDecoderLedger()` recomputes the hash chain, sequence and run identity,
reconstructs every phase and retry prompt from the recorded decoder state,
re-derives structured responses and model receipts from exact raw stdout,
recomputes validation, validates exact units and prefixes, and binds the
terminal output byte-for-byte to committed units. It replays the complete
proposal/revision/judge state machine, including 2/2 phase quorum, finalist and
selection equality, tie commitment/reveal, exact dissent, failed-round closure,
terminal uniqueness, and the rule that only the terminal receipt may follow a
committed STOP. As with the rest of Tribunal, internal verification is
tamper-evident but not third-party provenance unless the head hash is anchored
elsewhere.

The local service acquires an atomic process lease before recovery, writes every
event to an owner-only append journal before it is streamed, salvages and seals
a complete prefix after a torn final journal line, then atomically seals the
terminal JSON ledger and metadata. It admits one two-agent run at a time across
processes, disconnects backpressured SSE clients so they can resume from
`afterSeq`, and never silently replaces a conflicting sequence. Loopback is the
default; a non-loopback bind requires an operator token on every decoder route.

## Surfaces

- Kernel protocol: `packages/kernel/src/decoder.ts`
- Exact unit validator: `packages/kernel/src/surface.ts`
- Pinned CLI transports: `packages/kernel/src/providers/decoder-cli.ts`
- Local API and persistence: `apps/server/src/decoder-service.ts`
- Live UI: `apps/web/src/decoder-components.tsx`
- HTTP/SSE endpoints: `/api/decoder/*`
