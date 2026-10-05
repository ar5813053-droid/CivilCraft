/**
 * Police orchestrator. Interval stats and treasury-funded salaries.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { transferMoney, TxType } from "../economy/transactions.js";
import { sanitizeMoney } from "../economy/wallet.js";
import { getTreasury, hydrateTreasury } from "../government/treasury.js";
import { createDefaultPolice, normalizePolice, BASE_SALARY, MAX_UNPAID } from "./police-data.js";
import { ensureCentralStation } from "./stations.js";
import { salaryFor } from "./ranks.js";
import { pushPoliceEvent } from "./police-events.js";

export const POLICE_INTERVAL_TICKS = 1000;

let initialized = false;
let tick = 0;

export function initializePolice() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.police = data.police ? normalizePolice(data.police) : createDefaultPolice();
  ensureCentralStation(data.police);
  const gov = data.government?.governments?.[data.government.primaryId];
  if (gov?.departments?.public_safety) gov.departments.public_safety.enabled = true;
  markDirty();
  system.runInterval(() => {
    try {
      tick += 1;
      refreshPoliceStats(data.police);
      if (tick % 3 === 0) paySalaries(data.police);
      markDirty();
    } catch (e) {
      Logger.error("Police tick failed", e);
    }
  }, POLICE_INTERVAL_TICKS);
  Logger.info("Police manager initialized.");
}

export function getPolice() {
  const data = getWorldData();
  if (!data.police) data.police = createDefaultPolice();
  return data.police;
}

export function refreshPoliceStats(store) {
  const officers = store.officers || [];
  store.stats.activeOfficers = officers.length;
  store.stats.availableOfficers = officers.filter((o) => o.status === "available").length;
  store.stats.onPatrol = officers.filter((o) => o.status === "patrol").length;
  store.stats.responding = officers.filter((o) => o.status === "responding").length;
  store.stats.arrests = (store.arrests || []).length;
  store.stats.unpaidSalary = (store.unpaidSalaries || []).reduce((s, u) => s + (u.amount || 0), 0);
}

export function paySalaries(store) {
  const treasury = getTreasury(store.jurisdiction);
  if (!treasury) return { paid: 0, unpaid: 0 };
  hydrateTreasury(treasury);
  let paid = 0;
  let unpaid = 0;
  for (const officer of store.officers) {
    const amount = salaryFor(officer.rank, BASE_SALARY);
    const villager = getVillager(officer.villagerId);
    if (!villager) continue;
    if (sanitizeMoney(treasury.balance) < amount) {
      store.unpaidSalaries.push({
        officerId: officer.officerId,
        amount,
        timestamp: Date.now()
      });
      if (store.unpaidSalaries.length > MAX_UNPAID) {
        store.unpaidSalaries = store.unpaidSalaries.slice(-MAX_UNPAID);
      }
      unpaid += amount;
      continue;
    }
    const result = transferMoney(treasury, villager, amount, TxType.GOVERNMENT_SALARY, "police_salary");
    if (!result.ok) {
      store.unpaidSalaries.push({ officerId: officer.officerId, amount, timestamp: Date.now() });
      unpaid += amount;
      continue;
    }
    paid += amount;
  }
  if (unpaid > 0) pushPoliceEvent(store, "unpaid_salary", String(unpaid));
  return { paid, unpaid };
}

export function formatPoliceLines() {
  const store = getPolice();
  const s = store.stats;
  return [
    "§6CivilCraft Police§r",
    `Jurisdiction: ${store.jurisdiction}`,
    `Officers: ${s.activeOfficers}  Patrol: ${s.onPatrol}  Available: ${s.availableOfficers}`,
    `Arrests: ${s.arrests}  Reports: ${s.violationsReported}`,
    `Unpaid salary: ${s.unpaidSalary}`
  ];
}
