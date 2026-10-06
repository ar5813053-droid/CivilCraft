import { MAX_PARTICIPANTS } from "./event-instances.js";
import { getPersonality } from "../citizenai/citizen-ai-manager.js";

/**
 * Select participant IDs from real villager records. No full object copies.
 */
export function selectParticipants(data, def, settlementId = "settlement_main") {
  const ids = Object.keys(data.villagers || {});
  const scored = [];
  for (const id of ids) {
    const v = data.villagers[id];
    if (!v || v.alive === false) continue;
    let score = 50;
    try {
      const p = getPersonality(id);
      if (def.category === "festival" || def.category === "social") score += (p.sociability || 50) * 0.3;
      if (def.category === "election" || def.category === "government") score += (p.civicDuty || 50) * 0.4;
      if (def.category === "community") score += (p.familyFocus || 50) * 0.2;
    } catch {
      /* citizen AI optional */
    }
    scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const cap = Math.min(def.maxParticipants || 20, MAX_PARTICIPANTS);
  return scored.slice(0, cap).map((s) => s.id);
}

export function addParticipant(instance, citizenId) {
  if (!instance || !citizenId) return false;
  if (instance.participantIds.includes(citizenId)) return false;
  if (instance.participantIds.length >= MAX_PARTICIPANTS) return false;
  instance.participantIds.push(citizenId);
  return true;
}

export function removeParticipant(instance, citizenId) {
  if (!instance) return false;
  const i = instance.participantIds.indexOf(citizenId);
  if (i < 0) return false;
  instance.participantIds.splice(i, 1);
  return true;
}
