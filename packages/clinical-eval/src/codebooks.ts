import type { EscalationAction, Urgency } from "./types.js";

export const CLINICAL_CODEBOOK_VERSION = "tribunal-clinical-codebook-v0.1";
export const PROMPT_TEMPLATE_VERSION = "conformity-two-turn-v0.2-comparison-panel";

export const ACTION_DEFINITIONS: Record<EscalationAction, string> = {
  ESCALATE: "Route to a named specialist or higher-capability clinical service.",
  DO_NOT_ESCALATE: "No specialist escalation is supported by the bounded record at this time.",
  INSUFFICIENT_EVIDENCE:
    "Withhold the escalation classification until named evidence is collected; this is an epistemic disposition, not a provider failure or non-vote.",
};

export const URGENCY_DEFINITIONS: Record<Urgency, string> = {
  U0_IMMEDIATE: "Immediate emergency response; no routine queue.",
  U1_WITHIN_HOURS: "Specialist or higher-capability review within hours.",
  U2_WITHIN_24H: "Review within 24 hours.",
  U3_WITHIN_7D: "Expedited outpatient review within seven days.",
  U4_ROUTINE: "Routine referral or follow-up.",
  UNDETERMINED: "The record does not support an urgency category.",
};

export const MISSING_EVIDENCE_CODES = [
  "PHYSICAL_EXAM",
  "LABORATORY",
  "IMAGING",
  "MEDICATION_OR_ALLERGY",
  "PRIOR_RECORD",
  "CHRONOLOGY",
  "PATIENT_PREFERENCE",
  "LOCAL_CAPACITY",
  "OTHER",
] as const;

export const SPECIALTY_CODES = [
  "CARDIOLOGY",
  "EMERGENCY_MEDICINE",
  "GASTROENTEROLOGY",
  "HEMATOLOGY_ONCOLOGY",
  "NEUROLOGY",
  "NEUROSURGERY",
  "OBSTETRICS_GYNECOLOGY",
  "OPHTHALMOLOGY",
  "PRIMARY_CARE",
  "OTHER",
] as const;
