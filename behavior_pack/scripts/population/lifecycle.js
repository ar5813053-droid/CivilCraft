/**
 * Bounded generational lifecycle: aging, marriage, births, senior mortality.
 * Operates on population records — does not spawn entities.
 */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { addRelationship } from "./relationships.js";
import { createHousehold } from "./households.js";
import { pushPopulationEvent } from "./population-events.js";
import { lifeStage } from "./population-data.js";
import { rememberCitizen } from "../memory/memory-manager.js";

const AGE_BATCH = 25;
const MAX_BIRTHS_PER_TICK = 2;
const MAX_MARRIAGES_PER_TICK = 2;

function hashPair(a, b) {
  const s = a < b ? `${a}|${b}` : `${b}|${a}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Age a batch of living villagers; update lifeStage.
 */
export function processAging(store, villagers, cursor, day) {
  const ids = Object.keys(villagers || {});
  if (!ids.length) return { cursor: 0, aged: 0 };
  // Age once per ~30 sim days via day stamp on store
  if (store.lastAgeDay === day) return { cursor, aged: 0 };
  store.lastAgeDay = day;

  let aged = 0;
  const start = cursor % ids.length;
  for (let i = 0; i < Math.min(AGE_BATCH, ids.length); i++) {
    const id = ids[(start + i) % ids.length];
    const v = villagers[id];
    if (!v || v.alive === false) continue;
    v.age = Math.min(100, (v.age ?? 30) + 1);
    v.lifeStage = lifeStage(v.age);
    aged++;
    // Senior mortality (bounded, deterministic)
    if (v.age >= 85 && hashPair(id, String(day)) % 20 === 0) {
      v.alive = false;
      pushPopulationEvent(store, "death", id);
      try {
        rememberCitizen(id, "death", { age: v.age });
      } catch {
        /* */
      }
    }
  }
  markDirty();
  return { cursor: (start + AGE_BATCH) % ids.length, aged };
}

/**
 * Form marriages between eligible unmarried adults in same settlement.
 */
export function processMarriages(store, villagers, day) {
  if (store.lastMarriageDay === day) return { marriages: 0 };
  store.lastMarriageDay = day;

  const adults = Object.values(villagers || {}).filter(
    (v) => v.alive !== false && (v.age ?? 30) >= 20 && (v.age ?? 30) < 60
  );
  const married = new Set();
  for (const r of store.relationships || []) {
    if (r.type === "spouse" && r.active !== false) {
      married.add(r.fromVillagerId);
      married.add(r.toVillagerId);
    }
  }

  let marriages = 0;
  for (let i = 0; i < adults.length && marriages < MAX_MARRIAGES_PER_TICK; i++) {
    for (let j = i + 1; j < adults.length && marriages < MAX_MARRIAGES_PER_TICK; j++) {
      const a = adults[i];
      const b = adults[j];
      if (married.has(a.id) || married.has(b.id)) continue;
      if ((a.settlementId || "settlement_main") !== (b.settlementId || "settlement_main")) continue;
      // Deterministic compatibility
      if (hashPair(a.id, b.id) % 17 !== 0) continue;
      addRelationship(store, a.id, b.id, "spouse");
      addRelationship(store, b.id, a.id, "spouse");
      married.add(a.id);
      married.add(b.id);
      // Shared household if none
      const ha = (store.households || []).find((h) => h.memberIds?.includes(a.id));
      const hb = (store.households || []).find((h) => h.memberIds?.includes(b.id));
      if (!ha && !hb) {
        createHousehold(store, {
          memberIds: [a.id, b.id],
          headId: a.id,
          settlementId: a.settlementId || "settlement_main"
        });
      } else if (ha && !hb && !(ha.memberIds || []).includes(b.id)) {
        ha.memberIds = [...(ha.memberIds || []), b.id].slice(0, 12);
        ha.size = ha.memberIds.length;
      }
      try {
        rememberCitizen(a.id, "marriage", { partnerId: b.id });
        rememberCitizen(b.id, "marriage", { partnerId: a.id });
      } catch {
        /* */
      }
      pushPopulationEvent(store, "marriage", `${a.id}+${b.id}`);
      marriages++;
    }
  }
  if (marriages) markDirty();
  return { marriages };
}

/**
 * Births for spouse pairs with room in household.
 */
export function processBirths(store, villagers, day) {
  if (store.lastBirthDay === day) return { births: 0 };
  store.lastBirthDay = day;

  const living = Object.keys(villagers || {}).length;
  if (living >= 400) return { births: 0 }; // hard population cap

  const spouses = (store.relationships || []).filter((r) => r.type === "spouse" && r.active !== false);
  let births = 0;
  const seen = new Set();

  for (const rel of spouses) {
    if (births >= MAX_BIRTHS_PER_TICK) break;
    const pair = [rel.fromVillagerId, rel.toVillagerId].sort().join("|");
    if (seen.has(pair)) continue;
    seen.add(pair);
    const a = villagers[rel.fromVillagerId];
    const b = villagers[rel.toVillagerId];
    if (!a || !b || a.alive === false || b.alive === false) continue;
    if ((a.age ?? 30) < 20 || (a.age ?? 30) > 45) continue;
    if (hashPair(pair, String(day)) % 23 !== 0) continue;

    const childId = generateId("v");
    villagers[childId] = {
      id: childId,
      name: `Child_${childId.slice(-4)}`,
      age: 0,
      lifeStage: "child",
      settlementId: a.settlementId || "settlement_main",
      alive: true,
      health: 90,
      educationLevel: "none",
      profession: "citizen"
    };
    addRelationship(store, a.id, childId, "parent");
    addRelationship(store, b.id, childId, "parent");
    const hh = (store.households || []).find((h) => h.memberIds?.includes(a.id));
    if (hh && (hh.memberIds || []).length < 12) {
      hh.memberIds.push(childId);
      hh.size = hh.memberIds.length;
    }
    try {
      rememberCitizen(a.id, "child_birth", { childId });
      rememberCitizen(b.id, "child_birth", { childId });
    } catch {
      /* */
    }
    pushPopulationEvent(store, "birth", childId);
    births++;
  }
  if (births) markDirty();
  return { births };
}
