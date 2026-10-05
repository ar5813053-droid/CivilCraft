/**
 * Legal status derived from persisted records, with an optional override.
 */

import { LegalStatus } from "./justice-data.js";

const RANK = {
  clean: 0,
  warned: 1,
  fined: 2,
  wanted: 3,
  restricted: 4
};

export function deriveLegalStatus(store, villagerId, now = Date.now()) {
  if (!store || !villagerId) return LegalStatus.CLEAN;
  let rank = 0;

  for (const penalty of store.penalties || []) {
    if (penalty.villagerId !== villagerId) continue;
    if (penalty.type === "temporary_ban" && penalty.status !== "expired") {
      if (!penalty.expiresAt || penalty.expiresAt > now) rank = Math.max(rank, RANK.restricted);
    }
    if (penalty.type === "fine" && penalty.status === "outstanding") {
      rank = Math.max(rank, RANK.fined);
    }
    if (penalty.type === "warning" && penalty.status !== "expired") {
      if (!penalty.expiresAt || penalty.expiresAt > now) rank = Math.max(rank, RANK.warned);
    }
  }

  for (const violation of store.violations || []) {
    if (violation.offenderVillagerId !== villagerId) continue;
    if (violation.status === "dismissed" || violation.status === "resolved") continue;
    if (violation.severity >= 3) rank = Math.max(rank, RANK.wanted);
  }

  const override = store.statusOverrides?.[villagerId];
  if (override && RANK[override] != null) rank = Math.max(rank, RANK[override]);

  return Object.keys(RANK).find((k) => RANK[k] === rank) || LegalStatus.CLEAN;
}

export function setLegalStatus(store, villagerId, status) {
  if (!store || !villagerId) return { ok: false, error: "invalid" };
  if (!Object.values(LegalStatus).includes(status)) return { ok: false, error: "invalid_status" };
  if (!store.statusOverrides) store.statusOverrides = {};
  if (status === LegalStatus.CLEAN) delete store.statusOverrides[villagerId];
  else store.statusOverrides[villagerId] = status;
  return { ok: true, status: deriveLegalStatus(store, villagerId) };
}

export function getLegalStatus(store, villagerId) {
  return deriveLegalStatus(store, villagerId);
}
