/**
 * Bounded personal goals derived from real citizen state.
 */

export const MAX_ACTIVE_GOALS = 3;
export const GOAL_TYPES = Object.freeze([
  "earn_money",
  "find_job",
  "improve_career",
  "buy_house",
  "improve_house",
  "maintain_health",
  "get_education",
  "save_money",
  "socialize",
  "help_community",
  "support_family",
  "participate_politics"
]);

export function createGoal(type, priority, target = 100) {
  if (!GOAL_TYPES.includes(type)) return null;
  return {
    id: `goal_${type}`,
    type,
    priority: Math.max(0, Math.min(100, Math.round(priority))),
    progress: 0,
    target: Math.max(1, Math.floor(target)),
    status: "active",
    createdDay: Math.floor(Date.now() / 86400000)
  };
}

/**
 * Generate up to MAX_ACTIVE_GOALS from state + personality.
 * Does not invent unsupported goals (e.g. start_business omitted).
 */
export function generateGoals(context, personality) {
  const candidates = [];
  const p = personality || {};

  if (context.unemployed && context.workingAge) {
    candidates.push(createGoal("find_job", 70 + (p.ambition || 0) * 0.2));
  }
  if ((context.health ?? 80) < 50) {
    candidates.push(createGoal("maintain_health", 80));
  }
  if ((context.educationLevel === "none" || context.educationLevel === "primary") && (context.age ?? 30) < 25) {
    candidates.push(createGoal("get_education", 55 + (p.curiosity || 0) * 0.2));
  }
  if (context.homeless) {
    candidates.push(createGoal("buy_house", 75));
  }
  if ((context.money ?? 50) < 30 && (p.ambition || 50) > 50) {
    candidates.push(createGoal("earn_money", 50 + (p.ambition || 0) * 0.3));
  }
  if ((p.frugality || 50) > 65 && (context.money ?? 0) < 200) {
    candidates.push(createGoal("save_money", p.frugality));
  }
  if ((p.familyFocus || 50) > 70) {
    candidates.push(createGoal("support_family", p.familyFocus));
  }
  if ((p.sociability || 50) > 65) {
    candidates.push(createGoal("socialize", p.sociability));
  }
  if ((p.civicDuty || 50) > 70) {
    candidates.push(createGoal("help_community", p.civicDuty));
    candidates.push(createGoal("participate_politics", p.civicDuty * 0.9));
  }
  if (context.employed && (p.ambition || 50) > 70) {
    candidates.push(createGoal("improve_career", p.ambition));
  }

  const valid = candidates.filter(Boolean).sort((a, b) => b.priority - a.priority || a.type.localeCompare(b.type));
  const seen = new Set();
  const out = [];
  for (const g of valid) {
    if (seen.has(g.type)) continue;
    seen.add(g.type);
    out.push(g);
    if (out.length >= MAX_ACTIVE_GOALS) break;
  }
  return out;
}

export function advanceGoalProgress(goal, amount) {
  if (!goal || goal.status !== "active") return goal;
  goal.progress = Math.max(0, Math.min(goal.target, (goal.progress || 0) + amount));
  if (goal.progress >= goal.target) goal.status = "completed";
  return goal;
}
