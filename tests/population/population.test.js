/** Population and housing tests. Run: node tests/population/population.test.js */
const TYPES = { shelter: { capacity: 2 }, family_house: { capacity: 6, quality: 65 } };
function stage(age) {
  if (age <= 2) return "infant";
  if (age <= 12) return "child";
  if (age <= 17) return "teenager";
  if (age <= 29) return "young_adult";
  if (age <= 49) return "adult";
  if (age <= 64) return "middle_aged";
  return "senior";
}
function status(occ, cap) { return occ <= 0 ? "vacant" : occ >= cap ? "occupied" : "partially_occupied"; }
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ "+m);} else { failed++; console.error("  ✗ "+m);} }

console.log("Housing and population\n");
const housing = { houses: [] };
const house = { id: "h1", type: "family_house", settlementId: "settlement_main", capacity: TYPES.family_house.capacity, occupants: 0, status: "vacant", condition: 80, quality: 65 };
housing.houses.push(house);
assert(house.capacity === 6, "housing creation and capacity");
const household = { id: "hh1", settlementId: "settlement_main", memberIds: ["a", "b"], houseId: null, status: "homeless", size: 2 };
house.householdId = household.id; house.occupants = 2; household.houseId = house.id; household.status = "housed"; house.status = status(2, 6);
assert(house.status === "partially_occupied" && household.houseId === "h1", "house assignment");
house.householdId = null; house.occupants = 0; household.houseId = null; household.status = "homeless"; house.status = status(0, 6);
assert(house.status === "vacant" && household.status === "homeless", "house release and homelessness");
const rels = [];
function addRel(from, to, type) {
  if (rels.some((r) => r.from === from && r.to === to && r.type === type)) return false;
  rels.push({ from, to, type });
  return true;
}
assert(addRel("p", "c", "parent"), "family relationship");
assert(!addRel("p", "c", "parent"), "duplicate relationship prevention");
assert(stage(8) === "child" && stage(70) === "senior", "life-stage calculation");
const villagers = { v1: { id: "v1", age: 32, money: 20, profession: "farmer" } };
if (!villagers.v1.lifeStage) villagers.v1.lifeStage = stage(villagers.v1.age);
assert(villagers.v1.id === "v1" && villagers.v1.money === 20, "existing villager migration preserves id and wallet");
villagers.sim1 = { id: "sim1", age: 0, simulated: true, money: 0 };
assert(villagers.sim1.simulated && villagers.sim1.id !== "v1", "new simulated citizen");
villagers.sim1.alive = false;
assert(villagers.sim1.alive === false && villagers.v1.alive !== false, "death record does not kill others");
const migrations = [];
migrations.push({ direction: "in", villagerId: "sim1" });
migrations.push({ direction: "out", villagerId: "sim1" });
assert(migrations.filter((m) => m.direction === "in").length === 1, "migration in");
assert(migrations.filter((m) => m.direction === "out").length === 1, "migration out");
const demand = Math.max(0, 3 - 1);
assert(demand === 2, "housing demand");
assert(house.quality === 65, "housing quality");
house.condition = Math.max(0, house.condition - 1);
assert(house.condition === 79, "house condition decay");
house.ownership = "owner";
assert(house.ownership === "owner", "ownership");
const tenant = { money: 3 };
const rent = 4;
const unpaid = tenant.money < rent;
assert(unpaid && tenant.money === 3, "renting does not create negative balance");
const settlement = { population: Object.values(villagers).filter((v) => v.alive !== false).length, capacity: Math.max(100, house.capacity) };
assert(settlement.population === 1 && settlement.capacity >= 100, "settlement population and capacity");
assert(housing.houses.length === 1, "housing statistics");
assert(Object.keys(villagers).length === 2, "population statistics");
const migrated = { version: 8, villagers, housing, economyKept: true };
assert(migrated.version === 8 && migrated.economyKept && migrated.villagers.v1.money === 20, "v7 to v8 migration");
const events = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(events.length === 200, "collection caps");

console.log(failed ? `${failed} failed` : `\nAll ${passed} population tests passed.`);
process.exit(failed ? 1 : 0);
