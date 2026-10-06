/**
 * Festival → real Economy demand via existing prices API.
 */

import { recordDemand } from "../economy/prices.js";
import { Logger } from "../core/logger.js";

/**
 * Apply preferred goods demand once per phase key.
 * @returns {string[]} applied goods
 */
export function applyFestivalDemand(festival, completedKeys, phase = "active") {
  const applied = [];
  if (!festival?.preferredGoods?.length && !festival?.effects) return applied;

  const goods = festival.preferredGoods || [];
  const effects = festival.effects || {};

  const map = {
    bread: effects.demandBread || (goods.includes("bread") ? 5 : 0),
    wheat: effects.demandWheat || (goods.includes("wheat") ? 4 : 0)
  };

  for (const [good, amount] of Object.entries(map)) {
    if (!amount) continue;
    const key = `${phase}_demand_${good}`;
    if (completedKeys[key]) continue;
    try {
      recordDemand(good, amount);
      completedKeys[key] = true;
      applied.push(good);
    } catch (e) {
      Logger.warn(`Festival demand ${good}: ${e}`);
    }
  }
  return applied;
}
