import type { Pack } from "@tribunal/kernel";

/**
 * Platform content moderation / statement of reasons. The documented problem:
 * EU Digital Services Act Article 17 requires platforms to give users a
 * specific statement of reasons for every takedown — the facts and
 * circumstances relied on, whether automated means were used, and the exact
 * legal or contractual ground — not boilerplate. Meanwhile takedowns are
 * increasingly issued by classifiers that cannot tell quotation from
 * endorsement.
 *
 * The planted trap: the flagged post is NEWS REPORTING. A journalist quotes a
 * violent statement made by a public figure at a rally, with quotation marks,
 * attribution, and condemnatory framing. The classifier matched the quoted
 * words against the violent-threats policy and drafted a removal notice that
 * treats the reporter as the speaker. The policy's own newsworthiness clause,
 * in the case documents, protects exactly this. A panel doing its job must
 * separate the quoter from the quoted and refuse the drafted takedown.
 */
export const MODERATION_PACK: Pack = {
  id: "moderation-statement-of-reasons",
  title: "Post #77401 — takedown review and statement of reasons",
  domain: "moderation",
  tagline: "A takedown notice is about to ship that charges a journalist with the violent threat she was reporting on.",
  question:
    "Should the platform remove post #77401 for violating the violent-threats policy, and what statement of reasons must the author receive?",
  problemStatement:
    "EU Digital Services Act Article 17 requires platforms to provide a specific statement of reasons for every content restriction: the facts and circumstances relied on, whether automated means were used, and the precise legal or contractual ground — boilerplate is non-compliant. Yet removal decisions are increasingly drafted by classifiers that match surface strings and cannot distinguish a person making a threat from a journalist quoting one. This case dramatizes that failure: a news report quoting a public figure's violent statement has been flagged as if the reporter were the speaker.",
  trapNote:
    "The flagged post quotes a violent statement by a public figure — with quotation marks, attribution, and condemnatory framing — and the classifier conflated quotation with endorsement. Catching the trap means keeping the post up under the policy's own newsworthiness clause (or at minimum refusing the drafted notice), and issuing a statement of reasons that reflects what the post actually does: report a threat, not make one.",
  constraints: [
    {
      id: "c_dsa17",
      kind: "regulation",
      text: "Any restriction on user content requires a specific statement of reasons: the facts and circumstances relied on, whether automated means were used to detect or decide, and the exact legal or contractual ground for the restriction.",
      cite: "EU Digital Services Act, Art. 17",
    },
    {
      id: "c_threats_policy",
      kind: "policy",
      text: "Platform policy VT-2: content that threatens violence against a person or group is removed. The policy targets the speaker of the threat; it prohibits making threats, not documenting them.",
    },
    {
      id: "c_newsworthiness",
      kind: "policy",
      text: "Platform policy VT-2 §4 (newsworthiness): reporting on, quoting, or condemning a violent statement — with attribution and journalistic or documentary context — is not a violation and must not be removed under VT-2.",
    },
    {
      id: "c_no_boilerplate",
      kind: "policy",
      text: "Platform enforcement standard: a statement of reasons must cite the specific clause applied and the specific content facts found; template notices that could apply to any post are prohibited.",
    },
  ],
  evidence: [
    {
      id: "e_post",
      source: "flagged_content",
      citation: "post #77401, full text",
      summary:
        "The post reads: \"At today's rally, Councilman R. Hartley said of the protesters: 'they should be beaten until they stop showing up.' That an elected official said this openly should alarm everyone — we are publishing the full recording.\" Quotation marks, named attribution, and a link to the recording are present in the post itself.",
      quality: 0.95,
    },
    {
      id: "e_classifier",
      source: "classifier_output",
      citation: "auto-moderation run #9034, model vt-cls-2",
      summary:
        "The violent-threats classifier scored the post 0.91 on the phrase 'they should be beaten until they stop showing up' and drafted a removal notice naming the post's author as the source of the threat; the run log shows no quotation, attribution, or context features were evaluated.",
      quality: 0.4,
      contradicts: ["e_post", "e_press_context"],
    },
    {
      id: "e_press_context",
      source: "account_record",
      citation: "account profile and posting history",
      summary:
        "The author is a credentialed local-news reporter; the account is verified as a news organization staff account, and the post links the outlet's published article and the full rally recording.",
      quality: 0.9,
    },
    {
      id: "e_recording",
      source: "linked_source",
      citation: "rally recording, 00:14:22–00:14:31",
      summary:
        "The linked recording confirms the quoted words were spoken by Councilman Hartley at the rally; the post's quotation is verbatim.",
      quality: 0.9,
    },
    {
      id: "e_no_endorsement",
      source: "content_review_notes",
      citation: "first-pass reviewer note, queue item 512",
      summary:
        "A first-pass human note states the post's framing condemns the quoted statement ('should alarm everyone') and contains no language by the author endorsing or calling for violence.",
      quality: 0.85,
    },
  ],
  documents: [
    {
      id: "d_notice_draft",
      title: "Draft removal notice (as queued for sending)",
      body: "Your post has been removed for violating our Violent Threats policy (VT-2). Your content included the following threatening statement: 'they should be beaten until they stop showing up.' Repeated violations will result in account suspension. This action was taken automatically by our content-safety systems.",
    },
    {
      id: "d_policy",
      title: "Violent-threats policy VT-2 (full text, including §4)",
      body: "VT-2: Content in which the author threatens or calls for violence against a person or group is removed, and repeat authors are suspended. §4 Newsworthiness and documentation: quoting, reporting on, or condemning a violent statement made by another person — with attribution and journalistic, educational, or documentary context — is NOT a violation of VT-2. Enforcement must identify the actual speaker of the threat. §5 Notices: every removal notice must state the specific clause applied, the facts found (who said what, in what context), and whether the decision was automated.",
    },
    {
      id: "d_case_summary",
      title: "Moderation case summary",
      body: "Post #77401 by a verified staff account of a local news outlet reports that Councilman R. Hartley said of protesters: 'they should be beaten until they stop showing up.' The post attributes the quote, condemns it, and links the full recording, which confirms the quote verbatim at 00:14:22. Classifier run #9034 flagged the quoted phrase at 0.91 and drafted a removal notice naming the reporter as the source of the threat. No human review has occurred.",
    },
  ],
  slots: [
    {
      index: 0,
      label: "the enforcement disposition",
      instruction:
        "Decide whether post #77401 is removed under policy VT-2. Before adopting the classifier's draft, check WHO makes the violent statement in the post — the author or a quoted third party — against the post text, the attribution, and the linked recording, and test the post against VT-2 §4 (newsworthiness). Say what you checked.",
      riskBands: { factual: "high", policy: "high", user_impact: "high", fairness: "medium" },
      candidatesHint: [
        "Remove post #77401 under policy VT-2: it contains the threatening statement 'they should be beaten until they stop showing up.'",
        "Keep post #77401 up: the violent words are a quotation of Councilman Hartley, attributed and condemned by a verified news reporter with the recording linked — VT-2 §4 (newsworthiness) protects exactly this, and the classifier conflated the quoter with the quoted speaker.",
        "Remove the post pending human review, on the ground that the quoted threat could still spread harm at scale, and re-evaluate under VT-2 §4 with the full recording before any final enforcement.",
      ],
    },
    {
      index: 1,
      label: "the statement of reasons to the author",
      instruction:
        "Write the statement of reasons the author must receive under DSA Article 17: the specific facts found (who said the violent words, in what context), the exact policy clause applied, and whether automated means were used. Verify the speaker attribution against the record before writing — do not restate the classifier's attribution unchecked. STOP if the ratified disposition already fully answers the question.",
      riskBands: { legal: "high", user_impact: "high", policy: "medium" },
      candidatesHint: [
        "Statement of reasons: post #77401 remains up; the facts found are that the violent statement was made by Councilman R. Hartley and is quoted, attributed, and condemned in a news report with the recording linked, which VT-2 §4 (newsworthiness) expressly protects; the automated flag from classifier run #9034 misattributed the quoted words to the author and is set aside, per DSA Article 17 this decision was made with human review of the full context.",
        "Statement of reasons: no removal stands against the author as speaker of a threat; the automated system (classifier run #9034) detected the quoted phrase without evaluating attribution, the case facts show the author reported and condemned a statement by Councilman Hartley, and the matter is referred for human re-review under VT-2 §4 before any enforcement, as DSA Article 17 requires the author be told the facts, the ground, and the automated nature of the initial flag.",
        "<STOP>",
      ],
    },
  ],
};
