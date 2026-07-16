import assert from "node:assert/strict";
import test from "node:test";
import {
  SAFETY_PACKET_AUTHORITY,
  SAFETY_PACKET_LOCAL_OUTPUT_POLICY,
  computeSafetyAssertionVerificationHash,
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
  type NonVoteReason,
  type SafetyAssertion,
  type SafetyPacketProvenance,
  type SafetySeatNonVote,
  type SafetySeatOutcome,
  type SafetySeatProvenance,
  type SafetySeatVote,
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
    run_id: "run-1",
    protocol_version: "tribunal-clinical-protocol-v0.2",
    codebook_version: "tribunal-clinical-codebook-v0.1",
    ledger_head_sha256: sha256("ledger-head-1"),
    generated_at: "2026-07-16T12:05:00.000Z",
  };
}

function seatProvenance(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
): SafetySeatProvenance {
  const base = {
    seat_id: seatId,
    case_id: packet.case_id,
    case_state_sha256: packet.case_state_sha256,
    run_id: packet.run_id,
    protocol_version: packet.protocol_version,
    codebook_version: packet.codebook_version,
    ledger_head_sha256: packet.ledger_head_sha256,
    observation_id: "observation-" + seatId,
    session_id: "session-" + seatId,
    prompt_sha256: sha256("prompt-" + seatId),
    input_sha256: sha256("input-" + seatId),
    provider: "scripted-provider",
    model: "scripted-model",
    effort: "deterministic",
    observed_at: "2026-07-16T12:00:0" + index + ".000Z",
  };
  return {
    observation_id: base.observation_id,
    session_id: base.session_id,
    prompt_sha256: base.prompt_sha256,
    input_sha256: base.input_sha256,
    provider: base.provider,
    model: base.model,
    effort: base.effort,
    observed_at: base.observed_at,
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
  return {
    seat_id: seatId,
    result: canonicalVote(action, options.urgency),
    clinical_escalation_veto: {
      activated: options.veto ?? false,
      assertion_ids: options.veto ? ["A1"] : [],
    },
    evidence_links: [{
      assertion_id: "A1",
      relation: "SUPPORTS_ACTION",
      relation_verification_id: "relation-" + seatId + "-A1",
    }],
    provenance: seatProvenance(seatId, index, packet),
  };
}

function nonVoteSeat(
  seatId: string,
  index: number,
  packet: SafetyPacketProvenance,
  reason: NonVoteReason,
): SafetySeatNonVote {
  return {
    seat_id: seatId,
    result: { status: "NON_VOTE", reason },
    provenance: seatProvenance(seatId, index, packet),
  };
}

function authorizedCall(
  seat: SafetySeatOutcome,
  packet: SafetyPacketProvenance,
): AuthorizedSafetySeatCall {
  return {
    seat_id: seat.seat_id,
    case_id: packet.case_id,
    case_state_sha256: packet.case_state_sha256,
    run_id: packet.run_id,
    protocol_version: packet.protocol_version,
    codebook_version: packet.codebook_version,
    ledger_head_sha256: packet.ledger_head_sha256,
    observation_id: seat.provenance.observation_id,
    session_id: seat.provenance.session_id,
    prompt_sha256: seat.provenance.prompt_sha256,
    input_sha256: seat.provenance.input_sha256,
    provider: seat.provenance.provider,
    model: seat.provenance.model,
    effort: seat.provenance.effort,
    observed_at: seat.provenance.observed_at,
    call_commitment_sha256: seat.provenance.call_commitment_sha256,
  };
}

function refreshSeatCommitment(fixture: Fixture, index: number): void {
  const seat = fixture.packet.seats[index];
  seat.provenance.call_commitment_sha256 = computeSafetySeatCallCommitment({
    seat_id: seat.seat_id,
    case_id: fixture.packet.provenance.case_id,
    case_state_sha256: fixture.packet.provenance.case_state_sha256,
    run_id: fixture.packet.provenance.run_id,
    protocol_version: fixture.packet.provenance.protocol_version,
    codebook_version: fixture.packet.provenance.codebook_version,
    ledger_head_sha256: fixture.packet.provenance.ledger_head_sha256,
    observation_id: seat.provenance.observation_id,
    session_id: seat.provenance.session_id,
    prompt_sha256: seat.provenance.prompt_sha256,
    input_sha256: seat.provenance.input_sha256,
    provider: seat.provenance.provider,
    model: seat.provenance.model,
    effort: seat.provenance.effort,
    observed_at: seat.provenance.observed_at,
  });
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
  fixture.context.authorized_seat_calls = fixture.packet.seats.map((seat) =>
    authorizedCall(seat, fixture.packet.provenance),
  );
  refreshActionRelationVerifications(fixture);
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
    case_state_sha256: provenance.case_state_sha256,
    record_id: "record-1",
    source: "patient-transcript",
    canonical_text: text,
    record_sha256: sha256(text),
    available_at_decision_time: true,
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
    verified_at: "2026-07-16T11:59:00.000Z",
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
    local_output_policy: SAFETY_PACKET_LOCAL_OUTPUT_POLICY,
    provenance,
    human_decision_owner: {
      principal_id: "clinician-1",
      role: "attending physician",
      authority_record_id: "auth-record-1",
    },
    assertions: [assertion],
    seats,
  };
  const context: ClinicianSafetyValidationContext = {
    case_id: provenance.case_id,
    case_state_sha256: provenance.case_state_sha256,
    run_id: provenance.run_id,
    protocol_version: provenance.protocol_version,
    codebook_version: provenance.codebook_version,
    ledger_head_sha256: provenance.ledger_head_sha256,
    generated_at: provenance.generated_at,
    evidence_records: [record],
    authenticated_humans: [{
      principal_id: "clinician-1",
      role: "attending physician",
      authority_record_id: "auth-record-1",
      authenticated_at: "2026-07-16T11:58:00.000Z",
    }],
    authorized_seat_calls: seats.map((seat) => authorizedCall(seat, provenance)),
    assertion_verifications: [],
    action_relation_verifications: [],
  };
  const built = { packet, context, record, assertion };
  refreshVerification(built);
  return built;
}

test("valid packet uses canonical full tuples and trusted runtime contexts", () => {
  const built = fixture();
  assert.doesNotThrow(() => validateClinicianSafetyPacket(built.packet, built.context));
  const summary = summarizeClinicianSafetyPacket(built.packet, built.context);
  assert.equal(summary.panel_recommendation, "ESCALATE");
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
    /cross-case or stale case-state splice/u,
  );
});

test("contradictory exact quote metadata and source identity mismatches fail closed", () => {
  const contradicted = fixture();
  const exactText = "Chest pain is absent";
  contradicted.record.canonical_text = exactText;
  contradicted.record.record_sha256 = sha256(exactText);
  contradicted.record.spans[0].end_char = exactText.length;
  contradicted.record.spans[0].polarity = "NEGATED";
  const pointer = contradicted.assertion.support_pointer as NonNullable<SafetyAssertion["support_pointer"]>;
  pointer.record_sha256 = contradicted.record.record_sha256;
  pointer.quoted_text = exactText;
  pointer.end_char = exactText.length;
  refreshVerification(contradicted);
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
  stale.record.available_at_decision_time = false;
  stale.assertion.available_at_decision_time = false;
  stale.assertion.unsupported_taxonomy = ["NOT_AVAILABLE_AT_DECISION_TIME"];
  refreshVerification(stale);
  assert.throws(
    () => validateClinicianSafetyPacket(stale.packet, stale.context),
    /verified ENTAILED|stale evidence/u,
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
    role: "model",
    authority_record_id: "made-up-record",
  };
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /not present in trusted authenticated runtime authority context/u,
  );
});

test("seat call provenance rejects duplicate observation and session relabeling", () => {
  const duplicateObservation = fixture();
  duplicateObservation.packet.seats[1].provenance.observation_id =
    duplicateObservation.packet.seats[0].provenance.observation_id;
  refreshSeatCommitment(duplicateObservation, 1);
  refreshCallAuthority(duplicateObservation);
  assert.throws(
    () => validateClinicianSafetyPacket(duplicateObservation.packet, duplicateObservation.context),
    /observation identifiers must be unique/u,
  );

  const duplicateSession = fixture();
  duplicateSession.packet.seats[1].provenance.session_id =
    duplicateSession.packet.seats[0].provenance.session_id;
  refreshSeatCommitment(duplicateSession, 1);
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
    /OPPOSES_ACTION requires verified ENTAILED decision-time evidence/u,
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

test("human authority cannot be asserted retroactively after packet generation", () => {
  const built = fixture();
  built.context.authenticated_humans[0].authenticated_at = "2026-07-16T12:06:00.000Z";
  assert.throws(
    () => validateClinicianSafetyPacket(built.packet, built.context),
    /authenticated after packet generation/u,
  );
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
