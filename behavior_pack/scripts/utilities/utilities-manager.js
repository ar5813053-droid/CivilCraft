import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultUtilities, normalizeUtilities } from "./utilities-data.js";
import { updateNetwork, averageQuality } from "./utility-services.js";
import { getAllShops } from "../economy/shops.js";

export const UTILITIES_INTERVAL_TICKS = 2400;
const BATCH = 10;
let initialized = false;

export function initializeUtilities() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.utilities = data.utilities ? normalizeUtilities(data.utilities) : createDefaultUtilities();
  system.runInterval(() => {
    try {
      processUtilities(data);
    } catch (e) {
      Logger.error("Utilities tick failed", e);
    }
  }, UTILITIES_INTERVAL_TICKS);
  Logger.info("Utilities manager initialized.");
}

export function getUtilitiesStore() {
  const data = getWorldData();
  if (!data.utilities) data.utilities = createDefaultUtilities();
  return data.utilities;
}

function processUtilities(data) {
  const store = data.utilities;
  const settlements = data.settlements?.list || data.settlements?.settlements || [{ id: "settlement_main" }];
  const ids = settlements.map((s) => s.id || s.settlementId || "settlement_main");
  if (!ids.length) ids.push("settlement_main");
  const start = store.cursor % ids.length;
  const pop = Object.keys(data.villagers || {}).length;
  const biz = getAllShops().length;
  const infra = data.infrastructure?.coverage ?? 50;
  for (let i = 0; i < Math.min(BATCH, ids.length); i++) {
    updateNetwork(store, ids[(start + i) % ids.length], pop, biz, typeof infra === "number" ? infra : 50);
  }
  store.cursor = (start + BATCH) % ids.length;
  const qualities = store.networks.map(averageQuality);
  store.stats.averageQuality = qualities.length
    ? Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
    : 50;
  markDirty();
}
