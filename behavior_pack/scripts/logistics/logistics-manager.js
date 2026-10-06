import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultLogistics, normalizeLogistics } from "./logistics-data.js";
import { advanceShipment } from "./shipments.js";

export const LOGISTICS_INTERVAL_TICKS = 1200;
const BATCH = 25;
let initialized = false;

export function initializeLogistics() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.logistics = data.logistics ? normalizeLogistics(data.logistics) : createDefaultLogistics();
  system.runInterval(() => {
    try {
      processShipments(data);
    } catch (e) {
      Logger.error("Logistics tick failed", e);
    }
  }, LOGISTICS_INTERVAL_TICKS);
  Logger.info("Logistics manager initialized.");
}

export function getLogisticsStore() {
  const data = getWorldData();
  if (!data.logistics) data.logistics = createDefaultLogistics();
  return data.logistics;
}

function processShipments(data) {
  const store = data.logistics;
  if (!store?.shipments?.length) return;
  const day = Math.floor(Date.now() / 86400000);
  const list = store.shipments.filter((s) => s.status === "in_transit");
  if (!list.length) return;
  const start = store.cursor % list.length;
  for (let i = 0; i < Math.min(BATCH, list.length); i++) {
    advanceShipment(store, list[(start + i) % list.length], day);
  }
  store.cursor = (start + BATCH) % Math.max(1, list.length);
  markDirty();
}
