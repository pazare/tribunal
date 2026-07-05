import { createHash } from "node:crypto";

/**
 * Deterministic, canonical JSON serialization: object keys sorted recursively so
 * that two logically-equal payloads always produce byte-identical output (and
 * therefore identical hashes) regardless of construction order.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) continue; // omit undefined so it never perturbs the hash
      out[key] = sortDeep(v);
    }
    return out;
  }
  return value;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Hash of any structured value via its canonical JSON. */
export function hashOf(value: unknown): string {
  return sha256Hex(canonicalJSON(value));
}

/** Short, content-derived stable id (first 12 hex of the payload hash). */
export function stableId(prefix: string, ...parts: unknown[]): string {
  return `${prefix}_${hashOf(parts).slice(0, 12)}`;
}
