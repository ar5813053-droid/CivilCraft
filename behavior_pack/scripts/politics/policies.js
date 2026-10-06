import { getParty } from "./parties.js";
import { markDirty } from "../core/data-store.js";

/**
 * Apply bounded policy modifiers to government tax/budget config.
 * Does not collect taxes; only adjusts policy knobs.
 */
export function applyRulingPolicy(store, government, partyId) {
  if (!government) return { ok: false };
  const party = getParty(store, partyId);
  if (!party) return { ok: false, error: "unknown_party" };
  government.rulingPartyId = partyId;
  if (!government.policy) government.policy = {};
  // Bounded tax rate influence: 5–15%
  const taxBias = (party.economicPriority - 50) / 100;
  const baseRate = government.policy.incomeTaxRate ?? 0.1;
  government.policy.incomeTaxRate = Math.max(0.05, Math.min(0.15, Math.round((baseRate + taxBias * 0.02) * 1000) / 1000));
  government.policy.welfarePriority = party.welfarePriority;
  government.policy.safetyPriority = party.safetyPriority;
  government.policy.educationPriority = party.educationPriority;
  government.policy.healthcarePriority = party.healthcarePriority;
  government.policy.infrastructurePriority = party.infrastructurePriority;
  markDirty();
  return { ok: true, taxRate: government.policy.incomeTaxRate };
}
