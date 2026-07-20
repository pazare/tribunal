# Formal Specification — Tribunal Provider Boundary, Decoder Surface, HTTP/Security Layer, and Auditability Scorecard

Specification for re-implementation inside a production companion
application. Ground truth: the CURRENT WORKING TREE of
`/Users/pablo/Desktop/RAISE Cursor` (branch
`pazare/tribunal-hackathon-recovery-20260716`), uncommitted modifications
included; citations `file:line` refer to working-tree bytes. Code wins over
comments and docs; disagreements are registered in §10.

---

## 0. Notation, identifier families, and ground-truth ledger

**N1 (identifier families).** `N*` notation; `D*` definitions; `INV*` invariants;
`L*` laws (executable-contract obligations extracted from tests); `LEM*` lemmas;
`T*` theorems; `C*` conjectures; `F*` findings (security-relevant observations);
`DE-*` discrepancies (code-vs-docs, dead code, uncommitted-file risk).

**N2 (working-tree status classes).** Per `git status --short` at read time,
each cited file carries exactly one class: **[M]** modified vs HEAD, **[??]**
untracked (exists only in the working tree), **[=]** identical to HEAD.
Assignments used throughout —
**[M]:** `providers/{base,cli,decoder-cli,offline,openrouter}.ts`;
kernel `{engine,ledger,panel,types,index,prompt,feedback}.ts`; kernel tests
`{provider_contracts,decoder_cli,kernel}.test.ts`; server
`{index,decoder-auth,decoder-service}.ts`; server tests
`{decoder-auth,decoder-http-auth}.test.ts`; `scorecard/src/index.ts` +
its test; `apps/worker/src/index.ts` + `README.md`;
`docs/{honesty,decoder-design,architecture}.md`; `.env.example`.
**[??]:** `providers/cli-environment.ts`; `kernel/src/ledger-structure.ts`;
`kernel/test/prompt_security.test.ts`; `server/src/request-security.ts`;
`server/test/request-security.test.ts`.
**[=]:** `kernel/src/{decoder,surface,hash}.ts`;
`server/test/decoder-service.test.ts`; `kernel/test/decoder.test.ts`.

**N3 (sets and maps).** `Σ_soc = {evidence, adversary, law_policy,
affected_party, safety, concision}` in order (`panel.ts:12-19`); `Σ_prov ⊇
{openai, xai, anthropic, cursor, microsoft, nvidia, meta, deepseek, mistral,
google, offline}`; `P = {codex, claude}` the decoder principals
(`decoder.ts:10`). `s[i]` is 0-based indexing, `|s|` length. `H(x) =
SHA256hex(cjson(x))`, `cjson` = canonical JSON (keys sorted recursively,
`undefined` omitted, arrays order-preserving; `hash.ts:8-24,26-33`). `ε` =
empty string; `∥` = concatenation.

**N4 (event).** A ledger event is a record `e = ⟨seq, runId, k, ts, kind,
payload, prevHash, hash⟩` where `k` is `spanIndex` (panel ledger,
`types.ts:392+`, `ledger.ts:38-58`) or `roundIndex` (decoder ledger,
`decoder.ts:84-93`). Hash rule (both ledgers): `e.hash = H(e ∖ {hash})`;
`e₀.prevHash = 0⁶⁴`; `eᵢ₊₁.prevHash = eᵢ.hash` (`ledger.ts:43-55`,
`decoder.ts:121,141-160`).

**N5 (clock).** `ts` is wall time or a logical counter; offline panel runs
use the logical clock (`ledger.ts:22-24`; `apps/server/src/index.ts:567`).

---

## 1. The provider boundary (`packages/kernel/src/providers/base.ts` [M])

### 1.1 Typed contract

**D1 (PanelClient).** A panel seat's connection to a model is any object
implementing (`base.ts:74-85`):

```
PanelClient = ⟨ provider: Provider, model: string,
                modelSource?: "response"|"requested"|"cli_config"|"scripted",
                transport: "cli"|"http"|"offline",
                seatId: string, society: Society,
                propose:      ProposeRequest      → Promise<ProposeResult>,
                revise:       ReviseRequest       → Promise<ReviseResult>,
                reviewSafety: SafetyReviewRequest → Promise<SafetyReviewResult> ⟩
```

Request types (`base.ts:27-45,59-66`): `ProposeRequest = ⟨view, seed, signal?⟩`;
`ReviseRequest = ⟨view, ownRound1, feedback, guidance, feedbackAnonymized?,
seed, signal?⟩`; `SafetyReviewRequest = ⟨view, candidate, maintainedObjections,
seed, signal?⟩`. Result types (`base.ts:47-57,68-72`): each result is
`⟨domainObject, usage: UsageRecord, repaired: ℕ⟩` where `repaired` counts
fields the adapter synthesized (`base.ts:50`).

**D2 (UsageRecord).** `⟨provider, model, modelSource?, requestedModel?,
servingProvider?, tokensIn?, tokensOut?, latencyMs?, status, transport⟩`
(`packages/kernel/src/types.ts:347-362` [M]). `status ∈ TurnStatus ⊇
{ok, incomplete, error, refusal, cancelled}` (usages observed:
`engine.ts:196,310,406,518` set `incomplete`; adapters emit `ok`).

**D3 (strict parse).** `extractStrictJSON(text)` accepts `text` iff
`JSON.parse(trim(text))` is a non-array object AND the raw string contains no
duplicate key at any path (`base.ts:122-132`, duplicate scan `base.ts:134-189`).
The tolerant extractor `extractJSON` (fence-stripping, last-balanced-object,
comma/quote repair; `base.ts:92-114,191-216`) is exported but is not on any
voting path (see DE-4).

**D4 (repaired ⇒ non-vote).** For any adapter result `r`, if `r.repaired > 0`
or the domain-shape validator rejects, the engine ledgers the call with
`usage.status = "incomplete"` and excludes it from proposals/revisions/safety
quorum (`engine.ts:193-200` safety, `306-311` propose, `402-407,514-521`
revise; contract comment `base.ts:22-25`).

**INV1 (empty-iff-stop).** In every coerced candidate,
`candidate.text = ε ⟺ candidate.isStop`. Enforced identically at
`cli.ts:501-521` and `openrouter.ts:312-332` (`text.trim() = ε ⇒ isStop`;
`isStop ⇒ text := ε`), and demanded by the strict validator
(`cli.ts:527`, `openrouter.ts:338`).

### 1.2 Timeout, retry, cancellation, error taxonomy

**D5 (per-adapter deadline).** `cli.ts` default `timeoutMs = 120 000`
(`cli.ts:163`); construction-time overridable. `openrouter.ts` default
`timeoutMs = 90 000` via `AbortController` timer (`openrouter.ts:69,184-188`).
`decoder-cli.ts` defaults `timeoutMs = 0` and `maxOutputBytes = 0` — i.e.
NO deadline and NO output cap (`decoder-cli.ts:16-19`); the server layers a
finite backstop `TRIBUNAL_DECODER_TIMEOUT_MS` (default 30 min) as operator
policy (`apps/server/src/index.ts:98-109`). `offline.ts` is synchronous-fast;
no deadline.

**D6 (termination protocol, CLI family).** On timeout/abort: SIGTERM to the
POSIX process group; after grace G, SIGKILL; a settle fallback bounds the wait
for `close`. Constants: panel CLI `G = 750 ms`, fallback `2 000 ms`
(`cli.ts:125-126,338-352`); decoder CLI `G = 1 000 ms`, fallback `3 000 ms`
(`decoder-cli.ts:20-21,261-268`). Group signalling and liveness re-check:
`cli.ts:291-317,372-392`; `decoder-cli.ts:224-232,285-290`.

**D7 (error taxonomy).** Adapter-level failures are disjoint classes:
(i) `spawn failed` (`cli.ts:369-371`; `decoder-cli.ts:284`);
(ii) `stdin failed` outside termination (`cli.ts:363-368`;
`decoder-cli.ts:281-283`);
(iii) nonzero exit with empty cleaned stdout (`cli.ts:386-390`);
(iv) `timed out after Nms` (`cli.ts:394-397`; `decoder-cli.ts:291-296`);
(v) HTTP `OpenRouter <status>: <body[0,200)>` (`openrouter.ts:210-213`);
(vi) parse errors from D3 (empty output / non-strict JSON / non-object /
duplicate keys, `base.ts:122-131`);
(vii) cancellation (`AbortError` or signal reason, `cli.ts:354-359`;
`decoder-cli.ts:269`).
Panel adapters REJECT (throw); the engine converts a rejection to a ledgered
`provider_call` with error usage (`engine.ts:184-190`). The decoder transport
NEVER rejects: it resolves a receipt with
`status ∈ {ok, error, cancelled, timeout}` (`decoder-cli.ts:191-302`, D14).

**D8 (retry).** Panel adapters: zero retries per call (single spawn/fetch per
`propose|revise|reviewSafety`). Decoder: at most 2 attempts per
(phase, principal), attempt 2 issued only after an invalid, non-cancelled
attempt 1, with the validation errors echoed into the retry prompt
(`decoder.ts:447-549`, prompt suffix `decoder.ts:435-437`; verifier enforces
the same rule, `decoder.ts:1142-1150`).

### 1.3 Laws extracted from the executable contract

Authority: `packages/kernel/test/provider_contracts.test.ts` [M] (`PCT`) and
`packages/kernel/test/decoder_cli.test.ts` [M] (`DCT`). Each law is an
obligation a re-implementation MUST satisfy; cited assertions are falsifiers.

- **L1 (seat-construction totality).** `buildPanel` yields exactly 6 seats, in
  `Σ_soc` order, no society dropped or duplicated; `seatId =
  "seat_{i+1}_{society}"`; per-seat `provider/model/transport` equal the
  assignment. (PCT:37-59 cli; PCT:202-226 openrouter; impl `panel.ts:88-109`.)
- **L2 (prompt confidentiality of transport).** Protected-data CLI transports
  deliver the prompt on stdin ONLY; the prompt string does not occur in argv.
  (PCT:109-110,171; DCT:94-95,115-116; impl `cli.ts:401-404`,
  `decoder-cli.ts:299-300`.)
- **L3 (isolation flags).** codex argv contains `--ephemeral
  --ignore-user-config --ignore-rules … --sandbox read-only … mcp_servers={}`
  (PCT:111-115; impl `cli.ts:56-70`); claude argv contains `--safe-mode
  --no-session-persistence --tools "" --permission-mode dontAsk`
  (PCT:172-175; impl `cli.ts:87-103`).
- **L4 (minimal child environment).** The child env is exactly
  `{PATH,HOME,USER,LOGNAME,TMPDIR,LANG,LC_ALL,LC_CTYPE} ∩ dom(process.env)
  ∪ {NO_COLOR:"1", CI:"1"} ∪ reviewed`, where `reviewed ⊆
  {ANTHROPIC_SMALL_FAST_MODEL, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC}`;
  any other extra key throws. Arbitrary process secrets and
  `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` do NOT reach the child.
  (PCT:116-117,178,196-199; DCT:117-120; impl `cli-environment.ts:10-41`.)
- **L5 (ephemeral working directory).** Each CLI call runs in a fresh
  `mkdtemp` cwd removed after settlement. (PCT:118; impl `cli.ts:269,406-408`,
  `decoder-cli.ts:91,185-187`.)
- **L6 (fail-closed protected-data gate).** Constructing a `CliPanelClient`
  for a provider without established stdin/tool/session/filesystem isolation
  (`xai`, `cursor`) throws unless `protectedData:false` is explicit.
  (PCT:184-200; impl `cli.ts:48-49,153-160`.)
- **L7 (default roster pinning).** `dom(CLI_DEFAULT_ASSIGNMENT) =
  dom(OPENROUTER_DEFAULT_ASSIGNMENT) = Σ_soc` and the adversary OpenRouter
  seat is pinned to `nvidia/nemotron-3-super-120b-a12b`. (PCT:228-235; impl
  `panel.ts:36-53`.)
- **L8 (provenance separation).** When the HTTP API reports a served model or
  serving host, `usage.model := reported`, `usage.modelSource := "response"`,
  `usage.requestedModel := configured`, `usage.servingProvider := reported`,
  and token counts propagate. (PCT:237-301, asserts 295-300; impl
  `openrouter.ts:80-93,216-221`.)
- **L9 (Anthropic auxiliary-model pinning).** The claude child env pins
  `ANTHROPIC_SMALL_FAST_MODEL` to the requested model and
  `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"`. (PCT:140-143,176-178;
  DCT:117-124; impl `cli.ts:106-109`, `decoder-cli.ts:139-144`.)
- **L10 (decoder runtime defaults).** `DECODER_CLI_RUNTIME_DEFAULTS =
  {timeoutMs: 0, maxOutputBytes: 0}` exactly. (DCT:13-15; impl
  `decoder-cli.ts:16-19`.)
- **L11 (decoder pinning and receipt redaction).** Decoder CLI argv pins
  `gpt-5.6-sol` + `model_reasoning_effort="medium"` (codex) and
  `claude-opus-4-8` + `--effort medium` (claude); the ledgered command args
  replace the schema path/JSON by `<output-schema:H₁₆>` / `<json-schema:H₁₆>`
  where `H₁₆ = H(outputSchema)[0,16)`; the prompt is byte-exact on stdin.
  (DCT:92-126; impl `decoder-cli.ts:96-144`.)
- **L12 (byte fidelity, unbounded output).** Multi-megabyte stdout with UTF-8
  code points split across chunk boundaries is reassembled without replacement
  characters and without truncation at defaults. (DCT:134-177; impl
  `StringDecoder`, `decoder-cli.ts:207-209,270-277`.)
- **L13 (cancellation of deadline-free calls).** Aborting the request signal
  terminates a hung decoder CLI call and yields `status = "cancelled"` with a
  cancellation-bearing error. (DCT:179-209; impl `decoder-cli.ts:269,297-298`.)
- **L14 (envelope/model receipt).** The claude transport derives
  `responseText` and `reportedModel(s)` deterministically from exact stdout via
  `decodeClaudeCliEnvelope`; codex `responseText = stdout`.
  (DCT:96-98; impl `decoder-cli.ts:157-159`, pure fn `decoder.ts:380-405`.)

### 1.4 Law × implementation matrix

Cells: satisfying line(s), or `N/A` (law's subject absent by type), or
`UNTESTED` (holds by inspection, no direct assertion), or `VIOLATION`.

| Law | cli.ts | decoder-cli.ts | offline.ts | openrouter.ts |
|---|---|---|---|---|
| L1 | via `panel.ts:88-109` (PCT:37-59) | N/A (not a panel seat) | `panel.ts:92-93` UNTESTED-direct | `panel.ts:101-106` (PCT:202-226) |
| L2 | 401-404 (openai/anthropic); xai/cursor argv 79,114-117 permitted ONLY under L6 probe mode | 299-300 (DCT:94-95) | N/A (no process) | N/A (HTTPS body) |
| L3 | 56-70, 87-103 (PCT:111-115,172-175) | 96-135 (DCT:105-114) | N/A | N/A |
| L4 | 274 (PCT:116-117,196-199) | 219 (DCT:117-120) | N/A | N/A (parent process fetch) |
| L5 | 269,406-408 (PCT:118) | 91,185-187 UNTESTED-direct | N/A | N/A |
| L6 | 153-160 (PCT:184-200) | N/A (principals fixed) | N/A | N/A |
| L7 | `panel.ts:36-43` (PCT:228-231) | N/A | N/A | `panel.ts:46-53` (PCT:231-235) |
| L8 | modelSource `"cli_config"` fixed 142-143; no served-model channel — vacuous | reportedModel(s) 157-183 (DCT:97-98) | modelSource `"scripted"` 31 | 80-93,216-221 (PCT:293-300) |
| L9 | 106-109 (PCT:176-178) | 139-144 (DCT:117-124) | N/A | N/A |
| L10 | N/A (its default is 120 000, D5) | 16-19 (DCT:13-15) | N/A | N/A |
| L11 | N/A | 96-144 (DCT:102-126) | N/A | N/A |
| L12 | VIOLATION-adjacent: `out += d.toString()` (361) can split UTF-8 across chunks; UNTESTED there | 207-209,270-277 (DCT:134-177) | N/A | N/A (fetch json) |
| L13 | 354-359,398-399 UNTESTED-direct (kernel.test exercises engine-level cancel) | 269,297-298 (DCT:179-209) | `throwIfAborted` 39,95,152 | 183-188 UNTESTED-direct |
| L14 | N/A | 157-159 (DCT:96-98) | N/A | N/A |

The L12/cli.ts cell is a latent-defect note, not a contract breach: the panel
CLI contract never asserts multi-byte chunk safety; see DE-9.

---

## 2. Credential handling

Docs claim: "Keys and CLI auth are read from the environment at call time
only" (`docs/honesty.md:27`, invariant 4 at `:52`; `.env.example:2`).
Verification per implementation:

- `cli.ts` — holds NO API key. Authentication lives in each vendor CLI's own
  owner-only credential store (`cli-environment.ts:4-8`); the spawned child
  receives the L4 minimal environment (`cli.ts:274`). Non-secret model
  selectors `TRIBUNAL_CLAUDE_MODEL`/`TRIBUNAL_CURSOR_MODEL` are read from env
  at MODULE LOAD (`cli.ts:92,107,110,115-120`), not call time (DE-1b).
- `decoder-cli.ts` — no key; same minimal env (`:219`); the only injected env
  is the L9 pair, which is ledgered in `command.environment` (`:169`) and is
  non-secret by construction.
- `openrouter.ts` — `apiKey := opts.apiKey ?? process.env.OPENROUTER_API_KEY`
  captured in the CONSTRUCTOR (`openrouter.ts:64-65`), retained in a private
  field for the client's lifetime, and emitted only as the `Authorization`
  header (`:195`). Clients are constructed per run (`apps/server/src/index.ts:
  509-520`), so retention is run-scoped, not process-persistent. This is
  run-construction time, not literally call time (DE-1a).
- `offline.ts` — keyless by type (`offline.ts:29-37`).

Leak-path audit (each path checked for key/token bytes):

- Decoder ledger `provider_attempt.command.args` are the REDACTED `safeArgs`
  (schema replaced by hash tag, `decoder-cli.ts:136-138`; L11) — no secret.
- `UsageRecord` carries no credential field (D2).
- Run artifacts are written `0o600` in `0o700` dirs for decoder runs
  (`decoder-service.ts:206-207,473-477,522-524,549,863-869`).
- **F1.** The OpenRouter key outlives a single call (constructor capture,
  `openrouter.ts:64`); residual: heap persistence for the run's duration.
  HTTP error text embeds `body.slice(0,200)` of the PROVIDER response
  (`openrouter.ts:212`) — cannot contain the request's own key unless the
  provider echoes it; residual accepted.
- **F2.** When no operator token is configured on loopback, a generated
  32-byte token is PRINTED to the local terminal at startup
  (`apps/server/src/index.ts:84-86,1230-1232`); intentional and rotating, but
  terminal capture/scrollback is a residual exposure channel.
- **F3.** The decoder ledger intentionally persists full prompts and raw
  stdout/stderr (`decoder.ts:459-540`); this is the public-transcript design
  (D16), not a credential leak, but any secret PASTED INTO a user prompt is
  persisted verbatim under `runs/decoder/*` — residual by design.
- **F4.** xai/cursor panel adapters pass the prompt via argv (`cli.ts:79,
  114-117`), visible to local process listings; reachable only with
  `protectedData:false` (L6) and server-side only for the synthetic liveness
  probe (`apps/server/src/index.ts:863-869`).

**INV2 (no stored credentials).** No code path writes
`OPENROUTER_API_KEY`, `TRIBUNAL_OPERATOR_TOKEN`, session ids, or CLI auth
material to disk; the session store retains SHA-256 digests only
(`decoder-auth.ts:141-143,171,201`). Verified by exhaustive read of every
`writeFileSync/appendFileSync` site in the cited modules
(`decoder-service.ts:473-477,541-543,549-559,606-607,667-673,965-969`;
`apps/server/src/index.ts:657-681`).

---

## 3. The offline provider (`offline.ts` [M])

**D9 (offline client).** `OfflinePanelClient` fixes `provider = "offline"`,
`model = "offline/scripted-v1"`, `modelSource = "scripted"`,
`transport = "offline"` (`offline.ts:29-37`). It performs no I/O; content is
computed from `(society, runId, slot.index, seed)` through
`mulberry32(H([...])[0,8) as u32)` (`offline.ts:43,97,229-238`) plus fixed
society bias tables (`offline.ts:182-189`).

**T1 (determinism).** For fixed inputs `(view, seed)` and fixed society, every
`propose/revise/reviewSafety` output is a pure function of its arguments; with
the logical clock, entire offline runs are byte-deterministic.
*Proof.* (i) The only nondeterminism sources in the three methods would be
time, randomness, or I/O. There is no I/O and no `Date.now()` in
`offline.ts` (usage records omit `latencyMs`, `offline.ts:77,133,161-167`).
(ii) All numeric jitter derives from `mulberry32(seedStr)` seeded by
`H([...])` of the arguments (`offline.ts:43,97`), a deterministic integer
recurrence over `Math.imul`/shifts (`offline.ts:229-238`) — IEEE-754/ECMA-262
integer-exact. (iii) Ledger timestamps come from the `Ledger` clock, which the
server sets to `"logical"` exactly when `mode === "offline"`
(`apps/server/src/index.ts:567`, `ledger.ts:22-24`); event hashes are then
functions of content only. ∎
**C1 (cross-platform byte-identity).** Identical bytes across Node/V8 versions
additionally require stable float-to-string formatting of the `round2(...)`
outputs in `JSON.stringify`; ECMA-262 fixes shortest-round-trip formatting, so
this is expected, but it is asserted here as CONJECTURE (not tested across
runtimes in-repo).

**INV3 (always-labeled).** Every surface that can carry offline output carries
the offline label; enumeration of ALL flows:

1. Per-call provenance: every `provider_call` event embeds the D9 quadruple
   via `usage` (`offline.ts:77,133,161-167` → `engine.ts:188,201,306-311`).
2. Run header: `run_started.payload.panel[*].{provider,model,modelSource}` and
   `payload.note = "OFFLINE deterministic panel (no model calls) — CI/smoke
   mode."` iff every seat transport is offline (`engine.ts:112-130`).
3. Run config echo: `RunConfig.panel` persisted in the same event
   (`apps/server/src/index.ts:525-539`).
4. Persisted artifact: `meta.json.mode` (`apps/server/src/index.ts:663-675`).
5. Health surface: `/api/panel` returns `offline.note = "deterministic
   scripted panel (CI/tests only — labeled, never presented as a model)"`
   (`apps/server/src/index.ts:294`).
6. Policy anchor: `docs/honesty.md:26,51` (offline never presented as model
   output).

Boundary note (non-finding): `offline.revise` dereferences
`sort(feedback)[0].candidate` (`offline.ts:100-102`), presuming a nonempty
packet — guaranteed by the engine under quorum; preserve or guard it.

---

## 4. The decoder protocol (`decoder.ts` [=], `decoder-cli.ts` [M], `decoder-service.ts` [M])

### 4.1 Surface alphabet

**D10 (unit alphabet).** `U = Span ∪ {␣, ↵, ■}` with exact syntax
(`surface.ts:9-13`):

```
{kind:"span",  text:s}   s ≠ ε ∧ ¬∃c∈s: White_Space(c) ∨ c∈Cc∪Cf∪Cs
{kind:"space", text:" "}   exactly U+0020
{kind:"enter", text:"\n"}  exactly U+000A
{kind:"stop",  text:""}    exactly ε
```

`validateDecoderUnit` accepts exactly `U`, rejects unknown keys, and performs
NO trimming/normalization/inference (`surface.ts:26-70`; policy comment
`surface.ts:3-7`; `docs/decoder-design.md:19-34`). The span text `"STOP"` is
ordinary text; only `■` terminates.
`key(u)`: `span:⟨text⟩ | space:U+0020 | enter:U+000A | stop`
(`surface.ts:72-83`). `text(u) = u.text`; `text(■) = ε` (`surface.ts:86-88`).

**INV4 (output binding).** `finalOutput = ∥_{u ∈ committed, u ≠ ■} text(u)`,
byte-exact. Maintained at commit (`decoder.ts:827-837`) and re-verified
terminally (`decoder.ts:1467-1476,1515-1518`).

### 4.2 Principals and pinning

**D11 (pinned principals).** The client tuple MUST be ordered
`[codex, claude]` with `codex = ⟨openai, gpt-5.6-sol, medium⟩` and
`claude = ⟨anthropic, claude-opus-4-8, medium⟩` (`decoder-cli.ts:23-26`).
Enforced independently at four layers: kernel entry (`decoder.ts:616-634`),
service factory check (`decoder-service.ts:715-733`), verifier roster check
(`decoder.ts:1027-1063`), per-call/per-receipt roster checks
(`decoder.ts:1156-1164,1256-1263`).

**INV5 (model-drift exclusion).** If a transport receipt reports any model
∉ {requestedModel}, the attempt's validation is forced invalid with error
`provider reported unexpected model(s): …` even when the JSON parses
(`decoder.ts:499-515`); the verifier recomputes this and flags
`model_mismatch` if a drifted receipt was admitted (`decoder.ts:1223-1269`).
Docs restatement: `docs/honesty.md:40-45`.

### 4.3 Quorum and the per-unit election loop

**D12 (turn grammar).** Phase-indexed strict response types
(`decoder.ts:56-70,183-217,323-372`): propose → `⟨unit, publicWarrant⟩`;
revise → `⟨unit, publicWarrant, critiqueOfPeer⟩`; judge →
`⟨pick ∈ {0,1}, publicWarrant⟩`. Parsing is strict JSON with duplicate-key
rejection and exact key sets; whitespace-only warrants are invalid
(`decoder.ts:296-321,331-371`).

**D13 (quorum predicate).** For round `r`, phase `φ`:
`Q(r,φ) ≔ |{p ∈ P : validAttempt(r,φ,p) ≠ ⊥}| = 2`, where `validAttempt`
selects the latest attempt (2 then 1) with `status = ok ∧ validation.ok`
(`decoder.ts:935-950`). `phase_completed.payload = ⟨quorum, requiredQuorum:2,
valid = (quorum = 2), principals = [codex, claude]⟩` (`decoder.ts:567-574`);
the verifier recomputes it (`decoder.ts:1303-1311`). Both principals are
required in EVERY phase; one provider never impersonates two
(`docs/decoder-design.md:65-67`).

**D14 (transport receipt).** Every attempt appends `provider_call_started`
(exact prompt, roster; `decoder.ts:459-469`) then `provider_attempt` (exact
prompt, command fingerprint, raw stdout/stderr, responseText, status, exit,
signal, timing, reported models, validation, parsed; `decoder.ts:516-540`).

**D15 (round algorithm).** For each `r < maxRounds`
(`decoder.ts:682-843`):

1. Sample tie `⟨bit, nonce⟩`; append `round_started` (with `prefixBefore`)
   then `tie_committed` with `commitment = H({runId, roundIndex, bit, nonce})`
   BEFORE any provider call (`decoder.ts:684-708,577-583`).
2. `propose` phase (2 attempts max/principal, D8). `¬Q(r,propose)` ⇒ run
   `failed` with per-principal error join (`decoder.ts:726-730,585-590`).
3. `revise` phase over label-blinded proposals (`decoder.ts:733-754`;
   prompt `decoder.ts:441-443`).
4. Selection (`decoder.ts:756-801`):
   - `key(rev₀.unit) = key(rev₁.unit)` ⇒ method `revision_consensus`,
     `selectedIndex = 0`, NO judge phase.
   - else `judge` phase (fresh 2/2 ballots): `pick₀ = pick₁` ⇒
     `judge_consensus`, `selectedIndex = pick₀`.
   - else if exactly one finalist has `kind = stop` ⇒
     `unilateral_stop_overruled`, select the non-stop finalist
     (`decoder.ts:791-795`).
   - else ⇒ `precommitted_tie_break`, `selectedIndex = bit`, reveal
     `⟨bit, nonce, commitment⟩` (`decoder.ts:796-799`).
5. Append `unit_selected` (finalists, judgeVotes, method, tieReveal, fixed
   public reason per method, `decoder.ts:598-609,807-815`); if the losing
   finalist's unit differs, append `dissent_preserved` with the loser's full
   revision (`decoder.ts:817-824`).
6. Append `unit_committed` (`unit, unitKey, surfaceText, prefixBefore,
   prefixAfter, method`); extend prefix per INV4; push the round into public
   history (`decoder.ts:827-838`). `■` ⇒ status `stopped`, loop ends
   (`decoder.ts:839-842`).

Terminal statuses: `stopped | failed | cancelled | budget_exhausted`
(`decoder.ts:12`); `maxRounds` exhaustion is `budget_exhausted`, never a
fabricated `■` (`decoder.ts:641,845-853`; `docs/decoder-design.md:79`).

**INV6 (tie precommitment).** In every round the tie commitment event
precedes every provider call of that round, and a revealed tie satisfies
`H({runId, roundIndex, bit, nonce}) = commitment` (`decoder.ts:698-708`;
verifier `decoder.ts:1101-1114,1384-1399`). This is auditable coordinator
randomness, NOT externally anchored randomness
(`externalRandomnessProven:false`, `decoder.ts:707,798`;
`docs/decoder-design.md:61-63`).

**LEM1 (STOP is never unilateral).** If exactly one principal's finalist is
`■` and the ballots split, the committed unit is the non-stop finalist.
*Proof.* The split-ballot branch computes `stopIndex`; if
`stopIndex ≥ 0 ∧ rev[1−stopIndex].unit.kind ≠ stop` then
`selectedIndex := 1−stopIndex` (`decoder.ts:791-795`). The tie-break branch is
reached only when both or neither finalists are `■` (`else`, `:796-799`); when
both are `■`, either choice is `■` and stopping is unanimous-in-kind. The
verifier rejects any other resolution (`decoder.ts:1378-1382`). ∎

**LEM2 (per-round commit uniqueness / post-stop silence).** A verified ledger
has at most one `unit_committed` per round, and after a committed `■` only
`decoder_finished` may follow.
*Proof.* Verifier: `duplicate_commit` (`decoder.ts:1444`),
`event_after_commit` restricts a committed round's successors to
`round_started | decoder_finished` (`decoder.ts:1014-1020`),
`event_after_stop` (`decoder.ts:998-1000`), terminal uniqueness and last-event
rules (`decoder.ts:997,1502-1506`). Generator conformance: the loop appends
exactly one commit per iteration and breaks on `■` (`decoder.ts:830-842`). ∎

**LEM3 (prompt re-derivability).** Every ledgered provider prompt is a pure
function of previously verified ledger state; the verifier recomputes it and
rejects on inequality (`protocol_prompt_mismatch`).
*Proof.* Prompts are built by `buildDecoderPrompt` from
`(phase, principal, userPrompt, prefix, verified history, valid parsed
proposals/revisions, prior validation errors for attempt 2)`
(`decoder.ts:424-445`); the verifier reconstructs exactly these inputs from
already-verified events (`decoder.ts:952-984`) and compares
(`decoder.ts:1151-1155`). Both call the SAME function in the SAME module
([=] `decoder.ts`), so agreement is by construction, and any tampering of
prompt-relevant state breaks either a hash link or this equality. ∎

**T2 (verified-transcript soundness).** If `verifyDecoderLedger(E).ok`, then
E satisfies simultaneously: hash-chain integrity (N4), the D11 roster, D13
quorum for every completed phase, D15 selection-rule correctness for every
commit (incl. LEM1), INV4 output binding, INV5 drift exclusion, INV6 tie
correctness, LEM2 structure, per-attempt raw-I/O consistency (responseText
re-derived from exact stdout via L14; validation recomputed —
`false_validation`, `decoder.ts:1206-1255`), and terminal-status validity
(`stopped ⟺ committed ■`; `budget_exhausted ⟺` all configured rounds opened
and committed; `failed ⇒` an invalid pre-selection phase in every uncommitted
opened round; `cancelled ⇒` public cancellation receipt;
`decoder.ts:1502-1571`).
*Proof.* Conjunction of the cited checks; each conjunct's falsification pushes
a problem and `ok ⟺ problems = ∅` (`decoder.ts:1573`). ∎
The guarantee is over the OBSERVABLE CLI interface only; provider-internal
computation is out of scope (`decoder.ts:679`; `docs/honesty.md:29-38`).

### 4.4 Failure modes and coded resolutions

| Mode | Detection | Coded resolution |
|---|---|---|
| Principal call times out | receipt `status:"timeout"` (service backstop, `decoder-cli.ts:291-296`; policy `apps/server/src/index.ts:98-109`) | attempt invalid with transport error (`decoder.ts:496-498`); one retry only if attempt 1 invalid AND not cancelled (D8); else `¬Q` ⇒ run `failed` (`decoder.ts:726-730,750-753,781-784`) |
| Unparseable/off-schema unit | `parseDecoderTurn` errors (D12) | retry prompt carries `YOUR_PREVIOUS_RESPONSE_WAS_INVALID_JSON=[…]` (`decoder.ts:435-437`); second failure ⇒ `failed`, per-principal errors joined (`decoder.ts:585-590`) |
| Principals disagree on unit | `key(rev₀) ≠ key(rev₁)` | judge phase; consensus → that finalist; split+one-■ → LEM1; split two-non-■ → precommitted bit (D15.4); loser preserved as dissent (`decoder.ts:817-824`) |
| Reported model ≠ pin | receipt `reportedModel(s)` | attempt invalidated (INV5); visible as failed attempt, never quorum |
| Empty structured response with exit 0 | `decoder-cli.ts:160` | receipt downgraded to `error` ("CLI returned no structured public response", `:177-180`) |
| Operator cancel | `signal.aborted` observed at every loop juncture (`decoder.ts:645-666,683,725,749,780,803,816,825`) | status `cancelled` + typed receipt `{actor?, reason, requestedAt?}` into `decoder_finished.cancellation` (`decoder.ts:852`) |
| Coordinator tie-sampler broken | throw / non-bit / empty nonce | run `failed` before any call (`decoder.ts:684-696`) |
| Server crash mid-run | journal `decoder.jsonl` prefix | recovery salvages the longest valid prefix, seals `failed` (or terminal payload if present), never fabricates `■` (`decoder-service.ts:562-612,871-907`) |

### 4.5 Worked trace

Decode of the answer `Hi there` under `maxRounds = 8`. `pfx` = prefix before
round; `⟨cx, cl⟩` = codex/claude emissions (units only; warrants elided).

| r | pfx | propose ⟨cx,cl⟩ | revise ⟨cx,cl⟩ | judge ⟨cx,cl⟩ | method | committed | pfx after |
|---|---|---|---|---|---|---|---|
| 0 | ε | span"Hi", span"Hi" | span"Hi", span"Hi" | — (skipped) | revision_consensus | span"Hi" | `Hi` |
| 1 | `Hi` | ␣, ↵ | ␣, ↵ | pick 0, pick 0 | judge_consensus | ␣ | `Hi␠` |
| 2 | `Hi␠` | span"there", ■ | span"there", ■ | pick 0, pick 1 | unilateral_stop_overruled | span"there" | `Hi there` |
| 3 | `Hi there` | ■, ■ | ■, ■ | — | revision_consensus | ■ | `Hi there` |

Event skeleton per round (ledger order): `round_started`, `tie_committed`,
2×(`provider_call_started`,`provider_attempt`) per phase, `phase_completed`
per phase, `unit_selected`, [`dissent_preserved` in r=1 (claude's ↵) and r=2
(claude's ■)], `unit_committed`. Terminal:
`decoder_finished{status:"stopped", finalOutput:"Hi there", rounds:4,
partial:false}` — INV4 holds: `"Hi" ∥ " " ∥ "there" ∥ ε = "Hi there"`. Had
r=2 split between TWO non-stop finalists, the commit would be `rev[bit]` with
the reveal checked against the r=2 commitment (INV6); no tie reveal is
emitted in r=0/1/3 (reveal only when used, `decoder.ts:759,796-799`).

### 4.6 Service envelope (`decoder-service.ts` [M])

**D16 (service lifecycle).** `starting → running → cancelling →
{stopped, failed, cancelled, budget_exhausted}` (`decoder-service.ts:38-45,
264,375-382,422,437-442`). Concurrency: ONE active run per runs directory —
in-process check (`:246-256`) plus an atomic `wx` lease file with stale-PID
takeover (`:660-713`). Bounds: `userPrompt ≤ 65 536` UTF-8 bytes;
`maxRounds ∈ [1,600]`, default 256 (`:26-29,747-771`). Persistence:
per-event append journal `decoder.jsonl` (0600) BEFORE SSE fan-out
(`:459-487`); terminal atomic seal of `decoder.json` + `decoder-meta.json`
via temp+rename (`:520-543,965-969`); persistence failure downgrades the run
to `failed` (`:445-452`). SSE: replay from `afterSeq`, heartbeat 15 s,
backpressured subscribers dropped (`:302-351`). Filenames deliberately differ
from panel `meta.json`/`ledger.json` so decoder transcripts can never
masquerade as packs (`:539-541`).

---

## 5. Auth and request security (`decoder-auth.ts` [M], `request-security.ts` [??])

### 5.1 Principal model and request binding

**D17 (operator principal).** There is exactly ONE principal class: the
operator. Two credential forms bind a request to it
(`decoder-auth.ts:179-182`):
(i) the operator token, presented as `Authorization: Bearer ⟨t⟩` or
`X-Tribunal-Operator-Token: ⟨t⟩` (`:89-96`), compared by
`timingSafeEqual(SHA256(supplied), SHA256(expected))` (`:98-105`);
(ii) a derived browser session: cookie `tribunal_decoder_session=⟨id⟩`, id =
32 random bytes base64url (43 chars, `:6,156,197-199`), stored server-side as
`SHA256(id) ↦ expiry` with TTL 8 h and cap 256 sessions (`:5,7,191-202`).
Requests with zero or ≥2 session cookies, or a malformed id, bind to nothing
(`:107-122`). Unlock REQUIRES the raw token, rotates any prior session for
that browser, and never echoes the token (`:184-203`; test
`decoder-auth.test.ts:135-158`; HTTP test `decoder-http-auth.test.ts:167-188`).
A process restart revokes all sessions (`:139-141`).

**D18 (network/authz policy).**
- Startup: non-loopback `HOST` ⇒ a configured token is mandatory; any
  configured token must be ≥ 32 bytes (`decoder-auth.ts:72-83`;
  `apps/server/src/index.ts:80`); loopback with none ⇒ generated
  per-process token (F2).
- Host gate: EXACTLY ONE `Host` header, canonical form in the allowlist
  (loopback defaults for `PORT` ∪ `TRIBUNAL_ALLOWED_HOSTS`); else 421 — the
  DNS-rebinding defense (`request-security.ts:53-56,72-94`;
  `apps/server/src/index.ts:716-718`; tests
  `request-security.test.ts:18-28`, `decoder-http-auth.test.ts:118-128`).
- Origin gate: a present `Origin` must equal an allowlisted exact origin or
  403; Host-derived same-origin is deliberately NOT trusted
  (`request-security.ts:58-70,96-107`; `apps/server/src/index.ts:732-745`;
  tests `request-security.test.ts:30-38`, `decoder-http-auth.test.ts:130-148`).
- Authorization gate: `operatorAuthorizationRequired` is DEFAULT-DENY over
  `/api/**`; exceptions: `OPTIONS`, `GET` of `{/api/health, /api/packs,
  /api/capabilities}`, and `/api/decoder/session` (the unlock/lock endpoint)
  (`request-security.ts:3-7,110-117`); applies ON LOOPBACK TOO
  (`apps/server/src/index.ts:749-756`; `request-security.test.ts:40-60`).
- Unlock transport gate: token-bearing unlock only over (a) on-socket TLS,
  (b) `X-Forwarded-Proto: https` when `TRIBUNAL_DECODER_TRUST_PROXY=true`
  (https Origin if present), or (c) plain HTTP where Origin (if present),
  target Host, and (absent Origin) the socket peer are ALL loopback
  (`decoder-auth.ts:28-70`; spoof rejection
  `decoder-http-auth.test.ts:150-158`).
- Body discipline: `Content-Type` must include `application/json` (415),
  body ≤ 2 MiB (413) — forces cross-origin preflight, bounds memory
  (`apps/server/src/index.ts:110,687-708`).
- Header hardening on protected paths: `Cache-Control: no-store`, `Pragma:
  no-cache`, `Referrer-Policy: no-referrer` (`index.ts:724-728`); cookie
  attrs `Path=/api; HttpOnly; SameSite=Strict[; Secure]`
  (`decoder-auth.ts:211-224`; `decoder-auth.test.ts:142-147`).

**LEM4 (401 fail-closed).** Any request to a protected path binding to no
principal receives 401 with `WWW-Authenticate` and a cookie-clearing
`Set-Cookie`, before route dispatch.
*Proof.* The gate at `apps/server/src/index.ts:752-756` precedes every
protected route match in the single `createServer` handler; `authorized(...)`
is false absent both credential forms (D17, `decoder-auth.ts:179-182`, and
`false` when no token configured, `:180`). Live assertions:
`decoder-http-auth.test.ts:85-116`. ∎

### 5.2 Replay/abuse protections present and absent

Present: exact Host allowlist; exact Origin allowlist; JSON-preflight
requirement; `SameSite=Strict` + `HttpOnly` + `Path=/api` cookie; duplicate-
cookie rejection; timing-safe token compare; digest-only session store;
8 h TTL; 256-session cap with oldest eviction; session rotation at unlock;
restart revocation; single-active-decoder-run rule (D16); prompt/rounds size
caps; 2 MiB body cap; run-id syntactic gate `^decoder_[a-z0-9_]+$`
(`decoder-service.ts:35,940-944`); static-path containment on the resolved
path (`apps/server/src/index.ts:1198-1213`).

Absent (verified by exhaustive read of both modules and the router): nonces /
per-request signatures; rate limiting or attempt lockout on token guessing;
audience/expiry claims inside the bearer token (it is a static shared secret);
multi-user identities, roles, or consent flows (single-operator boundary,
`docs/decoder-design.md:148-151`).

**D19 (threat model).**

| Threat | Mitigation (cite) | Residual |
|---|---|---|
| DNS rebinding to loopback API | single exact Host allowlist, 421 (`request-security.ts:77-94`) | none within HTTP; OS-level SSRF out of scope |
| CSRF / cross-site quota spend | default-deny authz (`request-security.ts:110-117`); SameSite=Strict cookie; JSON content-type preflight (`index.ts:687-694`); exact Origin 403 (`index.ts:733-735`) | non-browser clients holding the token are unconstrained by Origin |
| Token theft via URL/storage/bundle | token only in `Authorization`/header; cookie exchange; never persisted (`decoder-design.md:132-140`; INV2) | terminal printout of generated token (F2); paste into shell history |
| Token brute force | ≥32-byte entropy (`decoder-auth.ts:72-77`); timing-safe compare (`:98-105`) | **no rate limit** — online guessing bounded only by entropy (F5) |
| Session fixation/duplication | server-generated 43-char id; duplicate-cookie reject (`:107-122`); rotation at unlock (`:189-190`) | none identified |
| Replay of a captured bearer/cookie | TLS guidance only (`decoder-design.md:144-147`) | plaintext loopback capture replays until restart/TTL (F5) |
| Spoofed `X-Forwarded-Proto` | trusted only under explicit `TRIBUNAL_DECODER_TRUST_PROXY=true` (`decoder-auth.ts:37-48`; test `:150-158`) | misconfigured proxy that does not overwrite the header |
| Forged human-actor identity in ledger | none — by declared design | **actor labels are operator-supplied and unsigned; the ledger does not prove human identity or verbatim voice transcription** (`docs/honesty.md:13`) |
| Post-hoc ledger forgery by sole holder | hash chain + head hash in `meta.json` (`ledger.ts:71-84`) | **unanchored** without external head publication (`docs/honesty.md:88-95`) |
| Provider CLI exfiltrating env secrets | L4 minimal env; L6 fail-closed gate | vendor CLI's own store/network behavior is out of scope |
| Malicious case documents steering seats | prompt hardening tested in `prompt_security.test.ts` [??] (out of this spec's core scope) | model-level injection not provably eliminated |
| Public verifier abuse (worker) | stateless, no secrets (`worker/src/index.ts:111-115`) | CORS `*`, no body cap ⇒ DoS-by-large-body (F6) |

**F5.** No rate limiting or lockout exists on any authentication surface;
with the plaintext-HTTP loopback default, a co-resident process may replay
credentials. Compensating controls: 32-byte entropy floor, restart rotation,
TTL.
**F6.** `apps/worker/src/index.ts:111-115` sets CORS `*` and never bounds
request size — acceptable for a stateless verifier; a public port should cap
body size.

---

## 6. Server API semantics (`apps/server/src/index.ts` [M])

### 6.1 Panel-run lifecycle

**D20 (LiveRun states).** `status ∈ {running, cancelling, cancelled,
finished, error}` (`index.ts:188-205`). There is NO `created` state for panel
runs: `startRun` registers the run already `running` under a provisional id
`live_⟨ts36⟩_⟨rand⟩` and returns it before the first kernel event
(`index.ts:541-559,634`); the kernel's content-derived `runId` is ALIASED to
the same LiveRun from the first event (`index.ts:573-576`). (The decoder
service, by contrast, has `starting`; D16.)

Transitions (total, no others exist):
`running →(kernel resolves, stoppedBy ≠ cancelled)→ finished`
(`index.ts:615`); `running →(POST cancel)→ cancelling`
(`beginCancellation`, `index.ts:365-386,1069`);
`cancelling →(kernel seals run_finished.stoppedBy=cancelled)→ cancelled`
(`index.ts:610-615`); `running|cancelling →(kernel throws)→ error`
(`index.ts:624-627`). Cancel on `finished|error` ⇒ 409; on
`cancelling|cancelled` ⇒ idempotent 200 with the original receipt
(`index.ts:1055-1064`).

**D21 (cancellation receipt).** `⟨actor, reason, requestedAt,
unappliedInterventions, unappliedInterventionIds⟩` (`types.ts:380-386`),
built from the pending+pulled queues at cancel time; queues then cleared and
the AbortController aborted with the receipt as reason (`index.ts:365-386`).
Bounds: actor 1–120, reason 1–1000 chars (`index.ts:1065-1068`).

### 6.2 Intervention endpoint

**D22 (`POST /api/runs/:id/intervene`).** Precondition `status = "running"`
(409 otherwise, `index.ts:1109`). Validation (`index.ts:1110-1139`):
`text ∈ (0,5000]`; `kind ∈ {objection, veto, question, affirm}`;
`channel ∈ {typed, voice}`; `actor ∈ (0,120]` (default "Human auditor");
`targetKey ≤ 2000`, REQUIRED when `kind = veto`; `spanIndex ∈ {−1} ∪ ℕ`,
`< maxSpans`, and `> lastInterventionPullSpan` when ≥ 0 (409 "checkpoint
closed"). Effect: a server-issued receipt id `human_⟨ts36⟩_⟨rand⟩` is queued;
response `{queued, interventionId, willApplyAtSpan}` (`index.ts:1141-1154`).
Queue introspection: `GET …/interventions` returns
`{pending, processing}` (`index.ts:1073-1084`); `POST
…/interventions/:iid/cancel` removes a still-pending item with receipt
`status:"not_applied"` (`index.ts:1086-1102`).

**D23 (checkpoint pull).** The kernel pulls at each span checkpoint:
`take = {h : h.spanIndex = s ∨ h.spanIndex < 0}`; taken items move to
`pulledInterventions` until their ledger event lands, at which point the
receipt id is cleared (`index.ts:577-596`). Uncheckpointed leftovers are
drained at termination into the D21 receipt (`index.ts:597-605`;
`engine.ts:638`).

**INV7 (binding human veto).** Every pulled intervention is appended as a
`human_intervention` event; a `veto` with `targetKey` injects a synthetic
safety verdict `⟨candidateKey = targetKey, veto = true, legalRisk = 1,
publicReason = "Human auditor (actor) veto: text"⟩` into the ratification
input, and veto power is enabled for that decision EVEN IF the AI-safety-veto
flag is ablated: `effectiveVetoEnabled = flags.safetyVeto ∨ humanVetoPresent`
(`engine.ts:438-460`). Honesty bound: the ledger proves the intervention
occurred and bound the outcome; it does NOT authenticate the human
(D19 row 8; `docs/honesty.md:13`).

### 6.3 Verify endpoint and exports

**D24 (`POST /api/verify`).** Input: exactly one of `events[]` (foreign
ledgers accepted) or `runId` (live registry, then recorded artifact); else
400\. Output `{verify, audit, baseline}` = `⟨verifyLedger(E),
computeAuditability(E) (§7), baselineReport()⟩` (`index.ts:1158-1169`).
`verifyLedger` checks, in order: per-event hash recomputation, prev-hash
linkage, `proposals_revealed` per-proposal hash recomputation against
`hashChecks.recomputed`, then the shared structural state machine —
contiguous `seq`, one `runId`, exact payload schemas, legal span/phase
transitions, v2 quorum + mandatory safety participation and coverage,
terminal uniqueness, prefix evolution, byte-exact `finalAnswer`
reconstruction (`answerConsistent`) (`ledger.ts:71-139`;
`ledger-structure.ts` [??]; `docs/architecture.md:87-89`).

**D25 (export surfaces).** (i) `GET /api/runs/:id` → full event array +
status (live) or `{runId, artifactId, events, status:"recorded"}`
(`index.ts:1032-1048`); (ii) `GET /api/runs/:id/events` → SSE, live stream or
paced replay explicitly labeled `status:"replay"` (`index.ts:1001-1030`);
(iii) persisted artifact directory `runs/⟨id⟩/` with `ledger.json`,
`meta.json` (incl. recomputed `head` for anchoring), `audit.json`
(`index.ts:637-681`); (iv) `GET /api/runs/:id/tampered` — pedagogical export:
a `structuredClone` of the ledger with one field mutated, returned WITH its
failing verification (`index.ts:1171-1195`).

**INV8 (no endpoint mutates a sealed ledger).** For every route: recorded
ledgers are only ever `readFileSync`-loaded (`index.ts:237-241`); the tamper
route mutates a clone only (`index.ts:1176`); interventions and cancels
require a LIVE run (`index.ts:1091,1109,1055-1064`); persistence refuses any
ledger failing verification (`index.ts:637-641`) and NEVER overwrites a
different ledger at an existing id — byte-identical re-runs are skipped,
colliding ids get a suffixed fresh directory (`index.ts:645-655`).
*Proof.* Exhaustive enumeration of write sites in the server: the only
`writeFileSync` calls touching run artifacts are inside `persistRun`
(`index.ts:657-680`), which executes exactly once per run completion path
(`index.ts:616`) under the guards above; no HTTP handler calls `persistRun`
or writes under `RUNS_DIR`. ∎ (Decoder analogue: journal append is
per-new-event with conflict rejection, `decoder-service.ts:459-477`; terminal
seal is atomic rename, `:965-969`.)

**D26 (run creation validation).** `POST /api/run` validates: known `packId`;
`mode ∈ {offline, cli, openrouter}`; `seed ∈ [0, 2³²−1]` (default 7);
`maxSpans ∈ [1,64]` (default `|slots|+2`); `clientView ∈ {answer_only,
answer_plus_summary}`; provider pool XOR exact six-society assignment;
cli providers ⊆ `{openai, anthropic}` with NO cli model override; openrouter
assignments must use the vendor's model prefix; flags ⊆ `dom(DEFAULT_FLAGS)`
with `debateRounds ∈ {0,1}` (`index.ts:392-507,111-124`).

### 6.4 Server-run lifecycle summary

`POST /api/run → running →(kernel ok)→ finished →(persistRun, INV8)→
recorded`; `running →(POST cancel)→ cancelling
→(run_finished{stoppedBy:cancelled})→ cancelled`; `running|cancelling
→(kernel throw)→ error` (no persistence on the error path); SSE subscribers
receive every event throughout (D25.ii).

---

## 7. Scorecard A1–A12 (`packages/scorecard/src/index.ts` [M])

**D27 (anti-triviality constants).** `MIN_SUBSTANTIVE = 20` chars;
`REPAIR_MARKERS = {"(no warrant returned", "(no public warrant",
"not returned by model)", "(revision round disabled"}` (`:25-32`). A
back-filled or trivial rationale FAILS its item even when structure passes
(policy `docs/honesty.md:53-57`; spoof-guard tests
`scorecard.test.ts:101-125`).

**D28 (items as predicates over the event multiset E).**

| Id | Predicate over E (informal but exact) | Anti-triviality / failure modes | Cite |
|---|---|---|---|
| A1 | reveals ≠ ∅ ∧ commits ≠ ∅ ∧ ∀ revealed proposal p: ∃ commit c same seat/span with `c.seq < reveal.seq` ∧ `c.proposalHash = H(p)` | fails on missing commit, late commit, hash mismatch | `:39-76` |
| A2 | every revealed candidate warrant has length ≥ 20 ∧ no warrant/publicWarrant contains a repair marker ∧ ≥ 1 candidate | repair marker ⇒ "credit refused" | `:78-109` |
| A3 | every `feedback_issued.anonymized = true` ∧ no summary object contains a key ∈ {seatId, society, provider, agent, author} | type-level only; stylometry disclaimed (`honesty.md:25`) | `:111-134` |
| A4 | ∃ span with ≥ 2 multi-candidate recipient orders ∧ EVERY such span has ≥ 2 distinct order strings | vacuous comparables ⇒ fail ("no multi-candidate spans") | `:136-165` |
| A5 | revisions ≠ ∅ ∧ ∀ r: each of {answerToStrongestObjection, steelmanOfBestRival, changeMyMind} has length ≥ 20 ∧ no repair marker | junk "x" fails (test `:115-125`) | `:167-185` |
| A6 | safety_reviews ≠ ∅ ∧ all have `vetoEnabled = true` | ablated veto ⇒ fail; evidence counts fired vetoes | `:187-205` |
| A7 | ratifications ≠ ∅ ∧ ∀ d: `method` ∧ `metaRule` present ∧ `publicReason` ≥ 20 | trivial reason fails | `:207-221` |
| A8 | let M = maintained objections with severity ≥ 0.4; (M ≠ ∅ ⇒ every m ∈ M appears verbatim in some `dissent_preserved`) ∧ revisions ≠ ∅ | M = ∅ ⇒ pass labeled "vacuous pass"; dropped dissent counted | `:223-256` (dead conjunct, DE-3) |
| A9 | `memory_updated` ≠ ∅ ∧ total writes > 0 | zero-write updates fail | `:258-270` |
| A10 | `verifyLedger(E).ok ∧ .answerConsistent` | evidence carries the UNANCHORED caveat verbatim | `:272-285` |
| A11 | `run_finished.stoppedBy = "stop_ratified"` ∧ ∃ `span_committed` with `isStop` | cancelled/max_spans/degraded ⇒ fail with honest reason | `:287-305` |
| A12 | E ≠ ∅ ∧ every kind ∈ the 18 known kinds ∧ every payload has its REQUIRED_FIELDS ∧ `run_finished` passes the cancellation-receipt discipline (receipt present ⟺ stoppedBy = cancelled; receipt fields typed, ids unique, counts equal) | forged/misplaced receipts fail (tests `:151-198`) | `:307-329,366-439` |

Score = `|{i : Aᵢ}| / 12` (`:331-333`).

**D29 (baseline).** `baselineReport()` returns 0/12 for a single-model
answer, each item failing "BY CONSTRUCTION" with an explicit reason
(`:336-354`; `scorecard.test.ts:63-67`; `honesty.md:53,76`).

**T3 (process-not-quality).** No conjunction `⋀_{i∈S⊆[1,12]} Aᵢ` — including
`S = [1,12]` — entails correctness of the decision content.
*Proof.* (1) Domain analysis: every predicate in D28 ranges over syntactic
and ordering properties of E — event presence, sequencing, hash equalities,
string lengths, key sets, enum flags — and never references any oracle,
ground-truth label, or domain semantics of `finalAnswer`; hence the
predicates cannot distinguish two ledgers that differ only in the truth of
their content. (2) Constructive witness: the deterministic offline run —
whose content is scripted, not a model judgment (`offline.ts:19-24`) —
scores 12/12 (`scorecard.test.ts:56-61`). Its `finalAnswer` is whatever the
fixture's candidate hints induce; replacing the fixture with one whose hinted
span is materially false changes no predicate value (all D28 predicates are
invariant under content substitution preserving lengths/keys/hashes, and
hashes are recomputed over the substituted content by the generator). Hence
`⋀Aᵢ ∧ ¬Correct` is satisfiable. ∎
Corollary (what the scorecard CAN certify): that the recorded PROCESS
occurred as claimed — commitments preceded reveals, warrants were substantive
and non-back-filled, feedback was identity-stripped and order-randomized,
revisions engaged objections, a veto-empowered safety review ran, decisions
name rules and reasons, material dissent survived, memory persisted, the
chain verifies with a consistent answer reconstruction, STOP was explicit,
and the log is schema-typed (`docs/honesty.md:3,15,22`). Tribunal's own live
runs score 11/12 (A11 misses) and the policy is to report that, not tune it
(`docs/honesty.md:78-86`).

**LEM5 (spoof resistance is limited but real).** Rehashing a mutated ledger
defeats A10's hash check only if the mutation also satisfies the structural
state machine; the committed tests exhibit two forgeries (receipt deletion;
receipt on a non-cancelled run) that survive rehashing yet fail A10 and A12.
*Proof.* `scorecard.test.ts:151-198` rehashes with the generator's own rule
(`:27-36`) and asserts A10 = false via `verifyLedgerStructure` payload/
provenance checks and A12 = false via D28's receipt discipline. ∎
Boundary: an adversary who forges a FULLY structure-consistent ledger from
scratch defeats both — that is exactly the unanchored-chain caveat
(`docs/honesty.md:88-95`), restated as INV9.

**INV9 (anchoring).** Verification of any exported ledger proves internal
consistency of the presented bytes only; provenance requires an
independently held copy or an externally published head hash (stored per run
in `runs/⟨id⟩/meta.json.head`, `index.ts:668-670`).

---

## 8. Worker (`apps/worker/src/index.ts` [M])

**D30 (worker).** A Cloudflare Worker exposing `POST /verify` and
`POST /api/verify` accepting `{events: LedgerEvent[]}` and returning
`{verify: {ok, events, head, problems, answerConsistent}}`
(`worker/src/index.ts:124-156`), response-shape-identical to the Node
server's `verify` field (`worker/README.md:12-24`).

Sameness decomposition vs `verifyLedger` (`ledger.ts:85-139`):

| Layer | Node server | Worker | Relation |
|---|---|---|---|
| canonical JSON | `hash.ts:8-24` | `worker:12-28` | DUPLICATED, textually equivalent algorithm (sortDeep, undefined-omitting) |
| SHA-256 | `node:crypto` sync (`hash.ts:26-28`) | WebCrypto async (`worker:30-34`) | re-implemented for edge runtime |
| chain + reveal-hash checks | `ledger.ts:89-127` | `worker:59-97` | duplicated loop, same checks incl. `proposals_revealed` per-proposal recomputation |
| schema/state machine/quorum/answer | `verifyLedgerStructure` (`ledger.ts:129-137`) | SAME MODULE imported by relative path (`worker:3-6,99-108`) | SHARED, single implementation |

**LEM6 (worker/server agreement).** For every event array E, worker and
server verifiers agree on `ok`, `problems` (up to hash-detail string
formatting), `head`, and `answerConsistent`, PROVIDED the duplicated hash
layer stays in sync.
*Proof.* Structural layer: same function, hence pointwise equal. Hash layer:
both compute `SHA256hex(cjson(e ∖ {hash}))` over the identical field set
`{seq, runId, spanIndex, ts, kind, payload, prevHash}` with the same `cjson`
(textual comparison of `worker:12-28` against `hash.ts:8-24`: identical
recursion, identical undefined-omission); SHA-256 is runtime-independent. The
proviso is a standing maintenance obligation, codified as honesty invariant 8
("If kernel ledger logic changes, update `apps/worker/src/index.ts` in the
same change", `docs/honesty.md:56`). ∎

Operational meaning of "a separately operated verifier is not implied"
(`docs/honesty.md:16`): the worker is the SAME repository's code, deployed —
if at all — by the SAME operator (`worker/README.md:28`). Running it
re-executes Tribunal's own verifier at the edge; it is NOT third-party
attestation, adds no provenance beyond INV9, and its passing verdict must be
phrased as replay verification, never independent audit. CORS `*`
(`worker:111-115`) is tenable only because it holds no state or secrets (F6).

---

## 9. Cross-provider heterogeneity

**D31 (round-robin seating).** `buildPanelFromProviders(providers, opts)`
staffs ALL six societies by `provider(seatᵢ) = providers[i mod |providers|]`,
`seatId = "seat_{i+1}_{societyᵢ}"` (`panel.ts:61-86`, assignment rule
`:72-74`). Server defaults: cli mode with no pool ⇒ round-robin over the
protected-data set `[openai, anthropic]`; an explicit pool round-robins that
pool; an exact six-society assignment bypasses round-robin
(`apps/server/src/index.ts:111-121,509-520`). Exact-assignment construction
is L1. Degradation semantics: losing a vendor shrinks the POOL, never the
SEAT COUNT — the institution keeps all six mandates and the ledger records
which vendor staffed each seat (`panel.ts:56-60`).

**INV10 (honesty boundary on heterogeneity — restated in spirit, faithful to
`docs/honesty.md:10`).** Tribunal claims that different vendor routes CREATE
provider heterogeneity across seats, and that committed live runs used two
(openai+xai) and three (openai+xai+anthropic) vendors round-robined across
six seats; Tribunal does NOT claim any demonstrated causal reduction in
correlated error. Re-implementations MUST NOT strengthen this into an
error-decorrelation claim without a controlled study. Corresponding
provenance duty: seat→provider/model/modelSource is ledgered in
`run_started.panel` and every `provider_call.usage` (INV3 items 1–2 apply to
live modes identically), and OpenRouter vendor labels reflect the model
vendor (`openrouter.ts:28-31`), with requested-vs-served separation per L8.

**INV11 (probe/protected separation).** Quota-bearing liveness probes run
only under `protectedData:false` on synthetic data via authenticated POST
(`apps/server/src/index.ts:856-918`); real case runs keep the protected
default and fail closed on non-isolated transports (L6;
`index.ts:425-429,463-472`).

---

## 10. Discrepancy register

- **DE-1 (docs vs code, credentials timing).**
  (a) `docs/honesty.md:27,52` and `.env.example:2` state keys are read "at
  call time only"; `openrouter.ts:64-65` reads the key at CLIENT CONSTRUCTION
  (per run) and retains it for the client lifetime. Substance (never stored,
  env-sourced, run-scoped) holds; the literal timing claim does not. F1.
  (b) `cli.ts:54-122` reads `TRIBUNAL_CLAUDE_MODEL`/`TRIBUNAL_CURSOR_MODEL`
  at MODULE LOAD; non-secret, but "call time" is again literally false.
- **DE-2 (stale test counts).** `docs/architecture.md:133` claims 52 kernel
  tests and `:136` claims 8 server tests; the working tree contains 64
  `test(` occurrences across kernel test files
  (18+4+33+2+7) and 11 across `apps/server/test` (3+1+4+3). Counted, not run.
- **DE-3 (dead conjunct).** `scorecard/src/index.ts:241`:
  `dissents.length >= 0` is a tautology; the operative guards are
  `missing === 0` and `revs.length > 0`. Behavior matches intent; the
  conjunct is dead code a re-implementation should drop.
- **DE-4 (tolerant extractor unused on voting paths).** `extractJSON`
  (`base.ts:92-114`) is exported "for non-voting UI utilities and backwards
  compatibility" (`base.ts:119-121`); both live adapters vote only through
  `extractStrictJSON` (`cli.ts:416,456,558`; `openrouter.ts:233,270,369`).
  Port the strict path; treat the tolerant one as optional UI tooling.
- **DE-5 (uncommitted-file build risk).** The server imports
  `./request-security.js` (`apps/server/src/index.ts:49-55`), worker and
  kernel import `ledger-structure.js` (`worker:3-6`, `ledger.ts:2`), and both
  CLI transports import `./cli-environment.js` (`cli.ts:26`,
  `decoder-cli.ts:7`) — all three modules are UNTRACKED [??]; a checkout of
  HEAD does not compile. Commit them (plus the two [??] tests) with the [M]
  files they serve.
- **DE-6 (lifecycle naming).** External descriptions of a
  `created → running → …` lifecycle do not match the code: panel runs are
  born `running` (`index.ts:548`); only the decoder service has a pre-running
  `starting` state (`decoder-service.ts:264`). Specify per D20/D16.
- **DE-7 (mixed-freshness decoder stack).** `decoder.ts` and `surface.ts` are
  [=] while `decoder-cli.ts`, `decoder-service.ts`, and both server auth
  files are [M] and `request-security.ts` is [??]: the working tree's decoder
  changes are concentrated at the transport/service/auth edge, with the
  kernel protocol and verifier unchanged from HEAD. Integration should treat
  §4.1–4.3 as stable and §4.6/§5 as the moving surface.
- **DE-8 (duplicated hash layer).** Worker duplicates `canonicalJSON`/SHA-256
  (`worker:12-34` vs `hash.ts:8-28`). Currently textually in sync (LEM6);
  divergence risk is governed only by `docs/honesty.md:56`. A production port
  should extract the hash layer into the shared runtime-portable module
  alongside `ledger-structure.ts`.
- **DE-9 (latent multi-byte defect, panel CLI).** `cli.ts:361` accumulates
  stdout via `chunk.toString()` per chunk; a UTF-8 code point split across
  chunk boundaries yields U+FFFD. The decoder transport solved this with
  `StringDecoder` (`decoder-cli.ts:207-209`; L12); the panel path did not.
  No contract test asserts it (L12 row); flagged for the port.
- **DE-10 (health note asymmetry, minor).** `/api/decoder/health` reports
  `authChecked:false, servedModelChecked:false` and redacts binaries to
  basenames (`decoder-service.ts:108-114,1024-1027`); `/api/panel` returns
  raw first-line probe output (`index.ts:270-272`). Both operator-gated;
  port the stricter decoder posture.

**INV12 (claim-boundary summary for the port, normative).** A companion
implementation MUST preserve: auditability-not-quality (T3, `honesty.md:22,49`),
unanchored-chain disclosure (INV9), offline labeling (INV3), env-only
credentials (INV2), the observable-CLI transcript boundary and VERIFIED FULL
gating (T2, `honesty.md:29-45`), unsigned-actor disclosure (INV7 caveat), and
constructed-heterogeneity-only phrasing (INV10).

---

## 11. Obligation → falsifier index

L1–L9: `provider_contracts.test.ts:37-301`. L10–L14:
`decoder_cli.test.ts:13-209`. T2 conjuncts: `kernel/test/decoder.test.ts`
(18 tests, [=]). D17–D18/LEM4: `decoder-auth.test.ts:15-178`,
`decoder-http-auth.test.ts:53-211`, `request-security.test.ts:18-60`.
D16 persistence/lease/recovery: `decoder-service.test.ts` (4 tests, [=]).
D28/D29, T3 witness, LEM5: `scorecard.test.ts:56-198`. INV1/D4 engine
exclusion: `kernel.test.ts` (33 tests, [M]).

END OF SPECIFICATION.
