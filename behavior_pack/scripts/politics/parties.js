import { MAX_PARTIES } from "./politics-data.js";
import { markDirty } from "../core/data-store.js";

export function getParty(store, partyId) {
  return (store.parties || []).find((p) => p.id === partyId) || null;
}

export function listParties(store) {
  return store.parties || [];
}

export function registerParty(store, party) {
  if (!party?.id || !party?.name) return { ok: false, error: "invalid_party" };
  if (getParty(store, party.id)) return { ok: false, error: "duplicate" };
  if ((store.parties || []).length >= MAX_PARTIES) return { ok: false, error: "cap" };
  store.parties.push({
    id: party.id,
    name: party.name,
    economicPriority: clamp(party.economicPriority ?? 50),
    welfarePriority: clamp(party.welfarePriority ?? 50),
    safetyPriority: clamp(party.safetyPriority ?? 50),
    educationPriority: clamp(party.educationPriority ?? 50),
    healthcarePriority: clamp(party.healthcarePriority ?? 50),
    infrastructurePriority: clamp(party.infrastructurePriority ?? 50),
    utilityPriority: clamp(party.utilityPriority ?? 50)
  });
  markDirty();
  return { ok: true };
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}
