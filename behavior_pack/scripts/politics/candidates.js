import { MAX_CANDIDATES } from "./politics-data.js";
import { getParty } from "./parties.js";
import { jobEligible, lifeStage } from "../population/population-data.js";
import { markDirty } from "../core/data-store.js";

export function isEligibleCandidate(villager, educationLevel = "none") {
  if (!villager || villager.alive === false) return false;
  if (!jobEligible(villager.age ?? 30)) return false;
  const stage = villager.lifeStage || lifeStage(villager.age);
  if (["infant", "child", "teenager"].includes(stage)) return false;
  const eduOrder = ["none", "primary", "secondary", "vocational", "advanced"];
  if (eduOrder.indexOf(educationLevel || "none") < 1) return false;
  return true;
}

export function registerCandidate(store, input) {
  const { villagerId, partyId, office = "mayor", villager, educationLevel } = input;
  if (!villagerId || !partyId) return { ok: false, error: "invalid" };
  if (!getParty(store, partyId)) return { ok: false, error: "unknown_party" };
  if (!isEligibleCandidate(villager, educationLevel)) return { ok: false, error: "ineligible" };
  if ((store.candidates || []).some((c) => c.villagerId === villagerId && c.office === office)) {
    return { ok: false, error: "duplicate" };
  }
  if ((store.candidates || []).length >= MAX_CANDIDATES) return { ok: false, error: "cap" };
  const candidate = {
    id: `cand_${villagerId}_${office}`,
    villagerId,
    partyId,
    office,
    campaignStrength: 50,
    popularity: 50,
    eligibility: true
  };
  store.candidates.push(candidate);
  markDirty();
  return { ok: true, candidate };
}
