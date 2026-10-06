import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultBanking, normalizeBanking } from "./banking-data.js";
import { openAccount, deposit, withdraw, transfer, getAccount, statementLines } from "./bank-accounts.js";

let initialized = false;
export const BANKING_INTERVAL_TICKS = 2400;

export function initializeBanking() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.banking = data.banking ? normalizeBanking(data.banking) : createDefaultBanking();
  system.runInterval(() => {
    try {
      // Operating cost (fully-backed model: only reduce liquidity if positive)
      for (const bank of data.banking.banks || []) {
        if (!bank.operational) continue;
        const cost = bank.operatingCostPerDay || 0;
        if (cost > 0 && (bank.liquidity || 0) >= cost) {
          bank.liquidity -= cost;
        }
      }
      markDirty();
    } catch (e) {
      Logger.error("Banking tick failed", e);
    }
  }, BANKING_INTERVAL_TICKS);
  Logger.info("Banking manager initialized.");
}

export function getBankingStore() {
  const data = getWorldData();
  if (!data.banking) data.banking = createDefaultBanking();
  return data.banking;
}

export {
  openAccount,
  deposit,
  withdraw,
  transfer,
  getAccount,
  statementLines
};
