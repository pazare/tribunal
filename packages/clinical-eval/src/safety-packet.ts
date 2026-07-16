import {
  ESCALATION_ACTIONS,
  NON_VOTE_REASONS,
  type EscalationAction,
  type EscalationTuple,
  type NonVote,
  type NonVoteReason,
  type Vote,
} from "./types.js";
import { hashJson, sha256 } from "./provenance.js";
import { validateVoteResult } from "./validate.js";

export const SAFETY_PACKET_AUTHORITY = "DECISION_SUPPORT_ONLY" as const;
export const SAFETY_PACKET_LOCAL_OUTPUT_POLICY =
  "LOCAL_SCHEMA_STRUCTURED_ASSERTIONS_ONLY_NO_DEDICATED_CHAIN_OF_THOUGHT_FIELD" as const;

export const ASSERTION_POLARITIES = ["AFFIRMED", "NEGATED"] as const;
export type AssertionPolarity = (typeof ASSERTION_POLARITIES)[number];

export const ASSERTION_CERTAINTIES = [
  "CERTAIN",
  "PROBABLE",
  "POSSIBLE",
  "UNKNOWN",
] as const;
export type AssertionCertainty = (typeof ASSERTION_CERTAINTIES)[number];

export const ASSERTION_TEMPORALITIES = [
  "CURRENT",
  "HISTORICAL",
  "FUTURE_OR_HYPOTHETICAL",
  "UNKNOWN",
] as const;
export type AssertionTemporality = (typeof ASSERTION_TEMPORALITIES)[number];

export const ASSERTION_ENTAILMENT_LABELS = [
  "ENTAILED",
  "CONTRADICTED",
  "NOT_ENOUGH_INFORMATION",
] as const;
export type AssertionEntailment = (typeof ASSERTION_ENTAILMENT_LABELS)[number];

export const ASSERTION_VERIFIER_STATUSES = [
  ...ASSERTION_ENTAILMENT_LABELS,
  "UNVERIFIED",
] as const;
export type AssertionVerifierStatus =
  (typeof ASSERTION_VERIFIER_STATUSES)[number];

export const UNSUPPORTED_ASSERTION_TAXONOMY = [
  "MISSING_SUPPORT_POINTER",
  "SOURCE_OR_SPEAKER_MISMATCH",
  "EXPERIENCER_MISMATCH",
  "ASSERTION_SPAN_MISMATCH",
  "POLARITY_MISMATCH",
  "CERTAINTY_OVERSTATEMENT",
  "TEMPORALITY_MISMATCH",
  "NOT_AVAILABLE_AT_DECISION_TIME",
  "VALUE_MISMATCH",
  "UNIT_MISMATCH",
  "CONTRADICTED_BY_SOURCE",
  "COMPOSITE_CLAIM_NOT_ENTAILED",
] as const;
export type UnsupportedAssertionCode =
  (typeof UNSUPPORTED_ASSERTION_TAXONOMY)[number];

export const SAFETY_EVIDENCE_RELATIONS = [
  "SUPPORTS_ACTION",
  "OPPOSES_ACTION",
  "CONTEXT",
] as const;
export type SafetyEvidenceRelation =
  (typeof SAFETY_EVIDENCE_RELATIONS)[number];

export const SAFETY_SUMMARY_BLOCKING_REASONS = [
  "NO_QUORUM",
  "TIE",
  "NO_THREE_SEAT_AGREEMENT",
  "URGENT_ESCALATION_DISSENT_BLOCKS_NON_ESCALATION",
  "CLINICAL_ESCALATION_VETO_BLOCKS_NON_ESCALATION",
  "DO_NOT_ESCALATE_REQUIRES_UNANIMOUS_VALID_PANEL",
] as const;
export type SafetySummaryBlockingReason =
  (typeof SAFETY_SUMMARY_BLOCKING_REASONS)[number];

export interface SupportPointer {
  record_id: string;
  record_sha256: string;
  span_id: string;
  quoted_text: string;
  start_char: number;
  end_char: number;
}

export interface SafetyAssertion {
  assertion_id: string;
  claim_text: string;
  source: string;
  speaker: string;
  experiencer: string;
  polarity: AssertionPolarity;
  certainty: AssertionCertainty;
  temporality: AssertionTemporality;
  available_at_decision_time: boolean;
  value: string | number | boolean | null;
  unit: string | null;
  support_pointer: SupportPointer | null;
  model_reported_entailment: AssertionEntailment;
  verified_entailment: AssertionVerifierStatus;
  verification_id: string | null;
  verifier_id: string | null;
  verified_at: string | null;
  unsupported_taxonomy: UnsupportedAssertionCode[];
}

export interface SafetyPacketProvenance {
  case_id: string;
  case_state_sha256: string;
  run_id: string;
  protocol_version: string;
  codebook_version: string;
  ledger_head_sha256: string;
  generated_at: string;
}

export interface HumanDecisionOwner {
  principal_id: string;
  role: string;
  authority_record_id: string;
}

export interface SafetySeatProvenance {
  observation_id: string;
  session_id: string;
  prompt_sha256: string;
  input_sha256: string;
  provider: string;
  model: string;
  effort: string;
  observed_at: string;
  call_commitment_sha256: string;
}

export interface SafetyEvidenceLink {
  assertion_id: string;
  relation: SafetyEvidenceRelation;
  relation_verification_id: string | null;
}

export interface ClinicalEscalationVeto {
  activated: boolean;
  assertion_ids: string[];
}

export interface SafetySeatVote {
  seat_id: string;
  result: Vote;
  clinical_escalation_veto: ClinicalEscalationVeto;
  evidence_links: SafetyEvidenceLink[];
  provenance: SafetySeatProvenance;
}

export interface SafetySeatNonVote {
  seat_id: string;
  result: NonVote;
  provenance: SafetySeatProvenance;
}

export type SafetySeatOutcome = SafetySeatVote | SafetySeatNonVote;

export interface ClinicianSafetyPacket {
  packet_id: string;
  authority: typeof SAFETY_PACKET_AUTHORITY;
  local_output_policy: typeof SAFETY_PACKET_LOCAL_OUTPUT_POLICY;
  provenance: SafetyPacketProvenance;
  human_decision_owner: HumanDecisionOwner;
  assertions: SafetyAssertion[];
  seats: SafetySeatOutcome[];
}

export interface AuthorizedEvidenceSpan {
  span_id: string;
  start_char: number;
  end_char: number;
  speaker: string;
  experiencer: string;
  polarity: AssertionPolarity;
  certainty: AssertionCertainty;
  temporality: AssertionTemporality;
  value: string | number | boolean | null;
  unit: string | null;
}

export interface AuthorizedEvidenceRecord {
  case_id: string;
  case_state_sha256: string;
  record_id: string;
  source: string;
  canonical_text: string;
  record_sha256: string;
  available_at_decision_time: boolean;
  spans: AuthorizedEvidenceSpan[];
}

export interface AuthenticatedHumanAuthority {
  principal_id: string;
  role: string;
  authority_record_id: string;
  authenticated_at: string;
}

export interface SafetySeatCallCommitmentInput {
  seat_id: string;
  case_id: string;
  case_state_sha256: string;
  run_id: string;
  protocol_version: string;
  codebook_version: string;
  ledger_head_sha256: string;
  observation_id: string;
  session_id: string;
  prompt_sha256: string;
  input_sha256: string;
  provider: string;
  model: string;
  effort: string;
  observed_at: string;
}

export interface AuthorizedSafetySeatCall extends SafetySeatCallCommitmentInput {
  call_commitment_sha256: string;
}

export interface AuthorizedAssertionVerification {
  verification_id: string;
  case_id: string;
  case_state_sha256: string;
  assertion_id: string;
  assertion_sha256: string;
  verified_entailment: AssertionEntailment;
  verifier_id: string;
  verified_at: string;
}

export interface AuthorizedActionRelationVerification {
  relation_verification_id: string;
  case_id: string;
  case_state_sha256: string;
  run_id: string;
  assertion_id: string;
  assertion_sha256: string;
  seat_id: string;
  call_commitment_sha256: string;
  tuple_sha256: string;
  relation: Exclude<SafetyEvidenceRelation, "CONTEXT">;
  authorizes_clinical_escalation_veto: boolean;
  verifier_id: string;
  verifier_version: string;
  verified_at: string;
}

export interface ClinicianSafetyValidationContext {
  case_id: string;
  case_state_sha256: string;
  run_id: string;
  protocol_version: string;
  codebook_version: string;
  ledger_head_sha256: string;
  generated_at: string;
  evidence_records: AuthorizedEvidenceRecord[];
  authenticated_humans: AuthenticatedHumanAuthority[];
  authorized_seat_calls: AuthorizedSafetySeatCall[];
  assertion_verifications: AuthorizedAssertionVerification[];
  action_relation_verifications: AuthorizedActionRelationVerification[];
}

export type SafetyPanelRecommendation = EscalationAction | "UNDERDETERMINED";

export interface SafetyPanelSummary {
  packet_id: string;
  authority: typeof SAFETY_PACKET_AUTHORITY;
  local_output_policy: typeof SAFETY_PACKET_LOCAL_OUTPUT_POLICY;
  provenance: SafetyPacketProvenance;
  human_decision_owner: HumanDecisionOwner;
  expected_seats: 4;
  quorum_required: 3;
  valid_vote_count: number;
  quorum_met: boolean;
  action_counts: Record<EscalationAction, number>;
  action_groups: Record<EscalationAction, string[]>;
  non_vote_groups: Record<NonVoteReason, string[]>;
  three_seat_candidate: EscalationAction | null;
  panel_recommendation: SafetyPanelRecommendation;
  blocking_reasons: SafetySummaryBlockingReason[];
  urgent_escalation_seat_ids: string[];
  clinical_escalation_veto_seat_ids: string[];
  minority_against_candidate_seat_ids: string[];
  disagreement_seat_ids: string[];
  non_vote_seat_ids: string[];
  requires_human_decision: true;
  tuple_consensus_policy: "ACTION_ONLY_NO_SPECIALTY_OR_URGENCY_SYNTHESIS";
  assertions: SafetyAssertion[];
  seat_outcomes: SafetySeatOutcome[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  const missing = wanted.filter((key) => !Object.hasOwn(value, key));
  const unexpected = actual.filter((key) => !wanted.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    const details = [
      missing.length > 0 ? "missing keys: " + missing.join(", ") : "",
      unexpected.length > 0 ? "unexpected keys: " + unexpected.join(", ") : "",
    ].filter(Boolean);
    throw new Error(label + " has " + details.join("; "));
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(label + " must be a non-empty string");
  }
}

function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(label + " must be a lowercase SHA-256 hash");
  }
}

function assertTimestamp(value: unknown, label: string): asserts value is string {
  assertNonEmptyString(value, label);
  if (Number.isNaN(Date.parse(value))) throw new Error(label + " must be a parseable timestamp");
}

function assertStringArray(value: unknown, label: string, allowEmpty = true): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error(label + " must contain " + (allowEmpty ? "only " : "one or more ") + "non-empty strings");
  }
  if (new Set(value).size !== value.length) throw new Error(label + " must contain unique strings");
}

function sameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const wanted = new Set(right);
  return left.every((item) => wanted.has(item));
}

function isSafetySeatVote(seat: SafetySeatOutcome): seat is SafetySeatVote {
  return seat.result.status === "VOTE";
}

function isSafetySeatNonVote(seat: SafetySeatOutcome): seat is SafetySeatNonVote {
  return seat.result.status === "NON_VOTE";
}

export function computeSafetySeatCallCommitment(
  input: SafetySeatCallCommitmentInput,
): string {
  return hashJson({ schema: "tribunal-safety-seat-call-v1", ...input });
}

function assertionVerificationPayload(assertion: SafetyAssertion): unknown {
  return {
    schema: "tribunal-safety-assertion-v1",
    assertion_id: assertion.assertion_id,
    claim_text: assertion.claim_text,
    source: assertion.source,
    speaker: assertion.speaker,
    experiencer: assertion.experiencer,
    polarity: assertion.polarity,
    certainty: assertion.certainty,
    temporality: assertion.temporality,
    available_at_decision_time: assertion.available_at_decision_time,
    value: assertion.value,
    unit: assertion.unit,
    support_pointer: assertion.support_pointer,
  };
}

export function computeSafetyAssertionVerificationHash(assertion: SafetyAssertion): string {
  return hashJson(assertionVerificationPayload(assertion));
}

export function computeSafetyTupleHash(tuple: EscalationTuple): string {
  return hashJson({ schema: "tribunal-safety-escalation-tuple-v1", tuple });
}

function validatePacketProvenance(value: unknown): asserts value is SafetyPacketProvenance {
  if (!isRecord(value)) throw new Error("safety packet.provenance must be an object");
  assertExactKeys(
    value,
    [
      "case_id",
      "case_state_sha256",
      "run_id",
      "protocol_version",
      "codebook_version",
      "ledger_head_sha256",
      "generated_at",
    ],
    "safety packet.provenance",
  );
  for (const key of ["case_id", "run_id", "protocol_version", "codebook_version"] as const) {
    assertNonEmptyString(value[key], "safety packet.provenance." + key);
  }
  assertSha256(value.case_state_sha256, "safety packet.provenance.case_state_sha256");
  assertSha256(value.ledger_head_sha256, "safety packet.provenance.ledger_head_sha256");
  assertTimestamp(value.generated_at, "safety packet.provenance.generated_at");
}

function validateAuthorizedEvidenceContext(
  provenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
): void {
  if (context.case_id !== provenance.case_id) {
    throw new Error("authorized evidence context case_id does not match packet provenance");
  }
  if (context.case_state_sha256 !== provenance.case_state_sha256) {
    throw new Error("authorized evidence context case-state hash does not match packet provenance");
  }
  for (const key of [
    "run_id",
    "protocol_version",
    "codebook_version",
    "ledger_head_sha256",
    "generated_at",
  ] as const) {
    if (context[key] !== provenance[key]) {
      throw new Error("trusted runtime context " + key + " does not match packet provenance");
    }
  }
  assertSha256(context.ledger_head_sha256, "trusted runtime context.ledger_head_sha256");
  assertTimestamp(context.generated_at, "trusted runtime context.generated_at");
  if (!Array.isArray(context.evidence_records)) {
    throw new Error("authorized evidence records must be an array");
  }
  const recordIds = new Set<string>();
  for (const [recordIndex, record] of context.evidence_records.entries()) {
    const label = "authorized evidence record[" + recordIndex + "]";
    if (!isRecord(record)) throw new Error(label + " must be an object");
    assertExactKeys(
      record,
      [
        "case_id",
        "case_state_sha256",
        "record_id",
        "source",
        "canonical_text",
        "record_sha256",
        "available_at_decision_time",
        "spans",
      ],
      label,
    );
    for (const key of ["case_id", "record_id", "source", "canonical_text"] as const) {
      assertNonEmptyString(record[key], label + "." + key);
    }
    assertSha256(record.case_state_sha256, label + ".case_state_sha256");
    assertSha256(record.record_sha256, label + ".record_sha256");
    if (record.case_id !== provenance.case_id || record.case_state_sha256 !== provenance.case_state_sha256) {
      throw new Error(label + " is a cross-case or stale case-state splice");
    }
    if (record.record_sha256 !== sha256(record.canonical_text as string)) {
      throw new Error(label + " record hash does not match canonical_text");
    }
    if (typeof record.available_at_decision_time !== "boolean") {
      throw new Error(label + ".available_at_decision_time must be boolean");
    }
    if (recordIds.has(record.record_id as string)) throw new Error("authorized record identifiers must be unique");
    recordIds.add(record.record_id as string);
    if (!Array.isArray(record.spans) || record.spans.length === 0) {
      throw new Error(label + ".spans must be a non-empty array");
    }
    const spanIds = new Set<string>();
    for (const [spanIndex, span] of (record.spans as unknown[]).entries()) {
      const spanLabel = label + ".spans[" + spanIndex + "]";
      if (!isRecord(span)) throw new Error(spanLabel + " must be an object");
      assertExactKeys(
        span,
        [
          "span_id",
          "start_char",
          "end_char",
          "speaker",
          "experiencer",
          "polarity",
          "certainty",
          "temporality",
          "value",
          "unit",
        ],
        spanLabel,
      );
      for (const key of ["span_id", "speaker", "experiencer"] as const) {
        assertNonEmptyString(span[key], spanLabel + "." + key);
      }
      if (
        !Number.isInteger(span.start_char) ||
        !Number.isInteger(span.end_char) ||
        (span.start_char as number) < 0 ||
        (span.end_char as number) <= (span.start_char as number) ||
        (span.end_char as number) > (record.canonical_text as string).length
      ) {
        throw new Error(spanLabel + " offsets do not bound canonical_text");
      }
      if (!ASSERTION_POLARITIES.includes(span.polarity as AssertionPolarity)) {
        throw new Error(spanLabel + ".polarity is invalid");
      }
      if (!ASSERTION_CERTAINTIES.includes(span.certainty as AssertionCertainty)) {
        throw new Error(spanLabel + ".certainty is invalid");
      }
      if (!ASSERTION_TEMPORALITIES.includes(span.temporality as AssertionTemporality)) {
        throw new Error(spanLabel + ".temporality is invalid");
      }
      if (spanIds.has(span.span_id as string)) throw new Error(label + " span identifiers must be unique");
      spanIds.add(span.span_id as string);
    }
  }
}

function validateAssertionScalar(value: unknown, label: string): void {
  if (
    value !== null &&
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    throw new Error(label + " must be a string, finite number, boolean, or null");
  }
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(label + " must be finite");
  if (typeof value === "string" && value.trim() === "") throw new Error(label + " must not be empty");
}

function findAuthorizedRecord(
  context: ClinicianSafetyValidationContext,
  recordId: string,
): AuthorizedEvidenceRecord {
  const record = context.evidence_records.find((item) => item.record_id === recordId);
  if (!record) throw new Error("support pointer references a nonexistent authorized record");
  return record;
}

export function validateSafetyAssertion(
  value: unknown,
  provenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
  label = "assertion",
): asserts value is SafetyAssertion {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertExactKeys(
    value,
    [
      "assertion_id",
      "claim_text",
      "source",
      "speaker",
      "experiencer",
      "polarity",
      "certainty",
      "temporality",
      "available_at_decision_time",
      "value",
      "unit",
      "support_pointer",
      "model_reported_entailment",
      "verified_entailment",
      "verification_id",
      "verifier_id",
      "verified_at",
      "unsupported_taxonomy",
    ],
    label,
  );
  for (const key of ["assertion_id", "claim_text", "source", "speaker", "experiencer"] as const) {
    assertNonEmptyString(value[key], label + "." + key);
  }
  if (!ASSERTION_POLARITIES.includes(value.polarity as AssertionPolarity)) {
    throw new Error(label + ".polarity is invalid");
  }
  if (!ASSERTION_CERTAINTIES.includes(value.certainty as AssertionCertainty)) {
    throw new Error(label + ".certainty is invalid");
  }
  if (!ASSERTION_TEMPORALITIES.includes(value.temporality as AssertionTemporality)) {
    throw new Error(label + ".temporality is invalid");
  }
  if (typeof value.available_at_decision_time !== "boolean") {
    throw new Error(label + ".available_at_decision_time must be boolean");
  }
  validateAssertionScalar(value.value, label + ".value");
  if (value.unit !== null) {
    assertNonEmptyString(value.unit, label + ".unit");
    if (value.value === null || typeof value.value === "boolean") {
      throw new Error(label + ".unit requires a string or numeric value");
    }
  }
  if (!ASSERTION_ENTAILMENT_LABELS.includes(value.model_reported_entailment as AssertionEntailment)) {
    throw new Error(label + ".model_reported_entailment is invalid");
  }
  if (!ASSERTION_VERIFIER_STATUSES.includes(value.verified_entailment as AssertionVerifierStatus)) {
    throw new Error(label + ".verified_entailment is invalid");
  }
  if (
    !Array.isArray(value.unsupported_taxonomy) ||
    value.unsupported_taxonomy.some(
      (code) => !UNSUPPORTED_ASSERTION_TAXONOMY.includes(code as UnsupportedAssertionCode),
    )
  ) {
    throw new Error(label + ".unsupported_taxonomy contains an invalid code");
  }
  const unsupported = value.unsupported_taxonomy as UnsupportedAssertionCode[];
  if (new Set(unsupported).size !== unsupported.length) {
    throw new Error(label + ".unsupported_taxonomy must contain unique codes");
  }

  let pointer: SupportPointer | null = null;
  if (value.support_pointer !== null) {
    if (!isRecord(value.support_pointer)) throw new Error(label + ".support_pointer must be an object");
    assertExactKeys(
      value.support_pointer,
      ["record_id", "record_sha256", "span_id", "quoted_text", "start_char", "end_char"],
      label + ".support_pointer",
    );
    for (const key of ["record_id", "span_id", "quoted_text"] as const) {
      assertNonEmptyString(value.support_pointer[key], label + ".support_pointer." + key);
    }
    assertSha256(value.support_pointer.record_sha256, label + ".support_pointer.record_sha256");
    if (
      !Number.isInteger(value.support_pointer.start_char) ||
      !Number.isInteger(value.support_pointer.end_char) ||
      (value.support_pointer.start_char as number) < 0 ||
      (value.support_pointer.end_char as number) <= (value.support_pointer.start_char as number)
    ) {
      throw new Error(label + ".support_pointer offsets are invalid");
    }
    pointer = value.support_pointer as unknown as SupportPointer;
    const record = findAuthorizedRecord(context, pointer.record_id);
    if (record.case_id !== provenance.case_id || record.case_state_sha256 !== provenance.case_state_sha256) {
      throw new Error(label + " support pointer is a cross-case or stale case-state splice");
    }
    if (pointer.record_sha256 !== record.record_sha256) {
      throw new Error(label + " support pointer record hash does not match authorized record");
    }
    const span = record.spans.find((item) => item.span_id === pointer?.span_id);
    if (!span) throw new Error(label + " support pointer references a nonexistent authorized span");
    if (span.start_char !== pointer.start_char || span.end_char !== pointer.end_char) {
      throw new Error(label + " support pointer offsets do not match authorized span");
    }
    const exactText = record.canonical_text.slice(span.start_char, span.end_char);
    if (pointer.quoted_text !== exactText) {
      throw new Error(label + " support quote is not the exact authorized substring");
    }
    if (value.source !== record.source || value.speaker !== span.speaker) {
      throw new Error(label + " source or speaker does not match authorized span");
    }
    if (value.experiencer !== span.experiencer) {
      throw new Error(label + " experiencer does not match authorized span");
    }
    if (value.polarity !== span.polarity) {
      throw new Error(label + " polarity contradicts authorized span metadata");
    }
    if (value.certainty !== span.certainty) {
      throw new Error(label + " certainty does not match authorized span metadata");
    }
    if (value.temporality !== span.temporality) {
      throw new Error(label + " temporality does not match authorized span metadata");
    }
    if (!Object.is(value.value, span.value) || value.unit !== span.unit) {
      throw new Error(label + " value or unit does not match authorized span metadata");
    }
    if (value.available_at_decision_time !== record.available_at_decision_time) {
      throw new Error(label + " decision-time availability does not match authorized record");
    }
  }

  if (pointer === null && !unsupported.includes("MISSING_SUPPORT_POINTER")) {
    throw new Error(label + ": null support_pointer requires MISSING_SUPPORT_POINTER");
  }
  if (pointer !== null && unsupported.includes("MISSING_SUPPORT_POINTER")) {
    throw new Error(label + ": MISSING_SUPPORT_POINTER conflicts with a support_pointer");
  }
  if (
    value.available_at_decision_time === false &&
    !unsupported.includes("NOT_AVAILABLE_AT_DECISION_TIME")
  ) {
    throw new Error(label + ": unavailable assertions require NOT_AVAILABLE_AT_DECISION_TIME");
  }
  if (
    value.available_at_decision_time === true &&
    unsupported.includes("NOT_AVAILABLE_AT_DECISION_TIME")
  ) {
    throw new Error(label + ": NOT_AVAILABLE_AT_DECISION_TIME conflicts with availability");
  }

  if (value.verified_entailment === "UNVERIFIED") {
    if (value.verification_id !== null || value.verifier_id !== null || value.verified_at !== null) {
      throw new Error(label + ": UNVERIFIED assertions cannot claim verifier provenance");
    }
  } else {
    assertNonEmptyString(value.verification_id, label + ".verification_id");
    assertNonEmptyString(value.verifier_id, label + ".verifier_id");
    assertTimestamp(value.verified_at, label + ".verified_at");
    if (Date.parse(value.verified_at as string) > Date.parse(provenance.generated_at)) {
      throw new Error(label + " verification occurred after packet generation");
    }
    const verification = context.assertion_verifications.find(
      (item) => item.verification_id === value.verification_id,
    );
    if (!verification) throw new Error(label + " references an unauthorized verification");
    const assertion = value as unknown as SafetyAssertion;
    if (
      verification.case_id !== provenance.case_id ||
      verification.case_state_sha256 !== provenance.case_state_sha256 ||
      verification.assertion_id !== assertion.assertion_id ||
      verification.assertion_sha256 !== computeSafetyAssertionVerificationHash(assertion) ||
      verification.verified_entailment !== assertion.verified_entailment ||
      verification.verifier_id !== assertion.verifier_id ||
      verification.verified_at !== assertion.verified_at
    ) {
      throw new Error(label + " verifier record is not bound to this exact assertion and case state");
    }
  }

  if (value.verified_entailment === "ENTAILED") {
    if (pointer === null) throw new Error(label + ": verified ENTAILED requires support_pointer");
    if (unsupported.length !== 0) {
      throw new Error(label + ": verified ENTAILED requires empty unsupported_taxonomy");
    }
    if (value.available_at_decision_time !== true) {
      throw new Error(label + ": stale evidence cannot be verified ENTAILED for decision-time use");
    }
  }
  if (value.verified_entailment === "CONTRADICTED") {
    if (pointer === null || !unsupported.includes("CONTRADICTED_BY_SOURCE")) {
      throw new Error(label + ": verified CONTRADICTED requires pointer and CONTRADICTED_BY_SOURCE");
    }
  }
  if (value.verified_entailment === "NOT_ENOUGH_INFORMATION" && unsupported.length === 0) {
    throw new Error(label + ": verified NOT_ENOUGH_INFORMATION requires taxonomy codes");
  }
}

function validateSeatProvenance(
  value: unknown,
  seatId: string,
  packetProvenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
  label: string,
): asserts value is SafetySeatProvenance {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertExactKeys(
    value,
    [
      "observation_id",
      "session_id",
      "prompt_sha256",
      "input_sha256",
      "provider",
      "model",
      "effort",
      "observed_at",
      "call_commitment_sha256",
    ],
    label,
  );
  for (const key of ["observation_id", "session_id", "provider", "model", "effort"] as const) {
    assertNonEmptyString(value[key], label + "." + key);
  }
  for (const key of ["prompt_sha256", "input_sha256", "call_commitment_sha256"] as const) {
    assertSha256(value[key], label + "." + key);
  }
  assertTimestamp(value.observed_at, label + ".observed_at");
  const input: SafetySeatCallCommitmentInput = {
    seat_id: seatId,
    case_id: packetProvenance.case_id,
    case_state_sha256: packetProvenance.case_state_sha256,
    run_id: packetProvenance.run_id,
    protocol_version: packetProvenance.protocol_version,
    codebook_version: packetProvenance.codebook_version,
    ledger_head_sha256: packetProvenance.ledger_head_sha256,
    observation_id: value.observation_id as string,
    session_id: value.session_id as string,
    prompt_sha256: value.prompt_sha256 as string,
    input_sha256: value.input_sha256 as string,
    provider: value.provider as string,
    model: value.model as string,
    effort: value.effort as string,
    observed_at: value.observed_at as string,
  };
  const expectedCommitment = computeSafetySeatCallCommitment(input);
  if (value.call_commitment_sha256 !== expectedCommitment) {
    throw new Error(label + " call commitment does not bind the exact seat and call provenance");
  }
  const authorized = context.authorized_seat_calls.find(
    (item) => item.call_commitment_sha256 === expectedCommitment,
  );
  if (!authorized || hashJson(authorized) !== hashJson({ ...input, call_commitment_sha256: expectedCommitment })) {
    throw new Error(label + " call commitment is not present in trusted runtime authority context");
  }
}

export function validateSafetySeatOutcome(
  value: unknown,
  assertions: ReadonlyMap<string, SafetyAssertion>,
  packetProvenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
  label = "seat",
): asserts value is SafetySeatOutcome {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertNonEmptyString(value.seat_id, label + ".seat_id");
  if (!isRecord(value.result)) throw new Error(label + ".result must be an object");
  validateVoteResult(value.result, label + ".result");

  if (value.result.status === "NON_VOTE") {
    assertExactKeys(value, ["seat_id", "result", "provenance"], label);
    validateSeatProvenance(
      value.provenance,
      value.seat_id,
      packetProvenance,
      context,
      label + ".provenance",
    );
    return;
  }

  assertExactKeys(
    value,
    ["seat_id", "result", "clinical_escalation_veto", "evidence_links", "provenance"],
    label,
  );
  if (!isRecord(value.clinical_escalation_veto)) {
    throw new Error(label + ".clinical_escalation_veto must be an object");
  }
  assertExactKeys(
    value.clinical_escalation_veto,
    ["activated", "assertion_ids"],
    label + ".clinical_escalation_veto",
  );
  if (typeof value.clinical_escalation_veto.activated !== "boolean") {
    throw new Error(label + ".clinical_escalation_veto.activated must be boolean");
  }
  assertStringArray(
    value.clinical_escalation_veto.assertion_ids,
    label + ".clinical_escalation_veto.assertion_ids",
  );
  validateSeatProvenance(
    value.provenance,
    value.seat_id,
    packetProvenance,
    context,
    label + ".provenance",
  );
  const seatProvenance = value.provenance as unknown as SafetySeatProvenance;
  if (!Array.isArray(value.evidence_links) || value.evidence_links.length === 0) {
    throw new Error(label + ".evidence_links must be a non-empty array");
  }
  const linkIds: string[] = [];
  const supportingIds: string[] = [];
  const vetoAuthorizedSupportingIds: string[] = [];
  for (const [index, item] of value.evidence_links.entries()) {
    const linkLabel = label + ".evidence_links[" + index + "]";
    if (!isRecord(item)) throw new Error(linkLabel + " must be an object");
    assertExactKeys(
      item,
      ["assertion_id", "relation", "relation_verification_id"],
      linkLabel,
    );
    assertNonEmptyString(item.assertion_id, linkLabel + ".assertion_id");
    if (!SAFETY_EVIDENCE_RELATIONS.includes(item.relation as SafetyEvidenceRelation)) {
      throw new Error(linkLabel + ".relation is invalid");
    }
    if (linkIds.includes(item.assertion_id)) {
      throw new Error(label + ".evidence_links assertion identifiers must be unique");
    }
    linkIds.push(item.assertion_id);
    const assertion = assertions.get(item.assertion_id);
    if (!assertion) throw new Error(label + " references unknown assertion " + item.assertion_id);
    if (item.relation === "CONTEXT") {
      if (item.relation_verification_id !== null) {
        throw new Error(linkLabel + ": CONTEXT cannot claim action-relation verification");
      }
    } else {
      assertNonEmptyString(
        item.relation_verification_id,
        linkLabel + ".relation_verification_id",
      );
      const verification = context.action_relation_verifications.find(
        (candidate) => candidate.relation_verification_id === item.relation_verification_id,
      );
      if (!verification) {
        throw new Error(linkLabel + " references an unauthorized action-relation verification");
      }
      if (
        verification.case_id !== packetProvenance.case_id ||
        verification.case_state_sha256 !== packetProvenance.case_state_sha256 ||
        verification.run_id !== packetProvenance.run_id ||
        verification.assertion_id !== assertion.assertion_id ||
        verification.assertion_sha256 !== computeSafetyAssertionVerificationHash(assertion) ||
        verification.seat_id !== value.seat_id ||
        verification.call_commitment_sha256 !== seatProvenance.call_commitment_sha256 ||
        verification.tuple_sha256 !== computeSafetyTupleHash(value.result.tuple) ||
        verification.relation !== item.relation
      ) {
        throw new Error(
          linkLabel + " action-relation verification is not bound to this exact case, assertion, seat, call, tuple, and relation",
        );
      }
      if (Date.parse(verification.verified_at) > Date.parse(packetProvenance.generated_at)) {
        throw new Error(linkLabel + " action-relation verification occurred after packet generation");
      }
      if (
        item.relation === "SUPPORTS_ACTION" &&
        verification.authorizes_clinical_escalation_veto
      ) {
        vetoAuthorizedSupportingIds.push(item.assertion_id);
      }
      if (assertion.verified_entailment !== "ENTAILED" || !assertion.available_at_decision_time) {
        throw new Error(
          label + " " + item.relation + " requires verified ENTAILED decision-time evidence",
        );
      }
    }
    if (item.relation === "SUPPORTS_ACTION") {
      supportingIds.push(item.assertion_id);
    }
  }
  if (supportingIds.length === 0) {
    throw new Error(label + " requires at least one SUPPORTS_ACTION assertion");
  }
  if (!sameStringSet(value.result.evidenceRefs, linkIds)) {
    throw new Error(label + ".result.evidenceRefs must exactly match evidence_links assertion identifiers");
  }
  const veto = value.clinical_escalation_veto as unknown as ClinicalEscalationVeto;
  if (veto.activated) {
    if (value.result.tuple.action !== "ESCALATE") {
      throw new Error(label + " clinical escalation veto must accompany an ESCALATE vote");
    }
    if (veto.assertion_ids.length === 0) {
      throw new Error(label + " activated clinical escalation veto requires evidence assertions");
    }
    if (veto.assertion_ids.some((id) => !supportingIds.includes(id))) {
      throw new Error(label + " clinical escalation veto assertions must be SUPPORTS_ACTION evidence");
    }
    if (veto.assertion_ids.some((id) => !vetoAuthorizedSupportingIds.includes(id))) {
      throw new Error(
        label + " clinical escalation veto assertion is not authorized by trusted veto policy verification",
      );
    }
  } else if (veto.assertion_ids.length !== 0) {
    throw new Error(label + " inactive clinical escalation veto cannot carry assertion identifiers");
  }
}

function validateRuntimeAuthorityContext(context: ClinicianSafetyValidationContext): void {
  if (!isRecord(context)) throw new Error("safety validation context must be an object");
  for (const key of [
    "authenticated_humans",
    "authorized_seat_calls",
    "assertion_verifications",
    "action_relation_verifications",
  ] as const) {
    if (!Array.isArray(context[key])) throw new Error("safety validation context." + key + " must be an array");
  }
  const humanKeys = context.authenticated_humans.map(
    (item) => item.principal_id + "\u0000" + item.authority_record_id,
  );
  if (new Set(humanKeys).size !== humanKeys.length) {
    throw new Error("authenticated human authority records must be unique");
  }
  for (const [index, human] of context.authenticated_humans.entries()) {
    for (const key of ["principal_id", "role", "authority_record_id"] as const) {
      assertNonEmptyString(human[key], "authenticated_humans[" + index + "]." + key);
    }
    assertTimestamp(human.authenticated_at, "authenticated_humans[" + index + "].authenticated_at");
  }
  const callCommitments = context.authorized_seat_calls.map((item) => item.call_commitment_sha256);
  if (new Set(callCommitments).size !== callCommitments.length) {
    throw new Error("authorized seat call commitments must be unique");
  }
  const verificationIds = context.assertion_verifications.map((item) => item.verification_id);
  if (new Set(verificationIds).size !== verificationIds.length) {
    throw new Error("authorized assertion verification identifiers must be unique");
  }
  const relationVerificationIds = context.action_relation_verifications.map(
    (item) => item.relation_verification_id,
  );
  if (new Set(relationVerificationIds).size !== relationVerificationIds.length) {
    throw new Error("authorized action-relation verification identifiers must be unique");
  }
  for (const [index, verification] of context.action_relation_verifications.entries()) {
    const label = "action_relation_verifications[" + index + "]";
    if (!isRecord(verification)) throw new Error(label + " must be an object");
    assertExactKeys(
      verification,
      [
        "relation_verification_id",
        "case_id",
        "case_state_sha256",
        "run_id",
        "assertion_id",
        "assertion_sha256",
        "seat_id",
        "call_commitment_sha256",
        "tuple_sha256",
        "relation",
        "authorizes_clinical_escalation_veto",
        "verifier_id",
        "verifier_version",
        "verified_at",
      ],
      label,
    );
    for (const key of [
      "relation_verification_id",
      "case_id",
      "run_id",
      "assertion_id",
      "seat_id",
      "verifier_id",
      "verifier_version",
    ] as const) {
      assertNonEmptyString(verification[key], label + "." + key);
    }
    for (const key of [
      "case_state_sha256",
      "assertion_sha256",
      "call_commitment_sha256",
      "tuple_sha256",
    ] as const) {
      assertSha256(verification[key], label + "." + key);
    }
    if (verification.relation !== "SUPPORTS_ACTION" && verification.relation !== "OPPOSES_ACTION") {
      throw new Error(label + ".relation must be SUPPORTS_ACTION or OPPOSES_ACTION");
    }
    if (typeof verification.authorizes_clinical_escalation_veto !== "boolean") {
      throw new Error(label + ".authorizes_clinical_escalation_veto must be boolean");
    }
    if (
      verification.relation !== "SUPPORTS_ACTION" &&
      verification.authorizes_clinical_escalation_veto
    ) {
      throw new Error(
        label + ": only SUPPORTS_ACTION can authorize a clinical escalation veto",
      );
    }
    assertTimestamp(verification.verified_at, label + ".verified_at");
  }
}

export function validateClinicianSafetyPacket(
  value: unknown,
  context: ClinicianSafetyValidationContext,
): asserts value is ClinicianSafetyPacket {
  validateRuntimeAuthorityContext(context);
  if (!isRecord(value)) throw new Error("safety packet must be an object");
  assertExactKeys(
    value,
    [
      "packet_id",
      "authority",
      "local_output_policy",
      "provenance",
      "human_decision_owner",
      "assertions",
      "seats",
    ],
    "safety packet",
  );
  assertNonEmptyString(value.packet_id, "safety packet.packet_id");
  if (value.authority !== SAFETY_PACKET_AUTHORITY) {
    throw new Error("safety packet.authority must be DECISION_SUPPORT_ONLY");
  }
  if (value.local_output_policy !== SAFETY_PACKET_LOCAL_OUTPUT_POLICY) {
    throw new Error("safety packet.local_output_policy must declare the locally enforced output schema");
  }
  validatePacketProvenance(value.provenance);
  const provenance = value.provenance as SafetyPacketProvenance;
  validateAuthorizedEvidenceContext(provenance, context);

  if (!isRecord(value.human_decision_owner)) {
    throw new Error("safety packet.human_decision_owner must be an object");
  }
  assertExactKeys(
    value.human_decision_owner,
    ["principal_id", "role", "authority_record_id"],
    "safety packet.human_decision_owner",
  );
  for (const key of ["principal_id", "role", "authority_record_id"] as const) {
    assertNonEmptyString(
      value.human_decision_owner[key],
      "safety packet.human_decision_owner." + key,
    );
  }
  const owner = value.human_decision_owner as unknown as HumanDecisionOwner;
  const authenticatedOwner = context.authenticated_humans.find(
    (item) =>
      item.principal_id === owner.principal_id &&
      item.role === owner.role &&
      item.authority_record_id === owner.authority_record_id,
  );
  if (!authenticatedOwner) {
    throw new Error("human decision owner is not present in trusted authenticated runtime authority context");
  }
  if (Date.parse(authenticatedOwner.authenticated_at) > Date.parse(provenance.generated_at)) {
    throw new Error("human decision owner authority was authenticated after packet generation");
  }

  if (!Array.isArray(value.assertions) || value.assertions.length === 0) {
    throw new Error("safety packet.assertions must be a non-empty array");
  }
  const assertionIds = new Set<string>();
  const assertionMap = new Map<string, SafetyAssertion>();
  value.assertions.forEach((assertion, index) => {
    validateSafetyAssertion(
      assertion,
      provenance,
      context,
      "safety packet.assertions[" + index + "]",
    );
    if (assertionIds.has(assertion.assertion_id)) {
      throw new Error("safety packet assertion identifiers must be unique");
    }
    assertionIds.add(assertion.assertion_id);
    assertionMap.set(assertion.assertion_id, assertion);
  });

  if (!Array.isArray(value.seats) || value.seats.length !== 4) {
    throw new Error("safety packet.seats must contain exactly four outcomes");
  }
  value.seats.forEach((seat, index) =>
    validateSafetySeatOutcome(
      seat,
      assertionMap,
      provenance,
      context,
      "safety packet.seats[" + index + "]",
    ),
  );
  const seats = value.seats as SafetySeatOutcome[];
  for (const [label, items] of [
    ["seat identifiers", seats.map((seat) => seat.seat_id)],
    ["observation identifiers", seats.map((seat) => seat.provenance.observation_id)],
    ["session identifiers", seats.map((seat) => seat.provenance.session_id)],
    ["call commitments", seats.map((seat) => seat.provenance.call_commitment_sha256)],
  ] as const) {
    if (new Set(items).size !== items.length) {
      throw new Error("safety packet " + label + " must be unique; duplicated-call relabeling is forbidden");
    }
  }
  const generatedAt = Date.parse(provenance.generated_at);
  if (seats.some((seat) => Date.parse(seat.provenance.observed_at) > generatedAt)) {
    throw new Error("safety packet generated_at precedes a seat observation");
  }
}

function clonePacketValue<T>(value: T): T {
  return structuredClone(value);
}

export function summarizeClinicianSafetyPacket(
  packet: ClinicianSafetyPacket,
  context: ClinicianSafetyValidationContext,
): SafetyPanelSummary {
  validateClinicianSafetyPacket(packet, context);
  const votes = packet.seats.filter(isSafetySeatVote);
  const nonVotes = packet.seats.filter(isSafetySeatNonVote);
  const actionGroups: Record<EscalationAction, string[]> = {
    ESCALATE: [],
    DO_NOT_ESCALATE: [],
    INSUFFICIENT_EVIDENCE: [],
  };
  for (const vote of votes) actionGroups[vote.result.tuple.action].push(vote.seat_id);
  const actionCounts: Record<EscalationAction, number> = {
    ESCALATE: actionGroups.ESCALATE.length,
    DO_NOT_ESCALATE: actionGroups.DO_NOT_ESCALATE.length,
    INSUFFICIENT_EVIDENCE: actionGroups.INSUFFICIENT_EVIDENCE.length,
  };
  const nonVoteGroups = Object.fromEntries(
    NON_VOTE_REASONS.map((reason) => [reason, [] as string[]]),
  ) as Record<NonVoteReason, string[]>;
  for (const nonVote of nonVotes) nonVoteGroups[nonVote.result.reason].push(nonVote.seat_id);
  const threeSeatCandidate =
    ESCALATION_ACTIONS.find((action) => actionCounts[action] >= 3) ?? null;
  const urgentEscalationSeatIds = votes
    .filter(
      (vote) =>
        vote.result.tuple.action === "ESCALATE" &&
        (vote.result.tuple.urgency === "U0_IMMEDIATE" ||
          vote.result.tuple.urgency === "U1_WITHIN_HOURS"),
    )
    .map((vote) => vote.seat_id);
  const clinicalVetoSeatIds = votes
    .filter((vote) => vote.clinical_escalation_veto.activated)
    .map((vote) => vote.seat_id);
  const blockingReasons: SafetySummaryBlockingReason[] = [];

  if (votes.length < 3) blockingReasons.push("NO_QUORUM");
  if (votes.length >= 3 && threeSeatCandidate === null) {
    const populatedCounts = Object.values(actionCounts)
      .filter((count) => count > 0)
      .sort((left, right) => right - left);
    if (populatedCounts.length >= 2 && populatedCounts[0] === populatedCounts[1]) {
      blockingReasons.push("TIE");
    } else {
      blockingReasons.push("NO_THREE_SEAT_AGREEMENT");
    }
  }
  if (
    threeSeatCandidate !== null &&
    threeSeatCandidate !== "ESCALATE" &&
    urgentEscalationSeatIds.length > 0
  ) {
    blockingReasons.push("URGENT_ESCALATION_DISSENT_BLOCKS_NON_ESCALATION");
  }
  if (
    threeSeatCandidate !== null &&
    threeSeatCandidate !== "ESCALATE" &&
    clinicalVetoSeatIds.length > 0
  ) {
    blockingReasons.push("CLINICAL_ESCALATION_VETO_BLOCKS_NON_ESCALATION");
  }
  if (
    threeSeatCandidate === "DO_NOT_ESCALATE" &&
    (votes.length !== 4 || actionCounts.DO_NOT_ESCALATE !== 4)
  ) {
    blockingReasons.push("DO_NOT_ESCALATE_REQUIRES_UNANIMOUS_VALID_PANEL");
  }

  const panelRecommendation: SafetyPanelRecommendation =
    votes.length >= 3 && threeSeatCandidate !== null && blockingReasons.length === 0
      ? threeSeatCandidate
      : "UNDERDETERMINED";
  const populatedActionGroups = Object.values(actionGroups).filter((group) => group.length > 0);
  const disagreementSeatIds =
    populatedActionGroups.length <= 1 ? [] : votes.map((vote) => vote.seat_id);

  return {
    packet_id: packet.packet_id,
    authority: packet.authority,
    local_output_policy: packet.local_output_policy,
    provenance: clonePacketValue(packet.provenance),
    human_decision_owner: clonePacketValue(packet.human_decision_owner),
    expected_seats: 4,
    quorum_required: 3,
    valid_vote_count: votes.length,
    quorum_met: votes.length >= 3,
    action_counts: actionCounts,
    action_groups: clonePacketValue(actionGroups),
    non_vote_groups: clonePacketValue(nonVoteGroups),
    three_seat_candidate: threeSeatCandidate,
    panel_recommendation: panelRecommendation,
    blocking_reasons: blockingReasons,
    urgent_escalation_seat_ids: urgentEscalationSeatIds,
    clinical_escalation_veto_seat_ids: clinicalVetoSeatIds,
    minority_against_candidate_seat_ids:
      threeSeatCandidate === null
        ? []
        : votes
          .filter((vote) => vote.result.tuple.action !== threeSeatCandidate)
          .map((vote) => vote.seat_id),
    disagreement_seat_ids: disagreementSeatIds,
    non_vote_seat_ids: nonVotes.map((seat) => seat.seat_id),
    requires_human_decision: true,
    tuple_consensus_policy: "ACTION_ONLY_NO_SPECIALTY_OR_URGENCY_SYNTHESIS",
    assertions: clonePacketValue(packet.assertions),
    seat_outcomes: clonePacketValue(packet.seats),
  };
}
