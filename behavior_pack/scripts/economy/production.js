/**
 * Job-based production cycles.
 *
 * Production runs on economy intervals, not every tick.
 * Output goes to village stock / producer inventory — never spawns item entities.
 */

import { getWorldData, markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";
import { getJob } from "../jobs/job-registry.js";
import { ensureInventory, addItem } from "./inventory.js";
import { grantIncome, TxType } from "./transactions.js";
import { getMarketPrice } from "./prices.js";

/**
 * Production recipes keyed by job id.
 * amount = units produced per successful work cycle.
 * incomeShare = fraction of market value paid to producer (0–1).
 *
 * @type {Record<string, { outputs: { goodId: string, amount: number }[], incomeShare: number }>}
 */
const PRODUCTION_RECIPES = {
  farmer: {
    outputs: [
      { goodId: "wheat", amount: 3 },
      { goodId: "bread", amount: 1 }
    ],
    incomeShare: 0.4
  },
  worker: {
    outputs: [
      { goodId: "wood", amount: 2 },
      { goodId: "stone", amount: 2 },
      { goodId: "coal", amount: 1 }
    ],
    incomeShare: 0.4
  },
  builder: {
    // Builders primarily consume; light tool production when materials available
    outputs: [{ goodId: "tools", amount: 1 }],
    incomeShare: 0.5,
    inputs: [
      { goodId: "wood", amount: 2 },
      { goodId: "stone", amount: 1 },
      { goodId: "iron", amount: 1 }
    ]
  }
};

/**
 * Whether a villager is currently in a work activity.
 * @param {import("../villagers/villager-identity.js").VillagerRecord} record
 * @returns {boolean}
 */
function isWorking(record) {
  return record.currentActivity === "work";
}

/**
 * Runs one production cycle for a single villager if eligible.
 * @param {import("../villagers/villager-identity.js").VillagerRecord} record
 * @returns {{ produced: boolean, goods?: string[] }}
 */
export function runProductionCycle(record) {
  if (!record || !isWorking(record)) {
    return { produced: false };
  }

  const recipe = PRODUCTION_RECIPES[record.profession];
  if (!recipe) return { produced: false };

  const data = getWorldData();
  if (!data.economy) return { produced: false };

  // Builder needs inputs from village stock
  if (recipe.inputs) {
    for (const input of recipe.inputs) {
      const stock = data.economy.villageStock[input.goodId] || 0;
      if (stock < input.amount) {
        return { produced: false };
      }
    }
    for (const input of recipe.inputs) {
      data.economy.villageStock[input.goodId] =
        (data.economy.villageStock[input.goodId] || 0) - input.amount;
    }
  }

  const producedGoods = [];
  let value = 0;

  for (const out of recipe.outputs) {
    // Village stockpile receives production
    data.economy.villageStock[out.goodId] =
      (data.economy.villageStock[out.goodId] || 0) + out.amount;

    // Producer keeps a small personal share in inventory
    const personal = Math.max(1, Math.floor(out.amount * 0.25));
    const inv = ensureInventory(record);
    addItem(inv, out.goodId, personal);

    producedGoods.push(`${out.goodId}x${out.amount}`);
    value += getMarketPrice(out.goodId) * out.amount;
  }

  // Income from production value
  const income = Math.max(1, Math.floor(value * (recipe.incomeShare ?? 0.4)));
  grantIncome(record, income, TxType.PRODUCTION_INCOME, `produce:${record.profession}`);

  data.economy.totals.totalProduction =
    (data.economy.totals.totalProduction || 0) +
    recipe.outputs.reduce((s, o) => s + o.amount, 0);

  markDirty();
  Logger.debug(
    `${record.name} produced [${producedGoods.join(", ")}] earned ${income}₡`
  );
  return { produced: true, goods: producedGoods };
}

/**
 * Batch production for a list of villager records.
 * @param {import("../villagers/villager-identity.js").VillagerRecord[]} records
 * @returns {number} cycles completed
 */
export function runProductionForMany(records) {
  let count = 0;
  for (const r of records) {
    try {
      if (runProductionCycle(r).produced) count++;
    } catch (e) {
      Logger.debug("Production cycle error", e);
    }
  }
  return count;
}

/**
 * @param {string} jobId
 * @returns {boolean}
 */
export function jobHasProduction(jobId) {
  return !!PRODUCTION_RECIPES[jobId];
}
