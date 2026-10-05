/** Station data records. No world construction. */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_STATIONS } from "./police-data.js";

export function ensureCentralStation(store) {
  if (!store) return null;
  let station = store.stations.find((s) => s.stationId === "central_station");
  if (!station) {
    station = {
      stationId: "central_station",
      name: "Central Station",
      jurisdiction: store.jurisdiction || "municipal_main",
      location: null,
      capacity: 12,
      officerIds: [],
      status: "active",
      createdAt: Date.now()
    };
    store.stations.push(station);
    if (store.stations.length > MAX_STATIONS) store.stations = store.stations.slice(-MAX_STATIONS);
    markDirty();
  }
  return station;
}

export function assignStation(store, officer, stationId) {
  const station = store.stations.find((s) => s.stationId === stationId);
  if (!station || !officer) return { ok: false, error: "missing_station" };
  officer.stationId = stationId;
  if (!station.officerIds.includes(officer.officerId)) station.officerIds.push(officer.officerId);
  markDirty();
  return { ok: true, station };
}

export function createStation(store, name) {
  if (store.stations.length >= MAX_STATIONS) return { ok: false, error: "station_cap" };
  const station = {
    stationId: generateId("sta"),
    name: name || "Station",
    jurisdiction: store.jurisdiction,
    location: null,
    capacity: 8,
    officerIds: [],
    status: "active",
    createdAt: Date.now()
  };
  store.stations.push(station);
  markDirty();
  return { ok: true, station };
}
