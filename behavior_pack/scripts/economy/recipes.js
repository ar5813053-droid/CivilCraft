/**
 * Central production recipes for business and self-employed production.
 */

export const RECIPES = Object.freeze({
  bread: {
    id: "bread",
    inputs: [{ goodId: "wheat", amount: 2 }],
    outputs: [{ goodId: "bread", amount: 1 }],
    jobIds: ["trader", "farmer", "worker"],
    cooldownDays: 1,
    maxPerCycle: 5
  },
  tools: {
    id: "tools",
    inputs: [
      { goodId: "wood", amount: 2 },
      { goodId: "iron", amount: 1 }
    ],
    outputs: [{ goodId: "tools", amount: 1 }],
    jobIds: ["worker", "builder", "trader"],
    cooldownDays: 1,
    maxPerCycle: 2
  }
});

export function getRecipe(id) {
  return RECIPES[id] || null;
}

export function getAllRecipes() {
  return Object.values(RECIPES);
}

export function recipesForJob(jobId) {
  return getAllRecipes().filter((r) => r.jobIds.includes(jobId));
}
