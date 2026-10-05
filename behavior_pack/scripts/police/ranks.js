/** Configurable police ranks. Promotions are explicit APIs only. */

const RANKS = [
  { id: "recruit", name: "Recruit", salaryMultiplier: 1, authorityLevel: 1, maxPatrolSize: 1 },
  { id: "officer", name: "Officer", salaryMultiplier: 1.2, authorityLevel: 2, maxPatrolSize: 2 },
  { id: "senior_officer", name: "Senior Officer", salaryMultiplier: 1.4, authorityLevel: 3, maxPatrolSize: 3 },
  { id: "sergeant", name: "Sergeant", salaryMultiplier: 1.6, authorityLevel: 4, maxPatrolSize: 4 },
  { id: "lieutenant", name: "Lieutenant", salaryMultiplier: 1.8, authorityLevel: 5, maxPatrolSize: 4 },
  { id: "captain", name: "Captain", salaryMultiplier: 2, authorityLevel: 6, maxPatrolSize: 6 },
  { id: "chief", name: "Chief", salaryMultiplier: 2.2, authorityLevel: 7, maxPatrolSize: 8 }
];

const byId = new Map(RANKS.map((r) => [r.id, r]));

export function getRank(id) {
  return byId.get(id);
}

export function getAllRanks() {
  return RANKS.slice();
}

export function isValidRank(id) {
  return byId.has(id);
}

export function setRank(officer, rankId) {
  if (!officer) return { ok: false, error: "missing_officer" };
  if (!isValidRank(rankId)) return { ok: false, error: "invalid_rank" };
  officer.rank = rankId;
  return { ok: true, rank: rankId };
}

export function salaryFor(rankId, base = 12) {
  const rank = getRank(rankId) || getRank("recruit");
  return Math.max(1, Math.floor(base * rank.salaryMultiplier));
}
