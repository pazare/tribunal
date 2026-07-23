import type { BootstrapInterval } from "./types.js";

export interface AgreementUnit<T> {
  caseId: string;
  ratings: Array<T | null>;
}

export interface RawAgreementResult {
  meanOfCases: number | null;
  pooledPairwise: number | null;
  agreeingPairs: number;
  totalPairs: number;
  validCases: number;
  perCase: Array<{ caseId: string; agreement: number | null; agreeingPairs: number; totalPairs: number }>;
}

export interface CohenKappaResult {
  kappa: number | null;
  observedAgreement: number | null;
  expectedAgreement: number | null;
  n: number;
}

export interface KrippendorffResult<T> {
  alpha: number | null;
  observedDisagreement: number | null;
  expectedDisagreement: number | null;
  coincidenceN: number;
  marginals: Map<T, number>;
  validCases: number;
}

function increment<K>(map: Map<K, number>, key: K, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

export function rawPairwiseAgreement<T>(units: AgreementUnit<T>[]): RawAgreementResult {
  let agreeingPairs = 0;
  let totalPairs = 0;
  const perCase = units.map((unit) => {
    const ratings = unit.ratings.filter((rating): rating is T => rating !== null);
    let caseAgree = 0;
    let casePairs = 0;
    for (let i = 0; i < ratings.length; i += 1) {
      for (let j = i + 1; j < ratings.length; j += 1) {
        casePairs += 1;
        if (ratings[i] === ratings[j]) caseAgree += 1;
      }
    }
    agreeingPairs += caseAgree;
    totalPairs += casePairs;
    return {
      caseId: unit.caseId,
      agreement: casePairs > 0 ? caseAgree / casePairs : null,
      agreeingPairs: caseAgree,
      totalPairs: casePairs,
    };
  });
  const valid = perCase.filter(
    (item): item is typeof item & { agreement: number } => item.agreement !== null,
  );
  return {
    meanOfCases:
      valid.length > 0 ? valid.reduce((sum, item) => sum + item.agreement, 0) / valid.length : null,
    pooledPairwise: totalPairs > 0 ? agreeingPairs / totalPairs : null,
    agreeingPairs,
    totalPairs,
    validCases: valid.length,
    perCase,
  };
}

export function unanimityDistribution<T>(units: AgreementUnit<T>[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const unit of units) {
    const ratings = unit.ratings.filter((rating): rating is T => rating !== null);
    const counts = new Map<T, number>();
    for (const rating of ratings) increment(counts, rating, 1);
    const max = Math.max(0, ...counts.values());
    const key = `${max}-of-${ratings.length}`;
    distribution[key] = (distribution[key] ?? 0) + 1;
  }
  return distribution;
}

export function cohenKappa<T>(pairs: Array<readonly [T, T]>): CohenKappaResult {
  const n = pairs.length;
  if (n === 0) return { kappa: null, observedAgreement: null, expectedAgreement: null, n };
  const left = new Map<T, number>();
  const right = new Map<T, number>();
  let agreements = 0;
  for (const [a, b] of pairs) {
    increment(left, a, 1);
    increment(right, b, 1);
    if (a === b) agreements += 1;
  }
  const categories = new Set<T>([...left.keys(), ...right.keys()]);
  const observedAgreement = agreements / n;
  let expectedAgreement = 0;
  for (const category of categories) {
    expectedAgreement += ((left.get(category) ?? 0) / n) * ((right.get(category) ?? 0) / n);
  }
  const denominator = 1 - expectedAgreement;
  return {
    kappa: denominator === 0 ? null : (observedAgreement - expectedAgreement) / denominator,
    observedAgreement,
    expectedAgreement,
    n,
  };
}

export function weightedKappa<T>(
  pairs: Array<readonly [T, T]>,
  orderedLevels: readonly T[],
  kind: "linear" | "quadratic",
): number | null {
  if (pairs.length === 0 || orderedLevels.length < 2) return null;
  const index = new Map(orderedLevels.map((level, i) => [level, i]));
  const left = new Map<T, number>();
  const right = new Map<T, number>();
  const distance = (a: T, b: T): number => {
    const ai = index.get(a);
    const bi = index.get(b);
    if (ai === undefined || bi === undefined) throw new Error("rating not found in ordered levels");
    const normalized = Math.abs(ai - bi) / (orderedLevels.length - 1);
    return kind === "quadratic" ? normalized ** 2 : normalized;
  };
  let observedDisagreement = 0;
  for (const [a, b] of pairs) {
    increment(left, a, 1);
    increment(right, b, 1);
    observedDisagreement += distance(a, b);
  }
  observedDisagreement /= pairs.length;
  let expectedDisagreement = 0;
  for (const a of orderedLevels) {
    for (const b of orderedLevels) {
      expectedDisagreement +=
        ((left.get(a) ?? 0) / pairs.length) *
        ((right.get(b) ?? 0) / pairs.length) *
        distance(a, b);
    }
  }
  return expectedDisagreement === 0 ? null : 1 - observedDisagreement / expectedDisagreement;
}

export function fleissKappa(categoryCounts: number[][]): number | null {
  if (categoryCounts.length === 0 || categoryCounts[0].length === 0) return null;
  const raters = categoryCounts[0].reduce((sum, count) => sum + count, 0);
  const categories = categoryCounts[0].length;
  if (
    categoryCounts.some(
      (row) =>
        row.length !== categories ||
        row.some((count) => !Number.isInteger(count) || count < 0) ||
        row.reduce((sum, count) => sum + count, 0) !== raters,
    )
  ) {
    throw new Error("Fleiss kappa requires the same number of raters and categories for every case");
  }
  if (raters < 2) return null;
  const n = categoryCounts.length;
  const prevalence = Array.from({ length: categories }, (_, category) =>
    categoryCounts.reduce((sum, row) => sum + row[category], 0) / (n * raters),
  );
  const perCase = categoryCounts.map(
    (row) => (row.reduce((sum, count) => sum + count ** 2, 0) - raters) / (raters * (raters - 1)),
  );
  const observed = perCase.reduce((sum, value) => sum + value, 0) / n;
  const expected = prevalence.reduce((sum, value) => sum + value ** 2, 0);
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}

export function krippendorffAlpha<T>(
  units: AgreementUnit<T>[],
  delta: (a: T, b: T) => number = (a, b) => (a === b ? 0 : 1),
): KrippendorffResult<T> {
  const coincidence = new Map<T, Map<T, number>>();
  let validCases = 0;
  for (const unit of units) {
    const ratings = unit.ratings.filter((rating): rating is T => rating !== null);
    if (ratings.length < 2) continue;
    validCases += 1;
    const weight = 1 / (ratings.length - 1);
    for (let i = 0; i < ratings.length; i += 1) {
      for (let j = 0; j < ratings.length; j += 1) {
        if (i === j) continue;
        const row = coincidence.get(ratings[i]) ?? new Map<T, number>();
        increment(row, ratings[j], weight);
        coincidence.set(ratings[i], row);
      }
    }
  }
  const categories = new Set<T>();
  let coincidenceN = 0;
  for (const [a, row] of coincidence) {
    categories.add(a);
    for (const [b, count] of row) {
      categories.add(b);
      coincidenceN += count;
    }
  }
  if (coincidenceN <= 1) {
    return {
      alpha: null,
      observedDisagreement: null,
      expectedDisagreement: null,
      coincidenceN,
      marginals: new Map(),
      validCases,
    };
  }
  const marginals = new Map<T, number>();
  for (const category of categories) {
    const row = coincidence.get(category);
    increment(marginals, category, row ? [...row.values()].reduce((sum, count) => sum + count, 0) : 0);
  }
  let observedNumerator = 0;
  for (const [a, row] of coincidence) {
    for (const [b, count] of row) observedNumerator += count * delta(a, b);
  }
  const observedDisagreement = observedNumerator / coincidenceN;
  let expectedNumerator = 0;
  for (const a of categories) {
    for (const b of categories) {
      expectedNumerator += (marginals.get(a) ?? 0) * (marginals.get(b) ?? 0) * delta(a, b);
    }
  }
  const expectedDisagreement = expectedNumerator / (coincidenceN * (coincidenceN - 1));
  return {
    alpha: expectedDisagreement === 0 ? null : 1 - observedDisagreement / expectedDisagreement,
    observedDisagreement,
    expectedDisagreement,
    coincidenceN,
    marginals,
    validCases,
  };
}

export function gwetAc1<T>(units: AgreementUnit<T>[], categories: readonly T[]): number | null {
  if (categories.length < 2) return null;
  const prevalenceSums = new Map<T, number>(categories.map((category) => [category, 0]));
  let nonEmptyCases = 0;
  const agreementTerms: number[] = [];
  for (const unit of units) {
    const ratings = unit.ratings.filter((rating): rating is T => rating !== null);
    if (ratings.length === 0) continue;
    nonEmptyCases += 1;
    const counts = new Map<T, number>();
    for (const rating of ratings) {
      if (!categories.includes(rating)) throw new Error("rating not found in supplied Gwet AC1 categories");
      increment(counts, rating, 1);
    }
    for (const category of categories) {
      increment(prevalenceSums, category, (counts.get(category) ?? 0) / ratings.length);
    }
    if (ratings.length >= 2) {
      const agreeingOrderedPairs = [...counts.values()].reduce(
        (sum, count) => sum + count * (count - 1),
        0,
      );
      agreementTerms.push(agreeingOrderedPairs / (ratings.length * (ratings.length - 1)));
    }
  }
  if (nonEmptyCases === 0 || agreementTerms.length === 0) return null;
  const observed = agreementTerms.reduce((sum, value) => sum + value, 0) / agreementTerms.length;
  const expected =
    categories.reduce((sum, category) => {
      const prevalence = (prevalenceSums.get(category) ?? 0) / nonEmptyCases;
      return sum + prevalence * (1 - prevalence);
    }, 0) /
    (categories.length - 1);
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}

export function jaccardSimilarity<T>(left: Iterable<T>, right: Iterable<T>): number {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / union.size;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function percentileInterval(values: number[], confidence = 0.95): [number | null, number | null] {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) return [null, null];
  const tail = (1 - confidence) / 2;
  const lowerIndex = Math.max(0, Math.floor(tail * finite.length));
  const upperIndex = Math.min(finite.length - 1, Math.floor((1 - tail) * finite.length));
  return [finite[lowerIndex], finite[upperIndex]];
}

export function caseClusterBootstrap<T>(
  units: AgreementUnit<T>[],
  statistic: (sample: AgreementUnit<T>[]) => number | null,
  requestedReplicates = 2_000,
  seed = 18,
): BootstrapInterval {
  if (units.length === 0) {
    return {
      lower: null,
      upper: null,
      confidence: 0.95,
      requestedReplicates,
      validReplicates: 0,
      skippedReplicates: requestedReplicates,
      seed,
      resamplingUnit: "case",
    };
  }
  const rng = seededRandom(seed);
  const estimates: number[] = [];
  let skippedReplicates = 0;
  for (let replicate = 0; replicate < requestedReplicates; replicate += 1) {
    const sample = Array.from({ length: units.length }, () => units[Math.floor(rng() * units.length)]);
    const estimate = statistic(sample);
    if (estimate === null || !Number.isFinite(estimate)) skippedReplicates += 1;
    else estimates.push(estimate);
  }
  const [lower, upper] = percentileInterval(estimates);
  return {
    lower,
    upper,
    confidence: 0.95,
    requestedReplicates,
    validReplicates: estimates.length,
    skippedReplicates,
    seed,
    resamplingUnit: "case",
  };
}
