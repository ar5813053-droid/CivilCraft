import { MAX_NATIONS } from "./nation-data.js";
import { markDirty } from "../core/data-store.js";

export function getNation(store, id) {
  return (store.nations || []).find((n) => n.id === id) || null;
}

export function listNations(store) {
  return store.nations || [];
}

export function createNation(store, partial) {
  if (!partial?.id || !partial?.name) return { ok: false, error: "invalid" };
  if (getNation(store, partial.id)) return { ok: false, error: "duplicate" };
  if ((store.nations || []).length >= MAX_NATIONS) return { ok: false, error: "cap" };
  const nation = {
    id: partial.id,
    name: partial.name,
    capitalSettlementId: partial.capitalSettlementId || null,
    settlementIds: Array.isArray(partial.settlementIds) ? partial.settlementIds : [],
    governmentId: partial.governmentId || null,
    population: Math.max(0, Math.floor(partial.population || 0)),
    stability: clamp(partial.stability ?? 50),
    prosperity: clamp(partial.prosperity ?? 50),
    diplomaticPower: clamp(partial.diplomaticPower ?? 50),
    tariffRate: Math.max(0, Math.min(0.2, partial.tariffRate ?? 0.05))
  };
  store.nations.push(nation);
  store.stats.nations = store.nations.length;
  markDirty();
  return { ok: true, nation };
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

export function pairKey(a, b) {
  return [a, b].sort().join(":");
}
