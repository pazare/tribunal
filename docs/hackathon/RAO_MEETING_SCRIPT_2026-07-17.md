# Rao conversation — engagement script

Date: 2026-07-17 meeting; script frozen 2026-07-16 (same-day coherence pass before the meeting: decision numbering canonicalized to the one-pager/ledger scheme, two evidence rows disambiguated; no position changes)
Companion documents: `RAO_MEETING_ONE_PAGE_2026-07-17.md` (hand it over, don't read it aloud), `RAO_EVALUATION_SCENARIO_WORKSHEET_2026-07-17.md` (open on screen when he engages), evidence ledger §5b (citations on demand only).

**Window: assume 30 minutes. We speak ≤ 5. The meeting succeeds if he leaves fingerprints on five decisions.**

**Objective:** Rao is the evaluation-methodology and reliability referee. We are not asking "is this good?" — we are asking him to adjudicate five prespecified design decisions and to attack our frozen working answers. Every decision has a written fallback, so any answer he gives is progress.

**Posture:** on Wednesday Krishnan adjudicated the construct question at the clinical level (escalation tuple, formal vocabulary, kappa panel, stronger-than-Delphi experimental design — all now implemented or preregistered). Today is the measurement-engineering layer: units, failure definitions, comparators, timing, and the governance evidence bar. Bring the worksheet filled in; take his edits verbatim.

---

## The script (verbatim, ~600 words ≈ 4.5 minutes spoken)

### 0:00–0:35 — Open on his method, not ours

> "Professor Rao — thank you. Five minutes of setup, then five specific decisions we'd like your judgment on.
>
> We've built Tribunal: a working system where a high-stakes AI verdict is decided span by span under sealed ballots, anonymized cross-examination, a binding safety veto, and preserved dissent, on a hash-chained ledger anyone can re-verify. We're adapting it to one clinical workflow: complex-case specialist escalation. Professor Krishnan pushed us hard on construct validity on Wednesday; we rebuilt the evaluation design around a bounded escalation tuple instead of generic 'clinical consensus.'
>
> We prepared for this conversation using your own instruments — we filled in your AI Use Case Worksheet for our scenario, and we tried to apply the reliability-engineering framing from your trustworthy-AI work. That surfaced exactly the questions we can't settle ourselves."

### 0:35–1:30 — What exists, compressed

> "What's real today: the deliberation engine runs with cross-vendor panels and tamper-evident ledgers. For the clinical layer we've preregistered a paired five-arm mechanism experiment — every sealed case-agent state receives control, valid evidence, an unsupported majority count, both in conflict, or an irrelevant-evidence placebo — and the analysis harness is implemented, tested, and fail-closed: it refuses attrition, session reuse, or prompt drift, and its receipts replay the entire analysis from hashes. We ran the falsification gate with six scripted adversarial policies; the analyzer recovers each programmed effect exactly. So the instrument is calibrated — what we measure with it next is what today decides.
>
> One honest gap we bring you: an authenticated literature pass on reliability engineering for AI-based clinical decision support came back with classical reliability papers and no direct transfer. We'd rather have you correct our framing than invent one."

### 1:30–4:30 — Five decisions (hand over the one-pager; then stop talking)

> "The five decisions, with our current working answers to attack:
>
> **One — construct.** We treat 'clinical deliberative adequacy' as a formative umbrella — evidence support, safety, uncertainty, feasibility, dissent preservation, reviewability — and we report dimensions separately, no composite score. Is formative right, or is any composite defensible?
>
> **Two — the unit and the failure event.** Cases share templates; agents share model weights. For agreement statistics and for failure counting: is the decision point, the case, or the case-family the right independent unit — and what is the failure event for a stochastic panel: one wrong tuple, one unsafe ratification, or loss of a guaranteed function like the veto path? For same-provider agents our candidate framing is a common-cause-failure model — β-factor style — because independence is exactly what we cannot assume. Is that the right import, or would you model it differently?
>
> **Three — the comparator.** For an AI-panel-versus-human-panel comparison to persuade a governance committee: which of information, tools, time, action space, calls and tokens, retrieval, and adjudication must be identical? The one scoping review we verified found most published comparisons fail this — three-quarters retrospective, half with no time limit. And are documented historical specialist groups — tumor boards, MDT records — an admissible comparator alongside recruited raters, given their confounds?
>
> **Four — timing.** The verified literature says clinician-first commit-then-reveal performed best in the only randomized timing comparison we found, and that ordering changes the *form* of bias rather than removing it. We've designed for silent mode first, commit-then-reveal second. Where would you put the human, and what would make you move them?
>
> **Five — the governance bar.** From verified silent-trial precedents we distilled: hidden outputs for a defined window, prespecified comparison against benchmark and incumbent, explicit stop signals, go only after stability. What is the minimum evidence package — and which negative result would still justify continuing the research?"

*(Silence. Let him pick the thread. Do not fill pauses.)*

*(If time allows, the worksheet carries a sixth, smaller decision — whether the clinician evaluates the diagnostic assessment, the proposed action, or both separately, and in which order. Take it only after the five above have answers.)*

### Close — only when he winds down (~30 seconds)

> "Two small asks. First: your worksheet method expands use cases into evaluation scenarios through repeated human review — we'd like to use exactly that process to generate our counterfactual twin families, and we'd value your red-line on the first batch. Second: what's the right way to follow up after Saturday's build — and is there a student or collaborator who should be at the table?"

---

## Evidence on demand (cite only if he asks; never recite)

| If he probes | One line, with source |
| --- | --- |
| Timing evidence | Yin/Ngiam/Tan/Teo, *Management Science* 2025 (10.1287/mnsc.2022.01454): randomized; ex post advice best, better wrong-advice rejection — direction verified, effect sizes paywalled-pending |
| Human-first residual costs | AAAI-26 (10.1609/aaai.v40i47.41457): disuse dominates, appropriate reliance <50%; *Eur Radiol* 2026 (10.1007/s00330-026-12666-6): in wrong-AI cases anchoring bias 33.9%→17.2% and automation bias 36.1%→17.8% with XAI — reduced, not eliminated |
| Comparator hygiene | Chen et al., *IJMI* 2026 (10.1016/j.ijmedinf.2026.106346), 120 studies: 75.8% retrospective, 60.8% ≤10 readers, 50.8% no time limits, 20.8% information asymmetry; AIPSC item wording pending full text — say so if asked |
| Silent-trial precedent | Kwong et al., *Front Digit Health* 2022 (10.3389/fdgth.2022.929508): dev AUROC 0.90 → 0.50 in clinician-blinded silent trial (drift), restored to 0.91–0.92 before exposure; CHARTwatch ran ~10 months silent with no formal go/no-go thresholds — the gap our template fills |
| Conformity mechanism | Two Krishnan-group preprints motivated the sealed-versus-private-vote contrast — multi-turn attack taxonomy across nine reasoning models: arXiv 2602.13093; "unfaithful capitulation" (reasoning holds, emitted answer folds): arXiv 2605.29087. Our E2 measures a local count-cue susceptibility, not general immunity |
| Harness integrity | Receipted falsification run on clean history: six scripted policies, each recovered exactly; receipts replay the analysis; scripted providers — analyzer behavior, not an LLM result |

## Contingencies

| Situation | Move |
| --- | --- |
| Only 15 minutes | Skip §0:35–1:30 after the first sentence; decisions start at ~1:00; drop the close's first ask |
| He dives deep on one decision | Let him. One adjudicated decision beats five grazed. Land decisions Two and Five in the last minute if nothing else |
| He rejects the construct framing entirely | Do not defend. "What would you measure first?" — his answer becomes the primary endpoint candidate; record verbatim |
| He asks for performance/accuracy numbers | "We claim none yet. The harness is calibrated on scripted adversaries; live-model numbers come after Saturday, and clinical numbers only after the silent-mode bar you're helping us set." |
| He questions the reliability gap ("literature exists, you missed it") | Accept immediately, ask for the references — that is a better outcome than the gap; log them for verification |
| Stall or generic turn | Reserve question: **"Which single failure, if it happened once, should make this system unshippable regardless of its average performance?"** |
| He offers Abridge/Anthropic/hospital introductions | Accept concretely: propose the silent-mode protocol review as the artifact they'd see first |

## Listen for (write these down verbatim)

- The failure unit and denominator he names — they go straight into the preregistration and the receipt schema.
- Any hazard-analysis method he prefers (FMEA/STPA/fault tree) — becomes the Saturday risk-register format.
- The negative result he says would still be publishable/fundable — that defines our floor.
- Any dataset, benchmark, or named study — verification leads for the ledger.
- Names — each is an implicit warm introduction.

## Do not

- Recite his own worksheet or reliability paper back at him beyond the one-line acknowledgment — he wrote them.
- Present AIPSC checklist items as known — full text is pending; only the four percentages are verified.
- Call the reliability literature pass "proof there is no prior work" — it is a bounded search-gap from retrieved abstracts, nothing stronger.
- Claim the E2 falsification run says anything about real models — it calibrates the analyzer, full stop.
- Exceed five minutes of setup. His edits are the deliverable; at 5:00 whatever is unsaid becomes the follow-up email.

## Post-meeting protocol (same day)

1. Record each of the six worksheet answers as `ADOPT` / `TEST` / `DEFER` / `REJECT` with the exact protocol section affected (worksheet's disposition rule).
2. Issue a dated decision addendum to `RESEARCH_METHODS_PROTOCOL_2026-07-16.md` — never silently rewrite the preregistration.
3. Update the failure taxonomy and governance evidence ladder; freeze the Saturday issue set and demo claim card.
4. Send verification leads he names into the evidence-ledger queue before citing them anywhere.
