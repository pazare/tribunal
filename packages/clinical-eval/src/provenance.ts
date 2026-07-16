import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function canonical(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON rejects non-finite numbers");
    return value;
  }
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(`canonical JSON rejects ${typeof value}`);
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("canonical JSON accepts plain objects only");
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  throw new Error(`canonical JSON rejects ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonical(value));
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashJson(value: unknown): string {
  return sha256(canonicalJson(value));
}

export function hashFile(path: string): string {
  return sha256(readFileSync(resolve(path)));
}

export interface GitState {
  commit: string;
  dirty: boolean;
  branch: string;
}

export function gitState(cwd: string): GitState {
  const run = (args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  return {
    commit: run(["rev-parse", "HEAD"]),
    dirty: run(["status", "--porcelain"]).length > 0,
    branch: run(["branch", "--show-current"]),
  };
}
