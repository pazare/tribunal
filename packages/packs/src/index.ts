import type { Pack } from "@tribunal/kernel";
import { LENDING_PACK } from "./lending.js";
import { INSURANCE_PACK } from "./insurance.js";
import { BENEFITS_PACK } from "./benefits.js";
import { MODERATION_PACK } from "./moderation.js";

/**
 * The pack registry. Each pack is a real, documented high-stakes decision
 * workflow with (a) a citable problem statement, (b) a realistic case record,
 * (c) a planted trap that a lazy single-pass answer tends to swallow, and
 * (d) decision slots the panel resolves one ratified span at a time.
 *
 * Add new packs by importing them here. Do NOT remove or reorder existing ids —
 * recorded runs in runs/ reference packs by id.
 */
export const PACKS: Pack[] = [LENDING_PACK, INSURANCE_PACK, BENEFITS_PACK, MODERATION_PACK];

export { LENDING_PACK, INSURANCE_PACK, BENEFITS_PACK, MODERATION_PACK };
