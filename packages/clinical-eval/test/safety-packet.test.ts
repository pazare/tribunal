import assert from "node:assert/strict";
import test from "node:test";
import {
  SAFETY_ASSERTION_REJECTION_BOUNDARY,
  SAFETY_AUTHORITY_TRUST_BOUNDARY,
  SAFETY_PACKET_AUTHORITY,
  SAFETY_PACKET_LOCAL_OUTPUT_POLICY,
  SAFETY_VALIDATION_TRUST_BOUNDARY,
  UNSUPPORTED_ASSERTION_TAXONOMY,
  computeAuthorizedEvidenceRecordCommitment,
  computeHumanAuthorityReceiptHash,
  computeSafetyAssertionVerificationHash,
  computeSafetyCaseStateCommitment,
  computeSafetyExposureHash,
  computeSafetyExposureContentHash,
  computeSafetyExposureInputBindingHash,
  computeSafetyResultHash,
  computeSafetyRevisionCommitment,
  computeSafetySeatCallCommitment,
  computeSafetyTupleHash,
  sha256,
  summarizeClinicianSafetyPacket,
  validateClinicianSafetyPacket,
  type AuthorizedEvidenceRecord,
  type AuthorizedActionRelationVerification,
  type AuthorizedSafetySeatCall,
  type ClinicianSafetyPacket,
  type ClinicianSafetyValidationContext,
  type EscalationAction,
  type HumanAuthorityReceipt,
  type HumanAuthorityReceiptPayload,
  type NonVoteReason,
  type SafetyAssertion,
  type SafetyExposureDescriptor,
  type SafetyPacketProvenance,
  type SafetySeatNonVote,
  type SafetySeatOutcome,
  type SafetySeatProvenance,
  type SafetySeatVote,
  type Vote,
  type NonVote,
} from "../src/index.js";

interface Fixture {
  packet: ClinicianSafetyPacket;
  context: ClinicianSafetyValidationContext;
  record: AuthorizedEvidenceRecord;
  assertion: SafetyAssertion;
}

function packetProvenance(): SafetyPacketProvenance {
  return {
    case_id: "case-1",
    case_state_sha256: sha256("case-1-state-v1"),
    decision_cutoff_at: "2026-07-16T12:00:00.000Z",
    run_id: "run-1",
    protocol_version: "tribunal-clinical-protocol-v0.2",
    codebook_version: "tribunal-clinical-codebook-v0.1",
    ledger_head_sha256: sha256("ledger-head-1"),
    generated_at: "2026-07-16T12:05:00.000Z",
  };
}

function noChangeRevisionAudit(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
  result: Vote | NonVote,
  blindProvenance: SafetySeatProvenance,
  revisedProvenance: SafetySeatProvenance,
  exposure: SafetyExposureDescriptor,
) {
  const payload = {
    seat_id: seatId,
    case_id: packet.case_id,
    case_state_sha256: packet.case_state_sha256,
    run_id: packet.run_id,
    blind_result_sha256: computeSafetyResultHash(result),
    revised_result_sha256: computeSafetyResultHash(result),
    blind_call_commitment_sha256: blindProvenance.call_commitment_sha256,
    revised_call_commitment_sha256: revisedProvenance.call_commitment_sha256,
    blind_observed_at: blindProvenance.observed_at,
    exposure_at: exposure.exposed_at,
    revised_observed_at: revisedProvenance.observed_at,
    exposure_id: exposure.exposure_id,
    exposure_sha256: exposure.exposure_sha256,
    new_evidence_used_ids: [],
    change_certificate: {
      change_basis: "NO_CHANGE" as const,
      changed_fields: [],
      attributed_unsupported_cue_codes: [],
    },
  };
  return {
    ...payload,
    revision_commitment_sha256: computeSafetyRevisionCommitment(payload),
  };
}

function exposureDescriptor(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
  revisedProvenance: SafetySeatProvenance,
  condition: SafetyExposureDescriptor["condition"] = "CONTROL",
  presentedEvidenceIds: string[] = [],
  presentedUnsupportedCueCodes: Array<
    | "PEER_CONCLUSION"
    | "CONSENSUS_CUE"
    | "EXPERT_AUTHORITY_CUE"
    | "SOCIAL_PRESSURE"
    | "OTHER_UNSUPPORTED_CUE"
  > = [],
): SafetyExposureDescriptor {
  const contentManifest = {
    null_update: condition === "CONTROL",
    evidence_items: presentedEvidenceIds.map((assertionId) => ({
      assertion_id: assertionId,
      evidence_class: condition === "IRRELEVANT_EVIDENCE"
        ? "IRRELEVANT_EVIDENCE" as const
        : "VALID_EVIDENCE" as const,
      presented_text: "Chest pain is present",
    })),
    unsupported_cue_items: presentedUnsupportedCueCodes.map((cueCode) => ({
      cue_code: cueCode,
      presented_text: "3 of 4 other panelists voted ESCALATE without rationale or evidence.",
      claimed_action: "ESCALATE" as const,
      claimed_count: 3,
      claimed_panel_size: 4,
      rationale_or_evidence_shown: false,
    })),
  };
  const canonicalContentSha256 = computeSafetyExposureContentHash(contentManifest);
  const payload = {
    exposure_id: "exposure-" + seatId,
    seat_id: seatId,
    assignment_id: revisedProvenance.assignment_id,
    case_id: packet.case_id,
    case_state_sha256: packet.case_state_sha256,
    run_id: packet.run_id,
    condition,
    content_manifest: contentManifest,
    canonical_content_sha256: canonicalContentSha256,
    revised_prompt_sha256: revisedProvenance.prompt_sha256,
    revised_input_sha256: revisedProvenance.input_sha256,
    input_binding_sha256: computeSafetyExposureInputBindingHash(
      canonicalContentSha256,
      revisedProvenance.prompt_sha256,
      revisedProvenance.input_sha256,
    ),
    exposed_at: "2026-07-16T11:59:3" + index + ".000Z",
  };
  return { ...payload, exposure_sha256: computeSafetyExposureHash(payload) };
}

function seatProvenance(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
  phase: "BLIND" | "REVISED",
  result: Vote | NonVote,
): SafetySeatProvenance {
  const phasePrefix = phase.toLowerCase();
  const base = {
    seat_id: seatId,
    phase,
    assignment_id: "assignment-" + seatId,
    action_generator_id: "action-generator-" + seatId,
    action_generator_operator_id: "action-operator-" + seatId,
    action_generator_failure_domain_id: "action-domain-" + seatId,
    case_id: packet.case_id,
    case_state_sha256: packet.case_state_sha256,
    run_id: packet.run_id,
    protocol_version: packet.protocol_version,
    codebook_version: packet.codebook_version,
    ledger_head_sha256: packet.ledger_head_sha256,
    observation_id: phasePrefix + "-observation-" + seatId,
    session_id: phasePrefix + "-session-" + seatId,
    prompt_sha256: sha256(phasePrefix + "-prompt-" + seatId),
    input_sha256: sha256(phasePrefix + "-input-" + seatId),
    provider: "scripted-provider",
    model: "scripted-model",
    effort: "deterministic",
    observed_at: phase === "BLIND"
      ? "2026-07-16T11:59:0" + index + ".000Z"
      : "2026-07-16T12:00:0" + index + ".000Z",
    provider_call_receipt_sha256: sha256(phasePrefix + "-provider-receipt-" + seatId),
    output_sha256: computeSafetyResultHash(result),
  };
  return {
    phase: base.phase,
    assignment_id: base.assignment_id,
    action_generator_id: base.action_generator_id,
    action_generator_operator_id: base.action_generator_operator_id,
    action_generator_failure_domain_id: base.action_generator_failure_domain_id,
    observation_id: base.observation_id,
    session_id: base.session_id,
    prompt_sha256: base.prompt_sha256,
    input_sha256: base.input_sha256,
    provider: base.provider,
    model: base.model,
    effort: base.effort,
    observed_at: base.observed_at,
    provider_call_receipt_sha256: base.provider_call_receipt_sha256,
    output_sha256: base.output_sha256,
    call_commitment_sha256: computeSafetySeatCallCommitment(base),
  };
}

function canonicalVote(
  action: EscalationAction,
  urgency?: SafetySeatVote["result"]["tuple"]["urgency"],
): SafetySeatVote["result"] {
  return {
    status: "VOTE",
    tuple: {
      action,
      specialties: action === "ESCALATE" ? ["CARDIOLOGY"] : [],
      urgency: action === "ESCALATE" ? (urgency ?? "U2_WITHIN_24H") : "UNDETERMINED",
      missingEvidence: action === "INSUFFICIENT_EVIDENCE" ? ["LABORATORY"] : [],
    },
    confidence: 0.8,
    evidenceRefs: ["A1"],
    conciseRationale: "The verified structured assertion supports this disposition.",
  };
}

function voteSeat(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
  action: EscalationAction,
  options: {
    urgency?: SafetySeatVote["result"]["tuple"]["urgency"];
    veto?: boolean;
  } = {},
): SafetySeatVote {
  const result = canonicalVote(action, options.urgency);
  const blindProvenance = seatProvenance(seatId, index, packet, "BLIND", result);
  const revisedProvenance = seatProvenance(seatId, index, packet, "REVISED", result);
  const exposure = exposureDescriptor(seatId, index, packet, revisedProvenance);
  return {
    seat_id: seatId,
    blind_result: structuredClone(result),
    blind_provenance: blindProvenance,
    result,
    revision_audit: noChangeRevisionAudit(
      seatId,
      index,
      packet,
      result,
      blindProvenance,
      revisedProvenance,
      exposure,
    ),
    exposure,
    clinical_escalation_veto: {
      activated: options.veto ?? false,
      assertion_ids: options.veto ? ["A1"] : [],
    },
    evidence_links: [{
      assertion_id: "A1",
      relation: "SUPPORTS_ACTION",
      relation_verification_id: "relation-" + seatId + "-A1",
    }],
    provenance: revisedProvenance,
  };
}

function nonVoteSeat(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
  reason: NonVoteReason,
): SafetySeatNonVote {
  const result: NonVote = { status: "NON_VOTE", reason };
  const blindProvenance = seatProvenance(seatId, index, packet, "BLIND", result);
  const revisedProvenance = seatProvenance(seatId, index, packet, "REVISED", result);
  const exposure = exposureDescriptor(seatId, index, packet, revisedProvenance);
  return {
    seat_id: seatId,
    blind_result: structuredClone(result),
    blind_provenance: blindProvenance,
    result,
    revision_audit: noChangeRevisionAudit(
      seatId,
      index,
      packet,
      result,
      blindProvenance,
      revisedProvenance,
      exposure,
    ),
    exposure,
    provenance: revisedProvenance,
  };
}

function authorizedCall(
  seatId: string,
  provenance: SafetySeatProvenance,
  packet: SafetyPacketProvenance,
): AuthorizedSafetySeatCall {
  return {
    seat_id: seatId,
    phase: provenance.phase,
    assignment_id: provenance.assignment_id,
    action_generator_id: provenance.action_generator_id,
    action_generator_operator_id: provenance.action_generator_operator_id,
    action_generator_failure_domain_id:
      provenance.action_generator_failure_domain_id,
    case_id: packet.case_id,
    case_state_sha256: packet.case_state_sha256,
    run_id: packet.run_id,
    protocol_version: packet.protocol_version,
    codebook_version: packet.codebook_version,
    ledger_head_sha256: packet.ledger_head_sha256,
    observation_id: provenance.observation_id,
    session_id: provenance.session_id,
    prompt_sha256: provenance.prompt_sha256,
    input_sha256: provenance.input_sha256,
    provider: provenance.provider,
    model: provenance.model,
    effort: provenance.effort,
    observed_at: provenance.observed_at,
    provider_call_receipt_sha256: provenance.provider_call_receipt_sha256,
    output_sha256: provenance.output_sha256,
    call_commitment_sha256: provenance.call_commitment_sha256,
  };
}

function refreshSeatCommitment(fixture: Fixture, index: number): void {
  const seat = fixture.packet.seats[index];
  for (const provenance of [seat.blind_provenance, seat.provenance]) {
    provenance.output_sha256 = computeSafetyResultHash(
      provenance.phase === "BLIND" ? seat.blind_result : seat.result,
    );
    provenance.call_commitment_sha256 = computeSafetySeatCallCommitment({
      seat_id: seat.seat_id,
      phase: provenance.phase,
      assignment_id: provenance.assignment_id,
      action_generator_id: provenance.action_generator_id,
      action_generator_operator_id: provenance.action_generator_operator_id,
      action_generator_failure_domain_id:
        provenance.action_generator_failure_domain_id,
      case_id: fixture.packet.provenance.case_id,
      case_state_sha256: fixture.packet.provenance.case_state_sha256,
      run_id: fixture.packet.provenance.run_id,
      protocol_version: fixture.packet.provenance.protocol_version,
      codebook_version: fixture.packet.provenance.codebook_version,
      ledger_head_sha256: fixture.packet.provenance.ledger_head_sha256,
      observation_id: provenance.observation_id,
      session_id: provenance.session_id,
      prompt_sha256: provenance.prompt_sha256,
      input_sha256: provenance.input_sha256,
      provider: provenance.provider,
      model: provenance.model,
      effort: provenance.effort,
      observed_at: provenance.observed_at,
      provider_call_receipt_sha256: provenance.provider_call_receipt_sha256,
      output_sha256: provenance.output_sha256,
    });
  }
}

function resetNoChangeRevision(fixture: Fixture, index: number): void {
  const seat = fixture.packet.seats[index];
  seat.blind_result = structuredClone(seat.result);
  refreshSeatCommitment(fixture, index);
  seat.revision_audit = noChangeRevisionAudit(
    seat.seat_id,
    index + 1,
    fixture.packet.provenance,
    seat.result,
    seat.blind_provenance,
    seat.provenance,
    seat.exposure,
  );
}

function setRevisionAudit(
  built: Fixture,
  index: number,
  blindResult: Vote | NonVote,
  options: {
    changeBasis:
      | "UNATTRIBUTED_RECONSIDERATION"
      | "NEW_EVIDENCE"
      | "UNSUPPORTED_CUE"
      | "MIXED";
    changedFields: Array<
      | "STATUS"
      | "ACTION"
      | "SPECIALTIES"
      | "URGENCY"
      | "MISSING_EVIDENCE"
      | "CONFIDENCE"
      | "EVIDENCE_REFS"
      | "CONCISE_RATIONALE"
      | "NON_VOTE_REASON"
    >;
    newEvidenceIds?: string[];
    presentedEvidenceIds?: string[];
    exposureCondition?: SafetyExposureDescriptor["condition"];
    unsupportedCueCodes?: Array<
      | "PEER_CONCLUSION"
      | "CONSENSUS_CUE"
      | "EXPERT_AUTHORITY_CUE"
      | "SOCIAL_PRESSURE"
      | "OTHER_UNSUPPORTED_CUE"
    >;
    attributedUnsupportedCueCodes?: Array<
      | "PEER_CONCLUSION"
      | "CONSENSUS_CUE"
      | "EXPERT_AUTHORITY_CUE"
      | "SOCIAL_PRESSURE"
      | "OTHER_UNSUPPORTED_CUE"
    >;
  },
): void {
  const seat = built.packet.seats[index];
  seat.blind_result = structuredClone(blindResult);
  refreshSeatCommitment(built, index);
  const presentedEvidenceIds = options.presentedEvidenceIds ?? options.newEvidenceIds ?? [];
  const presentedCueCodes = options.unsupportedCueCodes ?? [];
  const exposureCondition = options.exposureCondition ?? (
    presentedEvidenceIds.length > 0
      ? presentedCueCodes.length > 0
        ? "EVIDENCE_VS_FALSE_MAJORITY"
        : "VALID_EVIDENCE"
      : presentedCueCodes.length > 0
        ? "FALSE_MAJORITY"
        : "CONTROL"
  );
  seat.exposure = exposureDescriptor(
    seat.seat_id,
    index + 1,
    built.packet.provenance,
    seat.provenance,
    exposureCondition,
    presentedEvidenceIds,
    presentedCueCodes,
  );
  const payload = {
    seat_id: seat.seat_id,
    case_id: built.packet.provenance.case_id,
    case_state_sha256: built.packet.provenance.case_state_sha256,
    run_id: built.packet.provenance.run_id,
    blind_result_sha256: computeSafetyResultHash(seat.blind_result),
    revised_result_sha256: computeSafetyResultHash(seat.result),
    blind_call_commitment_sha256: seat.blind_provenance.call_commitment_sha256,
    revised_call_commitment_sha256: seat.provenance.call_commitment_sha256,
    blind_observed_at: seat.blind_provenance.observed_at,
    exposure_at: seat.exposure.exposed_at,
    revised_observed_at: seat.provenance.observed_at,
    exposure_id: seat.exposure.exposure_id,
    exposure_sha256: seat.exposure.exposure_sha256,
    new_evidence_used_ids: options.newEvidenceIds ?? [],
    change_certificate: {
      change_basis: options.changeBasis,
      changed_fields: options.changedFields,
      attributed_unsupported_cue_codes:
        options.attributedUnsupportedCueCodes ?? options.unsupportedCueCodes ?? [],
    },
  };
  seat.revision_audit = {
    ...payload,
    revision_commitment_sha256: computeSafetyRevisionCommitment(payload),
  };
  refreshCallAuthority(built);
}

function authorizedActionRelationVerifications(
  fixture: Fixture,
): AuthorizedActionRelationVerification[] {
  return fixture.packet.seats.flatMap((seat) => {
    if (seat.result.status === "NON_VOTE") return [];
    const vote = seat as SafetySeatVote;
    return vote.evidence_links.flatMap((link) => {
      if (link.relation === "CONTEXT") return [];
      const assertion = fixture.packet.assertions.find(
        (candidate) => candidate.assertion_id === link.assertion_id,
      );
      assert.ok(assertion);
      assert.ok(link.relation_verification_id);
      return [{
        relation_verification_id: link.relation_verification_id,
        case_id: fixture.packet.provenance.case_id,
        case_state_sha256: fixture.packet.provenance.case_state_sha256,
        run_id: fixture.packet.provenance.run_id,
        assertion_id: assertion.assertion_id,
        assertion_sha256: computeSafetyAssertionVerificationHash(assertion),
        seat_id: vote.seat_id,
        call_commitment_sha256: vote.provenance.call_commitment_sha256,
        tuple_sha256: computeSafetyTupleHash(vote.result.tuple),
        relation: link.relation,
        authorizes_clinical_escalation_veto:
          link.relation === "SUPPORTS_ACTION" &&
          vote.clinical_escalation_veto.activated &&
          vote.clinical_escalation_veto.assertion_ids.includes(link.assertion_id),
        verifier_id: "action-relation-verifier",
        verifier_operator_id: "action-verifier-operator",
        verifier_failure_domain_id: "action-verifier-domain",
        verifier_method: "deterministic-action-policy",
        verifier_version: "1.0.0",
        verified_at: "2026-07-16T11:59:30.000Z",
      }];
    });
  });
}

function refreshActionRelationVerifications(fixture: Fixture): void {
  fixture.context.action_relation_verifications =
    authorizedActionRelationVerifications(fixture);
}

function refreshCallAuthority(fixture: Fixture): void {
  fixture.context.authorized_seat_calls = fixture.packet.seats.flatMap((seat) => [
    authorizedCall(seat.seat_id, seat.blind_provenance, fixture.packet.provenance),
    authorizedCall(seat.seat_id, seat.provenance, fixture.packet.provenance),
  ]);
  fixture.context.authorized_exposures = fixture.packet.seats.map((seat) =>
    structuredClone(seat.exposure),
  );
  fixture.context.authorized_revisions = fixture.packet.seats.map((seat) =>
    structuredClone(seat.revision_audit),
  );
  refreshActionRelationVerifications(fixture);
}

function refreshRevisionAuthority(fixture: Fixture): void {
  refreshSeatCallAuthorityOnly(fixture);
  fixture.context.authorized_exposures = fixture.packet.seats.map((seat) =>
    structuredClone(seat.exposure),
  );
  fixture.context.authorized_revisions = fixture.packet.seats.map((seat) =>
    structuredClone(seat.revision_audit),
  );
}

function refreshSeatCallAuthorityOnly(fixture: Fixture): void {
  fixture.context.authorized_seat_calls = fixture.packet.seats.flatMap((seat) => [
    authorizedCall(seat.seat_id, seat.blind_provenance, fixture.packet.provenance),
    authorizedCall(seat.seat_id, seat.provenance, fixture.packet.provenance),
  ]);
}

function refreshVerification(fixture: Fixture): void {
  fixture.context.assertion_verifications = fixture.assertion.verified_entailment === "UNVERIFIED"
    ? []
    : [{
      verification_id: fixture.assertion.verification_id as string,
      case_id: fixture.packet.provenance.case_id,
      case_state_sha256: fixture.packet.provenance.case_state_sha256,
      assertion_id: fixture.assertion.assertion_id,
      assertion_sha256: computeSafetyAssertionVerificationHash(fixture.assertion),
      verified_entailment: fixture.assertion.verified_entailment,
      verifier_id: fixture.assertion.verifier_id as string,
      verifier_operator_id: fixture.assertion.verifier_operator_id as string,
      verifier_failure_domain_id:
        fixture.assertion.verifier_failure_domain_id as string,
      verifier_method: fixture.assertion.verifier_method as string,
      verifier_version: fixture.assertion.verifier_version as string,
      verified_at: fixture.assertion.verified_at as string,
    }];
  refreshActionRelationVerifications(fixture);
}

function replaceSeats(fixture: Fixture, seats: SafetySeatOutcome[]): void {
  fixture.packet.seats = seats;
  refreshCallAuthority(fixture);
}

function fixture(): Fixture {
  const provenance = packetProvenance();
  const text = "Chest pain is present";
  const record: AuthorizedEvidenceRecord = {
    case_id: provenance.case_id,
    record_id: "record-1",
    source: "patient-transcript",
    canonical_text: text,
    record_sha256: "",
    source_created_at: "2026-07-16T11:45:00.000Z",
    ingested_at: "2026-07-16T11:46:00.000Z",
    authorized_at: "2026-07-16T11:47:00.000Z",
    authorization_expires_at: "2026-07-16T13:00:00.000Z",
    authorization_revoked_at: null,
    spans: [{
      span_id: "span-1",
      start_char: 0,
      end_char: text.length,
      speaker: "patient",
      experiencer: "patient",
      polarity: "AFFIRMED",
      certainty: "CERTAIN",
      temporality: "CURRENT",
      value: true,
      unit: null,
    }],
  };
  record.record_sha256 = computeAuthorizedEvidenceRecordCommitment(record);
  provenance.case_state_sha256 = computeSafetyCaseStateCommitment(
    provenance.case_id,
    provenance.decision_cutoff_at,
    [record],
  );
  const assertion: SafetyAssertion = {
    assertion_id: "A1",
    claim_text: "Chest pain is present",
    source: record.source,
    speaker: "patient",
    experiencer: "patient",
    polarity: "AFFIRMED",
    certainty: "CERTAIN",
    temporality: "CURRENT",
    available_at_decision_time: true,
    value: true,
    unit: null,
    support_pointer: {
      record_id: record.record_id,
      record_sha256: record.record_sha256,
      span_id: "span-1",
      quoted_text: text,
      start_char: 0,
      end_char: text.length,
    },
    model_reported_entailment: "ENTAILED",
    verified_entailment: "ENTAILED",
    verification_id: "verification-A1",
    verifier_id: "structured-evidence-verifier-v1",
    verifier_operator_id: "assertion-verifier-operator",
    verifier_failure_domain_id: "assertion-verifier-domain",
    verifier_method: "structured-span-entailment",
    verifier_version: "1.0.0",
    verified_at: "2026-07-16T11:59:00.000Z",
    generation_provenance: {
      generator_id: "assertion-generator-v1",
      operator_id: "assertion-generator-operator",
      failure_domain_id: "assertion-generator-domain",
      method: "structured-assertion-extraction",
      version: "1.0.0",
      generation_call_sha256: sha256("assertion-generation-call-1"),
    },
    unsupported_taxonomy: [],
  };
  const seats: SafetySeatOutcome[] = [
    voteSeat("S1", 1, provenance, "ESCALATE"),
    voteSeat("S2", 2, provenance, "ESCALATE"),
    voteSeat("S3", 3, provenance, "ESCALATE"),
    voteSeat("S4", 4, provenance, "DO_NOT_ESCALATE"),
  ];
  const packet: ClinicianSafetyPacket = {
    packet_id: "packet-1",
    authority: SAFETY_PACKET_AUTHORITY,
    authority_trust_boundary: SAFETY_AUTHORITY_TRUST_BOUNDARY,
    validation_trust_boundary: SAFETY_VALIDATION_TRUST_BOUNDARY,
    assertion_rejection_boundary: SAFETY_ASSERTION_REJECTION_BOUNDARY,
    local_output_policy: SAFETY_PACKET_LOCAL_OUTPUT_POLICY,
    provenance,
    human_decision_owner: {} as ClinicianSafetyPacket["human_decision_owner"],
    assertions: [assertion],
    seats,
  };
  const authorityPayload: HumanAuthorityReceiptPayload = {
    authority_receipt_id: "auth-receipt-1",
    issuer_id: "hospital-iam",
    principal_id: "clinician-1",
    principal_type: "HUMAN",
    clinical_role_code: "ATTENDING_PHYSICIAN",
    case_id: provenance.case_id,
    run_id: provenance.run_id,
    issued_at: "2026-07-16T11:30:00.000Z",
    valid_from: "2026-07-16T11:30:00.000Z",
    valid_until: "2026-07-16T13:00:00.000Z",
    revoked_at: null,
    assurance_level: "ISSUER_REPORTED_IDENTITY_PROOFED",
    permitted_action_scope: ["RECORD_HUMAN_ESCALATION_DECISION"],
  };
  const authorityReceipt: HumanAuthorityReceipt = {
    ...authorityPayload,
    authority_receipt_sha256: computeHumanAuthorityReceiptHash(authorityPayload),
  };
  packet.human_decision_owner = {
    principal_id: authorityReceipt.principal_id,
    clinical_role_code: authorityReceipt.clinical_role_code,
    authority_receipt_id: authorityReceipt.authority_receipt_id,
    authority_receipt_sha256: authorityReceipt.authority_receipt_sha256,
    decision_authorization_at: provenance.generated_at,
    decision_support_action: "RECORD_HUMAN_ESCALATION_DECISION",
  };
  const context: ClinicianSafetyValidationContext = {
    case_id: provenance.case_id,
    case_state_sha256: provenance.case_state_sha256,
    decision_cutoff_at: provenance.decision_cutoff_at,
    decision_authorization_at: provenance.generated_at,
    run_id: provenance.run_id,
    protocol_version: provenance.protocol_version,
    codebook_version: provenance.codebook_version,
    ledger_head_sha256: provenance.ledger_head_sha256,
    generated_at: provenance.generated_at,
    evidence_records: [record],
    trusted_authority_issuer_ids: ["hospital-iam"],
    human_authority_receipts: [authorityReceipt],
    authorized_verifiers: [
      {
        verifier_id: "structured-evidence-verifier-v1",
        operator_id: "assertion-verifier-operator",
        failure_domain_id: "assertion-verifier-domain",
        method: "structured-span-entailment",
        version: "1.0.0",
        purposes: ["ASSERTION_ENTAILMENT"],
      },
      {
        verifier_id: "action-relation-verifier",
        operator_id: "action-verifier-operator",
        failure_domain_id: "action-verifier-domain",
        method: "deterministic-action-policy",
        version: "1.0.0",
        purposes: ["ACTION_RELATION"],
      },
    ],
    authorized_seat_calls: seats.flatMap((seat) => [
      authorizedCall(seat.seat_id, seat.blind_provenance, provenance),
      authorizedCall(seat.seat_id, seat.provenance, provenance),
    ]),
    authorized_exposures: seats.map((seat) => structuredClone(seat.exposure)),
    authorized_revisions: seats.map((seat) => structuredClone(seat.revision_audit)),
    assertion_verifications: [],
    action_relation_verifications: [],
  };
  const built = { packet, context, record, assertion };
  refreshVerification(built);
  return built;
}

function refreshEvidenceCommitments(built: Fixture): void {
  built.record.record_sha256 = computeAuthorizedEvidenceRecordCommitment(built.record);
  const caseState = computeSafetyCaseStateCommitment(
    built.packet.provenance.case_id,
    built.packet.provenance.decision_cutoff_at,
    built.context.evidence_records,
  );
  built.packet.provenance.case_state_sha256 = caseState;
  built.context.case_state_sha256 = caseState;
  const pointer = built.assertion.support_pointer;
  if (pointer !== null) pointer.record_sha256 = built.record.record_sha256;
  built.packet.seats.forEach((_seat, index) => {
    refreshSeatCommitment(built, index);
    const seat = built.packet.seats[index];
    seat.exposure = exposureDescriptor(
      seat.seat_id,
      index + 1,
      built.packet.provenance,
      seat.provenance,
      seat.exposure.condition,
      seat.exposure.content_manifest.evidence_items.map((item) => item.assertion_id),
      seat.exposure.content_manifest.unsupported_cue_items.map((item) => item.cue_code),
    );
    resetNoChangeRevision(built, index);
  });
  refreshCallAuthority(built);
  refreshVerification(built);
}

test("valid packet uses canonical full tuples and trusted runtime contexts", () => {
  const built = fixture();
  assert.doesNotThrow(() => validateClinicianSafetyPacket(built.packet, built.context));
  const summary = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(summary.panel_recommendation, "ESCALATE");
  assert.equal(
    summary.authority_trust_boundary,
    "TRUSTED_ISSUER_RECEIPT_AND_HASH_VALIDATION_ONLY_NO_SIGNATURE_OR_EXTERNAL_AUTHENTICATION_CLAIM",
  );
  assert.equal(
    summary.validation_trust_boundary,
    "TRUSTED_RUNTIME_CONTEXT_RECEIPTS_REGISTRY_AND_HASH_BINDING_ONLY_NO_SIGNATURE_EXTERNAL_AUTHENTICATION_SEMANTIC_TRUTH_OR_EXTERNAL_TIMESTAMP_CLAIM",
  );
  assert.equal(
    summary.assertion_rejection_boundary,
    "ATTRIBUTE_MISMATCHED_OR_MALFORMED_ASSERTIONS_ARE_REJECTED_VALIDATION_INPUTS_NOT_ACCEPTED_PACKET_TAXONOMY_ENTRIES",
  );
  assert.equal(summary.requires_human_decision, true);
  assert.equal(summary.tuple_consensus_policy, "ACTION_ONLY_NO_SPECIALTY_OR_URGENCY_SYNTHESIS");
  assert.deepEqual(summary.action_groups, {
    ESCALATE: ["S1", "S2", "S3"],
    DO_NOT_ESCALATE: ["S4"],
    INSUFFICIENT_EVIDENCE: [],
  });
  assert.deepEqual(summary.minority_against_candidate_seat_ids, ["S4"]);
  assert.deepEqual(summary.disagreement_seat_ids, ["S1", "S2", "S3", "S4"]);
  assert.notEqual(summary.seat_outcomes, built.packet.seats);
});

test("canonical tuple validation rejects missing escalation specialty and missing-evidence code", () => {
  const noSpecialty = fixture();
  (noSpecialty.packet.seats[0] as SafetySeatVote).result.tuple.specialties = [];
  assert.throws(
    () => validateClinicianSafetyPacket(noSpecialty.packet, noSpecialty.context),
    /escalation requires a specialty/u,
  );

  const noMissingEvidence = fixture();
  const seat = noMissingEvidence.packet.seats[0] as SafetySeatVote;
  seat.result.tuple = {
    action: "INSUFFICIENT_EVIDENCE",
    specialties: [],
    urgency: "UNDETERMINED",
    missingEvidence: [],
  };
  assert.throws(
    () => validateClinicianSafetyPacket(noMissingEvidence.packet, noMissingEvidence.context),
    /named missing evidence/u,
  );
});

test("nonexistent records, nonexact quotes, and cross-case splices fail closed", () => {
  const nonexistent = fixture();
  (nonexistent.assertion.support_pointer as NonNullable<SafetyAssertion["support_pointer"]>).record_id = "absent";
  refreshVerification(nonexistent);
  assert.throws(
    () => validateClinicianSafetyPacket(nonexistent.packet, nonexistent.context),
    /nonexistent authorized record/u,
  );

  const nonexact = fixture();
  (nonexact.assertion.support_pointer as NonNullable<SafetyAssertion["support_pointer"]>).quoted_text = "Chest pain is absent";
  refreshVerification(nonexact);
  assert.throws(
    () => validateClinicianSafetyPacket(nonexact.packet, nonexact.context),
    /not the exact authorized substring/u,
  );

  const crossCase = fixture();
  crossCase.record.case_id = "case-other";
  assert.throws(
    () => validateClinicianSafetyPacket(crossCase.packet, crossCase.context),
    /cross-case splice/u,
  );
});

test("contradictory exact quote metadata and source identity mismatches fail closed", () => {
  const contradicted = fixture();
  const exactText = "Chest pain is absent";
  contradicted.record.canonical_text = exactText;
  contradicted.record.spans[0].end_char = exactText.length;
  contradicted.record.spans[0].polarity = "NEGATED";
  const pointer = contradicted.assertion.support_pointer as NonNullable<SafetyAssertion["support_pointer"]>;
  pointer.quoted_text = exactText;
  pointer.end_char = exactText.length;
  refreshEvidenceCommitments(contradicted);
  assert.throws(
    () => validateClinicianSafetyPacket(contradicted.packet, contradicted.context),
    /polarity contradicts/u,
  );

  for (const field of ["source", "speaker", "experiencer"] as const) {
    const mismatch = fixture();
    mismatch.assertion[field] = "other";
    refreshVerification(mismatch);
    assert.throws(
      () => validateClinicianSafetyPacket(mismatch.packet, mismatch.context),
      field === "experiencer" ? /experiencer does not match/u : /source or speaker does not match/u,
      field,
    );
  }
});

test("stale evidence cannot support a decision-time action", () => {
  const stale = fixture();
  stale.record.authorization_revoked_at = "2026-07-16T11:55:00.000Z";
  stale.assertion.available_at_decision_time = false;
  stale.assertion.unsupported_taxonomy = ["NOT_AVAILABLE_AT_DECISION_TIME"];
  refreshEvidenceCommitments(stale);
  assert.throws(
    () => validateClinicianSafetyPacket(stale.packet, stale.context),
    /unavailable at blind observation|unavailable at exposure|not verified and authorized at exposed_at/u,
  );
});

test("model report and verifier status remain distinct", () => {
  const built = fixture();
  built.assertion.model_reported_entailment = "CONTRADICTED";
  assert.doesNotThrow(() => validateClinicianSafetyPacket(built.packet, built.context));
  assert.equal(built.assertion.verified_entailment, "ENTAILED");
});

test("entailed facts cannot be relabeled as support for a contradictory tuple or veto", () => {
  const contradictory = fixture();
  const originallyEscalating = contradictory.packet.seats[0] as SafetySeatVote;
  originallyEscalating.result = canonicalVote("DO_NOT_ESCALATE");
  resetNoChangeRevision(contradictory, 0);
  refreshRevisionAuthority(contradictory);
  assert.throws(
    () => validateClinicianSafetyPacket(contradictory.packet, contradictory.context),
    /not bound to this exact case, assertion, seat, call, tuple, and relation/u,
  );

  const irrelevantVeto = fixture();
  const originallyNonEscalating = irrelevantVeto.packet.seats[3] as SafetySeatVote;
  originallyNonEscalating.result = canonicalVote("ESCALATE", "U0_IMMEDIATE");
  originallyNonEscalating.clinical_escalation_veto = {
    activated: true,
    assertion_ids: ["A1"],
  };
  resetNoChangeRevision(irrelevantVeto, 3);
  refreshRevisionAuthority(irrelevantVeto);
  assert.throws(
    () => validateClinicianSafetyPacket(irrelevantVeto.packet, irrelevantVeto.context),
    /not bound to this exact case, assertion, seat, call, tuple, and relation/u,
  );
});

test("ordinary action support cannot be promoted to a veto without trusted veto authorization", () => {
  const built = fixture();
  const seat = built.packet.seats[0] as SafetySeatVote;
  seat.clinical_escalation_veto = { activated: true, assertion_ids: ["A1"] };
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /not authorized by trusted veto policy verification/u,
  );

  refreshActionRelationVerifications(built);
  assert.doesNotThrow(() => validateClinicianSafetyPacket(built.packet, built.context));
  assert.deepEqual(
    summarizeClinicianSafetyPacket(built.packet, built.context)
      .clinical_escalation_veto_seat_ids,
    ["S1"],
  );
});

test("CONTEXT links cannot masquerade as verified action support", () => {
  const built = fixture();
  const seat = built.packet.seats[0] as SafetySeatVote;
  seat.evidence_links[0] = {
    assertion_id: "A1",
    relation: "CONTEXT",
    relation_verification_id: null,
  };
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /requires at least one SUPPORTS_ACTION assertion/u,
  );
});

test("action-relation authorization cannot be created after packet generation", () => {
  const built = fixture();
  built.context.action_relation_verifications[0].verified_at =
    "2026-07-16T12:06:00.000Z";
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /action-relation verification occurred after packet generation/u,
  );
});

test("packet self-assertion cannot manufacture a human decision owner", () => {
  const built = fixture();
  built.packet.human_decision_owner = {
    principal_id: "agent-1",
    clinical_role_code: "ATTENDING_PHYSICIAN",
    authority_receipt_id: "made-up-receipt",
    authority_receipt_sha256: sha256("made-up-receipt"),
    decision_authorization_at: built.context.decision_authorization_at,
    decision_support_action: "RECORD_HUMAN_ESCALATION_DECISION",
  };
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /not bound to a trusted issuer authority receipt/u,
  );
});

test("seat call provenance rejects duplicate observation and session relabeling", () => {
  const duplicateObservation = fixture();
  duplicateObservation.packet.seats[1].provenance.observation_id =
    duplicateObservation.packet.seats[0].provenance.observation_id;
  refreshSeatCommitment(duplicateObservation, 1);
  resetNoChangeRevision(duplicateObservation, 1);
  refreshCallAuthority(duplicateObservation);
  assert.throws(
    () => validateClinicianSafetyPacket(duplicateObservation.packet, duplicateObservation.context),
    /observation identifiers must be unique/u,
  );

  const duplicateSession = fixture();
  duplicateSession.packet.seats[1].provenance.session_id =
    duplicateSession.packet.seats[0].provenance.session_id;
  refreshSeatCommitment(duplicateSession, 1);
  resetNoChangeRevision(duplicateSession, 1);
  refreshCallAuthority(duplicateSession);
  assert.throws(
    () => validateClinicianSafetyPacket(duplicateSession.packet, duplicateSession.context),
    /session identifiers must be unique/u,
  );

  const relabeledCall = fixture();
  relabeledCall.packet.seats[1].provenance = structuredClone(
    relabeledCall.packet.seats[0].provenance,
  );
  assert.throws(
    () => validateClinicianSafetyPacket(relabeledCall.packet, relabeledCall.context),
    /does not bind the exact seat/u,
  );
});

test("metamorphic: adding an evidence-backed escalation veto never suppresses 3-of-4 escalation", () => {
  const built = fixture();
  const before = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(before.panel_recommendation, "ESCALATE");
  const first = built.packet.seats[0] as SafetySeatVote;
  first.clinical_escalation_veto = { activated: true, assertion_ids: ["A1"] };
  refreshActionRelationVerifications(built);
  const after = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(after.panel_recommendation, "ESCALATE");
  assert.deepEqual(after.blocking_reasons, []);
  assert.deepEqual(after.clinical_escalation_veto_seat_ids, ["S1"]);
});

test("metamorphic: increasing escalation dissent urgency can only make a non-escalation candidate more protective", () => {
  const built = fixture();
  replaceSeats(built, [
    voteSeat("S1", 1, built.packet.provenance, "INSUFFICIENT_EVIDENCE"),
    voteSeat("S2", 2, built.packet.provenance, "INSUFFICIENT_EVIDENCE"),
    voteSeat("S3", 3, built.packet.provenance, "INSUFFICIENT_EVIDENCE"),
    voteSeat("S4", 4, built.packet.provenance, "ESCALATE", { urgency: "U2_WITHIN_24H" }),
  ]);
  const before = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(before.panel_recommendation, "INSUFFICIENT_EVIDENCE");
  (built.packet.seats[3] as SafetySeatVote).result.tuple.urgency = "U0_IMMEDIATE";
  resetNoChangeRevision(built, 3);
  refreshRevisionAuthority(built);
  refreshActionRelationVerifications(built);
  const after = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(after.panel_recommendation, "UNDERDETERMINED");
  assert.deepEqual(after.blocking_reasons, [
    "URGENT_ESCALATION_DISSENT_BLOCKS_NON_ESCALATION",
  ]);
});

test("clinical escalation veto blocks insufficient-evidence but provider SAFETY_BLOCK is only a non-vote", () => {
  const clinicalVeto = fixture();
  replaceSeats(clinicalVeto, [
    voteSeat("S1", 1, clinicalVeto.packet.provenance, "INSUFFICIENT_EVIDENCE"),
    voteSeat("S2", 2, clinicalVeto.packet.provenance, "INSUFFICIENT_EVIDENCE"),
    voteSeat("S3", 3, clinicalVeto.packet.provenance, "INSUFFICIENT_EVIDENCE"),
    voteSeat("S4", 4, clinicalVeto.packet.provenance, "ESCALATE", { veto: true }),
  ]);
  const blocked = summarizeClinicianSafetyPacket(clinicalVeto.packet, clinicalVeto.context);
  assert.equal(blocked.panel_recommendation, "UNDERDETERMINED");
  assert.deepEqual(blocked.blocking_reasons, [
    "CLINICAL_ESCALATION_VETO_BLOCKS_NON_ESCALATION",
  ]);

  const providerBlock = fixture();
  replaceSeats(providerBlock, [
    voteSeat("S1", 1, providerBlock.packet.provenance, "ESCALATE"),
    voteSeat("S2", 2, providerBlock.packet.provenance, "ESCALATE"),
    voteSeat("S3", 3, providerBlock.packet.provenance, "ESCALATE"),
    nonVoteSeat("S4", 4, providerBlock.packet.provenance, "SAFETY_BLOCK"),
  ]);
  const summary = summarizeClinicianSafetyPacket(providerBlock.packet, providerBlock.context);
  assert.equal(summary.panel_recommendation, "ESCALATE");
  assert.deepEqual(summary.clinical_escalation_veto_seat_ids, []);
  assert.deepEqual(summary.non_vote_groups.SAFETY_BLOCK, ["S4"]);
});

test("metamorphic: replacing a negative vote with provider failure cannot preserve DO_NOT_ESCALATE", () => {
  const built = fixture();
  replaceSeats(built, [
    voteSeat("S1", 1, built.packet.provenance, "DO_NOT_ESCALATE"),
    voteSeat("S2", 2, built.packet.provenance, "DO_NOT_ESCALATE"),
    voteSeat("S3", 3, built.packet.provenance, "DO_NOT_ESCALATE"),
    voteSeat("S4", 4, built.packet.provenance, "DO_NOT_ESCALATE"),
  ]);
  assert.equal(
    summarizeClinicianSafetyPacket(built.packet, built.context).panel_recommendation,
    "DO_NOT_ESCALATE",
  );
  built.packet.seats[3] = nonVoteSeat("S4", 4, built.packet.provenance, "TIMEOUT");
  refreshCallAuthority(built);
  const after = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(after.panel_recommendation, "UNDERDETERMINED");
  assert.deepEqual(after.blocking_reasons, [
    "DO_NOT_ESCALATE_REQUIRES_UNANIMOUS_VALID_PANEL",
  ]);
  assert.deepEqual(after.non_vote_groups.TIMEOUT, ["S4"]);
});

test("metamorphic: contradicted evidence cannot remain action-supporting", () => {
  const built = fixture();
  built.assertion.verified_entailment = "CONTRADICTED";
  built.assertion.unsupported_taxonomy = ["CONTRADICTED_BY_SOURCE"];
  refreshVerification(built);
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /SUPPORTS_ACTION requires verified ENTAILED/u,
  );
});

test("contradicted evidence cannot become action-opposing merely by relabeling the relation", () => {
  const built = fixture();
  const seat = built.packet.seats[0] as SafetySeatVote;
  seat.evidence_links[0].relation = "OPPOSES_ACTION";
  built.assertion.verified_entailment = "CONTRADICTED";
  built.assertion.unsupported_taxonomy = ["CONTRADICTED_BY_SOURCE"];
  refreshVerification(built);
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /OPPOSES_ACTION requires verified ENTAILED evidence authorized at exposure/u,
  );
});

test("local output policy is a schema declaration and rejects undeclared reasoning fields", () => {
  const built = fixture();
  assert.equal(
    built.packet.local_output_policy,
    "LOCAL_SCHEMA_STRUCTURED_ASSERTIONS_ONLY_NO_DEDICATED_CHAIN_OF_THOUGHT_FIELD",
  );
  const withUndeclaredField = {
    ...built.packet,
    chain_of_thought: "not permitted as a dedicated packet field",
  };
  assert.throws(
    () => validateClinicianSafetyPacket(withUndeclaredField, built.context),
    /unexpected keys: chain_of_thought/u,
  );
});

test("required case, run, codebook, ledger, and trusted-call provenance fail closed", () => {
  const missingRun = fixture();
  const malformed = structuredClone(missingRun.packet) as unknown as Record<string, unknown>;
  delete (malformed.provenance as Record<string, unknown>).run_id;
  assert.throws(
    () => validateClinicianSafetyPacket(malformed, missingRun.context),
    /missing keys: run_id/u,
  );

  const badLedger = fixture();
  badLedger.packet.provenance.ledger_head_sha256 = "not-a-hash";
  assert.throws(
    () => validateClinicianSafetyPacket(badLedger.packet, badLedger.context),
    /ledger_head_sha256 must be a lowercase SHA-256/u,
  );

  const unauthorizedCall = fixture();
  unauthorizedCall.context.authorized_seat_calls.pop();
  assert.throws(
    () => validateClinicianSafetyPacket(unauthorizedCall.packet, unauthorizedCall.context),
    /not present in trusted runtime authority context/u,
  );
});

test("trusted runtime context binds run, protocol, codebook, and ledger provenance", () => {
  for (const key of ["run_id", "protocol_version", "codebook_version"] as const) {
    const built = fixture();
    built.packet.provenance[key] = "tampered-" + key;
    assert.throws(
      () => validateClinicianSafetyPacket(built.packet, built.context),
      new RegExp("trusted runtime context " + key + " does not match", "u"),
      key,
    );
  }

  const ledger = fixture();
  ledger.packet.provenance.ledger_head_sha256 = sha256("tampered-ledger");
  assert.throws(
    () => validateClinicianSafetyPacket(ledger.packet, ledger.context),
    /trusted runtime context ledger_head_sha256 does not match/u,
  );

  const generated = fixture();
  generated.packet.provenance.generated_at = "2026-07-16T12:07:00.000Z";
  assert.throws(
    () => validateClinicianSafetyPacket(generated.packet, generated.context),
    /trusted runtime context generated_at does not match/u,
  );
});

test("human authority receipt cannot be revoked at decision authorization", () => {
  const built = fixture();
  const receipt = built.context.human_authority_receipts[0];
  receipt.revoked_at = "2026-07-16T11:59:00.000Z";
  const { authority_receipt_sha256: _oldHash, ...payload } = receipt;
  receipt.authority_receipt_sha256 = computeHumanAuthorityReceiptHash(payload);
  built.packet.human_decision_owner.authority_receipt_sha256 =
    receipt.authority_receipt_sha256;
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /invalid\/revoked at decision authorization time/u,
  );
});

test("authority expiry or revocation after evidence cutoff but before packet authorization fails", () => {
  for (const field of ["valid_until", "revoked_at"] as const) {
    const built = fixture();
    const receipt = built.context.human_authority_receipts[0];
    receipt[field] = "2026-07-16T12:03:00.000Z";
    const { authority_receipt_sha256: _oldHash, ...payload } = receipt;
    receipt.authority_receipt_sha256 = computeHumanAuthorityReceiptHash(payload);
    built.packet.human_decision_owner.authority_receipt_sha256 =
      receipt.authority_receipt_sha256;
    assert.throws(
      () => validateClinicianSafetyPacket(built.packet, built.context),
      /invalid\/revoked at decision authorization time/u,
      field,
    );
  }
});

test("assertion verification cannot be asserted retroactively after packet generation", () => {
  const built = fixture();
  built.assertion.verified_at = "2026-07-16T12:06:00.000Z";
  refreshVerification(built);
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /verification occurred after packet generation/u,
  );
});

test("complete evidence-record commitment rejects coherent text-metadata and timestamp rewrites", () => {
  const spanRewrite = fixture();
  spanRewrite.record.spans[0].speaker = "clinician";
  spanRewrite.assertion.speaker = "clinician";
  refreshVerification(spanRewrite);
  assert.throws(
    () => validateClinicianSafetyPacket(spanRewrite.packet, spanRewrite.context),
    /does not bind complete normalized metadata, text, and spans/u,
  );

  const timestampRewrite = fixture();
  timestampRewrite.record.source_created_at = "2026-07-16T11:44:00.000Z";
  assert.throws(
    () => validateClinicianSafetyPacket(timestampRewrite.packet, timestampRewrite.context),
    /does not bind complete normalized metadata, text, and spans/u,
  );
});

test("case-state commitment is order-invariant and cutoff-bound", () => {
  const built = fixture();
  const second = structuredClone(built.record);
  second.record_id = "record-2";
  second.spans[0].span_id = "span-2";
  second.record_sha256 = computeAuthorizedEvidenceRecordCommitment(second);
  assert.equal(
    computeSafetyCaseStateCommitment(
      built.packet.provenance.case_id,
      built.packet.provenance.decision_cutoff_at,
      [built.record, second],
    ),
    computeSafetyCaseStateCommitment(
      built.packet.provenance.case_id,
      built.packet.provenance.decision_cutoff_at,
      [second, built.record],
    ),
  );

  built.packet.provenance.decision_cutoff_at = "2026-07-16T11:59:59.000Z";
  built.context.decision_cutoff_at = built.packet.provenance.decision_cutoff_at;
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /case-state commitment does not match/u,
  );
});

test("decision-time evidence availability is derived rather than caller-declared", () => {
  const built = fixture();
  built.record.authorized_at = "2026-07-16T12:01:00.000Z";
  refreshEvidenceCommitments(built);
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /decision-time availability does not match source, ingestion, authorization/u,
  );
});

test("human authority requires a trusted, scoped, valid HUMAN issuer receipt", () => {
  const badHash = fixture();
  badHash.context.human_authority_receipts[0].authority_receipt_sha256 =
    sha256("forged-authority-receipt");
  assert.throws(
    () => validateClinicianSafetyPacket(badHash.packet, badHash.context),
    /hash does not bind the complete authority receipt/u,
  );

  const untrusted = fixture();
  const untrustedReceipt = untrusted.context.human_authority_receipts[0];
  untrustedReceipt.issuer_id = "untrusted-issuer";
  const { authority_receipt_sha256: _oldIssuerHash, ...untrustedPayload } =
    untrustedReceipt;
  untrustedReceipt.authority_receipt_sha256 =
    computeHumanAuthorityReceiptHash(untrustedPayload);
  untrusted.packet.human_decision_owner.authority_receipt_sha256 =
    untrustedReceipt.authority_receipt_sha256;
  assert.throws(
    () => validateClinicianSafetyPacket(untrusted.packet, untrusted.context),
    /issuer is not trusted/u,
  );

  const crossRun = fixture();
  const crossRunReceipt = crossRun.context.human_authority_receipts[0];
  crossRunReceipt.run_id = "run-other";
  const { authority_receipt_sha256: _oldRunHash, ...crossRunPayload } =
    crossRunReceipt;
  crossRunReceipt.authority_receipt_sha256 =
    computeHumanAuthorityReceiptHash(crossRunPayload);
  crossRun.packet.human_decision_owner.authority_receipt_sha256 =
    crossRunReceipt.authority_receipt_sha256;
  assert.throws(
    () => validateClinicianSafetyPacket(crossRun.packet, crossRun.context),
    /outside case\/run scope/u,
  );
});

test("assertion and action verifiers require authorized identity, method, version, and generator separation", () => {
  const selfVerified = fixture();
  selfVerified.assertion.generation_provenance.generator_id =
    selfVerified.assertion.verifier_id as string;
  refreshVerification(selfVerified);
  assert.throws(
    () => validateClinicianSafetyPacket(selfVerified.packet, selfVerified.context),
    /verifier identity, operator, and failure domain must be distinct/u,
  );

  const unauthorizedVersion = fixture();
  unauthorizedVersion.assertion.verifier_version = "2.0.0-unapproved";
  refreshVerification(unauthorizedVersion);
  assert.throws(
    () => validateClinicianSafetyPacket(unauthorizedVersion.packet, unauthorizedVersion.context),
    /identity, method, version, and purpose are not authorized/u,
  );

  const relationSelfCheck = fixture();
  relationSelfCheck.assertion.generation_provenance.generator_id =
    "action-relation-verifier";
  refreshVerification(relationSelfCheck);
  assert.throws(
    () => validateClinicianSafetyPacket(relationSelfCheck.packet, relationSelfCheck.context),
    /verifier identity, operator, and failure domain must be distinct/u,
  );

  const actionSelfCheck = fixture();
  actionSelfCheck.packet.seats[0].provenance.action_generator_id =
    "action-relation-verifier";
  refreshSeatCommitment(actionSelfCheck, 0);
  resetNoChangeRevision(actionSelfCheck, 0);
  refreshCallAuthority(actionSelfCheck);
  assert.throws(
    () => validateClinicianSafetyPacket(actionSelfCheck.packet, actionSelfCheck.context),
    /verifier identity, operator, and failure domain must be distinct/u,
  );
});

test("unsupported-cue revision preserves blind and revised outcomes with a typed certificate", () => {
  const built = fixture();
  const seat = built.packet.seats[3] as SafetySeatVote;
  const blind = structuredClone(seat.result);
  seat.result = canonicalVote("ESCALATE");
  setRevisionAudit(built, 3, blind, {
    changeBasis: "UNSUPPORTED_CUE",
    changedFields: ["ACTION", "SPECIALTIES", "URGENCY"],
    unsupportedCueCodes: ["CONSENSUS_CUE"],
  });
  refreshActionRelationVerifications(built);

  assert.doesNotThrow(() => validateClinicianSafetyPacket(built.packet, built.context));
  assert.equal(seat.blind_result.status, "VOTE");
  assert.equal(
    seat.blind_result.status === "VOTE" ? seat.blind_result.tuple.action : null,
    "DO_NOT_ESCALATE",
  );
  assert.equal(seat.result.tuple.action, "ESCALATE");
  assert.equal(
    summarizeClinicianSafetyPacket(built.packet, built.context).panel_recommendation,
    "ESCALATE",
  );
});

test("no-change resistance preserves unsupported-cue exposure independently of change basis", () => {
  const built = fixture();
  const seat = built.packet.seats[3];
  seat.exposure = exposureDescriptor(
    seat.seat_id,
    4,
    built.packet.provenance,
    seat.provenance,
    "FALSE_MAJORITY",
    [],
    ["CONSENSUS_CUE"],
  );
  resetNoChangeRevision(built, 3);
  refreshRevisionAuthority(built);

  assert.doesNotThrow(() => validateClinicianSafetyPacket(built.packet, built.context));
  assert.equal(seat.exposure.condition, "FALSE_MAJORITY");
  assert.deepEqual(
    seat.exposure.content_manifest.unsupported_cue_items.map((item) => item.cue_code),
    ["CONSENSUS_CUE"],
  );
  assert.equal(seat.revision_audit.change_certificate.change_basis, "NO_CHANGE");
  assert.deepEqual(seat.revision_audit.change_certificate.changed_fields, []);
  assert.deepEqual(seat.revision_audit.new_evidence_used_ids, []);
});

test("trusted revision receipts reject coherent blind/revised or exposure-history rewrites", () => {
  const coherentRewrite = fixture();
  const seat = coherentRewrite.packet.seats[0] as SafetySeatVote;
  seat.result = canonicalVote("DO_NOT_ESCALATE");
  resetNoChangeRevision(coherentRewrite, 0);
  refreshSeatCallAuthorityOnly(coherentRewrite);
  assert.throws(
    () => validateClinicianSafetyPacket(coherentRewrite.packet, coherentRewrite.context),
    /not present in trusted runtime revision receipts/u,
  );

  const exposureRewrite = fixture();
  exposureRewrite.packet.seats[0].revision_audit.exposure_sha256 =
    sha256("different-exposure");
  assert.throws(
    () => validateClinicianSafetyPacket(exposureRewrite.packet, exposureRewrite.context),
    /does not bind the exact authorized exposure descriptor/u,
  );

  const blindRewrite = fixture();
  blindRewrite.packet.seats[0].blind_result = canonicalVote("DO_NOT_ESCALATE");
  assert.throws(
    () => validateClinicianSafetyPacket(blindRewrite.packet, blindRewrite.context),
    /blind_provenance.output_sha256 does not bind|blind result hash does not bind/u,
  );
});

test("blind and revised outcomes require distinct phase-bound call provenance", () => {
  const built = fixture();
  for (const seat of built.packet.seats) {
    assert.equal(seat.blind_provenance.phase, "BLIND");
    assert.equal(seat.provenance.phase, "REVISED");
    assert.notEqual(seat.blind_provenance.session_id, seat.provenance.session_id);
    assert.notEqual(
      seat.blind_provenance.call_commitment_sha256,
      seat.provenance.call_commitment_sha256,
    );
  }

  const phaseRelabel = fixture();
  phaseRelabel.packet.seats[0].blind_provenance.phase = "REVISED";
  assert.throws(
    () => validateClinicianSafetyPacket(phaseRelabel.packet, phaseRelabel.context),
    /phase must be BLIND/u,
  );

  const callRewrite = fixture();
  callRewrite.packet.seats[0].revision_audit.blind_call_commitment_sha256 =
    callRewrite.packet.seats[0].provenance.call_commitment_sha256;
  assert.throws(
    () => validateClinicianSafetyPacket(callRewrite.packet, callRewrite.context),
    /does not bind the exact blind and revised call commitments/u,
  );
});

test("unused trusted verification or call receipts are rejected", () => {
  const extraAssertionReceipt = fixture();
  extraAssertionReceipt.context.assertion_verifications.push({
    ...structuredClone(extraAssertionReceipt.context.assertion_verifications[0]),
    verification_id: "unused-verification",
  });
  assert.throws(
    () => validateClinicianSafetyPacket(
      extraAssertionReceipt.packet,
      extraAssertionReceipt.context,
    ),
    /must exactly match packet assertions/u,
  );

  const extraCallReceipt = fixture();
  const extra = structuredClone(extraCallReceipt.context.authorized_seat_calls[0]);
  extra.observation_id = "unused-observation";
  extra.session_id = "unused-session";
  extra.call_commitment_sha256 = computeSafetySeatCallCommitment({
    seat_id: extra.seat_id,
    phase: extra.phase,
    assignment_id: extra.assignment_id,
    action_generator_id: extra.action_generator_id,
    action_generator_operator_id: extra.action_generator_operator_id,
    action_generator_failure_domain_id: extra.action_generator_failure_domain_id,
    case_id: extra.case_id,
    case_state_sha256: extra.case_state_sha256,
    run_id: extra.run_id,
    protocol_version: extra.protocol_version,
    codebook_version: extra.codebook_version,
    ledger_head_sha256: extra.ledger_head_sha256,
    observation_id: extra.observation_id,
    session_id: extra.session_id,
    prompt_sha256: extra.prompt_sha256,
    input_sha256: extra.input_sha256,
    provider: extra.provider,
    model: extra.model,
    effort: extra.effort,
    observed_at: extra.observed_at,
    provider_call_receipt_sha256: extra.provider_call_receipt_sha256,
    output_sha256: extra.output_sha256,
  });
  extraCallReceipt.context.authorized_seat_calls.push(extra);
  assert.throws(
    () => validateClinicianSafetyPacket(extraCallReceipt.packet, extraCallReceipt.context),
    /must exactly match blind and revised calls/u,
  );
});

test("typed revision certificate cannot hide an unsupported-cue change or invent new evidence", () => {
  const hiddenCue = fixture();
  const seat = hiddenCue.packet.seats[3] as SafetySeatVote;
  const blind = structuredClone(seat.result);
  seat.result = canonicalVote("ESCALATE");
  setRevisionAudit(hiddenCue, 3, blind, {
    changeBasis: "UNSUPPORTED_CUE",
    changedFields: ["ACTION", "SPECIALTIES", "URGENCY"],
    unsupportedCueCodes: ["CONSENSUS_CUE"],
  });
  seat.revision_audit.change_certificate.change_basis = "NO_CHANGE";
  const { revision_commitment_sha256: _oldCommitment, ...payload } =
    seat.revision_audit;
  seat.revision_audit.revision_commitment_sha256 =
    computeSafetyRevisionCommitment(payload);
  refreshRevisionAuthority(hiddenCue);
  assert.throws(
    () => validateClinicianSafetyPacket(hiddenCue.packet, hiddenCue.context),
    /change basis conflicts/u,
  );

  const inventedEvidence = fixture();
  inventedEvidence.packet.seats[0].revision_audit.new_evidence_used_ids = ["A1"];
  const { revision_commitment_sha256: _oldEvidenceCommitment, ...evidencePayload } =
    inventedEvidence.packet.seats[0].revision_audit;
  inventedEvidence.packet.seats[0].revision_audit.revision_commitment_sha256 =
    computeSafetyRevisionCommitment(evidencePayload);
  refreshRevisionAuthority(inventedEvidence);
  assert.throws(
    () => validateClinicianSafetyPacket(inventedEvidence.packet, inventedEvidence.context),
    /must equal revised minus blind evidence references/u,
  );
});

test("changed control and evidence-arm outcomes permit neutral unattributed reconsideration", () => {
  for (const exposureCondition of ["CONTROL", "VALID_EVIDENCE"] as const) {
    const built = fixture();
    const seat = built.packet.seats[3] as SafetySeatVote;
    const blind = structuredClone(seat.result);
    seat.result = canonicalVote("ESCALATE");
    setRevisionAudit(built, 3, blind, {
      changeBasis: "UNATTRIBUTED_RECONSIDERATION",
      changedFields: ["ACTION", "SPECIALTIES", "URGENCY"],
      exposureCondition,
      presentedEvidenceIds: exposureCondition === "VALID_EVIDENCE" ? ["A1"] : [],
      newEvidenceIds: [],
    });
    assert.doesNotThrow(
      () => validateClinicianSafetyPacket(built.packet, built.context),
      exposureCondition,
    );
    assert.equal(
      seat.revision_audit.change_certificate.change_basis,
      "UNATTRIBUTED_RECONSIDERATION",
    );
    assert.deepEqual(seat.revision_audit.new_evidence_used_ids, []);
    assert.deepEqual(
      seat.revision_audit.change_certificate.attributed_unsupported_cue_codes,
      [],
    );
  }
});

test("exposure descriptors preserve the exact E2 valid-versus-irrelevant evidence arms", () => {
  const irrelevant = fixture();
  const seat = irrelevant.packet.seats[0];
  seat.exposure = exposureDescriptor(
    seat.seat_id,
    1,
    irrelevant.packet.provenance,
    seat.provenance,
    "IRRELEVANT_EVIDENCE",
    ["A1"],
  );
  resetNoChangeRevision(irrelevant, 0);
  refreshRevisionAuthority(irrelevant);
  assert.doesNotThrow(() => validateClinicianSafetyPacket(irrelevant.packet, irrelevant.context));
  assert.equal(
    seat.exposure.content_manifest.evidence_items[0].evidence_class,
    "IRRELEVANT_EVIDENCE",
  );

  seat.exposure.condition = "VALID_EVIDENCE";
  assert.throws(
    () => validateClinicianSafetyPacket(irrelevant.packet, irrelevant.context),
    /conflicts with the exact E2 assignment condition/u,
  );
});

test("exposure content is recomputable and bound to revised prompt and input", () => {
  const contentTamper = fixture();
  const seat = contentTamper.packet.seats[0];
  seat.exposure = exposureDescriptor(
    seat.seat_id,
    1,
    contentTamper.packet.provenance,
    seat.provenance,
    "VALID_EVIDENCE",
    ["A1"],
  );
  resetNoChangeRevision(contentTamper, 0);
  refreshRevisionAuthority(contentTamper);
  seat.exposure.content_manifest.evidence_items[0].presented_text = "altered content";
  assert.throws(
    () => validateClinicianSafetyPacket(contentTamper.packet, contentTamper.context),
    /presented_text must equal the bound assertion claim|not recomputable/u,
  );

  const inputTamper = fixture();
  inputTamper.packet.seats[0].exposure.revised_input_sha256 = sha256("other-input");
  assert.throws(
    () => validateClinicianSafetyPacket(inputTamper.packet, inputTamper.context),
    /prompt\/input binding does not match revised call commitment/u,
  );
});

test("exposed evidence must remain authorized at exposed_at", () => {
  const built = fixture();
  built.record.authorization_revoked_at = "2026-07-16T11:59:20.000Z";
  built.assertion.available_at_decision_time = false;
  built.assertion.unsupported_taxonomy = ["NOT_AVAILABLE_AT_DECISION_TIME"];
  refreshEvidenceCommitments(built);
  const seat = built.packet.seats[0];
  seat.exposure = exposureDescriptor(
    seat.seat_id,
    1,
    built.packet.provenance,
    seat.provenance,
    "VALID_EVIDENCE",
    ["A1"],
  );
  resetNoChangeRevision(built, 0);
  refreshRevisionAuthority(built);
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /evidence is not verified and authorized at exposed_at/u,
  );
});

test("verifier registry separation rejects shared operators and shared failure domains", () => {
  const sharedOperator = fixture();
  sharedOperator.assertion.generation_provenance.operator_id =
    sharedOperator.assertion.verifier_operator_id as string;
  refreshVerification(sharedOperator);
  assert.throws(
    () => validateClinicianSafetyPacket(sharedOperator.packet, sharedOperator.context),
    /identity, operator, and failure domain must be distinct/u,
  );

  const sharedDomain = fixture();
  sharedDomain.assertion.generation_provenance.failure_domain_id =
    sharedDomain.assertion.verifier_failure_domain_id as string;
  refreshVerification(sharedDomain);
  assert.throws(
    () => validateClinicianSafetyPacket(sharedDomain.packet, sharedDomain.context),
    /identity, operator, and failure domain must be distinct/u,
  );

  const actionSharedDomain = fixture();
  actionSharedDomain.packet.seats[0].provenance.action_generator_failure_domain_id =
    "action-verifier-domain";
  refreshSeatCommitment(actionSharedDomain, 0);
  resetNoChangeRevision(actionSharedDomain, 0);
  refreshCallAuthority(actionSharedDomain);
  assert.throws(
    () => validateClinicianSafetyPacket(actionSharedDomain.packet, actionSharedDomain.context),
    /identity, operator, and failure domain must be distinct/u,
  );
});

test("human authority receipt must permit the requested decision-support action", () => {
  const built = fixture();
  const receipt = built.context.human_authority_receipts[0];
  receipt.permitted_action_scope = ["REVIEW_ESCALATION_RECOMMENDATION"];
  const { authority_receipt_sha256: _oldHash, ...payload } = receipt;
  receipt.authority_receipt_sha256 = computeHumanAuthorityReceiptHash(payload);
  built.packet.human_decision_owner.authority_receipt_sha256 =
    receipt.authority_receipt_sha256;
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /does not authorize requested decision-support action/u,
  );
});

test("seat call commitments cross-bind provider receipt and canonical output hashes", () => {
  const built = fixture();
  for (const seat of built.packet.seats) {
    assert.notEqual(
      seat.blind_provenance.provider_call_receipt_sha256,
      seat.provenance.provider_call_receipt_sha256,
    );
    assert.equal(
      seat.blind_provenance.output_sha256,
      computeSafetyResultHash(seat.blind_result),
    );
    assert.equal(seat.provenance.output_sha256, computeSafetyResultHash(seat.result));
  }

  const receiptTamper = fixture();
  receiptTamper.packet.seats[0].provenance.provider_call_receipt_sha256 =
    sha256("different-provider-receipt");
  assert.throws(
    () => validateClinicianSafetyPacket(receiptTamper.packet, receiptTamper.context),
    /call commitment does not bind the exact seat and call provenance/u,
  );

  const outputTamper = fixture();
  outputTamper.packet.seats[0].provenance.output_sha256 = sha256("different-output");
  const revised = outputTamper.packet.seats[0].provenance;
  revised.call_commitment_sha256 = computeSafetySeatCallCommitment({
    seat_id: outputTamper.packet.seats[0].seat_id,
    phase: revised.phase,
    assignment_id: revised.assignment_id,
    action_generator_id: revised.action_generator_id,
    action_generator_operator_id: revised.action_generator_operator_id,
    action_generator_failure_domain_id: revised.action_generator_failure_domain_id,
    case_id: outputTamper.packet.provenance.case_id,
    case_state_sha256: outputTamper.packet.provenance.case_state_sha256,
    run_id: outputTamper.packet.provenance.run_id,
    protocol_version: outputTamper.packet.provenance.protocol_version,
    codebook_version: outputTamper.packet.provenance.codebook_version,
    ledger_head_sha256: outputTamper.packet.provenance.ledger_head_sha256,
    observation_id: revised.observation_id,
    session_id: revised.session_id,
    prompt_sha256: revised.prompt_sha256,
    input_sha256: revised.input_sha256,
    provider: revised.provider,
    model: revised.model,
    effort: revised.effort,
    observed_at: revised.observed_at,
    provider_call_receipt_sha256: revised.provider_call_receipt_sha256,
    output_sha256: revised.output_sha256,
  });
  refreshSeatCallAuthorityOnly(outputTamper);
  assert.throws(
    () => validateClinicianSafetyPacket(outputTamper.packet, outputTamper.context),
    /output_sha256 does not bind the revised result/u,
  );
});

test("accepted-packet taxonomy excludes attribute mismatches that fail validation", () => {
  assert.deepEqual(UNSUPPORTED_ASSERTION_TAXONOMY, [
    "MISSING_SUPPORT_POINTER",
    "NOT_AVAILABLE_AT_DECISION_TIME",
    "CONTRADICTED_BY_SOURCE",
    "COMPOSITE_CLAIM_NOT_ENTAILED",
  ]);
  const built = fixture();
  built.assertion.unsupported_taxonomy = [
    "POLARITY_MISMATCH" as (typeof UNSUPPORTED_ASSERTION_TAXONOMY)[number],
  ];
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /unsupported_taxonomy contains an invalid code/u,
  );
  assert.equal(
    built.packet.assertion_rejection_boundary,
    SAFETY_ASSERTION_REJECTION_BOUNDARY,
  );
});
