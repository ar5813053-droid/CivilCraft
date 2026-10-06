/**
 * Employee-driven shop production using shared recipes.
 * Self-employed production remains in production.js.
 */

import { getQty, removeItem, addItem, ensureInventory } from "./inventory.js";
import { getAllRecipes } from "./recipes.js";
import { ensureBusinessOps } from "./business-operations.js";
import { getAllShops } from "./shops.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";
import { system } from "@minecraft/server";

export const PROD_INTERVAL_TICKS = 1200;
export const PROD_BATCH = 25;
let initialized = false;

export function canProduce(shop, recipe, employmentRecords) {
  ensureBusinessOps(shop);
  if (!shop.active) return { ok: false, reason: "inactive" };
  if (shop.lastProductionDay != null && shop.lastProductionDay === Math.floor(Date.now() / 86400000)) {
    return { ok: false, reason: "cooldown" };
  }
  const employees = shop.employeeVillagerIds || [];
  if (!employees.length) return { ok: false, reason: "no_employee" };
  const hasWorker = employees.some((id) => {
    const rec = (employmentRecords || []).find((r) => r.villagerId === id && r.status === "employed");
    return rec && recipe.jobIds.includes(rec.jobId);
  });
  if (!hasWorker) return { ok: false, reason: "wrong_job" };
  const inv = ensureInventory(shop);
  for (const input of recipe.inputs) {
    if (getQty(inv, input.goodId) < input.amount) return { ok: false, reason: "missing_inputs" };
  }
  return { ok: true };
}

export function runBusinessProduction(shop, employmentRecords, dayStamp) {
  ensureBusinessOps(shop);
  if (!shop.active) return { produced: false, reason: "inactive" };
  let producedAny = false;
  const inv = ensureInventory(shop);
  for (const recipe of getAllRecipes()) {
    const check = canProduce(shop, recipe, employmentRecords);
    if (!check.ok) continue;
    const cycles = Math.min(recipe.maxPerCycle, shop.employeeVillagerIds.length);
    for (let i = 0; i < cycles; i++) {
      let ok = true;
      for (const input of recipe.inputs) {
        if (getQty(inv, input.goodId) < input.amount) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
      for (const input of recipe.inputs) removeItem(inv, input.goodId, input.amount);
      for (const out of recipe.outputs) addItem(inv, out.goodId, out.amount);
      producedAny = true;
    }
  }
  if (producedAny) {
    shop.lastProductionDay = dayStamp;
    shop.productionStats = (shop.productionStats || 0) + 1;
    markDirty();
  }
  return { produced: producedAny };
}

export function processProductionBatch(data) {
  const shops = getAllShops();
  if (!shops.length) return;
  const ops = data.economy?.businessOps || { cursor: 0 };
  if (!data.economy) return;
  data.economy.businessOps = ops;
  const day = Math.floor(Date.now() / 86400000);
  const start = (ops.prodCursor || 0) % shops.length;
  const records = data.employment?.records || [];
  for (let i = 0; i < Math.min(PROD_BATCH, shops.length); i++) {
    runBusinessProduction(shops[(start + i) % shops.length], records, day);
  }
  ops.prodCursor = (start + PROD_BATCH) % shops.length;
  markDirty();
}

export function initializeBusinessProduction() {
  if (initialized) return;
  initialized = true;
  system.runInterval(() => {
    try {
      processProductionBatch(getWorldData());
    } catch (e) {
      Logger.error("Business production tick failed", e);
    }
  }, PROD_INTERVAL_TICKS);
  Logger.info("Business production initialized.");
}
