import { sha256Hex } from "./hash.js";

/** Seeded PRNG (mulberry32) derived from a string, for reproducible shuffles. */
export function mulberry32FromString(s: string): () => number {
  let a = parseInt(sha256Hex(s).slice(0, 8), 16) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
