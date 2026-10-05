export { chooseActivity } from "./activities.js";

export function productivityModifier(needs) {
  const hunger = needs?.hunger ?? 70;
  const energy = needs?.energy ?? 70;
  const raw = 0.7 + hunger / 500 + energy / 500;
  return Math.max(0.5, Math.min(1.1, Math.round(raw * 100) / 100));
}
