/**
 * Comprehensive bounded health check for !cc validate
 */

import { getWorldData } from "./data-store.js";

/**
 * @returns {{ status: "PASS"|"WARN"|"FAIL", checks: Array<{name:string, result:string, detail?:string}> }}
 */
export function runValidation() {
  const checks = [];
  const data = getWorldData();
  let fails = 0;
  let warns = 0;

  function ok(name, detail) {
    checks.push({ name, result: "PASS", detail });
  }
  function warn(name, detail) {
    warns++;
    checks.push({ name, result: "WARN", detail });
  }
  function fail(name, detail) {
    fails++;
    checks.push({ name, result: "FAIL", detail });
  }

  // Schema
  if (typeof data.version === "number" && data.version >= 20) ok("schema", `v${data.version}`);
  else fail("schema", `unexpected ${data.version}`);

  // Core registries
  const vCount = Object.keys(data.villagers || {}).length;
  if (vCount >= 0) ok("villagers", `${vCount} records`);
  if (data.economy) ok("economy", "present");
  else warn("economy", "not initialized");
  if (data.employment) ok("employment", "present");
  else warn("employment", "not initialized");
  if (data.government) ok("government", "present");
  else warn("government", "not initialized");
  if (data.politics) ok("politics", "present");
  else warn("politics", "not initialized");
  if (data.justice) ok("justice", "present");
  else warn("justice", "not initialized");
  if (data.healthcare) ok("healthcare", "present");
  else warn("healthcare", "not initialized");
  if (data.education) ok("education", "present");
  else warn("education", "not initialized");
  if (data.housing) ok("housing", "present");
  else warn("housing", "not initialized");
  if (data.settlements) ok("settlements", "present");
  else warn("settlements", "not initialized");
  if (data.nations) ok("nations", "present");
  else warn("nations", "not initialized");
  if (data.memory) ok("memory", "present");
  else warn("memory", "not initialized");
  if (data.worldEvents?.calendar) ok("calendar", `Y${data.worldEvents.calendar.year} d${data.worldEvents.calendar.dayOfYear}`);
  else warn("calendar", "missing");
  if (data.culture) ok("culture", "present");
  else warn("culture", "not initialized");
  if (data.citizenAi) ok("citizenAi", "present");
  else warn("citizenAi", "not initialized");
  if (data.players) ok("players", "present");
  else warn("players", "not initialized");
  if (data.banking) ok("banking", "present");
  else warn("banking", "not initialized");
  if (data.dailyLife) ok("dailyLife", "present");
  else warn("dailyLife", "not initialized");
  if (data.social) ok("social", "present");
  else warn("social", "not initialized");
  if (data.logistics) ok("logistics", "present");
  else warn("logistics", "not initialized");
  if (data.utilities) ok("utilities", "present");
  else warn("utilities", "not initialized");
  if (data.emergency) ok("emergency", "present");
  else warn("emergency", "not initialized");
  if (data.police) ok("police", "present");
  else warn("police", "not initialized");

  // Integrity
  if (data.economy?.wallets) {
    const neg = Object.values(data.economy.wallets).filter((w) => (w.balance ?? 0) < 0);
    if (neg.length) fail("wallet_integrity", `${neg.length} negative`);
    else ok("wallet_integrity", "no negative balances");
  }

  if (data.culture?.activeFestivals?.length > 25) warn("festival_cap", "high active festival count");
  else ok("festival_bounds", "ok");

  if ((data.population?.households || []).length > 500) warn("household_cap", "high");
  else ok("population_bounds", "ok");

  const status = fails ? "FAIL" : warns ? "WARN" : "PASS";
  return { status, checks, fails, warns };
}
