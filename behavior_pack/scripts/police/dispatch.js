/**
 * Assigns available officers to queued emergencies. No pathfinding.
 */

import { responseTime } from "../emergency/emergency-dispatch.js";

export function dispatchUnit(store, emergency, units) {
  if (!emergency) return { ok: false, error: "missing_emergency" };
  const unit = (units || []).find(
    (u) => u.status === "available" && u.jurisdiction === (emergency.jurisdiction || store?.jurisdiction)
  );
  if (!unit) {
    emergency.status = "queued";
    return { ok: false, error: "no_unit", status: "queued" };
  }
  unit.status = "responding";
  emergency.status = "dispatched";
  emergency.assignedUnitId = unit.unitId;
  emergency.dispatchedAt = Date.now();
  const workload = (units || []).filter((u) => u.status === "responding").length;
  emergency.responseTime = responseTime(20, workload, emergency.distance || 0);
  return { ok: true, unit, emergency };
}
