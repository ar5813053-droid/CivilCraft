/**
 * Registers CivilCraft capital district markers on first run (data only).
 * Does not place thousands of blocks; defines layout for systems + players.
 */

import { getWorldData, markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";

export const CAPITAL_DISTRICTS = Object.freeze([
  { id: "square", name: "Public Square", dx: 0, dz: 0, kind: "public" },
  { id: "government", name: "Government", dx: 20, dz: 0, kind: "government" },
  { id: "bank", name: "Bank", dx: 24, dz: 4, kind: "bank" },
  { id: "residential_n", name: "North Homes", dx: 0, dz: 30, kind: "residential" },
  { id: "residential_s", name: "South Homes", dx: 0, dz: -30, kind: "residential" },
  { id: "farms", name: "Farm Belt", dx: -40, dz: 0, kind: "farm" },
  { id: "market", name: "Market", dx: 15, dz: 15, kind: "market" },
  { id: "school", name: "School", dx: -15, dz: 20, kind: "education" },
  { id: "clinic", name: "Clinic", dx: -15, dz: -20, kind: "healthcare" },
  { id: "police", name: "Police", dx: 25, dz: -15, kind: "police" },
  { id: "emergency", name: "Emergency", dx: 28, dz: -18, kind: "emergency" },
  { id: "logistics", name: "Logistics", dx: 40, dz: 10, kind: "logistics" },
  { id: "festival_field", name: "Festival Field", dx: 10, dz: 40, kind: "festival" }
]);

export function ensureCapitalBlueprint() {
  const data = getWorldData();
  if (!data.settlements) return;
  const main = data.settlements.settlements?.settlement_main;
  if (!main) return;
  if (main.districts && main.districts.length) return;
  const c = main.center || { x: 0, y: 64, z: 0 };
  main.districts = CAPITAL_DISTRICTS.map((d) => ({
    ...d,
    x: c.x + d.dx,
    y: c.y,
    z: c.z + d.dz
  }));
  main.blueprint = "civilcraft_capital_v1";
  markDirty();
  Logger.info("Capital district blueprint registered.");
}
