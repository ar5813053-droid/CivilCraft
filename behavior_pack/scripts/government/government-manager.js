/**
 * Government orchestrator. Interval-based; no per-tick work.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { getAllVillagers } from "../villagers/villager-registry.js";
import { getBalance } from "../economy/wallet.js";
import {
  createDefaultGovernmentStore,
  normalizeGovernmentStore
} from "./government-data.js";
import { getGovernment, reconcileLeadership, seatLabel } from "./leadership.js";
import { collectIncomeTax } from "./taxation.js";
import { allocateBudget, completeOldestProject } from "./public-spending.js";
import { hydrateTreasury } from "./treasury.js";
import { computeApproval, pushGovernmentEvent } from "./government-events.js";
import { CURRENCY_SYMBOL } from "../economy/economy-data.js";
import { formatMoney } from "../economy/wallet.js";

/** ~30 seconds. */
export const GOVERNMENT_INTERVAL_TICKS = 600;

let initialized = false;
let tickCount = 0;

export function initializeGovernment() {
  if (initialized) return;
  initialized = true;

  const data = getWorldData();
  data.government = data.government
    ? normalizeGovernmentStore(data.government)
    : createDefaultGovernmentStore();
  markDirty();

  const gov = getGovernment();
  if (gov) hydrateTreasury(gov.treasury);

  system.runInterval(() => {
    onGovernmentTick();
  }, GOVERNMENT_INTERVAL_TICKS);

  Logger.info("Government manager initialized.");
}

function onGovernmentTick() {
  tickCount++;
  const gov = getGovernment();
  if (!gov || !gov.active) return;

  try {
    reconcileLeadership();
    const tax = collectIncomeTax();
    if (tax.collected > 0) {
      pushGovernmentEvent(gov, "tax", `Collected ${tax.collected} CC from ${tax.payers}`);
    }
    allocateBudget();
    if (tickCount % 2 === 0) {
      completeOldestProject();
    }
    refreshStatistics(gov);
    markDirty();
  } catch (e) {
    Logger.error("Government tick failed", e);
  }
}

function refreshStatistics(gov) {
  const villagers = getAllVillagers();
  const population = villagers.length;
  let employed = 0;
  let wealth = 0;
  for (const v of villagers) {
    if (v.profession && v.profession !== "citizen") employed++;
    wealth += getBalance(v);
  }
  const unemployed = Math.max(0, population - employed);
  const unemploymentRate = population > 0 ? unemployed / population : 0;
  const averageWealth = population > 0 ? Math.round(wealth / population) : 0;

  const eco = getWorldData().economy;
  const foodSupply =
    (eco?.villageStock?.bread || 0) + (eco?.villageStock?.wheat || 0);

  const income = Math.max(1, gov.treasury.income || 0);
  const spendingRatio = Math.min(2, (gov.treasury.expenses || 0) / income);

  gov.approval = computeApproval({
    averageWealth,
    unemploymentRate,
    taxRatePercent: gov.taxPolicy.ratePercent,
    spendingRatio,
    foodSupply
  });

  const allocated =
    (gov.budget.public_works || 0) +
    (gov.budget.administration || 0) +
    (gov.budget.reserve || 0);
  const utilization =
    gov.treasury.balance > 0
      ? Math.round((allocated / gov.treasury.balance) * 100)
      : 0;

  gov.statistics = {
    population,
    employed,
    unemployed,
    averageWealth,
    taxRate: gov.taxPolicy.ratePercent,
    approval: gov.approval,
    budgetUtilization: Math.min(100, utilization),
    treasury: gov.treasury.balance,
    taxCollected: gov.taxCollected,
    spent: gov.treasury.expenses
  };

  const village = getWorldData().villages?.main;
  if (village) {
    village.government = {
      id: gov.id,
      name: gov.name,
      approval: gov.approval,
      treasury: gov.treasury.balance,
      taxRate: gov.taxPolicy.ratePercent
    };
  }
}

export function formatGovernmentLines() {
  const gov = getGovernment();
  if (!gov) return ["§cGovernment not initialized."];
  const s = CURRENCY_SYMBOL;
  return [
    "§6CivilCraft Government§r",
    `${gov.name} (${gov.type})`,
    `Mayor: ${seatLabel(gov.leadership.mayor)}`,
    `Treasury: §a${formatMoney(gov.treasury.balance, s)}§r`,
    `Tax rate: ${gov.taxPolicy.ratePercent}%  threshold ${gov.taxPolicy.threshold}${s}`,
    `Collected: ${gov.taxCollected}${s}  Spent: ${gov.treasury.expenses}${s}`,
    `Approval: ${gov.approval}%`,
    `Budget PW:${gov.budget.public_works}${s} Admin:${gov.budget.administration}${s} Reserve:${gov.budget.reserve}${s}`
  ];
}

export function getGovernmentSnapshot() {
  const gov = getGovernment();
  if (!gov) return { ready: false };
  return {
    ready: true,
    id: gov.id,
    name: gov.name,
    type: gov.type,
    mayor: seatLabel(gov.leadership.mayor),
    treasury: gov.treasury.balance,
    taxRate: gov.taxPolicy.ratePercent,
    collected: gov.taxCollected,
    spent: gov.treasury.expenses,
    approval: gov.approval,
    budget: { ...gov.budget },
    departments: Object.values(gov.departments).map((d) => ({
      id: d.id,
      name: d.name,
      enabled: d.enabled,
      head: d.headId || null
    })),
    projects: gov.projects.slice(-5),
    transactions: (gov.treasury.lastTransactions || []).slice(-8)
  };
}
