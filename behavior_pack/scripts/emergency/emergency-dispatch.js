/** Deterministic response time. Distance is stored blocks, not pathfinding. */

export function responseTime(base, workload, distance) {
  const b = Math.max(1, Math.floor(base || 20));
  const w = Math.max(0, Math.min(10, Math.floor(workload || 0))) * 5;
  const d = Math.max(0, Math.min(40, Math.floor((distance || 0) / 16)));
  return b + w + d;
}

const NEXT = {
  reported: ["queued", "dispatched", "cancelled"],
  queued: ["dispatched", "cancelled"],
  dispatched: ["responding", "cancelled"],
  responding: ["resolved", "cancelled"],
  resolved: [],
  cancelled: []
};

export function setEmergencyStatus(emergency, status) {
  if (!emergency) return { ok: false, error: "missing" };
  if (!(NEXT[emergency.status] || []).includes(status)) return { ok: false, error: "invalid_transition" };
  emergency.status = status;
  if (status === "resolved" || status === "cancelled") emergency.resolvedAt = Date.now();
  return { ok: true };
}

export function dispatchEmergency(store, emergency) {
  if (!store || !emergency) return { ok: false, error: "missing" };
  const unit = (store.units || []).find(
    (u) => u.status === "available" && u.jurisdiction === emergency.jurisdiction
  );
  if (!unit) {
    emergency.status = "queued";
    return { ok: false, error: "no_unit", status: "queued" };
  }
  unit.status = "responding";
  emergency.assignedUnitId = unit.unitId;
  emergency.status = "dispatched";
  emergency.dispatchedAt = Date.now();
  const workload = store.units.filter((u) => u.status === "responding").length;
  emergency.responseTime = responseTime(20, workload, emergency.distance || 0);
  return { ok: true, unit };
}
