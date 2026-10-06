/**
 * Festival appearance selection — priority above profession when participating.
 * Deterministic variants via hash(villagerId + festivalId + role).
 */

import { hashId } from "../civilization/appearance.js";
import { ROLE_APPEARANCE } from "../civilization/appearance.js";

/** Keys must match resource-pack Texture.* names and ROLE_INDEX entries */
export const FESTIVAL_APPEARANCE = Object.freeze({
  christmas: {
    civilian: "festival_christmas_civilian",
    farmer: "festival_christmas_farmer",
    worker: "festival_christmas_worker",
    police_officer: "festival_christmas_police",
    default: "festival_christmas_civilian"
  },
  diwali: {
    civilian: "festival_diwali_civilian",
    trader: "festival_diwali_trader",
    farmer: "festival_diwali_farmer",
    default: "festival_diwali_civilian"
  },
  holi: {
    civilian: "festival_holi_civilian",
    worker: "festival_holi_worker",
    default: "festival_holi_civilian"
  },
  ramadan: {
    civilian: "festival_ramadan_civilian",
    teacher: "festival_ramadan_teacher",
    default: "festival_ramadan_civilian"
  },
  eid: {
    civilian: "festival_eid_civilian",
    mayor: "festival_eid_festive",
    default: "festival_eid_civilian"
  }
});

export const FESTIVAL_ROLE_INDEX = Object.freeze({
  festival_christmas_civilian: 18,
  festival_christmas_farmer: 19,
  festival_christmas_worker: 20,
  festival_christmas_police: 21,
  festival_diwali_civilian: 22,
  festival_diwali_trader: 23,
  festival_diwali_farmer: 24,
  festival_holi_civilian: 25,
  festival_holi_worker: 26,
  festival_ramadan_civilian: 27,
  festival_ramadan_teacher: 28,
  festival_eid_civilian: 29,
  festival_eid_festive: 30
});

/**
 * @param {string} festivalId
 * @param {string} jobId
 * @param {string} villagerId
 * @returns {string} appearance key
 */
export function selectFestivalAppearance(festivalId, jobId, villagerId) {
  const map = FESTIVAL_APPEARANCE[festivalId];
  if (!map) return null;
  if (jobId && map[jobId]) return map[jobId];
  // profession-preserving fallback where map has role
  const roleKey = ROLE_APPEARANCE[jobId];
  if (roleKey && map[jobId]) return map[jobId];
  // deterministic civilian variant within festival
  const variants = Object.values(map).filter((v) => v !== map.default);
  if (variants.length) {
    return variants[hashId(`${villagerId}:${festivalId}`) % variants.length];
  }
  return map.default;
}
