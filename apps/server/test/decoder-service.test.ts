import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  type DecoderClient,
  type DecoderClientRequest,
  type DecoderTransportResult,
} from "@tribunal/kernel";
import { DecoderService, DecoderServiceError } from "../src/decoder-service.js";

function receipt(responseText: string, status: DecoderTransportResult["status"] = "ok"): DecoderTransportResult {
  return {
    responseText,
    stdout: responseText,
    stderr: "",
    command: { bin: "fake", args: [], promptTransport: "stdin" },
    startedAt: 1,
    finishedAt: 2,
    durationMs: 1,
    exitCode: status === "ok" ? 0 : null,
    signal: status === "cancelled" ? "SIGTERM" : null,
    status,
    ...(status === "ok" ? {} : { error: "cancelled" }),
  };
}

class FakeCliClient implements DecoderClient {
  readonly provider: "openai" | "anthropic";
  readonly requestedModel: string;
  readonly requestedEffort = "medium" as const;
  readonly modelSource = "requested" as const;
  readonly transport = "cli" as const;
  readonly executable = process.execPath;

  constructor(
    readonly clientId: "codex" | "claude",
    private readonly answer: (request: DecoderClientRequest) => Promise<DecoderTransportResult> | DecoderTransportResult,
  ) {
    this.provider = clientId === "codex" ? "openai" : "anthropic";
    this.requestedModel = clientId === "codex" ? "gpt-5.6-sol" : "claude-opus-4-8";
  }

  invoke(request: DecoderClientRequest): Promise<DecoderTransportResult> {
    return Promise.resolve(this.answer(request));
  }
}

class FakeServerResponse extends EventEmitter {
  destroyed = false;
  writableEnded = false;
  readonly writes: string[] = [];

  constructor(private readonly acceptWrites: boolean) {
    super();
  }

  writeHead() {
    return this;
  }

  flushHeaders() {}

  write(chunk: unknown): boolean {
    this.writes.push(String(chunk));
    return this.acceptWrites;
  }

  end() {
    if (!this.writableEnded) {
      this.writableEnded = true;
      this.emit("close");
    }
    return this;
  }
}

function clients(
  answer: (request: DecoderClientRequest) => Promise<DecoderTransportResult> | DecoderTransportResult,
): readonly [DecoderClient, DecoderClient] {
  return [new FakeCliClient("codex", answer), new FakeCliClient("claude", answer)];
}

async function waitForTerminal(service: DecoderService, runId: string) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const detail = service.detail(runId);
    if (
      detail.source === "recorded" &&
      ["stopped", "failed", "cancelled", "budget_exhausted"].includes(detail.status)
    ) return detail;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("decoder test run did not terminate");
}

test("service persists and reloads an exact two-round decoder ledger", async () => {
  const runsDir = mkdtempSync(join(tmpdir(), "tribunal-decoder-service-"));
  try {
    const answer = (request: DecoderClientRequest) => {
      const unit = request.roundIndex === 0
        ? { kind: "span", text: "OK" }
        : { kind: "stop", text: "" };
      const body = request.phase === "revise"
        ? { unit, publicWarrant: "public reason", critiqueOfPeer: "public critique" }
        : request.phase === "judge"
          ? { pick: 0, publicWarrant: "public judge" }
          : { unit, publicWarrant: "public reason" };
      return receipt(JSON.stringify(body));
    };
    const service = new DecoderService({ runsDir, createClients: () => clients(answer) as any });
    const started = await service.start({ userPrompt: "Return OK then STOP.", maxRounds: 2 });
    const finished = await waitForTerminal(service, started.runId);
    assert.equal(finished.status, "stopped");
    assert.equal(finished.result?.finalOutput, "OK");
    assert.equal(finished.events.length, 30);
    assert.equal(service.verify({ runId: started.runId }).ok, true);
    assert.equal(service.activeCount(), 0);
    assert.equal(finished.source, "recorded");
    assert.equal(statSync(join(runsDir, started.runId, "decoder.json")).mode & 0o777, 0o600);
    assert.equal(statSync(join(runsDir, started.runId, "decoder-meta.json")).mode & 0o777, 0o600);
    const journalPath = join(runsDir, started.runId, "decoder.jsonl");
    assert.equal(statSync(journalPath).mode & 0o777, 0o600);
    assert.equal(readFileSync(journalPath, "utf8").trim().split("\n").length, 30);
  } finally {
    rmSync(runsDir, { recursive: true, force: true });
  }
});

test("service admits only one two-agent run and cancellation seals it", async () => {
  const runsDir = mkdtempSync(join(tmpdir(), "tribunal-decoder-single-run-"));
  try {
    const blocking = (request: DecoderClientRequest) => new Promise<DecoderTransportResult>((resolve) => {
      const finish = () => resolve(receipt("", "cancelled"));
      request.signal?.addEventListener("abort", finish, { once: true });
      if (request.signal?.aborted) finish();
    });
    const service = new DecoderService({ runsDir, createClients: () => clients(blocking) as any });
    const first = await service.start({ userPrompt: "Wait.", maxRounds: 2 });
    await assert.rejects(
      service.start({ userPrompt: "Second.", maxRounds: 2 }),
      (error: unknown) => error instanceof DecoderServiceError && error.statusCode === 409,
    );
    service.cancel(first.runId, { actor: "test", reason: "finish test" });
    const finished = await waitForTerminal(service, first.runId);
    assert.equal(finished.status, "cancelled");
    assert.equal(service.verify({ runId: first.runId }).ok, true);
  } finally {
    rmSync(runsDir, { recursive: true, force: true });
  }
});

test("process lease excludes a second service until shutdown releases it", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "tribunal-decoder-lease-"));
  const inert = () => receipt(JSON.stringify({
    unit: { kind: "stop", text: "" },
    publicWarrant: "done",
  }));
  try {
    const first = new DecoderService({ runsDir, createClients: () => clients(inert) as any });
    assert.throws(
      () => new DecoderService({ runsDir, createClients: () => clients(inert) as any }),
      (error: unknown) => error instanceof DecoderServiceError && error.statusCode === 409,
    );
    first.shutdown("test", "release lease");
    const second = new DecoderService({ runsDir, createClients: () => clients(inert) as any });
    second.shutdown("test", "release second lease");
  } finally {
    rmSync(runsDir, { recursive: true, force: true });
  }
});

test("recovery salvages complete journal lines, seals a corrupt tail, and bounds SSE replay", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "tribunal-decoder-recovery-"));
  const runId = "decoder_interrupted_tail";
  const runDir = join(runsDir, runId);
  const inert = () => receipt(JSON.stringify({
    unit: { kind: "stop", text: "" },
    publicWarrant: "done",
  }));
  try {
    chmodSync(runsDir, 0o755);
    mkdirSync(runDir, { mode: 0o755 });
    writeFileSync(join(runDir, "decoder-meta.json"), JSON.stringify({
      schemaVersion: 1,
      runId,
      userPrompt: "Recover me.",
      maxRounds: 2,
      status: "running",
      startedAt: 1,
      eventCount: 0,
    }), { mode: 0o644 });
    const completeEvent = {
      seq: 0,
      runId,
      roundIndex: null,
      ts: 1,
      kind: "decoder_started",
      payload: {},
      prevHash: "0".repeat(64),
      hash: "incomplete-run-hash",
    };
    writeFileSync(
      join(runDir, "decoder.jsonl"),
      `${JSON.stringify(completeEvent)}\n{"seq":1`,
      { mode: 0o644 },
    );

    const service = new DecoderService({ runsDir, createClients: () => clients(inert) as any });
    const recovered = service.detail(runId);
    assert.equal(recovered.status, "failed");
    assert.equal(recovered.events.length, 1);
    assert.match(recovered.error ?? "", /corrupt tail/);
    assert.equal(statSync(runsDir).mode & 0o777, 0o700);
    assert.equal(statSync(runDir).mode & 0o777, 0o700);
    assert.equal(statSync(join(runDir, "decoder.jsonl")).mode & 0o777, 0o600);
    assert.equal(statSync(join(runDir, "decoder.json")).mode & 0o777, 0o600);
    assert.equal(statSync(join(runDir, "decoder-meta.json")).mode & 0o777, 0o600);

    const completeReplay = new FakeServerResponse(true);
    service.subscribe(runId, completeReplay as any, -1);
    assert.equal(completeReplay.writes.length, 2);
    assert.match(completeReplay.writes[0], /^id: 0\nevent: decoder\n/);
    assert.equal(completeReplay.writableEnded, true);

    const backpressuredReplay = new FakeServerResponse(false);
    service.subscribe(runId, backpressuredReplay as any, -1);
    assert.equal(backpressuredReplay.writes.length, 1);
    assert.equal(backpressuredReplay.writableEnded, true);
    service.shutdown("test", "release recovery lease");
  } finally {
    rmSync(runsDir, { recursive: true, force: true });
  }
});
