/**
 * Player-as-citizen: links Minecraft players to CivilCraft economy systems.
 */

import { system, world } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultPlayers, normalizePlayers, createPlayerProfile, MAX_PLAYERS } from "./player-data.js";
import { STARTING_BALANCE, getBalance, setBalance } from "../economy/wallet.js";
import { openAccount, getAccount, getBankingStore, deposit, withdraw, transfer, statementLines } from "../banking/banking-manager.js";
import { purchaseGoods, TxType } from "../economy/transactions.js";
import { getShop, getAllShops } from "../economy/shops.js";
import { ensureInventory, getQty, removeItem, addItem } from "../economy/inventory.js";
import { getMarketPrice } from "../economy/prices.js";

let initialized = false;

export function initializePlayerSystem() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.players = data.players ? normalizePlayers(data.players) : createDefaultPlayers();
  try {
    world.afterEvents.playerSpawn.subscribe((ev) => {
      try {
        onPlayerSpawn(ev.player, !!ev.initialSpawn);
      } catch (e) {
        Logger.error("Player spawn handler failed", e);
      }
    });
  } catch (e) {
    Logger.warn(`playerSpawn subscribe failed: ${e}`);
  }
  Logger.info("Player system initialized.");
}

export function getPlayersStore() {
  const data = getWorldData();
  if (!data.players) data.players = createDefaultPlayers();
  return data.players;
}

export function getOrCreateProfile(player) {
  const store = getPlayersStore();
  const id = player.id;
  if (store.profiles[id]) return store.profiles[id];
  if (Object.keys(store.profiles).length >= MAX_PLAYERS) {
    Logger.warn("Player profile cap reached");
    return null;
  }
  const profile = createPlayerProfile(id, player.name);
  profile.money = STARTING_BALANCE;
  store.profiles[id] = profile;
  store.stats.registered = (store.stats.registered || 0) + 1;
  const bank = getBankingStore();
  const acc = openAccount(bank, profile.id, "bank_central");
  if (acc.ok) profile.bankAccountId = acc.account.id;
  markDirty();
  return profile;
}

function onPlayerSpawn(player, initialSpawn) {
  if (!player) return;
  const profile = getOrCreateProfile(player);
  if (!profile) return;
  const store = getPlayersStore();

  if (initialSpawn && !profile.firstJoinSpawnDone) {
    profile.firstJoinSpawnDone = true;
    tryPlaceNearSettlement(player, store);
    try {
      player.sendMessage("§6Welcome to CivilCraft§r");
      player.sendMessage(`You are a citizen. Bank account ready. Starting wallet: ${getBalance(profile)} ₡`);
      player.sendMessage("Use §e!cc help§r for commands.");
    } catch {
      /* ignore */
    }
    markDirty();
  }
}

function tryPlaceNearSettlement(player, store) {
  if (store.spawnInitialized && store.spawnLocation) {
    // Only first civilization init teleports; subsequent uses stored flag on profile
    return;
  }
  try {
    const loc = player.location;
    // Prefer slight offset from current position as safe settlement-adjacent spawn
    const safe = {
      x: Math.floor(loc.x) + 8,
      y: Math.floor(loc.y),
      z: Math.floor(loc.z) + 8,
      dimensionId: player.dimension.id
    };
    // Soft teleport only once per world for first registered player path
    if (!store.spawnInitialized) {
      player.teleport(
        { x: safe.x + 0.5, y: safe.y, z: safe.z + 0.5 },
        { dimension: player.dimension }
      );
      store.spawnLocation = safe;
      store.spawnInitialized = true;
      markDirty();
    }
  } catch (e) {
    Logger.warn(`Spawn place failed: ${e}`);
  }
}

export function playerBuy(profile, shopId, goodId, quantity, payFrom = "wallet") {
  const shop = getShop(shopId);
  if (!shop) return { ok: false, error: "shop_not_found" };
  const qty = Math.max(1, Math.floor(quantity || 1));
  const price = shop.priceOverrides?.[goodId] ?? getMarketPrice(goodId);
  if (payFrom === "bank") {
    const bank = getBankingStore();
    const account = getAccount(bank, profile.id);
    if (!account) return { ok: false, error: "no_account" };
    const w = withdraw(bank, profile.id, profile, price * qty);
    if (!w.ok) return { ok: false, error: w.error };
  }
  ensureInventory(profile);
  const result = purchaseGoods({
    buyer: profile,
    seller: shop,
    goodId,
    quantity: qty,
    unitPrice: price,
    type: TxType.PURCHASE,
    reason: "player_shop_buy"
  });
  return result;
}

export function playerSell(profile, shopId, goodId, quantity) {
  const shop = getShop(shopId);
  if (!shop) return { ok: false, error: "shop_not_found" };
  const qty = Math.max(1, Math.floor(quantity || 1));
  ensureInventory(profile);
  ensureInventory(shop);
  if (getQty(profile.inventory, goodId) < qty) return { ok: false, error: "insufficient_goods" };
  const price = Math.max(1, Math.floor((getMarketPrice(goodId) || 5) * 0.7));
  const total = price * qty;
  if (getBalance(shop) < total) return { ok: false, error: "shop_cannot_pay" };
  removeItem(profile.inventory, goodId, qty);
  addItem(shop.inventory, goodId, qty);
  setBalance(shop, getBalance(shop) - total);
  setBalance(profile, getBalance(profile) + total);
  if (shop.revenue != null) shop.revenue = (shop.revenue || 0) + 0;
  markDirty();
  return { ok: true, total, balance: getBalance(profile) };
}

export function formatProfile(profile) {
  if (!profile) return ["No profile"];
  const bank = getAccount(getBankingStore(), profile.id);
  return [
    `§6${profile.name}§r (${profile.id})`,
    `Wallet ${getBalance(profile)} ₡ | Bank ${bank ? getBalance(bank) : 0} ₡`,
    `Job ${profile.jobId || "none"} | House ${profile.houseId || "none"}`,
    `Health ${profile.health} | Edu ${profile.educationLevel} | Legal ${profile.legalStatus}`,
    `Nation ${profile.nationId} | Settlement ${profile.settlementId}`
  ];
}

export { deposit, withdraw, transfer, statementLines, getAccount, getBankingStore, openAccount };
