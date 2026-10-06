/**
 * Deterministic automatic candidate seeding for elections.
 */

import { registerCandidate, isEligibleCandidate } from "./candidates.js";
import { listParties } from "./parties.js";
import { MAX_CANDIDATES } from "./politics-data.js";
import { markDirty } from "../core/data-store.js";

const MAX_SEED_PER_CYCLE = 4;

/**
 * Seed up to MAX_SEED_PER_CYCLE eligible candidates across parties.
 */
export function seedCandidates(store, villagers, educationMap = {}) {
  if (!store || !villagers?.length) return { seeded: 0 };
  if ((store.candidates || []).length >= MAX_CANDIDATES) return { seeded: 0 };
  const parties = listParties(store);
  if (!parties.length) return { seeded: 0 };
  const existing = new Set((store.candidates || []).map((c) => c.villagerId));
  const adults = villagers
    .filter((v) => v && v.alive !== false && isEligibleCandidate(v, educationMap[v.id] || "primary"))
    .filter((v) => !existing.has(v.id))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  let seeded = 0;
  for (let i = 0; i < adults.length && seeded < MAX_SEED_PER_CYCLE; i++) {
    const v = adults[i];
    const party = parties[i % parties.length];
    const r = registerCandidate(store, {
      villagerId: v.id,
      partyId: party.id,
      office: "mayor",
      villager: v,
      educationLevel: educationMap[v.id] || "primary"
    });
    if (r.ok) seeded += 1;
  }
  if (seeded) markDirty();
  return { seeded };
}
