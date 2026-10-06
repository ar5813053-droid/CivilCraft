/**
 * Player salary via Economy APIs — no free money.
 */

import { getBalance, credit, debit, sanitizeMoney } from "../economy/wallet.js";
import { getShop } from "../economy/shops.js";
import { getGovernment } from "../government/leadership.js";
import { markDirty } from "../core/data-store.js";
import { SALARY_HINT } from "./player-job-data.js";

/**
 * Pay mission reward from employer when funds exist.
 */
export function payMissionReward(profile, amount, mission, destination = "wallet") {
  const amt = sanitizeMoney(amount);
  if (amt <= 0 || !profile) return { ok: false, error: "invalid" };

  let source = null;
  if (mission?.employerType === "business" && mission.employerId) {
    source = getShop(mission.employerId);
  } else if (mission?.employerType === "government") {
    const gov = getGovernment();
    source = gov?.treasury || null;
  }

  if (source) {
    if (getBalance(source) < amt) return { ok: false, error: "employer_insufficient" };
    debit(source, amt);
  }
  // If no funded employer (self-employed), small capped grant is still not free-print:
  // only allow when employer paid or reward is 0. Self-employed: skip if no source.
  if (!source && mission?.employerType !== "self_employed") {
    return { ok: false, error: "no_employer_funds" };
  }
  if (!source && mission?.employerType === "self_employed") {
    // Self-employed: treat as production credit only if profile inventory path — skip cash mint
    return { ok: false, error: "self_employed_no_cash_mint" };
  }

  credit(profile, amt);
  markDirty();
  return { ok: true, amount: amt, balance: getBalance(profile) };
}

export function salaryHint(jobId) {
  return SALARY_HINT[jobId] || 10;
}

/**
 * Weekly payroll: once per 7 day stamps per player.
 */
export function tryWeeklyPayroll(store, profile, employment, dayStamp) {
  if (!profile || employment?.status !== "employed") return { ok: false };
  const last = store.lastPayday?.[profile.id];
  if (last != null && dayStamp - last < 7) return { ok: false, error: "too_soon" };
  const amt = salaryHint(employment.jobId);
  const mission = {
    employerType: employment.employerType,
    employerId: employment.employerId
  };
  const r = payMissionReward(profile, amt, mission);
  if (!r.ok) return r;
  store.lastPayday = store.lastPayday || {};
  store.lastPayday[profile.id] = dayStamp;
  store.stats.salariesPaid = (store.stats.salariesPaid || 0) + 1;
  markDirty();
  return { ok: true, amount: amt };
}
