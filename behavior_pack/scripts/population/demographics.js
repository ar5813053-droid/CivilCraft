export { lifeStage, jobEligible, LIFE_STAGES } from "./population-data.js";

export function ensureDemographics(villager) {
  if (!villager) return null;
  if (typeof villager.age !== "number") villager.age = 30;
  if (!villager.lifeStage) villager.lifeStage = "adult";
  if (!villager.settlementId) villager.settlementId = "settlement_main";
  if (!villager.alive) villager.alive = true;
  return villager;
}
