/** Lightweight patrol records. No pathfinding. */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_PATROLS } from "./police-data.js";
import { pushPoliceEvent } from "./police-events.js";

const NEXT = {
  scheduled: ["active", "cancelled"],
  active: ["responding", "completed", "cancelled"],
  responding: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function createPatrol(store, officerIds, area = "village") {
  if (!store) return { ok: false, error: "no_police" };
  const ids = (officerIds || []).slice(0, 6);
  if (ids.length === 0) return { ok: false, error: "no_officers" };
  const patrol = {
    patrolId: generateId("pat"),
    stationId: store.stations[0]?.stationId || "central_station",
    officerIds: ids,
    area,
    status: "scheduled",
    startedAt: null,
    completedAt: null
  };
  store.patrols.push(patrol);
  if (store.patrols.length > MAX_PATROLS) store.patrols = store.patrols.slice(-MAX_PATROLS);
  for (const id of ids) {
    const officer = store.officers.find((o) => o.officerId === id);
    if (officer) {
      officer.patrolId = patrol.patrolId;
      officer.status = "patrol";
    }
  }
  pushPoliceEvent(store, "patrol_created", patrol.patrolId);
  markDirty();
  return { ok: true, patrol };
}

export function setPatrolStatus(patrol, status) {
  if (!patrol) return { ok: false, error: "missing_patrol" };
  if (!(NEXT[patrol.status] || []).includes(status)) return { ok: false, error: "invalid_transition" };
  patrol.status = status;
  if (status === "active") patrol.startedAt = Date.now();
  if (status === "completed" || status === "cancelled") patrol.completedAt = Date.now();
  return { ok: true, patrol };
}
