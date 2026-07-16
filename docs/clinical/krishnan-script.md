# Krishnan conversation — engagement script

**Window: 15–30 minutes. We speak ≤ 5. The meeting succeeds if he talks for 20.**

**Objective:** extract his judgment on three decisions only he can adjudicate — the measurement construct, the sufficiency of the capitulation detector, and the silent-mode evidence bar. Everything else (workforce statistics, regulatory landscape, his own papers' findings) is context he already owns; reciting it burns his time and our credibility.

**Posture:** we are not pitching for approval; we are bringing a system built *on his group's findings* and asking him to attack it. Take notes visibly. Never defend — clarify, then write down.

---

## The script (verbatim, ~620 words ≈ 4.5 minutes spoken)

### 0:00–0:40 — Open on his work, not ours

> "Professor Krishnan — thank you. I'll take five minutes, then I want your judgment on three specific design decisions.
>
> We've built Tribunal: an open, working system where a high-stakes AI verdict is decoded span by span, and every span is *elected* — sealed blind ballots, anonymized cross-examination, a binding safety veto, preserved dissent, all on a hash-chained ledger. We're adapting it to clinical escalation: deciding when a complex case needs a specialist, which one, how urgently — and handing that specialist a better case packet.
>
> The design is built directly on three of your group's results: your multi-turn attack taxonomy, your unfaithful-capitulation finding, and Differential Reasoning Learning. We think we've built the system-level counterpart to what you've measured — and we'd like you to attack it."

*(Slide 3 visible. He now knows: real system, his papers read closely, specific asks coming.)*

### 0:40–2:00 — The mechanism, compressed

> "The core claim: in a clinical multi-agent panel, **consensus must be earned, not generated**. Four instruments enforce that.
>
> First, every material round is sealed before reveal — no agent rewrites its path after seeing the room.
>
> Second, no agent may change its vote without an **evidence-change certificate** naming the new fact, corrected inference, or normative trade-off that caused the change. A vote change without one is flagged as possible capitulation, not progress.
>
> Third, the **capitulation detector** implements your 2×2 latent-versus-behavioral framing — comparing each agent's public reasoning graph against its emitted vote. Since about half of think-mode capitulations leave a correct trace behind, that's a documented signal, and we claim only the public-warrant proxy, never faithful chain-of-thought.
>
> Fourth — because CARG fails on reasoning models — **no self-reported confidence enters ratification**. Calibration comes from outcome-anchored evaluation only. And when criteria are genuinely incommensurable, the ratifier computes the Sen maximal set and declares the case *underdetermined* — abstention and escalation to a credentialed human are first-class outcomes, not failures."

### 2:00–2:50 — Status and claim boundary

> "What exists today: the governance engine runs — cross-vendor panels, live ledgers anyone can re-verify. In one committed run the safety seat's veto overrode a three-to-two majority, on the record, under a named rule. Our scorecard fails our own runs where they deserve it — we claim process auditability, not answer quality, until controlled studies say otherwise. Saturday we build the clinical proof of concept at the Abridge–Anthropic hackathon: four agents plus a deterministic fact-checker, one rural complex case, one planted trap, refusals ledgered as non-votes."

### 2:50–4:30 — The three asks (then stop talking)

> "Three questions, in priority order.
>
> **One — construct validity.** 'Clinical consensus' could be operationalized as agreement, correctness, action appropriateness, calibrated abstention, or clinician usefulness. Which construct would you make the primary endpoint, so the rest become secondary by design rather than by accident?
>
> **Two — is the anti-conformity battery sufficient?** Sealed ballots, change certificates, an independent post-debate private vote, and the latent-versus-behavioral detector — is that enough to *distinguish* evidence-induced convergence from social capitulation, or does it take a stronger experimental design, like planted-evidence counterfactuals with known ground truth?
>
> **Three — the evidence bar.** What is the minimum package — technical, clinical, measurement, organizational — that gets a hospital AI-governance committee to approve silent-mode evaluation?"

*(Silence. Let him pick. Do not fill pauses.)*

### Close — only when he winds down (~30 seconds)

> "Last thought: this system is instrumented from birth — every alternative, objection, and veto is a typed event. If it would be useful to AIMSEC as a measurement testbed for multi-agent evaluation, we'd be glad to build the telemetry to your specification. What's the right way to follow up?"

---

## Contingencies

| Situation | Move |
| --- | --- |
| Only 15 minutes confirmed at start | Cut §2:00–2:50 entirely; asks begin at ~2:10 |
| He interrupts during the mechanism | Stop the script. His thread *is* the meeting. Steer back only to land Ask One before time ends |
| He challenges a premise ("public warrants aren't latent state") | Agree with the limitation explicitly — it's already our stated boundary — and ask what proxy he would accept |
| He asks about outcomes/accuracy claims | "We claim none. That's why question three matters — what evidence would let us start earning them?" |
| Conversation stalls or turns generic | Deploy the reserve question: **"What are we measuring that we've mistakenly treated as the thing itself?"** |
| He offers a student/collaborator | Accept concretely: propose they red-team the July 18 POC's evaluation rubric |

## Listen for (write these down verbatim)

- The construct he names first — that becomes the paper's primary endpoint.
- Any named metric, dataset, or design ("you'd want a ___ study") — these are his review criteria surfacing.
- Names he mentions — each is a warm introduction he's implicitly offering.
- Where he pushes back hardest — that's the section reviewers will attack; it gets rewritten first.

## Do not

- Recite workforce or diagnostic-error statistics — he knows them; the slide footnotes carry them.
- Present the economics unprompted — it's on the slide if he asks; the meeting is for measurement questions money can't answer.
- Claim outcome improvements, faithful chain-of-thought, or regulatory compliance — the honesty boundary is a feature; breaking it once costs everything.
- Exceed five minutes. The countdown is real: at 5:00, whatever remains unsaid becomes a follow-up email.
