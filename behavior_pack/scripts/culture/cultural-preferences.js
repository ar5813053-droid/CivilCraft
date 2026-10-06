/**
 * Compact cultural preferences from citizen ID + personality.
 * Simulated participation only — no real-world religious profiling.
 */

import { hashId } from "../citizenai/personality.js";

export const PREF_KEYS = Object.freeze([
  "festivalParticipation",
  "familyEvents",
  "communityEvents",
  "marketEvents",
  "observance",
  "sports",
  "music",
  "food",
  "charity"
]);

export function generateCulturalPreferences(citizenId, personality = {}) {
  const prefs = {};
  for (const k of PREF_KEYS) {
    const base = hashId(`${citizenId}::culture::${k}`) % 101;
    let mod = 0;
    if (k === "festivalParticipation" || k === "communityEvents") mod = ((personality.sociability || 50) - 50) * 0.2;
    if (k === "familyEvents") mod = ((personality.familyFocus || 50) - 50) * 0.3;
    if (k === "observance" || k === "charity") mod = ((personality.civicDuty || 50) - 50) * 0.2;
    if (k === "marketEvents") mod = ((personality.curiosity || 50) - 50) * 0.15;
    prefs[k] = Math.max(0, Math.min(100, Math.round(base + mod)));
  }
  return prefs;
}

/** Score 0–100 for joining a festival category */
export function participationScore(prefs, festival, personality = {}) {
  if (!prefs) return 40;
  let s = prefs.festivalParticipation || 40;
  if (festival.category === "family") s += (prefs.familyEvents || 40) * 0.3;
  if (festival.category === "community" || festival.category === "cultural") s += (prefs.communityEvents || 40) * 0.25;
  if (festival.category === "market" || festival.category === "harvest") s += (prefs.marketEvents || 40) * 0.2;
  if (festival.fastingAware) s = s * 0.5 + (prefs.observance || 40) * 0.5;
  s += ((personality.sociability || 50) - 50) * 0.15;
  return Math.max(0, Math.min(100, Math.round(s)));
}
