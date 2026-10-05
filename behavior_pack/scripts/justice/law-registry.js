/**
 * Data-driven law definitions. Future police/court systems reference these ids.
 * Laws do not enforce themselves.
 */

import { Logger } from "../core/logger.js";
import { DEFAULT_JURISDICTION, MAX_FINE } from "./justice-data.js";

/** @type {Map<string, object>} */
const laws = new Map();

export function registerLaw(def) {
  if (!def?.id) {
    Logger.error("Cannot register law without id");
    return;
  }
  const now = Date.now();
  laws.set(def.id, {
    id: def.id,
    name: def.name || def.id,
    description: def.description || "",
    category: def.category || "general",
    severity: Math.max(1, Math.min(5, Math.floor(def.severity || 1))),
    enabled: def.enabled !== false,
    fine: Math.max(0, Math.min(MAX_FINE, Math.floor(def.fine || 0))),
    repeatOffenseMultiplier: Math.max(1, Math.min(2, def.repeatOffenseMultiplier || 1.5)),
    cooldownMs: Math.max(0, Math.floor(def.cooldownMs ?? 60000)),
    jurisdiction: def.jurisdiction || DEFAULT_JURISDICTION,
    createdAt: def.createdAt || now,
    updatedAt: def.updatedAt || now
  });
}

export function getLaw(id) {
  return laws.get(id);
}

export function getAllLaws() {
  return Array.from(laws.values());
}

export function hasLaw(id) {
  return laws.has(id);
}

/**
 * Repeat-offense fine. Deterministic, capped.
 * count is 1-based prior+current offenses of the same law.
 * @param {object} law
 * @param {number} offenseCount
 * @param {number} [cap]
 */
export function computeFine(law, offenseCount, cap = MAX_FINE) {
  if (!law) return 0;
  const count = Math.max(1, Math.floor(offenseCount || 1));
  const multiplier = Math.max(1, Math.min(2, law.repeatOffenseMultiplier || 1));
  const scaled = Math.floor(law.fine * Math.pow(multiplier, count - 1));
  const limit = Math.max(0, Math.min(MAX_FINE, Math.floor(cap)));
  return Math.max(0, Math.min(limit, scaled));
}

export function initializeLaws() {
  if (laws.size > 0) return;
  registerLaw({
    id: "theft",
    name: "Theft",
    description: "Taking property that belongs to another.",
    category: "property",
    severity: 2,
    fine: 25,
    repeatOffenseMultiplier: 1.5,
    cooldownMs: 120000
  });
  registerLaw({
    id: "property_damage",
    name: "Property Damage",
    description: "Damaging buildings or goods.",
    category: "property",
    severity: 2,
    fine: 30,
    repeatOffenseMultiplier: 1.5,
    cooldownMs: 120000
  });
  registerLaw({
    id: "assault",
    name: "Assault",
    description: "Harming another resident.",
    category: "person",
    severity: 3,
    fine: 40,
    repeatOffenseMultiplier: 1.5,
    cooldownMs: 180000
  });
  registerLaw({
    id: "trespassing",
    name: "Trespassing",
    description: "Entering a private home without permission.",
    category: "property",
    severity: 1,
    fine: 10,
    repeatOffenseMultiplier: 1.5,
    cooldownMs: 60000
  });
  registerLaw({
    id: "public_disturbance",
    name: "Public Disturbance",
    description: "Disrupting public order.",
    category: "order",
    severity: 1,
    fine: 8,
    repeatOffenseMultiplier: 1.25,
    cooldownMs: 60000
  });
  registerLaw({
    id: "tax_evasion",
    name: "Tax Evasion",
    description: "Outstanding tax liability. Detection is not automatic.",
    category: "finance",
    severity: 2,
    fine: 20,
    repeatOffenseMultiplier: 1.5,
    cooldownMs: 300000
  });
  Logger.info(`Law registry initialized (${laws.size} laws).`);
}
