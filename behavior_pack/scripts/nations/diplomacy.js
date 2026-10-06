import { MAX_RELATIONS, MAX_TREATIES } from "./nation-data.js";
import { pairKey, getNation } from "./nation-registry.js";
import { markDirty } from "../core/data-store.js";

export function relationState(score) {
  if (score >= 60) return "allied";
  if (score >= 20) return "friendly";
  if (score > -20) return "neutral";
  if (score > -60) return "tense";
  return "hostile";
}

export function getRelation(store, nationA, nationB) {
  const key = pairKey(nationA, nationB);
  return (store.relations || []).find((r) => r.key === key) || null;
}

export function ensureRelation(store, nationA, nationB) {
  if (!getNation(store, nationA) || !getNation(store, nationB) || nationA === nationB) {
    return null;
  }
  let rel = getRelation(store, nationA, nationB);
  if (!rel) {
    rel = {
      key: pairKey(nationA, nationB),
      nationA: [nationA, nationB].sort()[0],
      nationB: [nationA, nationB].sort()[1],
      score: 0,
      state: "neutral"
    };
    store.relations.push(rel);
    if (store.relations.length > MAX_RELATIONS) store.relations = store.relations.slice(-MAX_RELATIONS);
  }
  return rel;
}

export function adjustRelation(store, nationA, nationB, delta) {
  const rel = ensureRelation(store, nationA, nationB);
  if (!rel) return { ok: false };
  rel.score = Math.max(-100, Math.min(100, rel.score + delta));
  rel.state = relationState(rel.score);
  markDirty();
  return { ok: true, relation: rel };
}

export function createTreaty(store, input) {
  if (!input?.nationA || !input?.nationB || input.nationA === input.nationB) {
    return { ok: false, error: "invalid" };
  }
  if (!["trade_agreement", "non_aggression", "mutual_assistance"].includes(input.type)) {
    return { ok: false, error: "invalid_type" };
  }
  const existing = (store.treaties || []).find(
    (t) =>
      t.status === "active" &&
      t.type === input.type &&
      pairKey(t.nationA, t.nationB) === pairKey(input.nationA, input.nationB)
  );
  if (existing) return { ok: false, error: "duplicate" };
  const day = input.startDay ?? Math.floor(Date.now() / 86400000);
  const treaty = {
    id: `treaty_${store.treaties.length + 1}`,
    nationA: input.nationA,
    nationB: input.nationB,
    type: input.type,
    startDay: day,
    expiryDay: day + (input.durationDays || 60),
    status: "active"
  };
  store.treaties.push(treaty);
  if (store.treaties.length > MAX_TREATIES) store.treaties = store.treaties.slice(-MAX_TREATIES);
  if (input.type === "trade_agreement") adjustRelation(store, input.nationA, input.nationB, 15);
  if (input.type === "non_aggression") adjustRelation(store, input.nationA, input.nationB, 10);
  if (input.type === "mutual_assistance") adjustRelation(store, input.nationA, input.nationB, 25);
  store.stats.treaties = (store.treaties || []).filter((t) => t.status === "active").length;
  markDirty();
  return { ok: true, treaty };
}

export function expireTreaties(store, day) {
  for (const t of store.treaties || []) {
    if (t.status === "active" && day >= t.expiryDay) {
      t.status = "expired";
      adjustRelation(store, t.nationA, t.nationB, -5);
    }
  }
}
