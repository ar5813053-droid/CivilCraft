/**
 * Employment orchestrator. Bounded batch processing.
 * Government/police payroll remains in their modules.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import {
  createDefaultEmployment,
  normalizeEmployment,
  JOB_MARKET_REFRESH_MS,
  BASE_PRIVATE_SALARY,
  MAX_UNPAID
} from "./employment-data.js";
import { refreshOpportunities } from "./job-market.js";
import { rankOpenings, canWork } from "./job-matching.js";
import { ensureRecord, hireCitizen, makeUnemployed, getRecord } from "./hiring.js";
import { canSearch, recordSearch, tickUnemployment } from "./unemployment.js";
import { refreshEmploymentStats } from "./employment-stats.js";
import { pushEmploymentEvent } from "./employment-events.js";
import { transferMoney, TxType } from "../economy/transactions.js";
import { getAllShops, hydrateShop } from "../economy/shops.js";

export const EMPLOYMENT_INTERVAL_TICKS = 1200;
const BATCH = 40;
let initialized = false;

export function initializeEmployment() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.employment = data.employment ? normalizeEmployment(data.employment) : createDefaultEmployment();
  refreshOpportunities(data.employment, data);
  refreshEmploymentStats(data.employment);
  system.runInterval(() => {
    try {
      processEmploymentBatch(data);
      markDirty();
    } catch (e) {
      Logger.error("Employment tick failed", e);
    }
  }, EMPLOYMENT_INTERVAL_TICKS);
  Logger.info("Employment manager initialized.");
}

export function getEmploymentStore() {
  const data = getWorldData();
  if (!data.employment) data.employment = createDefaultEmployment();
  return data.employment;
}

function educationFor(data, villagerId) {
  const rec = (data.education?.records || []).find((r) => r.villagerId === villagerId);
  return rec?.educationLevel || "none";
}

function healthFor(data, villagerId) {
  const rec = (data.healthcare?.records || []).find((r) => r.villagerId === villagerId);
  return rec?.health ?? 80;
}

export function processEmploymentBatch(data) {
  const store = data.employment;
  if (!store) return;
  if (Date.now() - (store.lastMarketRefresh || 0) > JOB_MARKET_REFRESH_MS) {
    refreshOpportunities(store, data);
  }

  const ids = Object.keys(data.villagers || {});
  if (!ids.length) return;
  const day = Math.floor(Date.now() / 86400000);
  const start = store.cursor % ids.length;

  for (let i = 0; i < Math.min(BATCH, ids.length); i++) {
    const villager = data.villagers[ids[(start + i) % ids.length]];
    if (!villager || villager.alive === false) continue;
    const rec = ensureRecord(store, villager.id);

    if (!canWork(villager)) {
      if (rec.status === "employed") makeUnemployed(store, villager.id, day, "ineligible");
      else rec.status = "inactive";
      continue;
    }

    if (rec.status === "employed") {
      // Validate job still open in market soft-cap sense only if opportunity list empty for that job
      const still = (store.opportunities || []).some((o) => o.jobId === rec.jobId);
      const hasJobDef = rec.jobId && villager.profession === rec.jobId;
      if (!hasJobDef && rec.jobId) {
        villager.profession = rec.jobId;
      }
      rec.lastWorkedDay = day;
      continue;
    }

    tickUnemployment(rec);
    if (!canSearch(store, villager.id, day)) continue;

    const edu = educationFor(data, villager.id);
    const health = healthFor(data, villager.id);
    const ranked = rankOpenings(store.opportunities, villager, edu, health);
    recordSearch(store, villager.id, day, ranked[0]?.jobId || "none");

    if (ranked.length === 0) continue;
    const best = ranked[0];
    hireCitizen(store, {
      villager,
      jobId: best.jobId,
      employerType: best.employerType,
      employerId: best.employerId,
      dayStamp: day,
      educationLevel: edu,
      health
    });
  }

  store.cursor = (start + BATCH) % ids.length;
  refreshEmploymentStats(store);
}

/**
 * Optional private payroll for self_employed/business roles that are not police.
 * Does not pay government_salary jobs (police module owns those).
 */
export function runPrivatePayroll(data, dayStamp) {
  const store = data.employment;
  if (!store) return { paid: 0, unpaid: 0 };
  let paid = 0;
  let unpaid = 0;
  const shops = getAllShops();
  for (const rec of store.records) {
    if (rec.status !== "employed") continue;
    if (rec.employerType === "government") continue; // police/gov modules pay
    const amount = BASE_PRIVATE_SALARY[rec.jobId] || 0;
    if (amount <= 0) continue;
    const villager = data.villagers[rec.villagerId];
    if (!villager) continue;

    if (rec.employerType === "business") {
      const shop = shops.find((s) => s.id === rec.employerId) || shops[0];
      if (!shop) {
        store.unpaid.push({ villagerId: rec.villagerId, amount, employerId: rec.employerId, payrollDay: dayStamp });
        unpaid += 1;
        continue;
      }
      hydrateShop(shop);
      const result = transferMoney(shop, villager, amount, TxType.SALARY, "employment_salary");
      if (result.ok) {
        paid += 1;
        pushEmploymentEvent(store, "salary_paid", rec.villagerId);
      } else {
        store.unpaid.push({ villagerId: rec.villagerId, amount, employerId: rec.employerId, payrollDay: dayStamp });
        unpaid += 1;
        pushEmploymentEvent(store, "salary_unpaid", rec.villagerId);
      }
    }
    // self_employed: income comes from production, not payroll
  }
  if (store.unpaid.length > MAX_UNPAID) store.unpaid = store.unpaid.slice(-MAX_UNPAID);
  markDirty();
  return { paid, unpaid };
}

export function formatEmploymentLines(villagerId) {
  const store = getEmploymentStore();
  if (!villagerId) {
    const s = store.stats;
    return [`§6Employment§r employed ${s.employed} unemployed ${s.unemployed}`, `Openings ${s.openings}`];
  }
  const rec = getRecord(store, villagerId);
  if (!rec) return ["§cNo employment record"];
  return [`${rec.status} ${rec.jobId || "none"}`, `employer ${rec.employerType || "-"} ${rec.employerId || "-"}`];
}

export { hireCitizen, makeUnemployed, getRecord, ensureRecord };
