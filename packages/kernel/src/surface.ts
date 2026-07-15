/**
 * Exact surface units for the two-agent live decoder.
 *
 * This boundary deliberately performs no trimming, Unicode normalization,
 * whitespace folding, truncation, or STOP inference. What the provider emits is
 * either one valid unit exactly as written or an invalid public attempt.
 */

export type DecoderUnit =
  | { kind: "span"; text: string }
  | { kind: "space"; text: " " }
  | { kind: "enter"; text: "\n" }
  | { kind: "stop"; text: "" };

export interface DecoderUnitValidation {
  ok: boolean;
  errors: string[];
  unit?: DecoderUnit;
}

const UNICODE_WHITESPACE = /\p{White_Space}/u;
const INVISIBLE_OR_CONTROL = /[\p{Cc}\p{Cf}\p{Cs}]/u;
const UNIT_KINDS = new Set(["span", "space", "enter", "stop"]);

/** Validate an unknown value without transforming it. */
export function validateDecoderUnit(value: unknown): DecoderUnitValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["unit must be an object"] };
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const key of keys) {
    if (key !== "kind" && key !== "text") errors.push(`unit contains unexpected field ${key}`);
  }
  if (!keys.includes("kind")) errors.push("unit.kind is required");
  if (!keys.includes("text")) errors.push("unit.text is required");

  const kind = record.kind;
  const text = record.text;
  if (typeof kind !== "string" || !UNIT_KINDS.has(kind)) {
    errors.push("unit.kind must be span, space, enter, or stop");
  }
  if (typeof text !== "string") errors.push("unit.text must be a string");
  if (errors.length || typeof text !== "string") return { ok: false, errors };

  switch (kind) {
    case "span":
      if (text.length === 0) errors.push("span text must be nonempty");
      if (UNICODE_WHITESPACE.test(text)) errors.push("span text must contain no Unicode whitespace");
      if (INVISIBLE_OR_CONTROL.test(text)) {
        errors.push("span text must contain no control, format, or surrogate code point");
      }
      break;
    case "space":
      if (text !== " ") errors.push("space text must be exactly U+0020");
      break;
    case "enter":
      if (text !== "\n") errors.push("enter text must be exactly LF (U+000A)");
      break;
    case "stop":
      if (text !== "") errors.push("stop text must be exactly empty");
      break;
  }

  return errors.length
    ? { ok: false, errors }
    : { ok: true, errors: [], unit: { kind, text } as DecoderUnit };
}

export function decoderUnitKey(unit: DecoderUnit): string {
  switch (unit.kind) {
    case "span":
      return `span:${unit.text}`;
    case "space":
      return "space:U+0020";
    case "enter":
      return "enter:U+000A";
    case "stop":
      return "stop";
  }
}

/** Exact bytes appended to the answer. STOP appends nothing. */
export function decoderUnitText(unit: DecoderUnit): string {
  return unit.text;
}

export function decoderUnitLabel(unit: DecoderUnit): string {
  if (unit.kind === "space") return "␠ SPACE";
  if (unit.kind === "enter") return "↵ ENTER";
  if (unit.kind === "stop") return "■ STOP";
  return unit.text;
}
