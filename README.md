# Tribunal

**Due process for high-stakes AI decisions.**

When an AI system denies your loan, rejects your insurance claim, flags your
benefits as fraud, or takes down your post, you get a fluent paragraph and no way
to know *why* — what evidence was weighed, who could have objected, what was
overruled, or whether anyone checked it against the law. Post-hoc "explanations"
from a single model are not a reliable audit surface.

Tribunal replaces the single-model answer with an **independent, cross-provider
panel that deliberates under due process** and leaves a **tamper-evident public
verdict ledger** — generated *during* the decision, not reconstructed after it:

1. **Blind proposal** — each seat (a different vendor's model) proposes a span
   without seeing the others.
2. **Sealed commitment** — every proposal is hashed into the ledger *before* any
   reveal, so nobody can claim a position they did not hold.
3. **Anonymized Delphi feedback** — seats critique candidates with authorship
   hidden and candidate order shuffled per recipient (position-bias control).
4. **Revision** — each seat must answer the strongest objection to its pick,
   steelman the best rival, and say what would change its mind.
5. **Safety veto** — one seat can *veto* with a public reason.
6. **Constitutional ratification** — a *named* rule selects the ratified span;
   material minority **dissent is preserved forever**.

The visible product is a normal decision. The hidden product is a hash-chained,
schema-valid, independently verifiable audit trail.

> Status: built at the RAISE Summit Hackathon 2026 (Cursor track). See
> `docs/` for the build log and `runs/` for committed, replayable real runs.

## Quickstart

```bash
npm install
npm run test          # kernel test suite (determinism, tamper-evidence, veto, dissent…)
npm run demo          # offline deterministic smoke run + hash-chain + tamper demo
npm run dev           # the API server + the web "deliberation theater" UI
```

More docs land as the build progresses.
