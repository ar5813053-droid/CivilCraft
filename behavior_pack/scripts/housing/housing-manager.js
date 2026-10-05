/**
 * Housing orchestrator. Maintenance is interval-only.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultHousing, normalizeHousing } from "./housing-data.js";
import { decayCondition } from "./houses.js";
import { housingStats } from "./housing-stats.js";

export const HOUSING_INTERVAL_TICKS = 2400;
let initialized = false;

export function initializeHousing() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.housing = data.housing ? normalizeHousing(data.housing) : createDefaultHousing();
  system.runInterval(() => {
    try {
      decayCondition(data.housing);
      data.housing.stats = housingStats(data.housing);
      markDirty();
    } catch (e) {
      Logger.error("Housing tick failed", e);
    }
  }, HOUSING_INTERVAL_TICKS);
  Logger.info("Housing manager initialized.");
}

export function getHousing() {
  const data = getWorldData();
  if (!data.housing) data.housing = createDefaultHousing();
  return data.housing;
}

export function formatHousingLines() {
  const stats = housingStats(getHousing());
  return [`§6Housing§r units ${stats.units} vacant ${stats.vacant}`, `Capacity ${stats.capacity} demand rent ${stats.rent}`];
}
