/**
 * Penalties. Fines move money through the existing wallet and treasury.
 */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { transferMoney, TxType } from "../economy/transactions.js";
import { getVillager } from "../villagers/villager-registry.js";
import { getTreasury, hydrateTreasury } from "../government/treasury.js";
import { getLaw, computeFine } from "./law-registry.js";
import { countPriorOffenses } from "./violations.js";
import { PenaltyType, MAX_PENALTIES, MAX_FINE } from "./justice-data.js";
import { pushJusticeEvent } from "./justice-events.js";
import { sanitizeMoney } from "../economy/wallet.js";

export function issueWarning(store, villagerId, reason, caseId = null) {
  if (!store || !villagerId) return { ok: false, error: "invalid" };
  const penalty = {
    id: generateId("pen"),
    type: PenaltyType.WARNING,
    villagerId,
    caseId,
    amount: 0,
    paid: 0,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    status: "outstanding",
    reason: reason || "warning"
  };
  store.penalties.push(penalty);
  if (store.penalties.length > MAX_PENALTIES) store.penalties = store.penalties.slice(-MAX_PENALTIES);
  pushJusticeEvent(store, "warning_issued", villagerId, { penaltyId: penalty.id });
  markDirty();
  return { ok: true, penalty };
}

/**
 * Issues a fine for a law. Attempts payment immediately. Unpaid remainder stays outstanding.
 */
export function issueFine(store, villagerId, lawId, caseId = null) {
  if (!store) return { ok: false, error: "no_justice" };
  const law = getLaw(lawId);
  if (!law) return { ok: false, error: "unknown_law" };
  const villager = getVillager(villagerId);
  if (!villager) return { ok: false, error: "missing_villager" };

  const offenseCount = countPriorOffenses(store, villagerId, lawId) || 1;
  const amount = computeFine(law, offenseCount, MAX_FINE);
  const penalty = {
    id: generateId("pen"),
    type: PenaltyType.FINE,
    villagerId,
    caseId,
    amount,
    paid: 0,
    issuedAt: Date.now(),
    expiresAt: null,
    status: "outstanding",
    reason: `fine:${lawId}`
  };
  store.penalties.push(penalty);
  if (store.penalties.length > MAX_PENALTIES) store.penalties = store.penalties.slice(-MAX_PENALTIES);
  pushJusticeEvent(store, "fine_issued", `${villagerId} ${amount}`, { penaltyId: penalty.id });

  const pay = payFine(store, penalty.id);
  markDirty();
  return { ok: true, penalty, payment: pay };
}

export function payFine(store, penaltyId) {
  const penalty = store?.penalties?.find((p) => p.id === penaltyId);
  if (!penalty || penalty.type !== PenaltyType.FINE) return { ok: false, error: "missing_fine" };
  if (penalty.status === "paid") return { ok: true, paid: 0, status: "paid" };

  const villager = getVillager(penalty.villagerId);
  const treasury = getTreasury(store.jurisdiction || "municipal_main");
  if (!villager || !treasury) return { ok: false, error: "missing_party", status: penalty.status };

  hydrateTreasury(treasury);
  const due = sanitizeMoney(penalty.amount - penalty.paid);
  const available = sanitizeMoney(villager.money);
  const payable = Math.min(due, available);
  if (payable <= 0) {
    penalty.status = "outstanding";
    pushJusticeEvent(store, "fine_unpaid", penalty.id, { penaltyId: penalty.id });
    markDirty();
    return { ok: false, error: "insufficient_funds", status: "outstanding", paid: 0 };
  }

  const result = transferMoney(villager, treasury, payable, TxType.LEGAL_FINE, penalty.reason);
  if (!result.ok) {
    penalty.status = "outstanding";
    pushJusticeEvent(store, "fine_unpaid", penalty.id, { penaltyId: penalty.id });
    return { ok: false, error: result.error, status: "outstanding" };
  }
  treasury.income = sanitizeMoney((treasury.income || 0) + payable);
  penalty.paid = sanitizeMoney(penalty.paid + payable);
  penalty.status = penalty.paid >= penalty.amount ? "paid" : "outstanding";
  store.stats.finesCollected = sanitizeMoney((store.stats.finesCollected || 0) + payable);
  pushJusticeEvent(store, penalty.status === "paid" ? "fine_paid" : "fine_unpaid", penalty.id, {
    penaltyId: penalty.id,
    amount: payable
  });
  markDirty();
  return { ok: penalty.status === "paid", paid: payable, status: penalty.status };
}
