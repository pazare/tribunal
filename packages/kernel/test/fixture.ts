import type { Pack } from "../src/engine.js";

/**
 * A self-contained fixture pack used by kernel tests and the offline demo. It is
 * a realistic (but synthetic) lending adverse-action case with a deliberately
 * planted trap: the draft reason relies on a debt-to-income ratio that does not
 * reconcile with the documented income, and omits the specific principal reason
 * that ECOA/Reg B require. A good panel should catch both.
 */
export const LENDING_FIXTURE: Pack = {
  id: "lending-fixture",
  title: "Loan #4471 — adverse action review",
  domain: "lending",
  question:
    "Should the lender deny this application, and if so, what specific principal reason must the adverse-action notice state?",
  constraints: [
    {
      id: "c_ecoa",
      kind: "regulation",
      text: "An adverse-action notice must state the specific principal reason(s) for denial; generic statements are non-compliant.",
      cite: "ECOA 15 U.S.C. §1691(d); Reg B 12 CFR §1002.9",
    },
    {
      id: "c_fairlend",
      kind: "regulation",
      text: "The decision must not rely on a prohibited basis or a proxy for one.",
      cite: "Reg B 12 CFR §1002.6",
    },
  ],
  evidence: [
    {
      id: "e_income",
      source: "verified_income",
      citation: "paystub bundle p.2",
      summary: "Verified gross monthly income is $7,200 (annual $86,400).",
      quality: 0.95,
    },
    {
      id: "e_debt",
      source: "credit_report",
      citation: "tradelines p.4",
      summary: "Total documented monthly debt obligations are $2,050.",
      quality: 0.9,
    },
    {
      id: "e_dti_draft",
      source: "underwriting_draft",
      citation: "worksheet cell D12",
      summary: "Draft worksheet states DTI = 52% and recommends denial for 'excessive DTI'.",
      quality: 0.4,
      contradicts: ["e_income", "e_debt"],
    },
    {
      id: "e_score",
      source: "credit_report",
      citation: "summary p.1",
      summary: "Credit score 690; two late payments in the last 24 months.",
      quality: 0.9,
    },
  ],
  documents: [
    {
      id: "d_policy",
      title: "Lending policy excerpt",
      body: "Applications with a debt-to-income ratio at or above 45% are declined absent compensating factors. The principal reason on any denial must be specific and accurate.",
    },
    {
      id: "d_draft",
      title: "Draft denial letter",
      body: "We regret to inform you that your application has been denied due to excessive debt-to-income ratio (52%).",
    },
  ],
  slots: [
    {
      index: 0,
      label: "the disposition",
      instruction:
        "Decide the disposition. Note that DTI = total monthly debt / gross monthly income. Check whether the draft's 52% reconciles with the documented income and debt before adopting it.",
      riskBands: { factual: "high", legal: "high", fairness: "medium" },
      candidatesHint: [
        "Deny for excessive debt-to-income ratio (52%).",
        "Deny, but state the accurate principal reason after re-computing DTI.",
        "Do not deny on the stated ground; the DTI figure does not reconcile with the record.",
      ],
    },
    {
      index: 1,
      label: "the principal-reason disclosure",
      instruction:
        "State the specific principal reason for the affected person, compliant with Reg B, or STOP if no denial is warranted.",
      riskBands: { legal: "high", user_impact: "high" },
      candidatesHint: [
        "Principal reason: recomputed DTI is 28% ($2,050/$7,200); denial on 'excessive DTI' is not supported.",
        "Principal reason: recent delinquencies (two late payments in 24 months) and credit score 690.",
        "<STOP>",
      ],
    },
  ],
};
