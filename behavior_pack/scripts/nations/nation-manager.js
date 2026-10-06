import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultNations, normalizeNations } from "./nation-data.js";
import { expireTreaties } from "./diplomacy.js";

export const NATIONS_INTERVAL_TICKS = 2400;
let initialized = false;

export function initializeNations() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.nations = data.nations ? normalizeNations(data.nations) : createDefaultNations();
  // Sync population cache
  const main = data.nations.nations.find((n) => n.id === "nation_main");
  if (main) main.population = Object.keys(data.villagers || {}).length;
  system.runInterval(() => {
    try {
      processNations(data);
    } catch (e) {
      Logger.error("Nations tick failed", e);
    }
  }, NATIONS_INTERVAL_TICKS);
  Logger.info("Nations manager initialized.");
}

export function getNationsStore() {
  const data = getWorldData();
  if (!data.nations) data.nations = createDefaultNations();
  return data.nations;
}

function processNations(data) {
  const store = data.nations;
  if (!store) return;
  const day = Math.floor(Date.now() / 86400000);
  expireTreaties(store, day);
  const main = store.nations.find((n) => n.id === "nation_main");
  if (main) main.population = Object.keys(data.villagers || {}).length;
  store.stats.nations = store.nations.length;
  store.stats.treaties = (store.treaties || []).filter((t) => t.status === "active").length;
  markDirty();
}
