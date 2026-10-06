/**
 * Private business operations on existing shop records.
 * Government/police payroll is never paid here.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { getAllShops, hydrateShop, getShop } from "./shops.js";
import { transferMoney, TxType } from "./transactions.js";
import { sanitizeMoney } from "./wallet.js";

export const BUSINESS_INTERVAL_TICKS = 1200;
export const BUSINESS_BATCH = 25;
export const PAYROLL_PERIOD_DAYS = 7;
export const MAX_UNPAID_PAYROLL = 500;
export const MAX_BUSINESS_EVENTS = 200;

/** Employee capacity by shop type. */
export const SHOP_CAPACITY = Object.freeze({
  general: 4,
  food: 5,
  building: 5,
  tools: 4
});

/** Daily maintenance in CC. */
export const SHOP_MAINTENANCE = Object.freeze({
  general: 2,
  food: 3,
  building: 3,
  tools: 3
});

/** Private job salaries paid by shops (not government roles). */
export const PRIVATE_JOB_SALARY = Object.freeze({
  trader: 10,
  worker: 8,
  farmer: 8,
  builder: 10
});

let initialized = false;

export function ensureBusinessOps(shop) {
  if (!shop) return shop;
  hydrateShop(shop);
  if (typeof shop.employeeCapacity !== "number") {
    shop.employeeCapacity = SHOP_CAPACITY[shop.type] ?? 4;
  }
  if (!Array.isArray(shop.employeeVillagerIds)) shop.employeeVillagerIds = [];
  if (typeof shop.revenue !== "number") shop.revenue = 0;
  if (typeof shop.operatingExpenses !== "number") shop.operatingExpenses = 0;
  if (typeof shop.payrollExpense !== "number") shop.payrollExpense = 0;
  if (typeof shop.profit !== "number") shop.profit = 0;
  if (shop.lastOperatingDay == null) shop.lastOperatingDay = null;
  if (shop.lastPayrollDay == null) shop.lastPayrollDay = null;
  if (!Array.isArray(shop.unpaidPayroll)) shop.unpaidPayroll = [];
  if (shop.financialStatus == null) shop.financialStatus = "healthy";
  if (shop.active == null) shop.active = shop.open !== false;
  return shop;
}

export function getVacancies(shop) {
  ensureBusinessOps(shop);
  if (!shop.active) return 0;
  return Math.max(0, (shop.employeeCapacity || 0) - (shop.employeeVillagerIds?.length || 0));
}

export function hasEmployee(shop, villagerId) {
  return (shop.employeeVillagerIds || []).includes(villagerId);
}

export function addEmployee(shop, villagerId) {
  ensureBusinessOps(shop);
  if (!shop.active) return { ok: false, error: "inactive" };
  if (hasEmployee(shop, villagerId)) return { ok: false, error: "duplicate" };
  if (getVacancies(shop) <= 0) return { ok: false, error: "full" };
  shop.employeeVillagerIds.push(villagerId);
  markDirty();
  return { ok: true };
}

export function removeEmployee(shop, villagerId) {
  ensureBusinessOps(shop);
  const before = shop.employeeVillagerIds.length;
  shop.employeeVillagerIds = shop.employeeVillagerIds.filter((id) => id !== villagerId);
  if (shop.employeeVillagerIds.length === before) return { ok: false, error: "not_found" };
  markDirty();
  return { ok: true };
}

export function recordSaleRevenue(shop, amount) {
  if (!shop || amount <= 0) return;
  ensureBusinessOps(shop);
  shop.revenue = Math.max(0, Math.floor((shop.revenue || 0) + amount));
  markDirty();
}

export function applyMaintenance(shop, dayStamp) {
  ensureBusinessOps(shop);
  if (!shop.active) return { ok: false, reason: "inactive" };
  if (shop.lastOperatingDay === dayStamp) return { ok: false, reason: "already_operated" };
  const cost = SHOP_MAINTENANCE[shop.type] ?? 2;
  if (sanitizeMoney(shop.balance) < cost) {
    shop.financialStatus = "constrained";
    shop.lastOperatingDay = dayStamp;
    return { ok: false, reason: "insufficient_funds", cost };
  }
  shop.balance = sanitizeMoney(shop.balance - cost);
  shop.operatingExpenses = Math.max(0, Math.floor((shop.operatingExpenses || 0) + cost));
  shop.profit = Math.floor((shop.revenue || 0) - (shop.operatingExpenses || 0) - (shop.payrollExpense || 0));
  shop.financialStatus = shop.balance >= 50 ? "healthy" : "constrained";
  shop.lastOperatingDay = dayStamp;
  markDirty();
  return { ok: true, cost };
}

/**
 * Private payroll for shop employees only. Excludes government/police/self-employed.
 */
export function runShopPayroll(shop, data, dayStamp, force = false) {
  ensureBusinessOps(shop);
  if (!shop.active) return { paid: 0, unpaid: 0, reason: "inactive" };
  if (!force && shop.lastPayrollDay != null && dayStamp - shop.lastPayrollDay < PAYROLL_PERIOD_DAYS) {
    return { paid: 0, unpaid: 0, reason: "not_due" };
  }

  let paid = 0;
  let unpaid = 0;
  const employment = data.employment;
  const villagers = data.villagers || {};

  for (const villagerId of [...(shop.employeeVillagerIds || [])]) {
    const villager = villagers[villagerId];
    const rec = (employment?.records || []).find((r) => r.villagerId === villagerId);
    if (!villager || !rec || rec.status !== "employed") {
      removeEmployee(shop, villagerId);
      continue;
    }
    // Safety: never pay government roles
    if (rec.employerType === "government") continue;
    if (rec.employerType === "self_employed") continue;
    if (["police_officer", "teacher", "doctor", "nurse", "healer"].includes(rec.jobId)) continue;

    const amount = PRIVATE_JOB_SALARY[rec.jobId] || PRIVATE_JOB_SALARY.trader || 8;
    if (amount <= 0) continue;

    if (sanitizeMoney(shop.balance) < amount) {
      shop.unpaidPayroll.push({
        villagerId,
        businessId: shop.id,
        amount,
        payrollDay: dayStamp,
        status: "unpaid"
      });
      if (shop.unpaidPayroll.length > MAX_UNPAID_PAYROLL) {
        shop.unpaidPayroll = shop.unpaidPayroll.slice(-MAX_UNPAID_PAYROLL);
      }
      unpaid += 1;
      shop.financialStatus = "constrained";
      continue;
    }

    const result = transferMoney(shop, villager, amount, TxType.SALARY, "employment_salary");
    if (result.ok) {
      shop.payrollExpense = Math.max(0, Math.floor((shop.payrollExpense || 0) + amount));
      paid += 1;
    } else {
      shop.unpaidPayroll.push({
        villagerId,
        businessId: shop.id,
        amount,
        payrollDay: dayStamp,
        status: "unpaid"
      });
      unpaid += 1;
    }
  }

  shop.lastPayrollDay = dayStamp;
  shop.profit = Math.floor((shop.revenue || 0) - (shop.operatingExpenses || 0) - (shop.payrollExpense || 0));
  markDirty();
  return { paid, unpaid, reason: "ok" };
}

export function processBusinessBatch(data) {
  if (!data.economy) return;
  const shops = getAllShops();
  if (!shops.length) return;
  const ops = data.economy.businessOps || { cursor: 0, events: [] };
  data.economy.businessOps = ops;
  const day = Math.floor(Date.now() / 86400000);
  const start = ops.cursor % shops.length;

  for (let i = 0; i < Math.min(BUSINESS_BATCH, shops.length); i++) {
    const shop = shops[(start + i) % shops.length];
    ensureBusinessOps(shop);
    applyMaintenance(shop, day);
    runShopPayroll(shop, data, day, false);
  }
  ops.cursor = (start + BUSINESS_BATCH) % shops.length;
  markDirty();
}

export function initializeBusinessOperations() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  if (data.economy) {
    for (const shop of getAllShops()) ensureBusinessOps(shop);
    if (!data.economy.businessOps) data.economy.businessOps = { cursor: 0, events: [] };
  }
  system.runInterval(() => {
    try {
      processBusinessBatch(getWorldData());
    } catch (e) {
      Logger.error("Business operations tick failed", e);
    }
  }, BUSINESS_INTERVAL_TICKS);
  Logger.info("Business operations initialized.");
}

export function formatBusinessLines(shopId) {
  const shops = getAllShops();
  if (!shopId) {
    return [`§6Businesses§r ${shops.length}`, ...shops.slice(0, 5).map((s) => `${s.id} ${s.type} vac ${getVacancies(s)}`)];
  }
  const shop = getShop(shopId) || shops.find((s) => s.id === shopId);
  if (!shop) return ["§cNo shop"];
  ensureBusinessOps(shop);
  return [
    `${shop.name} (${shop.type}) ${shop.active ? "active" : "inactive"}`,
    `bal ${shop.balance} rev ${shop.revenue} exp ${shop.operatingExpenses} pay ${shop.payrollExpense}`,
    `employees ${shop.employeeVillagerIds.length}/${shop.employeeCapacity} vac ${getVacancies(shop)}`,
    `status ${shop.financialStatus} unpaid ${shop.unpaidPayroll.length}`
  ];
}
