#!/usr/bin/env python3
"""Hand-verifiable oracles for Saturday's agreement statistics.

Pure stdlib. Every coefficient implemented from the primary-source formula,
with exact Fraction arithmetic where possible, so the numbers in the plan
can serve as unit-test oracles for the code written on hackathon day.
"""
import itertools
import random
from collections import Counter, defaultdict
from fractions import Fraction

# ---------------------------------------------------------------- alpha ----
def kripp_alpha(units, delta=None, exact=False):
    """Krippendorff's alpha from the coincidence matrix.

    units: list of lists of values (None = missing / ledgered non-vote).
    delta: difference function d(a,b) -> number in [0,1]; default nominal.
    """
    if delta is None:
        delta = lambda a, b: 0 if a == b else 1
    F = (lambda x: Fraction(x)) if exact else (lambda x: float(x))
    o = defaultdict(lambda: F(0))
    for vals in units:
        vals = [v for v in vals if v is not None]
        m = len(vals)
        if m < 2:
            continue
        w = Fraction(1, m - 1) if exact else 1.0 / (m - 1)
        for i, j in itertools.permutations(range(m), 2):
            o[(vals[i], vals[j])] += w
    n = sum(o.values())
    cats = sorted({c for p in o for c in p})
    nc = {c: sum(o.get((c, k), F(0)) for k in cats) for c in cats}
    Do = sum(v * delta(a, b) for (a, b), v in o.items()) / n
    De = sum(nc[a] * nc[b] * delta(a, b) for a in cats for b in cats) / (n * (n - 1))
    return 1 - Do / De, o, nc, n, Do, De

# ------------------------------------------------------- percent + n-of-n --
def percent_agreement(units):
    per_unit, tot_pairs, tot_agree = [], 0, 0
    for vals in units:
        vals = [v for v in vals if v is not None]
        if len(vals) < 2:
            per_unit.append(None)
            continue
        pairs = list(itertools.combinations(vals, 2))
        a = sum(1 for x, y in pairs if x == y)
        per_unit.append(Fraction(a, len(pairs)))
        tot_pairs += len(pairs)
        tot_agree += a
    valid = [p for p in per_unit if p is not None]
    mean_of_units = sum(valid) / len(valid)
    pooled = Fraction(tot_agree, tot_pairs)
    return mean_of_units, pooled, per_unit

def n_of_n(units):
    dist = Counter()
    for vals in units:
        vals = [v for v in vals if v is not None]
        m = len(vals)
        k = Counter(vals).most_common(1)[0][1] if m else 0
        dist[(k, m)] += 1
    return dict(dist)

# ------------------------------------------------------------------ Fleiss -
def fleiss_kappa(rows):
    """rows: item x category count table, equal raters per item. Exact."""
    r = sum(rows[0])
    N = len(rows)
    q = len(rows[0])
    p = [Fraction(sum(row[j] for row in rows), N * r) for j in range(q)]
    Pi = [Fraction(sum(x * x for x in row) - r, r * (r - 1)) for row in rows]
    Pbar = sum(Pi) / N
    Pe = sum(x * x for x in p)
    return (Pbar - Pe) / (1 - Pe)

# -------------------------------------------------------------------- AC1 --
def gwet_ac1(units, cats):
    """Gwet's AC1, multi-rater, variable raters per unit, exact fractions."""
    n_items = 0
    pa_terms = []
    pik = {k: [] for k in cats}
    for vals in units:
        vals = [v for v in vals if v is not None]
        m = len(vals)
        if m == 0:
            continue
        n_items += 1
        c = Counter(vals)
        for k in cats:
            pik[k].append(Fraction(c.get(k, 0), m))
        if m >= 2:
            pa_terms.append(Fraction(sum(v * (v - 1) for v in c.values()), m * (m - 1)))
    Pa = sum(pa_terms) / len(pa_terms)
    pi = {k: sum(v) / len(v) for k, v in pik.items()}
    Pe = sum(pi[k] * (1 - pi[k]) for k in cats) / (len(cats) - 1)
    return (Pa - Pe) / (1 - Pe)

# ------------------------------------------------------------------ Cohen --
def cohen_kappa(pairs):
    n = len(pairs)
    po = Fraction(sum(1 for a, b in pairs if a == b), n)
    ca = Counter(a for a, _ in pairs)
    cb = Counter(b for _, b in pairs)
    cats = set(ca) | set(cb)
    pe = sum(Fraction(ca.get(k, 0), n) * Fraction(cb.get(k, 0), n) for k in cats)
    return (po - pe) / (1 - pe), po, pe

def weighted_kappa(pairs, levels, kind):
    n = len(pairs)
    q = len(levels)
    idx = {v: i for i, v in enumerate(levels)}
    def w(i, j):
        d = Fraction(abs(i - j), q - 1)
        return d * d if kind == "quadratic" else d
    ca = Counter(a for a, _ in pairs)
    cb = Counter(b for _, b in pairs)
    Do = sum(w(idx[a], idx[b]) for a, b in pairs) / n
    De = sum(Fraction(ca.get(x, 0), n) * Fraction(cb.get(y, 0), n) * w(idx[x], idx[y])
             for x in levels for y in levels)
    return 1 - Do / De

# -------------------------------------------------------------- bootstrap --
def boot_ci(units, stat_fn, B=2000, seed=18):
    rng = random.Random(seed)
    vals, skipped = [], 0
    for _ in range(B):
        sample = [units[rng.randrange(len(units))] for _ in units]
        try:
            vals.append(float(stat_fn(sample)))
        except ZeroDivisionError:
            skipped += 1
    vals.sort()
    lo = vals[int(0.025 * len(vals))]
    hi = vals[min(int(0.975 * len(vals)), len(vals) - 1)]
    return lo, hi, skipped, len(vals)

# -------------------------------------------------------------- hierarchy --
def icd_truncation_agreement(codes):
    """Pairwise agreement at exact / 3-char category / first-letter proxy."""
    pairs = list(itertools.combinations(codes, 2))
    exact = Fraction(sum(1 for a, b in pairs if a == b), len(pairs))
    cat = Fraction(sum(1 for a, b in pairs if a[:3] == b[:3]), len(pairs))
    chap = Fraction(sum(1 for a, b in pairs if a[0] == b[0]), len(pairs))
    return exact, cat, chap, len(pairs)

# ==================================================================== toys ==
C, G, N = "CARD", "GI", "NONE"

TOY_A = [  # 5 cases x 4 agents, one ledgered non-vote (None)
    [C, C, C, C],
    [C, C, G, C],
    [G, G, G, G],
    [N, C, N, N],
    [N, N, N, None],
]

PANEL15 = [list(s) for s in [
    "AAAA", "BBBB", "CCCC", "AAAA", "BBBB", "AAAA", "CCCC", "AAAA",
    "AAAB", "BBBA", "AAAC", "CCCB", "BBBC", "AABB", "BBCC",
]]

TOY_B_PAIRS = [(1, 1), (2, 3), (2, 2), (4, 4), (3, 2)]   # urgency 1..4, 2 raters

TOY_C_PAIRS = [("Y", "Y")] * 18 + [("Y", "N"), ("N", "Y")]  # skewed binary

TOY_E_PAIRS = ([("Y", "Y")] * 6 + [("N", "N")] * 6 +
               [("Y", "N")] * 2 + [("N", "Y")])             # n=15, kappa ~0.6

TOY_D_CODES = ["I214", "I219", "I509", "K922"]  # I21.4 I21.9 I50.9 K92.2


def main():
    print("=" * 72)
    print("TOY A: 5 cases x 4 agents, 3 categories, 1 non-vote")
    a, o, nc, n, Do, De = kripp_alpha(TOY_A, exact=True)
    print(f"  coincidence n = {n}, marginals = { {k: str(v) for k, v in nc.items()} }")
    offdiag = {f"{p[0]}|{p[1]}": str(v) for p, v in sorted(o.items()) if p[0] != p[1]}
    diag = {f"{p[0]}|{p[1]}": str(v) for p, v in sorted(o.items()) if p[0] == p[1]}
    print(f"  diagonal = {diag}")
    print(f"  offdiag  = {offdiag}")
    print(f"  Do = {Do}  De = {De}")
    print(f"  alpha (nominal, exact) = {a} = {float(a):.6f}")
    assert a == Fraction(41, 59), a
    mean_u, pooled, per = percent_agreement(TOY_A)
    print(f"  percent agreement: mean-of-cases = {mean_u} = {float(mean_u):.4f}; "
          f"pooled pairs = {pooled} = {float(pooled):.4f}")
    print(f"  per-case pairwise = {[str(p) for p in per]}")
    print(f"  n-of-n distribution = {n_of_n(TOY_A)}")
    fk = fleiss_kappa([[4, 0, 0], [3, 1, 0], [0, 4, 0], [1, 0, 3]])
    print(f"  Fleiss kappa (complete cases C1-C4 only) = {fk} = {float(fk):.6f}")
    assert fk == Fraction(47, 79), fk
    ac1 = gwet_ac1(TOY_A, [C, G, N])
    print(f"  Gwet AC1 (all 5 cases incl. non-vote case) = {ac1} = {float(ac1):.6f}")
    assert ac1 == Fraction(189, 269), ac1
    lo, hi, sk, nb = boot_ci(TOY_A, lambda u: kripp_alpha(u)[0], B=2000, seed=18)
    print(f"  alpha bootstrap 95% CI (B=2000, seed=18): [{lo:.3f}, {hi:.3f}] "
          f"(degenerate resamples skipped: {sk}/{2000})")

    print("=" * 72)
    print("TOY B: ordinal urgency, 2 raters, 5 cases (1=emergent..4=routine)")
    k, po, pe = cohen_kappa(TOY_B_PAIRS)
    kl = weighted_kappa(TOY_B_PAIRS, [1, 2, 3, 4], "linear")
    kq = weighted_kappa(TOY_B_PAIRS, [1, 2, 3, 4], "quadratic")
    print(f"  unweighted kappa = {k} = {float(k):.6f} (po={po}, pe={pe})")
    print(f"  linear-weighted  = {kl} = {float(kl):.6f}")
    print(f"  quadratic        = {kq} = {float(kq):.6f}")
    assert k == Fraction(4, 9) and kl == Fraction(9, 14) and kq == Fraction(21, 26)

    print("=" * 72)
    print("TOY C: prevalence paradox, binary escalate, 20 cases, 90% agreement")
    k, po, pe = cohen_kappa(TOY_C_PAIRS)
    units_c = [[a, b] for a, b in TOY_C_PAIRS]
    ac1 = gwet_ac1(units_c, ["Y", "N"])
    print(f"  po = {po} = {float(po):.3f}; pe = {pe} = {float(pe):.4f}")
    print(f"  Cohen kappa = {k} = {float(k):.6f}")
    print(f"  Gwet AC1    = {ac1} = {float(ac1):.6f}")
    assert k == Fraction(-1, 19) and ac1 == Fraction(161, 181)

    print("=" * 72)
    print("TOY D: ICD-10-CM hierarchy, one case, 4 agents")
    ex, cat, chap, npairs = icd_truncation_agreement(TOY_D_CODES)
    print(f"  codes = {TOY_D_CODES}; pairs = {npairs}")
    print(f"  exact = {ex}; 3-char category = {cat}; chapter(letter proxy) = {chap}")
    assert (ex, cat, chap) == (Fraction(0), Fraction(1, 6), Fraction(1, 2))

    print("=" * 72)
    print("PANEL15: plausible Saturday panel, 15 cases x 4 agents, 3 categories")
    a15 = kripp_alpha(PANEL15, exact=True)[0]
    fk15 = fleiss_kappa([[Counter(u).get(c, 0) for c in "ABC"] for u in PANEL15])
    ac115 = gwet_ac1(PANEL15, list("ABC"))
    mean_u, pooled, _ = percent_agreement(PANEL15)
    print(f"  alpha = {a15} = {float(a15):.6f}")
    print(f"  Fleiss = {fk15} = {float(fk15):.6f}")
    print(f"  AC1 = {ac115} = {float(ac115):.6f}")
    print(f"  percent agreement mean-of-cases = {float(mean_u):.4f}")
    print(f"  n-of-n = {n_of_n(PANEL15)}")
    lo, hi, sk, nb = boot_ci(PANEL15, lambda u: kripp_alpha(u)[0], B=2000, seed=18)
    print(f"  alpha bootstrap 95% CI (B=2000, seed=18): [{lo:.3f}, {hi:.3f}] "
          f"(skipped {sk})")

    print("=" * 72)
    print("TOY E: 2 raters, binary, n=15, kappa ~0.6 -> CI width at pilot n")
    k, po, pe = cohen_kappa(TOY_E_PAIRS)
    print(f"  kappa = {k} = {float(k):.6f} (po={po}, pe={pe})")
    assert k == Fraction(68, 113)
    units_e = [[a, b] for a, b in TOY_E_PAIRS]
    lo, hi, sk, nb = boot_ci(units_e, lambda u: cohen_kappa([(x[0], x[1]) for x in u])[0],
                             B=2000, seed=18)
    print(f"  kappa bootstrap 95% CI (B=2000, seed=18): [{lo:.3f}, {hi:.3f}] "
          f"(skipped {sk})")

    print("=" * 72)
    print("Hierarchical-delta alpha on TOY D x 3 replicated cases (demo)")
    def hier_delta(a, b):
        if a == b:
            return 0
        if a[:3] == b[:3]:
            return Fraction(1, 3)
        if a[0] == b[0]:
            return Fraction(2, 3)
        return 1
    units_d = [TOY_D_CODES, ["I214", "I214", "I219", "I509"], ["K922", "K922", "K922", "K250"]]
    ad = kripp_alpha(units_d, delta=hier_delta, exact=True)[0]
    an = kripp_alpha(units_d, exact=True)[0]
    print(f"  alpha nominal = {an} = {float(an):.6f}")
    print(f"  alpha hierarchical-delta = {ad} = {float(ad):.6f}")
    print("ALL ASSERTS PASSED")


if __name__ == "__main__":
    main()
