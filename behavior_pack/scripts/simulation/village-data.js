/**
 * Village / civilization data model (Phase 1 subset).
 *
 * Designed to grow into full civilization statistics without
 * breaking existing saves.
 */

/**
 * @typedef {Object} VillageData
 * @property {string} id
 * @property {string} name
 * @property {number} population
 * @property {Record<string, number>} jobCounts
 * @property {number} houseCount
 * @property {number} workplaceCount
 * @property {number} averageHappiness
 * @property {number} createdAt
 */

/**
 * Recalculates lightweight aggregate stats from current villager registry.
 * Call infrequently (e.g. on save interval or significant events).
 * @param {string} villageId
 * @param {import("../villagers/villager-identity.js").VillagerRecord[]} villagers
 * @param {import("./village-data.js").VillageData} village
 */
export function refreshVillageStats(villageId, villagers, village) {
  village.population = villagers.length;

  /** @type {Record<string, number>} */
  const counts = {};
  let happinessSum = 0;

  for (const v of villagers) {
    const job = v.profession || "citizen";
    counts[job] = (counts[job] || 0) + 1;
    happinessSum += v.happiness ?? 50;
  }

  village.jobCounts = counts;
  village.averageHappiness =
    villagers.length > 0 ? Math.round(happinessSum / villagers.length) : 50;
}
