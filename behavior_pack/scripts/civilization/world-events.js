import { EVENT_COOLDOWNS, MAX_WORLD_EVENTS } from "./civilization-data.js";
import { markDirty } from "../core/data-store.js";
import { reportEvent } from "../social/media.js";

export function canFire(store, type, day) {
  const last = store.eventCooldowns?.[type];
  const cd = EVENT_COOLDOWNS[type] ?? 5;
  if (last == null) return true;
  return day - last >= cd;
}

export function fireEvent(store, socialStore, event) {
  const day = event.day ?? Math.floor(Date.now() / 86400000);
  if (!canFire(store, event.type, day)) return { ok: false, reason: "cooldown" };
  const record = {
    id: `we_${store.events.length + 1}_${day}`,
    type: event.type,
    severity: event.severity || "minor",
    settlementId: event.settlementId || "settlement_main",
    day,
    key: event.key || event.type
  };
  store.events.push(record);
  if (store.events.length > MAX_WORLD_EVENTS) store.events = store.events.slice(-MAX_WORLD_EVENTS);
  store.eventCooldowns[event.type] = day;
  if (socialStore) {
    reportEvent(socialStore, {
      type: "local_news",
      headlineKey: event.key || event.type,
      severity: severityToNum(event.severity),
      createdDay: day
    });
  }
  markDirty();
  return { ok: true, record };
}

function severityToNum(s) {
  return { minor: 1, moderate: 2, major: 3, critical: 4 }[s] || 1;
}

export function detectWorldEvents(store, stats, socialStore, day) {
  const fired = [];
  if ((stats.foodAvailability || 100) < 25 && canFire(store, "food_shortage", day)) {
    const r = fireEvent(store, socialStore, { type: "food_shortage", severity: "major", key: "food_shortage", day });
    if (r.ok) fired.push(r.record);
  }
  if ((stats.unemployment || 0) > 40 && canFire(store, "unemployment_crisis", day)) {
    const r = fireEvent(store, socialStore, { type: "unemployment_crisis", severity: "moderate", key: "unemployment_crisis", day });
    if (r.ok) fired.push(r.record);
  }
  if ((stats.utilityQuality || 100) < 30 && canFire(store, "utility_disruption", day)) {
    const r = fireEvent(store, socialStore, { type: "utility_disruption", severity: "moderate", key: "utility_disruption", day });
    if (r.ok) fired.push(r.record);
  }
  if ((stats.governmentApproval || 0) > 75 && canFire(store, "positive_government", day)) {
    const r = fireEvent(store, socialStore, { type: "positive_government", severity: "minor", key: "positive_government", day });
    if (r.ok) fired.push(r.record);
  }
  return fired;
}
