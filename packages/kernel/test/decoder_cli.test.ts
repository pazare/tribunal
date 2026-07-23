import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DECODER_CLI_RUNTIME_DEFAULTS,
  decoderOutputSchema,
  makeClaudeDecoderClient,
  makeCodexDecoderClient,
} from "../src/index.js";

test("decoder CLI defaults impose no latency deadline or public-output cap", () => {
  assert.deepEqual(DECODER_CLI_RUNTIME_DEFAULTS, { timeoutMs: 0, maxOutputBytes: 0 });
});

function executable(path: string, source: string): string {
  writeFileSync(path, `#!/usr/bin/env node\n${source}`, { mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

test("decoder CLI contracts pin models and effort while carrying the public prompt only on stdin", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tribunal-decoder-cli-test-"));
  const priorSecret = process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD;
  process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD = "must-not-reach-decoder-child";
  try {
    const codexPrompt = join(dir, "codex-prompt.txt");
    const codexArgs = join(dir, "codex-args.json");
    const claudePrompt = join(dir, "claude-prompt.txt");
    const claudeArgs = join(dir, "claude-args.json");
    const claudeEnv = join(dir, "claude-env.json");
    const codex = executable(
      join(dir, "fake-codex"),
      `
const fs = require("node:fs");
if (process.argv[2] === "--version") {
  process.stdout.write("fake-codex 1.0\\n");
} else {
  let prompt = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { prompt += chunk; });
  process.stdin.on("end", () => {
    fs.writeFileSync(${JSON.stringify(codexPrompt)}, prompt);
    fs.writeFileSync(${JSON.stringify(codexArgs)}, JSON.stringify(process.argv.slice(2)));
    process.stdout.write('  {"unit":{"kind":"span","text":"OK"},"publicWarrant":"exact test"}\\n');
  });
}
`,
    );
    const claude = executable(
      join(dir, "fake-claude"),
      `
const fs = require("node:fs");
if (process.argv[2] === "--version") {
  process.stdout.write("fake-claude 1.0\\n");
} else {
  let prompt = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { prompt += chunk; });
  process.stdin.on("end", () => {
    fs.writeFileSync(${JSON.stringify(claudePrompt)}, prompt);
    fs.writeFileSync(${JSON.stringify(claudeArgs)}, JSON.stringify(process.argv.slice(2)));
    fs.writeFileSync(${JSON.stringify(claudeEnv)}, JSON.stringify({
      smallFastModel: process.env.ANTHROPIC_SMALL_FAST_MODEL,
      nonessentialTraffic: process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
      leakedSecret: process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD,
      leakedOpenRouterKey: process.env.OPENROUTER_API_KEY
    }));
    process.stdout.write(JSON.stringify({
      structured_output: { unit: { kind: "span", text: "OK" }, publicWarrant: "exact test" },
      modelUsage: { "claude-opus-4-8": {} }
    }) + "\\n");
  });
}
`,
    );
    const prompt = "  keep exact leading space\nand newline  ";
    const request = {
      phase: "propose" as const,
      roundIndex: 0,
      attempt: 1,
      prompt,
      outputSchema: decoderOutputSchema("propose"),
    };

    const [codexReceipt, claudeReceipt] = await Promise.all([
      makeCodexDecoderClient({ bin: codex }).invoke(request),
      makeClaudeDecoderClient({ bin: claude }).invoke(request),
    ]);

    assert.equal(codexReceipt.status, "ok");
    assert.equal(claudeReceipt.status, "ok");
    assert.equal(readFileSync(codexPrompt, "utf8"), prompt);
    assert.equal(readFileSync(claudePrompt, "utf8"), prompt);
    assert.equal(codexReceipt.stdout, '  {"unit":{"kind":"span","text":"OK"},"publicWarrant":"exact test"}\n');
    assert.equal(claudeReceipt.reportedModel, "claude-opus-4-8");
    assert.deepEqual(claudeReceipt.reportedModels, ["claude-opus-4-8"]);
    assert.equal(codexReceipt.command.promptTransport, "stdin");
    assert.equal(claudeReceipt.command.promptTransport, "stdin");

    const recordedCodexArgs = JSON.parse(readFileSync(codexArgs, "utf8")) as string[];
    const recordedClaudeArgs = JSON.parse(readFileSync(claudeArgs, "utf8")) as string[];
    const recordedClaudeEnv = JSON.parse(readFileSync(claudeEnv, "utf8")) as Record<string, string>;
    assert.deepEqual(recordedCodexArgs.slice(0, 3), ["exec", "--ephemeral", "--ignore-user-config"]);
    assert.ok(recordedCodexArgs.includes("gpt-5.6-sol"));
    assert.ok(recordedCodexArgs.includes('model_reasoning_effort="medium"'));
    assert.ok(recordedCodexArgs.includes("--output-schema"));
    assert.ok(recordedClaudeArgs.includes("claude-opus-4-8"));
    assert.ok(recordedClaudeArgs.includes("--effort"));
    assert.ok(recordedClaudeArgs.includes("medium"));
    assert.ok(recordedClaudeArgs.includes("--prompt-suggestions"));
    assert.equal(recordedClaudeArgs[recordedClaudeArgs.indexOf("--prompt-suggestions") + 1], "false");
    assert.ok(recordedClaudeArgs.includes("--json-schema"));
    assert.ok(!recordedCodexArgs.includes(prompt));
    assert.ok(!recordedClaudeArgs.includes(prompt));
    assert.deepEqual(recordedClaudeEnv, {
      smallFastModel: "claude-opus-4-8",
      nonessentialTraffic: "1",
    });
    assert.deepEqual(claudeReceipt.command.environment, {
      ANTHROPIC_SMALL_FAST_MODEL: "claude-opus-4-8",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    });
    assert.ok(codexReceipt.command.args.some((arg) => arg.startsWith("<output-schema:")));
    assert.ok(claudeReceipt.command.args.some((arg) => arg.startsWith("<json-schema:")));
  } finally {
    if (priorSecret === undefined) delete process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD;
    else process.env.TRIBUNAL_TEST_SECRET_DO_NOT_FORWARD = priorSecret;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("decoder CLI preserves split UTF-8 and has no default public-output cap", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tribunal-decoder-unicode-test-"));
  try {
    const fake = executable(
      join(dir, "fake-codex"),
      `
if (process.argv[2] === "--version") {
  process.stdout.write("fake-codex 1.0\\n");
} else {
  process.stdin.resume();
  process.stdin.on("end", () => {
    const output = JSON.stringify({
      unit: { kind: "span", text: "é" },
      publicWarrant: "x".repeat(2 * 1024 * 1024 + 128)
    });
    const bytes = Buffer.from(output, "utf8");
    const marker = Buffer.from("é", "utf8");
    const split = bytes.indexOf(marker) + 1;
    process.stdout.write(bytes.subarray(0, split));
    setTimeout(() => process.stdout.end(bytes.subarray(split)), 5);
  });
}
`,
    );
    const response = await makeCodexDecoderClient({ bin: fake }).invoke({
      phase: "propose",
      roundIndex: 0,
      attempt: 1,
      prompt: "unicode",
      outputSchema: decoderOutputSchema("propose"),
    });
    assert.equal(response.status, "ok");
    assert.ok(response.stdout.length > 2 * 1024 * 1024);
    const parsed = JSON.parse(response.responseText) as {
      unit: { text: string };
      publicWarrant: string;
    };
    assert.equal(parsed.unit.text, "é");
    assert.equal(parsed.publicWarrant.length, 2 * 1024 * 1024 + 128);
    assert.equal(response.stdout.includes("�"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("operator cancellation terminates a deadline-free decoder CLI call", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tribunal-decoder-cancel-test-"));
  try {
    const fake = executable(
      join(dir, "fake-codex"),
      `
if (process.argv[2] === "--version") {
  process.stdout.write("fake-codex 1.0\\n");
} else {
  process.stdin.resume();
  process.stdin.on("end", () => setInterval(() => {}, 1000));
}
`,
    );
    const controller = new AbortController();
    const pending = makeCodexDecoderClient({ bin: fake }).invoke({
      phase: "propose",
      roundIndex: 0,
      attempt: 1,
      prompt: "cancel",
      outputSchema: decoderOutputSchema("propose"),
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(new Error("operator cancel")), 50);
    const response = await pending;
    assert.equal(response.status, "cancelled");
    assert.match(response.error ?? "", /cancelled/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
