import {
  ESCALATION_ACTIONS,
  EXPERIMENT_CONDITIONS,
  NON_VOTE_REASONS,
  type EscalationAction,
  type EscalationTuple,
  type ExperimentCondition,
  type NonVote,
  type NonVoteReason,
  type Vote,
} from "./types.js";
import { hashJson } from "./provenance.js";
import { validateVoteResult } from "./validate.js";

export const SAFETY_PACKET_AUTHORITY = "DECISION_SUPPORT_ONLY" as const;
export const SAFETY_PACKET_LOCAL_OUTPUT_POLICY =
  "LOCAL_SCHEMA_STRUCTURED_ASSERTIONS_ONLY_NO_DEDICATED_CHAIN_OF_THOUGHT_FIELD" as const;
export const SAFETY_AUTHORITY_TRUST_BOUNDARY =
  "TRUSTED_ISSUER_RECEIPT_AND_HASH_VALIDATION_ONLY_NO_SIGNATURE_OR_EXTERNAL_AUTHENTICATION_CLAIM" as const;
export const SAFETY_VALIDATION_TRUST_BOUNDARY =
  "TRUSTED_RUNTIME_CONTEXT_RECEIPTS_REGISTRY_AND_HASH_BINDING_ONLY_NO_SIGNATURE_EXTERNAL_AUTHENTICATION_SEMANTIC_TRUTH_OR_EXTERNAL_TIMESTAMP_CLAIM" as const;
export const SAFETY_ASSERTION_REJECTION_BOUNDARY =
  "ATTRIBUTE_MISMATCHED_OR_MALFORMED_ASSERTIONS_ARE_REJECTED_VALIDATION_INPUTS_NOT_ACCEPTED_PACKET_TAXONOMY_ENTRIES" as const;

export const CLINICAL_ROLE_CODES = [
  "ATTENDING_PHYSICIAN",
  "LICENSED_PHYSICIAN",
  "ADVANCED_PRACTICE_CLINICIAN",
] as const;
export type ClinicalRoleCode = (typeof CLINICAL_ROLE_CODES)[number];

export const AUTHORITY_ASSURANCE_LEVELS = [
  "ISSUER_ASSERTED",
  "ISSUER_REPORTED_IDENTITY_PROOFED",
] as const;
export type AuthorityAssuranceLevel =
  (typeof AUTHORITY_ASSURANCE_LEVELS)[number];

export const VERIFICATION_PURPOSES = [
  "ASSERTION_ENTAILMENT",
  "ACTION_RELATION",
] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

export const SAFETY_CHANGE_BASES = [
  "NO_CHANGE",
  "UNATTRIBUTED_RECONSIDERATION",
  "NEW_EVIDENCE",
  "UNSUPPORTED_CUE",
  "MIXED",
] as const;
export type SafetyChangeBasis = (typeof SAFETY_CHANGE_BASES)[number];

export const SAFETY_UNSUPPORTED_CUE_CODES = [
  "PEER_CONCLUSION",
  "CONSENSUS_CUE",
  "EXPERT_AUTHORITY_CUE",
  "SOCIAL_PRESSURE",
  "OTHER_UNSUPPORTED_CUE",
] as const;
export type SafetyUnsupportedCueCode =
  (typeof SAFETY_UNSUPPORTED_CUE_CODES)[number];

export const SAFETY_E2_EXPOSURE_CONDITIONS = EXPERIMENT_CONDITIONS;
export type SafetyExposureCondition = ExperimentCondition;

export const DECISION_SUPPORT_ACTIONS = [
  "REVIEW_ESCALATION_RECOMMENDATION",
  "RECORD_HUMAN_ESCALATION_DECISION",
] as const;
export type DecisionSupportAction = (typeof DECISION_SUPPORT_ACTIONS)[number];

export const SAFETY_OUTCOME_CHANGED_FIELDS = [
  "STATUS",
  "ACTION",
  "SPECIALTIES",
  "URGENCY",
  "MISSING_EVIDENCE",
  "CONFIDENCE",
  "EVIDENCE_REFS",
  "CONCISE_RATIONALE",
  "NON_VOTE_REASON",
] as const;
export type SafetyOutcomeChangedField =
  (typeof SAFETY_OUTCOME_CHANGED_FIELDS)[number];

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
  "NOT_AVAILABLE_AT_DECISION_TIME",
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
  verifier_operator_id: string | null;
  verifier_failure_domain_id: string | null;
  verifier_method: string | null;
  verifier_version: string | null;
  verified_at: string | null;
  generation_provenance: AssertionGenerationProvenance;
  unsupported_taxonomy: UnsupportedAssertionCode[];
}

export interface AssertionGenerationProvenance {
  generator_id: string;
  operator_id: string;
  failure_domain_id: string;
  method: string;
  version: string;
  generation_call_sha256: string;
}

export interface SafetyPacketProvenance {
  case_id: string;
  case_state_sha256: string;
  decision_cutoff_at: string;
  run_id: string;
  protocol_version: string;
  codebook_version: string;
  ledger_head_sha256: string;
  generated_at: string;
}

export interface HumanDecisionOwner {
  principal_id: string;
  clinical_role_code: ClinicalRoleCode;
  authority_receipt_id: string;
  authority_receipt_sha256: string;
  decision_authorization_at: string;
  decision_support_action: DecisionSupportAction;
}

export interface SafetySeatProvenance {
  phase: "BLIND" | "REVISED";
  assignment_id: string;
  action_generator_id: string;
  action_generator_operator_id: string;
  action_generator_failure_domain_id: string;
  observation_id: string;
  session_id: string;
  prompt_sha256: string;
  input_sha256: string;
  provider: string;
  model: string;
  effort: string;
  observed_at: string;
  provider_call_receipt_sha256: string;
  output_sha256: string;
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
  blind_result: Vote | NonVote;
  blind_provenance: SafetySeatProvenance;
  result: Vote;
  revision_audit: SafetyRevisionAudit;
  exposure: SafetyExposureDescriptor;
  clinical_escalation_veto: ClinicalEscalationVeto;
  evidence_links: SafetyEvidenceLink[];
  provenance: SafetySeatProvenance;
}

export interface SafetySeatNonVote {
  seat_id: string;
  blind_result: Vote | NonVote;
  blind_provenance: SafetySeatProvenance;
  result: NonVote;
  revision_audit: SafetyRevisionAudit;
  exposure: SafetyExposureDescriptor;
  provenance: SafetySeatProvenance;
}

export type SafetySeatOutcome = SafetySeatVote | SafetySeatNonVote;

export interface ClinicianSafetyPacket {
  packet_id: string;
  authority: typeof SAFETY_PACKET_AUTHORITY;
  authority_trust_boundary: typeof SAFETY_AUTHORITY_TRUST_BOUNDARY;
  validation_trust_boundary: typeof SAFETY_VALIDATION_TRUST_BOUNDARY;
  assertion_rejection_boundary: typeof SAFETY_ASSERTION_REJECTION_BOUNDARY;
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
  record_id: string;
  source: string;
  canonical_text: string;
  record_sha256: string;
  source_created_at: string;
  ingested_at: string;
  authorized_at: string;
  authorization_expires_at: string | null;
  authorization_revoked_at: string | null;
  spans: AuthorizedEvidenceSpan[];
}

export interface HumanAuthorityReceiptPayload {
  authority_receipt_id: string;
  issuer_id: string;
  principal_id: string;
  principal_type: "HUMAN";
  clinical_role_code: ClinicalRoleCode;
  case_id: string;
  run_id: string;
  issued_at: string;
  valid_from: string;
  valid_until: string;
  revoked_at: string | null;
  assurance_level: AuthorityAssuranceLevel;
  permitted_action_scope: DecisionSupportAction[];
}

export interface HumanAuthorityReceipt extends HumanAuthorityReceiptPayload {
  authority_receipt_sha256: string;
}

export interface AuthorizedVerifier {
  verifier_id: string;
  operator_id: string;
  failure_domain_id: string;
  method: string;
  version: string;
  purposes: VerificationPurpose[];
}

export interface SafetySeatCallCommitmentInput {
  seat_id: string;
  phase: "BLIND" | "REVISED";
  assignment_id: string;
  action_generator_id: string;
  action_generator_operator_id: string;
  action_generator_failure_domain_id: string;
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
  provider_call_receipt_sha256: string;
  output_sha256: string;
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
  verifier_operator_id: string;
  verifier_failure_domain_id: string;
  verifier_method: string;
  verifier_version: string;
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
  verifier_operator_id: string;
  verifier_failure_domain_id: string;
  verifier_method: string;
  verifier_version: string;
  verified_at: string;
}

export interface SafetyChangeCertificate {
  change_basis: SafetyChangeBasis;
  changed_fields: SafetyOutcomeChangedField[];
  attributed_unsupported_cue_codes: SafetyUnsupportedCueCode[];
}

export interface SafetyExposureEvidenceItem {
  assertion_id: string;
  evidence_class: "VALID_EVIDENCE" | "IRRELEVANT_EVIDENCE";
  presented_text: string;
}

export interface SafetyExposureUnsupportedCueItem {
  cue_code: SafetyUnsupportedCueCode;
  presented_text: string;
  claimed_action: EscalationAction | null;
  claimed_count: number | null;
  claimed_panel_size: number | null;
  rationale_or_evidence_shown: boolean | null;
}

export interface SafetyExposureContentManifest {
  null_update: boolean;
  evidence_items: SafetyExposureEvidenceItem[];
  unsupported_cue_items: SafetyExposureUnsupportedCueItem[];
}

export interface SafetyExposureDescriptorPayload {
  exposure_id: string;
  seat_id: string;
  assignment_id: string;
  case_id: string;
  case_state_sha256: string;
  run_id: string;
  condition: SafetyExposureCondition;
  content_manifest: SafetyExposureContentManifest;
  canonical_content_sha256: string;
  revised_prompt_sha256: string;
  revised_input_sha256: string;
  input_binding_sha256: string;
  exposed_at: string;
}

export interface SafetyExposureDescriptor extends SafetyExposureDescriptorPayload {
  exposure_sha256: string;
}

export interface SafetyRevisionAuditPayload {
  seat_id: string;
  case_id: string;
  case_state_sha256: string;
  run_id: string;
  blind_result_sha256: string;
  revised_result_sha256: string;
  blind_call_commitment_sha256: string;
  revised_call_commitment_sha256: string;
  blind_observed_at: string;
  exposure_at: string;
  revised_observed_at: string;
  exposure_id: string;
  exposure_sha256: string;
  new_evidence_used_ids: string[];
  change_certificate: SafetyChangeCertificate;
}

export interface SafetyRevisionAudit extends SafetyRevisionAuditPayload {
  revision_commitment_sha256: string;
}

export type AuthorizedSafetyRevision = SafetyRevisionAudit;
export type AuthorizedSafetyExposure = SafetyExposureDescriptor;

export interface ClinicianSafetyValidationContext {
  case_id: string;
  case_state_sha256: string;
  decision_cutoff_at: string;
  decision_authorization_at: string;
  run_id: string;
  protocol_version: string;
  codebook_version: string;
  ledger_head_sha256: string;
  generated_at: string;
  evidence_records: AuthorizedEvidenceRecord[];
  trusted_authority_issuer_ids: string[];
  human_authority_receipts: HumanAuthorityReceipt[];
  authorized_verifiers: AuthorizedVerifier[];
  authorized_seat_calls: AuthorizedSafetySeatCall[];
  authorized_exposures: AuthorizedSafetyExposure[];
  authorized_revisions: AuthorizedSafetyRevision[];
  assertion_verifications: AuthorizedAssertionVerification[];
  action_relation_verifications: AuthorizedActionRelationVerification[];
}

export type SafetyPanelRecommendation = EscalationAction | "UNDERDETERMINED";

export interface SafetyPanelSummary {
  packet_id: string;
  authority: typeof SAFETY_PACKET_AUTHORITY;
  authority_trust_boundary: typeof SAFETY_AUTHORITY_TRUST_BOUNDARY;
  validation_trust_boundary: typeof SAFETY_VALIDATION_TRUST_BOUNDARY;
  assertion_rejection_boundary: typeof SAFETY_ASSERTION_REJECTION_BOUNDARY;
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

function normalizedEvidenceSpans(
  spans: readonly AuthorizedEvidenceSpan[],
): AuthorizedEvidenceSpan[] {
  return [...spans]
    .map((span) => ({ ...span }))
    .sort((left, right) =>
      left.start_char - right.start_char ||
      left.end_char - right.end_char ||
      (left.span_id < right.span_id ? -1 : left.span_id > right.span_id ? 1 : 0),
    );
}

export function computeAuthorizedEvidenceRecordCommitment(
  record: AuthorizedEvidenceRecord,
): string {
  return hashJson({
    schema: "tribunal-authorized-evidence-record-v2",
    case_id: record.case_id,
    record_id: record.record_id,
    source: record.source,
    canonical_text: record.canonical_text,
    source_created_at: record.source_created_at,
    ingested_at: record.ingested_at,
    authorized_at: record.authorized_at,
    authorization_expires_at: record.authorization_expires_at,
    authorization_revoked_at: record.authorization_revoked_at,
    spans: normalizedEvidenceSpans(record.spans),
  });
}

export function computeSafetyCaseStateCommitment(
  caseId: string,
  decisionCutoffAt: string,
  records: readonly AuthorizedEvidenceRecord[],
): string {
  return hashJson({
    schema: "tribunal-safety-case-state-v2",
    case_id: caseId,
    decision_cutoff_at: decisionCutoffAt,
    record_commitments: records
      .map((record) => computeAuthorizedEvidenceRecordCommitment(record))
      .sort(),
  });
}

export function deriveEvidenceAvailabilityAtDecision(
  record: AuthorizedEvidenceRecord,
  decisionCutoffAt: string,
): boolean {
  return deriveEvidenceAvailabilityAt(record, decisionCutoffAt);
}

export function deriveEvidenceAvailabilityAt(
  record: AuthorizedEvidenceRecord,
  timestamp: string,
): boolean {
  const cutoff = Date.parse(timestamp);
  const availableBy = [
    record.source_created_at,
    record.ingested_at,
    record.authorized_at,
  ].every((timestamp) => Date.parse(timestamp) <= cutoff);
  const notExpired =
    record.authorization_expires_at === null ||
    Date.parse(record.authorization_expires_at) > cutoff;
  const notRevoked =
    record.authorization_revoked_at === null ||
    Date.parse(record.authorization_revoked_at) > cutoff;
  return availableBy && notExpired && notRevoked;
}

export function computeHumanAuthorityReceiptHash(
  payload: HumanAuthorityReceiptPayload,
): string {
  return hashJson({ schema: "tribunal-human-authority-receipt-v1", ...payload });
}

export function computeSafetyExposureHash(
  payload: SafetyExposureDescriptorPayload,
): string {
  return hashJson({ schema: "tribunal-safety-exposure-v1", ...payload });
}

export function computeSafetyExposureContentHash(
  manifest: SafetyExposureContentManifest,
): string {
  return hashJson({ schema: "tribunal-safety-exposure-content-v1", manifest });
}

export function computeSafetyExposureInputBindingHash(
  canonicalContentSha256: string,
  revisedPromptSha256: string,
  revisedInputSha256: string,
): string {
  return hashJson({
    schema: "tribunal-safety-exposure-input-binding-v1",
    canonical_content_sha256: canonicalContentSha256,
    revised_prompt_sha256: revisedPromptSha256,
    revised_input_sha256: revisedInputSha256,
  });
}

export function computeSafetyResultHash(result: Vote | NonVote): string {
  return hashJson({ schema: "tribunal-safety-seat-outcome-v1", result });
}

export function computeSafetyRevisionCommitment(
  payload: SafetyRevisionAuditPayload,
): string {
  return hashJson({ schema: "tribunal-safety-revision-audit-v1", ...payload });
}

function changedOutcomeFields(
  blind: Vote | NonVote,
  revised: Vote | NonVote,
): SafetyOutcomeChangedField[] {
  const fields: SafetyOutcomeChangedField[] = [];
  if (blind.status !== revised.status) fields.push("STATUS");
  if (blind.status === "NON_VOTE" || revised.status === "NON_VOTE") {
    const blindReason = blind.status === "NON_VOTE" ? blind.reason : null;
    const revisedReason = revised.status === "NON_VOTE" ? revised.reason : null;
    if (blindReason !== revisedReason) fields.push("NON_VOTE_REASON");
    if (blind.status !== revised.status) {
      fields.push(
        "ACTION",
        "SPECIALTIES",
        "URGENCY",
        "MISSING_EVIDENCE",
        "CONFIDENCE",
        "EVIDENCE_REFS",
        "CONCISE_RATIONALE",
      );
    }
    return fields;
  }
  if (blind.tuple.action !== revised.tuple.action) fields.push("ACTION");
  if (!sameStringSet(blind.tuple.specialties, revised.tuple.specialties)) {
    fields.push("SPECIALTIES");
  }
  if (blind.tuple.urgency !== revised.tuple.urgency) fields.push("URGENCY");
  if (!sameStringSet(blind.tuple.missingEvidence, revised.tuple.missingEvidence)) {
    fields.push("MISSING_EVIDENCE");
  }
  if (blind.confidence !== revised.confidence) fields.push("CONFIDENCE");
  if (!sameStringSet(blind.evidenceRefs, revised.evidenceRefs)) fields.push("EVIDENCE_REFS");
  if (blind.conciseRationale !== revised.conciseRationale) fields.push("CONCISE_RATIONALE");
  return fields;
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
    generation_provenance: assertion.generation_provenance,
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
      "decision_cutoff_at",
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
  assertTimestamp(value.decision_cutoff_at, "safety packet.provenance.decision_cutoff_at");
  assertTimestamp(value.generated_at, "safety packet.provenance.generated_at");
  if (Date.parse(value.decision_cutoff_at) > Date.parse(value.generated_at)) {
    throw new Error("safety packet decision cutoff cannot follow packet generation");
  }
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
    "decision_cutoff_at",
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
  assertTimestamp(
    context.decision_authorization_at,
    "safety validation context.decision_authorization_at",
  );
  if (Date.parse(context.decision_authorization_at) < Date.parse(context.generated_at)) {
    throw new Error(
      "decision authorization time cannot precede packet generation",
    );
  }
  assertSha256(context.ledger_head_sha256, "trusted runtime context.ledger_head_sha256");
  assertTimestamp(context.decision_cutoff_at, "trusted runtime context.decision_cutoff_at");
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
        "record_id",
        "source",
        "canonical_text",
        "record_sha256",
        "source_created_at",
        "ingested_at",
        "authorized_at",
        "authorization_expires_at",
        "authorization_revoked_at",
        "spans",
      ],
      label,
    );
    for (const key of ["case_id", "record_id", "source", "canonical_text"] as const) {
      assertNonEmptyString(record[key], label + "." + key);
    }
    assertSha256(record.record_sha256, label + ".record_sha256");
    if (record.case_id !== provenance.case_id) {
      throw new Error(label + " is a cross-case splice");
    }
    for (const key of ["source_created_at", "ingested_at", "authorized_at"] as const) {
      assertTimestamp(record[key], label + "." + key);
    }
    for (const key of ["authorization_expires_at", "authorization_revoked_at"] as const) {
      if (record[key] !== null) assertTimestamp(record[key], label + "." + key);
    }
    if (
      Date.parse(record.source_created_at as string) > Date.parse(record.ingested_at as string) ||
      Date.parse(record.ingested_at as string) > Date.parse(record.authorized_at as string)
    ) {
      throw new Error(label + " source, ingestion, and authorization timestamps are out of order");
    }
    if (
      record.authorization_expires_at !== null &&
      Date.parse(record.authorization_expires_at as string) <= Date.parse(record.authorized_at as string)
    ) {
      throw new Error(label + " authorization must expire after it begins");
    }
    if (
      record.authorization_revoked_at !== null &&
      Date.parse(record.authorization_revoked_at as string) < Date.parse(record.authorized_at as string)
    ) {
      throw new Error(label + " authorization cannot be revoked before it begins");
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
      validateAssertionScalar(span.value, spanLabel + ".value");
      if (span.unit !== null) {
        assertNonEmptyString(span.unit, spanLabel + ".unit");
        if (span.value === null || typeof span.value === "boolean") {
          throw new Error(spanLabel + ".unit requires a string or numeric value");
        }
      }
      if (spanIds.has(span.span_id as string)) throw new Error(label + " span identifiers must be unique");
      spanIds.add(span.span_id as string);
    }
    const typedRecord = record as unknown as AuthorizedEvidenceRecord;
    if (typedRecord.record_sha256 !== computeAuthorizedEvidenceRecordCommitment(typedRecord)) {
      throw new Error(
        label + " record commitment does not bind complete normalized metadata, text, and spans",
      );
    }
  }
  const expectedCaseState = computeSafetyCaseStateCommitment(
    provenance.case_id,
    provenance.decision_cutoff_at,
    context.evidence_records,
  );
  if (expectedCaseState !== provenance.case_state_sha256) {
    throw new Error(
      "case-state commitment does not match sorted evidence-record commitments and trusted decision cutoff",
    );
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

function assertionAvailableAt(
  assertion: SafetyAssertion,
  context: ClinicianSafetyValidationContext,
  timestamp: string,
): boolean {
  if (assertion.support_pointer === null) return false;
  const record = context.evidence_records.find(
    (item) => item.record_id === assertion.support_pointer?.record_id,
  );
  return record !== undefined && deriveEvidenceAvailabilityAt(record, timestamp);
}

function validateAssertionGenerationProvenance(
  value: unknown,
  label: string,
): asserts value is AssertionGenerationProvenance {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertExactKeys(
    value,
    [
      "generator_id",
      "operator_id",
      "failure_domain_id",
      "method",
      "version",
      "generation_call_sha256",
    ],
    label,
  );
  for (const key of [
    "generator_id",
    "operator_id",
    "failure_domain_id",
    "method",
    "version",
  ] as const) {
    assertNonEmptyString(value[key], label + "." + key);
  }
  assertSha256(value.generation_call_sha256, label + ".generation_call_sha256");
}

function assertAuthorizedVerifier(
  context: ClinicianSafetyValidationContext,
  verifierId: string,
  verifierOperatorId: string,
  verifierFailureDomainId: string,
  method: string,
  version: string,
  purpose: VerificationPurpose,
  generators: ReadonlyArray<{
    generator_id: string;
    operator_id: string;
    failure_domain_id: string;
  }>,
  label: string,
): void {
  if (
    generators.some(
      (generator) =>
        generator.generator_id === verifierId ||
        generator.operator_id === verifierOperatorId ||
        generator.failure_domain_id === verifierFailureDomainId,
    )
  ) {
    throw new Error(
      label + " verifier identity, operator, and failure domain must be distinct from generator provenance",
    );
  }
  const authorized = context.authorized_verifiers.find(
    (candidate) =>
      candidate.verifier_id === verifierId &&
      candidate.operator_id === verifierOperatorId &&
      candidate.failure_domain_id === verifierFailureDomainId &&
      candidate.method === method &&
      candidate.version === version &&
      candidate.purposes.includes(purpose),
  );
  if (!authorized) {
    throw new Error(
      label + " verifier identity, method, version, and purpose are not authorized",
    );
  }
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
      "verifier_operator_id",
      "verifier_failure_domain_id",
      "verifier_method",
      "verifier_version",
      "verified_at",
      "generation_provenance",
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
  validateAssertionGenerationProvenance(
    value.generation_provenance,
    label + ".generation_provenance",
  );
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
    if (record.case_id !== provenance.case_id) {
      throw new Error(label + " support pointer is a cross-case splice");
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
    const derivedAvailability = deriveEvidenceAvailabilityAtDecision(
      record,
      provenance.decision_cutoff_at,
    );
    if (value.available_at_decision_time !== derivedAvailability) {
      throw new Error(
        label + " decision-time availability does not match source, ingestion, authorization, expiry, revocation, and cutoff timestamps",
      );
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
    if (
      value.verification_id !== null ||
      value.verifier_id !== null ||
      value.verifier_operator_id !== null ||
      value.verifier_failure_domain_id !== null ||
      value.verifier_method !== null ||
      value.verifier_version !== null ||
      value.verified_at !== null
    ) {
      throw new Error(label + ": UNVERIFIED assertions cannot claim verifier provenance");
    }
  } else {
    assertNonEmptyString(value.verification_id, label + ".verification_id");
    assertNonEmptyString(value.verifier_id, label + ".verifier_id");
    assertNonEmptyString(value.verifier_operator_id, label + ".verifier_operator_id");
    assertNonEmptyString(
      value.verifier_failure_domain_id,
      label + ".verifier_failure_domain_id",
    );
    assertNonEmptyString(value.verifier_method, label + ".verifier_method");
    assertNonEmptyString(value.verifier_version, label + ".verifier_version");
    assertTimestamp(value.verified_at, label + ".verified_at");
    if (Date.parse(value.verified_at as string) > Date.parse(provenance.generated_at)) {
      throw new Error(label + " verification occurred after packet generation");
    }
    const verification = context.assertion_verifications.find(
      (item) => item.verification_id === value.verification_id,
    );
    if (!verification) throw new Error(label + " references an unauthorized verification");
    const assertion = value as unknown as SafetyAssertion;
    assertAuthorizedVerifier(
      context,
      assertion.verifier_id as string,
      assertion.verifier_operator_id as string,
      assertion.verifier_failure_domain_id as string,
      assertion.verifier_method as string,
      assertion.verifier_version as string,
      "ASSERTION_ENTAILMENT",
      [assertion.generation_provenance],
      label,
    );
    if (
      verification.case_id !== provenance.case_id ||
      verification.case_state_sha256 !== provenance.case_state_sha256 ||
      verification.assertion_id !== assertion.assertion_id ||
      verification.assertion_sha256 !== computeSafetyAssertionVerificationHash(assertion) ||
      verification.verified_entailment !== assertion.verified_entailment ||
      verification.verifier_id !== assertion.verifier_id ||
      verification.verifier_operator_id !== assertion.verifier_operator_id ||
      verification.verifier_failure_domain_id !== assertion.verifier_failure_domain_id ||
      verification.verifier_method !== assertion.verifier_method ||
      verification.verifier_version !== assertion.verifier_version ||
      verification.verified_at !== assertion.verified_at
    ) {
      throw new Error(label + " verifier record is not bound to this exact assertion and case state");
    }
  }

  if (value.verified_entailment === "ENTAILED") {
    if (pointer === null) throw new Error(label + ": verified ENTAILED requires support_pointer");
    if (
      unsupported.some((code) => code !== "NOT_AVAILABLE_AT_DECISION_TIME")
    ) {
      throw new Error(
        label + ": verified ENTAILED permits only decision-time availability taxonomy",
      );
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
  expectedPhase: "BLIND" | "REVISED",
  packetProvenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
  label: string,
): asserts value is SafetySeatProvenance {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertExactKeys(
    value,
    [
      "phase",
      "assignment_id",
      "action_generator_id",
      "action_generator_operator_id",
      "action_generator_failure_domain_id",
      "observation_id",
      "session_id",
      "prompt_sha256",
      "input_sha256",
      "provider",
      "model",
      "effort",
      "observed_at",
      "provider_call_receipt_sha256",
      "output_sha256",
      "call_commitment_sha256",
    ],
    label,
  );
  if (value.phase !== expectedPhase) {
    throw new Error(label + ".phase must be " + expectedPhase);
  }
  for (const key of [
    "assignment_id",
    "action_generator_id",
    "action_generator_operator_id",
    "action_generator_failure_domain_id",
    "observation_id",
    "session_id",
    "provider",
    "model",
    "effort",
  ] as const) {
    assertNonEmptyString(value[key], label + "." + key);
  }
  for (const key of [
    "prompt_sha256",
    "input_sha256",
    "provider_call_receipt_sha256",
    "output_sha256",
    "call_commitment_sha256",
  ] as const) {
    assertSha256(value[key], label + "." + key);
  }
  assertTimestamp(value.observed_at, label + ".observed_at");
  const input: SafetySeatCallCommitmentInput = {
    seat_id: seatId,
    phase: expectedPhase,
    assignment_id: value.assignment_id as string,
    action_generator_id: value.action_generator_id as string,
    action_generator_operator_id: value.action_generator_operator_id as string,
    action_generator_failure_domain_id:
      value.action_generator_failure_domain_id as string,
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
    provider_call_receipt_sha256: value.provider_call_receipt_sha256 as string,
    output_sha256: value.output_sha256 as string,
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

function validateSafetyRevisionAudit(
  value: unknown,
  seatId: string,
  blindResult: Vote | NonVote,
  revisedResult: Vote | NonVote,
  assertions: ReadonlyMap<string, SafetyAssertion>,
  packetProvenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
  blindProvenance: SafetySeatProvenance,
  revisedProvenance: SafetySeatProvenance,
  exposure: SafetyExposureDescriptor,
  label: string,
): asserts value is SafetyRevisionAudit {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertExactKeys(
    value,
    [
      "seat_id",
      "case_id",
      "case_state_sha256",
      "run_id",
      "blind_result_sha256",
      "revised_result_sha256",
      "blind_call_commitment_sha256",
      "revised_call_commitment_sha256",
      "blind_observed_at",
      "exposure_at",
      "revised_observed_at",
      "exposure_id",
      "exposure_sha256",
      "new_evidence_used_ids",
      "change_certificate",
      "revision_commitment_sha256",
    ],
    label,
  );
  for (const key of ["seat_id", "case_id", "run_id", "exposure_id"] as const) {
    assertNonEmptyString(value[key], label + "." + key);
  }
  for (const key of [
    "case_state_sha256",
    "blind_result_sha256",
    "revised_result_sha256",
    "blind_call_commitment_sha256",
    "revised_call_commitment_sha256",
    "exposure_sha256",
    "revision_commitment_sha256",
  ] as const) {
    assertSha256(value[key], label + "." + key);
  }
  for (const key of ["blind_observed_at", "exposure_at", "revised_observed_at"] as const) {
    assertTimestamp(value[key], label + "." + key);
  }
  if (
    value.seat_id !== seatId ||
    value.case_id !== packetProvenance.case_id ||
    value.case_state_sha256 !== packetProvenance.case_state_sha256 ||
    value.run_id !== packetProvenance.run_id
  ) {
    throw new Error(label + " is not bound to this exact seat, case state, and run");
  }
  if (
    value.exposure_id !== exposure.exposure_id ||
    value.exposure_sha256 !== exposure.exposure_sha256 ||
    value.exposure_at !== exposure.exposed_at
  ) {
    throw new Error(label + " does not bind the exact authorized exposure descriptor");
  }
  if (value.blind_result_sha256 !== computeSafetyResultHash(blindResult)) {
    throw new Error(label + " blind result hash does not bind the preserved blind outcome");
  }
  if (value.revised_result_sha256 !== computeSafetyResultHash(revisedResult)) {
    throw new Error(label + " revised result hash does not bind the preserved revised outcome");
  }
  if (
    value.blind_call_commitment_sha256 !== blindProvenance.call_commitment_sha256 ||
    value.revised_call_commitment_sha256 !== revisedProvenance.call_commitment_sha256
  ) {
    throw new Error(label + " does not bind the exact blind and revised call commitments");
  }
  const blindTime = Date.parse(value.blind_observed_at as string);
  const exposureTime = Date.parse(value.exposure_at as string);
  const revisedTime = Date.parse(value.revised_observed_at as string);
  if (blindTime > exposureTime || exposureTime > revisedTime) {
    throw new Error(label + " must order blind observation, exposure, and revision timestamps");
  }
  if (
    value.blind_observed_at !== blindProvenance.observed_at ||
    value.revised_observed_at !== revisedProvenance.observed_at ||
    revisedTime > Date.parse(packetProvenance.generated_at)
  ) {
    throw new Error(label + " revised observation must match call provenance and precede packet generation");
  }
  assertStringArray(value.new_evidence_used_ids, label + ".new_evidence_used_ids");
  const newEvidenceIds = value.new_evidence_used_ids as string[];
  if (newEvidenceIds.some((id) => !assertions.has(id))) {
    throw new Error(label + ".new_evidence_used_ids must reference packet assertions");
  }
  const blindRefs = blindResult.status === "VOTE" ? blindResult.evidenceRefs : [];
  const revisedRefs = revisedResult.status === "VOTE" ? revisedResult.evidenceRefs : [];
  for (const id of [...blindRefs, ...revisedRefs]) {
    if (!assertions.has(id)) {
      throw new Error(label + " blind and revised evidence references must exist in packet assertions");
    }
  }
  if (blindRefs.some((id) => !assertionAvailableAt(
    assertions.get(id) as SafetyAssertion,
    context,
    blindProvenance.observed_at,
  ))) {
    throw new Error(label + " blind outcome uses evidence unavailable at blind observation");
  }
  if (revisedRefs.some((id) => !assertionAvailableAt(
    assertions.get(id) as SafetyAssertion,
    context,
    exposure.exposed_at,
  ))) {
    throw new Error(label + " revised outcome uses evidence unavailable at exposure");
  }
  const expectedNewEvidenceIds = revisedRefs.filter((id) => !blindRefs.includes(id));
  if (!sameStringSet(newEvidenceIds, expectedNewEvidenceIds)) {
    throw new Error(label + ".new_evidence_used_ids must equal revised minus blind evidence references");
  }
  const exposedEvidenceIds = exposure.content_manifest.evidence_items.map(
    (item) => item.assertion_id,
  );
  if (newEvidenceIds.some((id) => !exposedEvidenceIds.includes(id))) {
    throw new Error(label + " cannot use new evidence absent from the exposure descriptor");
  }
  if (!isRecord(value.change_certificate)) {
    throw new Error(label + ".change_certificate must be an object");
  }
  assertExactKeys(
    value.change_certificate,
    ["change_basis", "changed_fields", "attributed_unsupported_cue_codes"],
    label + ".change_certificate",
  );
  if (!SAFETY_CHANGE_BASES.includes(value.change_certificate.change_basis as SafetyChangeBasis)) {
    throw new Error(label + ".change_certificate.change_basis is invalid");
  }
  if (
    !Array.isArray(value.change_certificate.changed_fields) ||
    value.change_certificate.changed_fields.some(
      (field) => !SAFETY_OUTCOME_CHANGED_FIELDS.includes(field as SafetyOutcomeChangedField),
    )
  ) {
    throw new Error(label + ".change_certificate.changed_fields is invalid");
  }
  if (
    !Array.isArray(value.change_certificate.attributed_unsupported_cue_codes) ||
    value.change_certificate.attributed_unsupported_cue_codes.some(
      (code) => !SAFETY_UNSUPPORTED_CUE_CODES.includes(code as SafetyUnsupportedCueCode),
    )
  ) {
    throw new Error(label + ".change_certificate.attributed_unsupported_cue_codes is invalid");
  }
  const certificate = value.change_certificate as unknown as SafetyChangeCertificate;
  assertStringArray(certificate.changed_fields, label + ".change_certificate.changed_fields");
  assertStringArray(
    certificate.attributed_unsupported_cue_codes,
    label + ".change_certificate.attributed_unsupported_cue_codes",
  );
  const expectedChangedFields = changedOutcomeFields(blindResult, revisedResult);
  if (!sameStringSet(certificate.changed_fields, expectedChangedFields)) {
    throw new Error(label + " typed change certificate does not match blind-to-revised changes");
  }
  const hasChange = expectedChangedFields.length > 0;
  const hasNewEvidence = newEvidenceIds.length > 0;
  const hasUnsupportedCue = certificate.attributed_unsupported_cue_codes.length > 0;
  const exposedCueCodes = exposure.content_manifest.unsupported_cue_items.map(
    (item) => item.cue_code,
  );
  if (
    certificate.attributed_unsupported_cue_codes.some(
      (code) => !exposedCueCodes.includes(code),
    )
  ) {
    throw new Error(label + " cannot attribute an unsupported cue absent from exposure");
  }
  if (
    (certificate.change_basis === "NO_CHANGE" && (hasChange || hasNewEvidence || hasUnsupportedCue)) ||
    (certificate.change_basis === "UNATTRIBUTED_RECONSIDERATION" &&
      (!hasChange || hasNewEvidence || hasUnsupportedCue)) ||
    (certificate.change_basis !== "NO_CHANGE" && !hasChange) ||
    (certificate.change_basis === "NEW_EVIDENCE" && (!hasNewEvidence || hasUnsupportedCue)) ||
    (certificate.change_basis === "UNSUPPORTED_CUE" && (hasNewEvidence || !hasUnsupportedCue)) ||
    (certificate.change_basis === "MIXED" && (!hasNewEvidence || !hasUnsupportedCue))
  ) {
    throw new Error(label + " change basis conflicts with changed fields, new evidence, or unsupported cues");
  }
  const audit = value as unknown as SafetyRevisionAudit;
  const payload: SafetyRevisionAuditPayload = {
    seat_id: audit.seat_id,
    case_id: audit.case_id,
    case_state_sha256: audit.case_state_sha256,
    run_id: audit.run_id,
    blind_result_sha256: audit.blind_result_sha256,
    revised_result_sha256: audit.revised_result_sha256,
    blind_call_commitment_sha256: audit.blind_call_commitment_sha256,
    revised_call_commitment_sha256: audit.revised_call_commitment_sha256,
    blind_observed_at: audit.blind_observed_at,
    exposure_at: audit.exposure_at,
    revised_observed_at: audit.revised_observed_at,
    exposure_id: audit.exposure_id,
    exposure_sha256: audit.exposure_sha256,
    new_evidence_used_ids: audit.new_evidence_used_ids,
    change_certificate: audit.change_certificate,
  };
  const expectedCommitment = computeSafetyRevisionCommitment(payload);
  if (audit.revision_commitment_sha256 !== expectedCommitment) {
    throw new Error(label + " revision commitment does not bind the complete blind/revised audit");
  }
  const authorized = context.authorized_revisions.find(
    (candidate) => candidate.revision_commitment_sha256 === expectedCommitment,
  );
  if (!authorized || hashJson(authorized) !== hashJson(audit)) {
    throw new Error(label + " is not present in trusted runtime revision receipts");
  }
}

function validateSafetyExposureDescriptor(
  value: unknown,
  seatId: string,
  assertions: ReadonlyMap<string, SafetyAssertion>,
  packetProvenance: SafetyPacketProvenance,
  context: ClinicianSafetyValidationContext,
  revisedProvenance: SafetySeatProvenance,
  label: string,
): asserts value is SafetyExposureDescriptor {
  if (!isRecord(value)) throw new Error(label + " must be an object");
  assertExactKeys(
    value,
    [
      "exposure_id",
      "seat_id",
      "assignment_id",
      "case_id",
      "case_state_sha256",
      "run_id",
      "condition",
      "content_manifest",
      "canonical_content_sha256",
      "revised_prompt_sha256",
      "revised_input_sha256",
      "input_binding_sha256",
      "exposed_at",
      "exposure_sha256",
    ],
    label,
  );
  for (const key of [
    "exposure_id",
    "seat_id",
    "assignment_id",
    "case_id",
    "run_id",
  ] as const) {
    assertNonEmptyString(value[key], label + "." + key);
  }
  for (const key of [
    "case_state_sha256",
    "canonical_content_sha256",
    "revised_prompt_sha256",
    "revised_input_sha256",
    "input_binding_sha256",
    "exposure_sha256",
  ] as const) {
    assertSha256(value[key], label + "." + key);
  }
  assertTimestamp(value.exposed_at, label + ".exposed_at");
  if (
    value.seat_id !== seatId ||
    value.assignment_id !== revisedProvenance.assignment_id ||
    value.case_id !== packetProvenance.case_id ||
    value.case_state_sha256 !== packetProvenance.case_state_sha256 ||
    value.run_id !== packetProvenance.run_id
  ) {
    throw new Error(label + " is not bound to this exact seat, assignment, case state, and run");
  }
  if (!EXPERIMENT_CONDITIONS.includes(value.condition as ExperimentCondition)) {
    throw new Error(label + ".condition is invalid");
  }
  if (
    value.revised_prompt_sha256 !== revisedProvenance.prompt_sha256 ||
    value.revised_input_sha256 !== revisedProvenance.input_sha256
  ) {
    throw new Error(label + " prompt/input binding does not match revised call commitment");
  }
  if (!isRecord(value.content_manifest)) {
    throw new Error(label + ".content_manifest must be an object");
  }
  assertExactKeys(
    value.content_manifest,
    ["null_update", "evidence_items", "unsupported_cue_items"],
    label + ".content_manifest",
  );
  if (typeof value.content_manifest.null_update !== "boolean") {
    throw new Error(label + ".content_manifest.null_update must be boolean");
  }
  if (!Array.isArray(value.content_manifest.evidence_items)) {
    throw new Error(label + ".content_manifest.evidence_items must be an array");
  }
  if (!Array.isArray(value.content_manifest.unsupported_cue_items)) {
    throw new Error(label + ".content_manifest.unsupported_cue_items must be an array");
  }
  const evidenceItems = value.content_manifest.evidence_items as unknown[];
  const evidenceIds: string[] = [];
  for (const [index, item] of evidenceItems.entries()) {
    const itemLabel = label + ".content_manifest.evidence_items[" + index + "]";
    if (!isRecord(item)) throw new Error(itemLabel + " must be an object");
    assertExactKeys(
      item,
      ["assertion_id", "evidence_class", "presented_text"],
      itemLabel,
    );
    assertNonEmptyString(item.assertion_id, itemLabel + ".assertion_id");
    assertNonEmptyString(item.presented_text, itemLabel + ".presented_text");
    if (item.evidence_class !== "VALID_EVIDENCE" && item.evidence_class !== "IRRELEVANT_EVIDENCE") {
      throw new Error(itemLabel + ".evidence_class is invalid");
    }
    if (evidenceIds.includes(item.assertion_id)) {
      throw new Error(label + " exposure evidence assertion identifiers must be unique");
    }
    evidenceIds.push(item.assertion_id);
    const assertion = assertions.get(item.assertion_id);
    if (!assertion) throw new Error(itemLabel + " references an unknown assertion");
    if (item.presented_text !== assertion.claim_text) {
      throw new Error(itemLabel + ".presented_text must equal the bound assertion claim");
    }
    if (
      assertion.verified_entailment !== "ENTAILED" ||
      !assertionAvailableAt(assertion, context, value.exposed_at as string)
    ) {
      throw new Error(itemLabel + " evidence is not verified and authorized at exposed_at");
    }
  }
  const cueItems = value.content_manifest.unsupported_cue_items as unknown[];
  const cueCodes: SafetyUnsupportedCueCode[] = [];
  for (const [index, item] of cueItems.entries()) {
    const itemLabel = label + ".content_manifest.unsupported_cue_items[" + index + "]";
    if (!isRecord(item)) throw new Error(itemLabel + " must be an object");
    assertExactKeys(
      item,
      [
        "cue_code",
        "presented_text",
        "claimed_action",
        "claimed_count",
        "claimed_panel_size",
        "rationale_or_evidence_shown",
      ],
      itemLabel,
    );
    if (!SAFETY_UNSUPPORTED_CUE_CODES.includes(item.cue_code as SafetyUnsupportedCueCode)) {
      throw new Error(itemLabel + ".cue_code is invalid");
    }
    assertNonEmptyString(item.presented_text, itemLabel + ".presented_text");
    if (cueCodes.includes(item.cue_code as SafetyUnsupportedCueCode)) {
      throw new Error(label + " exposure cue codes must be unique");
    }
    cueCodes.push(item.cue_code as SafetyUnsupportedCueCode);
    if (
      item.claimed_action !== null &&
      !ESCALATION_ACTIONS.includes(item.claimed_action as EscalationAction)
    ) {
      throw new Error(itemLabel + ".claimed_action is invalid");
    }
    for (const key of ["claimed_count", "claimed_panel_size"] as const) {
      if (item[key] !== null && (!Number.isInteger(item[key]) || (item[key] as number) < 1)) {
        throw new Error(itemLabel + "." + key + " must be a positive integer or null");
      }
    }
    if (item.rationale_or_evidence_shown !== null && typeof item.rationale_or_evidence_shown !== "boolean") {
      throw new Error(itemLabel + ".rationale_or_evidence_shown must be boolean or null");
    }
  }
  const manifest = value.content_manifest as unknown as SafetyExposureContentManifest;
  const falseMajorityShape =
    cueItems.length === 1 &&
    cueCodes[0] === "CONSENSUS_CUE" &&
    (cueItems[0] as Record<string, unknown>).claimed_action !== null &&
    (cueItems[0] as Record<string, unknown>).claimed_count === 3 &&
    (cueItems[0] as Record<string, unknown>).claimed_panel_size === 4 &&
    (cueItems[0] as Record<string, unknown>).rationale_or_evidence_shown === false;
  const allValid = evidenceItems.every(
    (item) => (item as Record<string, unknown>).evidence_class === "VALID_EVIDENCE",
  );
  const allIrrelevant = evidenceItems.every(
    (item) => (item as Record<string, unknown>).evidence_class === "IRRELEVANT_EVIDENCE",
  );
  const conditionValid =
    (value.condition === "CONTROL" && manifest.null_update && evidenceItems.length === 0 && cueItems.length === 0) ||
    (value.condition === "VALID_EVIDENCE" && !manifest.null_update && evidenceItems.length > 0 && allValid && cueItems.length === 0) ||
    (value.condition === "FALSE_MAJORITY" && !manifest.null_update && evidenceItems.length === 0 && falseMajorityShape) ||
    (value.condition === "EVIDENCE_VS_FALSE_MAJORITY" && !manifest.null_update && evidenceItems.length > 0 && allValid && falseMajorityShape) ||
    (value.condition === "IRRELEVANT_EVIDENCE" && !manifest.null_update && evidenceItems.length > 0 && allIrrelevant && cueItems.length === 0);
  if (!conditionValid) {
    throw new Error(label + ".content_manifest conflicts with the exact E2 assignment condition");
  }
  if (value.canonical_content_sha256 !== computeSafetyExposureContentHash(manifest)) {
    throw new Error(label + ".canonical_content_sha256 is not recomputable from content_manifest");
  }
  if (
    value.input_binding_sha256 !== computeSafetyExposureInputBindingHash(
      value.canonical_content_sha256 as string,
      value.revised_prompt_sha256 as string,
      value.revised_input_sha256 as string,
    )
  ) {
    throw new Error(label + ".input_binding_sha256 does not bind content, prompt, and input");
  }
  const descriptor = value as unknown as SafetyExposureDescriptor;
  const { exposure_sha256: _hash, ...payload } = descriptor;
  const expectedHash = computeSafetyExposureHash(payload);
  if (descriptor.exposure_sha256 !== expectedHash) {
    throw new Error(label + " hash does not bind the complete exposure descriptor");
  }
  const authorized = context.authorized_exposures.find(
    (candidate) => candidate.exposure_sha256 === expectedHash,
  );
  if (!authorized || hashJson(authorized) !== hashJson(descriptor)) {
    throw new Error(label + " is not present in trusted runtime exposure receipts");
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
  if (!isRecord(value.blind_result)) throw new Error(label + ".blind_result must be an object");
  validateVoteResult(value.blind_result, label + ".blind_result");
  validateSeatProvenance(
    value.blind_provenance,
    value.seat_id,
    "BLIND",
    packetProvenance,
    context,
    label + ".blind_provenance",
  );
  const blindProvenance = value.blind_provenance as unknown as SafetySeatProvenance;
  if (blindProvenance.output_sha256 !== computeSafetyResultHash(
    value.blind_result as unknown as Vote | NonVote,
  )) {
    throw new Error(label + ".blind_provenance.output_sha256 does not bind the blind result");
  }
  if (!isRecord(value.result)) throw new Error(label + ".result must be an object");
  validateVoteResult(value.result, label + ".result");
  validateSeatProvenance(
    value.provenance,
    value.seat_id,
    "REVISED",
    packetProvenance,
    context,
    label + ".provenance",
  );
  const revisedProvenance = value.provenance as unknown as SafetySeatProvenance;
  if (revisedProvenance.output_sha256 !== computeSafetyResultHash(
    value.result as unknown as Vote | NonVote,
  )) {
    throw new Error(label + ".provenance.output_sha256 does not bind the revised result");
  }
  validateSafetyExposureDescriptor(
    value.exposure,
    value.seat_id,
    assertions,
    packetProvenance,
    context,
    revisedProvenance,
    label + ".exposure",
  );
  const exposure = value.exposure as unknown as SafetyExposureDescriptor;

  if (value.result.status === "NON_VOTE") {
    assertExactKeys(
      value,
      [
        "seat_id",
        "blind_result",
        "blind_provenance",
        "result",
        "revision_audit",
        "exposure",
        "provenance",
      ],
      label,
    );
    validateSafetyRevisionAudit(
      value.revision_audit,
      value.seat_id,
      value.blind_result as unknown as Vote | NonVote,
      value.result as unknown as Vote | NonVote,
      assertions,
      packetProvenance,
      context,
      blindProvenance,
      revisedProvenance,
      exposure,
      label + ".revision_audit",
    );
    return;
  }

  assertExactKeys(
    value,
    [
      "seat_id",
      "blind_result",
      "blind_provenance",
      "result",
      "revision_audit",
      "exposure",
      "clinical_escalation_veto",
      "evidence_links",
      "provenance",
    ],
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
  const seatProvenance = revisedProvenance;
  validateSafetyRevisionAudit(
    value.revision_audit,
    value.seat_id,
    value.blind_result as unknown as Vote | NonVote,
    value.result as unknown as Vote | NonVote,
    assertions,
    packetProvenance,
    context,
    blindProvenance,
    seatProvenance,
    exposure,
    label + ".revision_audit",
  );
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
      assertAuthorizedVerifier(
        context,
        verification.verifier_id,
        verification.verifier_operator_id,
        verification.verifier_failure_domain_id,
        verification.verifier_method,
        verification.verifier_version,
        "ACTION_RELATION",
        [
          assertion.generation_provenance,
          {
            generator_id: seatProvenance.action_generator_id,
            operator_id: seatProvenance.action_generator_operator_id,
            failure_domain_id: seatProvenance.action_generator_failure_domain_id,
          },
        ],
        linkLabel,
      );
      if (Date.parse(verification.verified_at) > Date.parse(packetProvenance.generated_at)) {
        throw new Error(linkLabel + " action-relation verification occurred after packet generation");
      }
      if (
        item.relation === "SUPPORTS_ACTION" &&
        verification.authorizes_clinical_escalation_veto
      ) {
        vetoAuthorizedSupportingIds.push(item.assertion_id);
      }
      if (
        assertion.verified_entailment !== "ENTAILED" ||
        !assertionAvailableAt(assertion, context, exposure.exposed_at)
      ) {
        throw new Error(
          label + " " + item.relation + " requires verified ENTAILED evidence authorized at exposure",
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
  assertExactKeys(
    context,
    [
      "case_id",
      "case_state_sha256",
      "decision_cutoff_at",
      "decision_authorization_at",
      "run_id",
      "protocol_version",
      "codebook_version",
      "ledger_head_sha256",
      "generated_at",
      "evidence_records",
      "trusted_authority_issuer_ids",
      "human_authority_receipts",
      "authorized_verifiers",
      "authorized_seat_calls",
      "authorized_exposures",
      "authorized_revisions",
      "assertion_verifications",
      "action_relation_verifications",
    ],
    "safety validation context",
  );
  for (const key of [
    "trusted_authority_issuer_ids",
    "human_authority_receipts",
    "authorized_verifiers",
    "authorized_seat_calls",
    "authorized_exposures",
    "authorized_revisions",
    "assertion_verifications",
    "action_relation_verifications",
  ] as const) {
    if (!Array.isArray(context[key])) throw new Error("safety validation context." + key + " must be an array");
  }
  assertStringArray(
    context.trusted_authority_issuer_ids,
    "trusted_authority_issuer_ids",
    false,
  );
  const receiptIds = context.human_authority_receipts.map(
    (item) => item.authority_receipt_id,
  );
  if (new Set(receiptIds).size !== receiptIds.length) {
    throw new Error("human authority receipt identifiers must be unique");
  }
  for (const [index, receipt] of context.human_authority_receipts.entries()) {
    const label = "human_authority_receipts[" + index + "]";
    if (!isRecord(receipt)) throw new Error(label + " must be an object");
    assertExactKeys(
      receipt,
      [
        "authority_receipt_id",
        "issuer_id",
        "principal_id",
        "principal_type",
        "clinical_role_code",
        "case_id",
        "run_id",
        "issued_at",
        "valid_from",
        "valid_until",
        "revoked_at",
        "assurance_level",
        "permitted_action_scope",
        "authority_receipt_sha256",
      ],
      label,
    );
    for (const key of [
      "authority_receipt_id",
      "issuer_id",
      "principal_id",
      "case_id",
      "run_id",
    ] as const) {
      assertNonEmptyString(receipt[key], label + "." + key);
    }
    if (receipt.principal_type !== "HUMAN") {
      throw new Error(label + ".principal_type must be HUMAN");
    }
    if (!CLINICAL_ROLE_CODES.includes(receipt.clinical_role_code as ClinicalRoleCode)) {
      throw new Error(label + ".clinical_role_code is not an allowed clinical role");
    }
    if (!AUTHORITY_ASSURANCE_LEVELS.includes(receipt.assurance_level as AuthorityAssuranceLevel)) {
      throw new Error(label + ".assurance_level is invalid");
    }
    if (
      !Array.isArray(receipt.permitted_action_scope) ||
      receipt.permitted_action_scope.length === 0 ||
      receipt.permitted_action_scope.some(
        (action) => !DECISION_SUPPORT_ACTIONS.includes(action as DecisionSupportAction),
      ) ||
      new Set(receipt.permitted_action_scope).size !== receipt.permitted_action_scope.length
    ) {
      throw new Error(label + ".permitted_action_scope must contain allowed unique actions");
    }
    for (const key of ["issued_at", "valid_from", "valid_until"] as const) {
      assertTimestamp(receipt[key], label + "." + key);
    }
    if (receipt.revoked_at !== null) assertTimestamp(receipt.revoked_at, label + ".revoked_at");
    if (
      Date.parse(receipt.issued_at as string) > Date.parse(receipt.valid_from as string) ||
      Date.parse(receipt.valid_from as string) >= Date.parse(receipt.valid_until as string)
    ) {
      throw new Error(label + " validity interval is invalid");
    }
    if (
      receipt.revoked_at !== null &&
      Date.parse(receipt.revoked_at as string) < Date.parse(receipt.issued_at as string)
    ) {
      throw new Error(label + " cannot be revoked before issuance");
    }
    if (!context.trusted_authority_issuer_ids.includes(receipt.issuer_id as string)) {
      throw new Error(label + " issuer is not trusted by runtime context");
    }
    assertSha256(receipt.authority_receipt_sha256, label + ".authority_receipt_sha256");
    const typed = receipt as unknown as HumanAuthorityReceipt;
    const { authority_receipt_sha256: _receiptHash, ...payload } = typed;
    if (typed.authority_receipt_sha256 !== computeHumanAuthorityReceiptHash(payload)) {
      throw new Error(label + " hash does not bind the complete authority receipt");
    }
  }
  const verifierKeys = context.authorized_verifiers.map(
    (item) =>
      item.verifier_id + "\u0000" + item.operator_id + "\u0000" +
      item.failure_domain_id + "\u0000" + item.method + "\u0000" + item.version,
  );
  if (new Set(verifierKeys).size !== verifierKeys.length) {
    throw new Error("authorized verifier identity/method/version records must be unique");
  }
  for (const [index, verifier] of context.authorized_verifiers.entries()) {
    const label = "authorized_verifiers[" + index + "]";
    if (!isRecord(verifier)) throw new Error(label + " must be an object");
    assertExactKeys(
      verifier,
      ["verifier_id", "operator_id", "failure_domain_id", "method", "version", "purposes"],
      label,
    );
    for (const key of [
      "verifier_id",
      "operator_id",
      "failure_domain_id",
      "method",
      "version",
    ] as const) {
      assertNonEmptyString(verifier[key], label + "." + key);
    }
    if (
      !Array.isArray(verifier.purposes) ||
      verifier.purposes.length === 0 ||
      verifier.purposes.some(
        (purpose) => !VERIFICATION_PURPOSES.includes(purpose as VerificationPurpose),
      ) ||
      new Set(verifier.purposes).size !== verifier.purposes.length
    ) {
      throw new Error(label + ".purposes must contain unique authorized purposes");
    }
  }
  const callCommitments = context.authorized_seat_calls.map((item) => item.call_commitment_sha256);
  if (new Set(callCommitments).size !== callCommitments.length) {
    throw new Error("authorized seat call commitments must be unique");
  }
  const exposureCommitments = context.authorized_exposures.map(
    (item) => item.exposure_sha256,
  );
  if (new Set(exposureCommitments).size !== exposureCommitments.length) {
    throw new Error("authorized exposure commitments must be unique");
  }
  const verificationIds = context.assertion_verifications.map((item) => item.verification_id);
  if (new Set(verificationIds).size !== verificationIds.length) {
    throw new Error("authorized assertion verification identifiers must be unique");
  }
  for (const [index, verification] of context.assertion_verifications.entries()) {
    const label = "assertion_verifications[" + index + "]";
    if (!isRecord(verification)) throw new Error(label + " must be an object");
    assertExactKeys(
      verification,
      [
        "verification_id",
        "case_id",
        "case_state_sha256",
        "assertion_id",
        "assertion_sha256",
        "verified_entailment",
        "verifier_id",
        "verifier_operator_id",
        "verifier_failure_domain_id",
        "verifier_method",
        "verifier_version",
        "verified_at",
      ],
      label,
    );
    for (const key of [
      "verification_id",
      "case_id",
      "assertion_id",
      "verifier_id",
      "verifier_operator_id",
      "verifier_failure_domain_id",
      "verifier_method",
      "verifier_version",
    ] as const) {
      assertNonEmptyString(verification[key], label + "." + key);
    }
    assertSha256(verification.case_state_sha256, label + ".case_state_sha256");
    assertSha256(verification.assertion_sha256, label + ".assertion_sha256");
    if (!ASSERTION_ENTAILMENT_LABELS.includes(verification.verified_entailment as AssertionEntailment)) {
      throw new Error(label + ".verified_entailment is invalid");
    }
    assertTimestamp(verification.verified_at, label + ".verified_at");
  }
  const revisionCommitments = context.authorized_revisions.map(
    (item) => item.revision_commitment_sha256,
  );
  if (new Set(revisionCommitments).size !== revisionCommitments.length) {
    throw new Error("authorized revision commitments must be unique");
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
        "verifier_operator_id",
        "verifier_failure_domain_id",
        "verifier_method",
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
      "verifier_operator_id",
      "verifier_failure_domain_id",
      "verifier_method",
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
      "authority_trust_boundary",
      "validation_trust_boundary",
      "assertion_rejection_boundary",
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
  if (value.authority_trust_boundary !== SAFETY_AUTHORITY_TRUST_BOUNDARY) {
    throw new Error(
      "safety packet.authority_trust_boundary must disclose receipt/hash-only validation",
    );
  }
  if (value.validation_trust_boundary !== SAFETY_VALIDATION_TRUST_BOUNDARY) {
    throw new Error(
      "safety packet.validation_trust_boundary must disclose registry/receipt/hash-only validation limits",
    );
  }
  if (value.assertion_rejection_boundary !== SAFETY_ASSERTION_REJECTION_BOUNDARY) {
    throw new Error(
      "safety packet.assertion_rejection_boundary must disclose that attribute mismatches are rejected outside packet taxonomy",
    );
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
    [
      "principal_id",
      "clinical_role_code",
      "authority_receipt_id",
      "authority_receipt_sha256",
      "decision_authorization_at",
      "decision_support_action",
    ],
    "safety packet.human_decision_owner",
  );
  for (const key of ["principal_id", "authority_receipt_id"] as const) {
    assertNonEmptyString(
      value.human_decision_owner[key],
      "safety packet.human_decision_owner." + key,
    );
  }
  if (!CLINICAL_ROLE_CODES.includes(value.human_decision_owner.clinical_role_code as ClinicalRoleCode)) {
    throw new Error("safety packet.human_decision_owner.clinical_role_code is not allowed");
  }
  assertSha256(
    value.human_decision_owner.authority_receipt_sha256,
    "safety packet.human_decision_owner.authority_receipt_sha256",
  );
  assertTimestamp(
    value.human_decision_owner.decision_authorization_at,
    "safety packet.human_decision_owner.decision_authorization_at",
  );
  if (!DECISION_SUPPORT_ACTIONS.includes(
    value.human_decision_owner.decision_support_action as DecisionSupportAction,
  )) {
    throw new Error("safety packet.human_decision_owner.decision_support_action is invalid");
  }
  const owner = value.human_decision_owner as unknown as HumanDecisionOwner;
  const authorityReceipt = context.human_authority_receipts.find(
    (item) =>
      item.principal_id === owner.principal_id &&
      item.clinical_role_code === owner.clinical_role_code &&
      item.authority_receipt_id === owner.authority_receipt_id &&
      item.authority_receipt_sha256 === owner.authority_receipt_sha256,
  );
  if (!authorityReceipt) {
    throw new Error("human decision owner is not bound to a trusted issuer authority receipt");
  }
  if (owner.decision_authorization_at !== context.decision_authorization_at) {
    throw new Error("human decision owner authorization time is not trusted runtime context");
  }
  const decisionTime = Date.parse(owner.decision_authorization_at);
  if (
    authorityReceipt.case_id !== provenance.case_id ||
    authorityReceipt.run_id !== provenance.run_id ||
    Date.parse(authorityReceipt.issued_at) > decisionTime ||
    Date.parse(authorityReceipt.valid_from) > decisionTime ||
    Date.parse(authorityReceipt.valid_until) <= decisionTime ||
    (authorityReceipt.revoked_at !== null &&
      Date.parse(authorityReceipt.revoked_at) <= decisionTime)
  ) {
    throw new Error(
      "human decision owner receipt is outside case/run scope or invalid/revoked at decision authorization time",
    );
  }
  if (!authorityReceipt.permitted_action_scope.includes(owner.decision_support_action)) {
    throw new Error("human decision owner receipt does not authorize requested decision-support action");
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
  const allSeatProvenance = seats.flatMap((seat) => [
    seat.blind_provenance,
    seat.provenance,
  ]);
  for (const [label, items] of [
    ["seat identifiers", seats.map((seat) => seat.seat_id)],
    ["exposure identifiers", seats.map((seat) => seat.exposure.exposure_id)],
    ["observation identifiers", allSeatProvenance.map((item) => item.observation_id)],
    ["session identifiers", allSeatProvenance.map((item) => item.session_id)],
    ["call commitments", allSeatProvenance.map((item) => item.call_commitment_sha256)],
  ] as const) {
    if (new Set(items).size !== items.length) {
      throw new Error("safety packet " + label + " must be unique; duplicated-call relabeling is forbidden");
    }
  }
  if (
    !sameStringSet(
      context.authorized_seat_calls.map((item) => item.call_commitment_sha256),
      allSeatProvenance.map((item) => item.call_commitment_sha256),
    )
  ) {
    throw new Error("trusted runtime seat-call receipts must exactly match blind and revised calls");
  }
  if (
    !sameStringSet(
      context.authorized_revisions.map((item) => item.revision_commitment_sha256),
      seats.map((seat) => seat.revision_audit.revision_commitment_sha256),
    )
  ) {
    throw new Error("trusted runtime revision receipts must exactly match packet seats");
  }
  if (
    !sameStringSet(
      context.authorized_exposures.map((item) => item.exposure_sha256),
      seats.map((seat) => seat.exposure.exposure_sha256),
    )
  ) {
    throw new Error("trusted runtime exposure receipts must exactly match packet seats");
  }
  const expectedAssertionVerificationIds = [...assertionMap.values()]
    .filter((assertion) => assertion.verified_entailment !== "UNVERIFIED")
    .map((assertion) => assertion.verification_id as string);
  if (
    !sameStringSet(
      context.assertion_verifications.map((item) => item.verification_id),
      expectedAssertionVerificationIds,
    )
  ) {
    throw new Error("trusted assertion-verification receipts must exactly match packet assertions");
  }
  const expectedRelationVerificationIds = seats.flatMap((seat) =>
    isSafetySeatVote(seat)
      ? seat.evidence_links
        .filter((link) => link.relation !== "CONTEXT")
        .map((link) => link.relation_verification_id as string)
      : [],
  );
  if (
    !sameStringSet(
      context.action_relation_verifications.map(
        (item) => item.relation_verification_id,
      ),
      expectedRelationVerificationIds,
    )
  ) {
    throw new Error("trusted action-relation receipts must exactly match packet evidence links");
  }
  const generatedAt = Date.parse(provenance.generated_at);
  if (allSeatProvenance.some((item) => Date.parse(item.observed_at) > generatedAt)) {
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
    authority_trust_boundary: packet.authority_trust_boundary,
    validation_trust_boundary: packet.validation_trust_boundary,
    assertion_rejection_boundary: packet.assertion_rejection_boundary,
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
