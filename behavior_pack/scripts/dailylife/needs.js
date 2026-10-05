import { clampNeed } from "./daily-life-data.js";

export function defaultNeeds() {
  return { hunger: 70, energy: 70, social: 60, health: 80, safety: 60, education: 40, comfort: 50 };
}

export function tickNeeds(needs, activity) {
  const next = { ...defaultNeeds(), ...needs };
  if (activity !== "sleeping") next.energy = clampNeed(next.energy - 2);
  else next.energy = clampNeed(next.energy + 8);
  if (activity !== "eating") next.hunger = clampNeed(next.hunger - 3);
  else next.hunger = clampNeed(next.hunger + 25);
  if (activity === "socializing" || activity === "family_time") next.social = clampNeed(next.social + 6);
  else next.social = clampNeed(next.social - 1);
  if (activity === "leisure") next.comfort = clampNeed(next.comfort + 4);
  return next;
}

export function happinessScore(needs, previous = 50) {
  const values = ["hunger", "energy", "social", "health", "safety", "education", "comfort"].map((k) => clampNeed(needs[k]));
  const next = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return clampNeed(previous + (next - previous) * 0.25);
}

export function stressScore(input, previous = 20) {
  let next = 20;
  if (input.unemployed) next += 15;
  if (input.homeless) next += 20;
  if ((input.hunger ?? 70) < 30) next += 15;
  if ((input.health ?? 80) < 40) next += 15;
  if (input.financialPressure) next += 10;
  next = clampNeed(next);
  return clampNeed(previous + (next - previous) * 0.25);
}
