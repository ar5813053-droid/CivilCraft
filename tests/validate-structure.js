/**
 * Lightweight structural validation runnable with Node.
 * Does not require Minecraft. Catches missing files / broken JSON.
 *
 * Usage: node tests/validate-structure.js
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed++;
}

function mustExist(rel) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) ok(rel);
  else fail(`Missing: ${rel}`);
}

function mustBeJson(rel) {
  const p = path.join(root, rel);
  try {
    JSON.parse(fs.readFileSync(p, "utf8"));
    ok(`${rel} is valid JSON`);
  } catch (e) {
    fail(`${rel} invalid JSON: ${e.message}`);
  }
}

console.log("CivilCraft structure validation\n");

const required = [
  "behavior_pack/manifest.json",
  "resource_pack/manifest.json",
  "behavior_pack/scripts/main.js",
  "behavior_pack/scripts/core/constants.js",
  "behavior_pack/scripts/core/data-store.js",
  "behavior_pack/scripts/core/logger.js",
  "behavior_pack/scripts/core/utils.js",
  "behavior_pack/scripts/villagers/villager-identity.js",
  "behavior_pack/scripts/villagers/villager-registry.js",
  "behavior_pack/scripts/villagers/villager-manager.js",
  "behavior_pack/scripts/jobs/index.js",
  "behavior_pack/scripts/jobs/job-registry.js",
  "behavior_pack/scripts/jobs/jobs/citizen.js",
  "behavior_pack/scripts/jobs/jobs/farmer.js",
  "behavior_pack/scripts/jobs/jobs/worker.js",
  "behavior_pack/scripts/jobs/jobs/trader.js",
  "behavior_pack/scripts/jobs/jobs/builder.js",
  "behavior_pack/scripts/schedules/default-schedule.js",
  "behavior_pack/scripts/schedules/schedule-manager.js",
  "behavior_pack/scripts/families/household-manager.js",
  "behavior_pack/scripts/simulation/simulation-manager.js",
  "behavior_pack/scripts/simulation/village-data.js",
  "behavior_pack/scripts/economy/economy-data.js",
  "behavior_pack/scripts/economy/wallet.js",
  "behavior_pack/scripts/economy/goods-registry.js",
  "behavior_pack/scripts/economy/inventory.js",
  "behavior_pack/scripts/economy/transactions.js",
  "behavior_pack/scripts/economy/prices.js",
  "behavior_pack/scripts/economy/production.js",
  "behavior_pack/scripts/economy/consumption.js",
  "behavior_pack/scripts/economy/shops.js",
  "behavior_pack/scripts/economy/businesses.js",
  "behavior_pack/scripts/economy/business-operations.js",
  "behavior_pack/scripts/economy/recipes.js",
  "behavior_pack/scripts/economy/business-production.js",
  "behavior_pack/scripts/logistics/logistics-data.js",
  "behavior_pack/scripts/logistics/logistics-manager.js",
  "behavior_pack/scripts/logistics/routes.js",
  "behavior_pack/scripts/logistics/shipments.js",
  "behavior_pack/scripts/utilities/utilities-data.js",
  "behavior_pack/scripts/utilities/utilities-manager.js",
  "behavior_pack/scripts/utilities/utility-services.js",
  "behavior_pack/scripts/social/social-data.js",
  "behavior_pack/scripts/social/social-manager.js",
  "behavior_pack/scripts/social/public-opinion.js",
  "behavior_pack/scripts/social/media.js",
  "behavior_pack/scripts/politics/politics-data.js",
  "behavior_pack/scripts/politics/politics-manager.js",
  "behavior_pack/scripts/politics/parties.js",
  "behavior_pack/scripts/politics/candidates.js",
  "behavior_pack/scripts/politics/elections.js",
  "behavior_pack/scripts/politics/political-preferences.js",
  "behavior_pack/scripts/politics/policies.js",
  "behavior_pack/scripts/nations/nation-data.js",
  "behavior_pack/scripts/nations/nation-manager.js",
  "behavior_pack/scripts/nations/nation-registry.js",
  "behavior_pack/scripts/nations/diplomacy.js",
  "behavior_pack/scripts/nations/international-trade.js",
  "behavior_pack/scripts/civilization/civilization-data.js",
  "behavior_pack/scripts/civilization/civilization-manager.js",
  "behavior_pack/scripts/civilization/civilization-score.js",
  "behavior_pack/scripts/civilization/world-events.js",
  "behavior_pack/scripts/civilization/simulation-tiers.js",
  "behavior_pack/scripts/civilization/appearance.js",
  "assets/LICENSES.md",



  "behavior_pack/scripts/economy/economy-manager.js",
  "behavior_pack/scripts/government/government-data.js",
  "behavior_pack/scripts/government/government-manager.js",
  "behavior_pack/scripts/government/leadership.js",
  "behavior_pack/scripts/government/departments.js",
  "behavior_pack/scripts/government/treasury.js",
  "behavior_pack/scripts/government/taxation.js",
  "behavior_pack/scripts/government/public-spending.js",
  "behavior_pack/scripts/government/government-events.js",
  "behavior_pack/scripts/justice/justice-data.js",
  "behavior_pack/scripts/justice/justice-manager.js",
  "behavior_pack/scripts/justice/law-registry.js",
  "behavior_pack/scripts/justice/violations.js",
  "behavior_pack/scripts/justice/cases.js",
  "behavior_pack/scripts/justice/penalties.js",
  "behavior_pack/scripts/justice/legal-status.js",
  "behavior_pack/scripts/justice/justice-events.js",
  "behavior_pack/scripts/jobs/jobs/police-officer.js",
  "behavior_pack/scripts/schedules/police-schedule.js",
  "behavior_pack/scripts/police/police-data.js",
  "behavior_pack/scripts/police/police-manager.js",
  "behavior_pack/scripts/police/police-department.js",
  "behavior_pack/scripts/police/officers.js",
  "behavior_pack/scripts/police/ranks.js",
  "behavior_pack/scripts/police/patrols.js",
  "behavior_pack/scripts/police/stations.js",
  "behavior_pack/scripts/police/dispatch.js",
  "behavior_pack/scripts/police/arrests.js",
  "behavior_pack/scripts/police/police-events.js",
  "behavior_pack/scripts/emergency/emergency-data.js",
  "behavior_pack/scripts/emergency/emergency-manager.js",
  "behavior_pack/scripts/emergency/emergency-dispatch.js",
  "behavior_pack/scripts/emergency/emergency-events.js",
  "behavior_pack/scripts/jobs/jobs/medical.js",
  "behavior_pack/scripts/jobs/jobs/teacher.js",
  "behavior_pack/scripts/schedules/service-schedules.js",
  "behavior_pack/scripts/healthcare/healthcare-data.js",
  "behavior_pack/scripts/healthcare/healthcare-manager.js",
  "behavior_pack/scripts/healthcare/health-records.js",
  "behavior_pack/scripts/healthcare/medical-staff.js",
  "behavior_pack/scripts/healthcare/clinics.js",
  "behavior_pack/scripts/healthcare/treatments.js",
  "behavior_pack/scripts/healthcare/medical-events.js",
  "behavior_pack/scripts/education/education-data.js",
  "behavior_pack/scripts/education/education-manager.js",
  "behavior_pack/scripts/education/students.js",
  "behavior_pack/scripts/education/teachers.js",
  "behavior_pack/scripts/education/schools.js",
  "behavior_pack/scripts/education/classes.js",
  "behavior_pack/scripts/education/education-events.js",
  "behavior_pack/scripts/settlements/settlement-data.js",
  "behavior_pack/scripts/settlements/settlement-manager.js",
  "behavior_pack/scripts/settlements/settlement-types.js",
  "behavior_pack/scripts/settlements/settlement-growth.js",
  "behavior_pack/scripts/settlements/settlement-stats.js",
  "behavior_pack/scripts/settlements/settlement-services.js",
  "behavior_pack/scripts/settlements/settlement-events.js",
  "behavior_pack/scripts/infrastructure/infrastructure-data.js",
  "behavior_pack/scripts/infrastructure/infrastructure-manager.js",
  "behavior_pack/scripts/infrastructure/infrastructure-types.js",
  "behavior_pack/scripts/infrastructure/roads.js",
  "behavior_pack/scripts/infrastructure/facilities.js",
  "behavior_pack/scripts/infrastructure/infrastructure-stats.js",
  "behavior_pack/scripts/infrastructure/infrastructure-events.js",
  "behavior_pack/scripts/housing/housing-data.js",
  "behavior_pack/scripts/housing/housing-manager.js",
  "behavior_pack/scripts/housing/housing-types.js",
  "behavior_pack/scripts/housing/houses.js",
  "behavior_pack/scripts/housing/housing-capacity.js",
  "behavior_pack/scripts/housing/housing-events.js",
  "behavior_pack/scripts/housing/housing-stats.js",
  "behavior_pack/scripts/housing/housing-demand.js",
  "behavior_pack/scripts/population/population-data.js",
  "behavior_pack/scripts/population/population-manager.js",
  "behavior_pack/scripts/population/households.js",
  "behavior_pack/scripts/population/family.js",
  "behavior_pack/scripts/population/relationships.js",
  "behavior_pack/scripts/population/demographics.js",
  "behavior_pack/scripts/population/migration.js",
  "behavior_pack/scripts/population/population-events.js",
  "behavior_pack/scripts/population/population-stats.js",
  "behavior_pack/scripts/dailylife/daily-life-data.js",
  "behavior_pack/scripts/dailylife/daily-life-manager.js",
  "behavior_pack/scripts/dailylife/routines.js",
  "behavior_pack/scripts/dailylife/activities.js",
  "behavior_pack/scripts/dailylife/citizen-state.js",
  "behavior_pack/scripts/dailylife/needs.js",
  "behavior_pack/scripts/dailylife/decisions.js",
  "behavior_pack/scripts/dailylife/attendance.js",
  "behavior_pack/scripts/dailylife/leisure.js",
  "behavior_pack/scripts/dailylife/daily-life-events.js",
  "behavior_pack/scripts/dailylife/daily-life-stats.js",
  "behavior_pack/scripts/dailylife/food.js",
  "behavior_pack/scripts/dailylife/consumption.js",
  "behavior_pack/scripts/employment/employment-data.js",
  "behavior_pack/scripts/employment/employment-manager.js",
  "behavior_pack/scripts/employment/employment-records.js",
  "behavior_pack/scripts/employment/job-market.js",
  "behavior_pack/scripts/employment/job-matching.js",
  "behavior_pack/scripts/employment/hiring.js",
  "behavior_pack/scripts/employment/unemployment.js",
  "behavior_pack/scripts/employment/employment-events.js",
  "behavior_pack/scripts/employment/employment-stats.js",

  "docs/architecture.md",
  "docs/roadmap.md",
  "README.md",
  "LICENSE"
];

for (const f of required) mustExist(f);

console.log("\nJSON validation\n");
mustBeJson("behavior_pack/manifest.json");
mustBeJson("resource_pack/manifest.json");

// UUID uniqueness check
const bp = JSON.parse(fs.readFileSync(path.join(root, "behavior_pack/manifest.json"), "utf8"));
const rp = JSON.parse(fs.readFileSync(path.join(root, "resource_pack/manifest.json"), "utf8"));
const uuids = new Set();
function track(u, label) {
  if (uuids.has(u)) fail(`Duplicate UUID ${u} (${label})`);
  else {
    uuids.add(u);
    ok(`UUID unique: ${label}`);
  }
}
track(bp.header.uuid, "BP header");
track(bp.modules[0].uuid, "BP data module");
track(bp.modules[1].uuid, "BP script module");
track(rp.header.uuid, "RP header");
track(rp.modules[0].uuid, "RP resources module");

// Dependency on RP
const dep = bp.dependencies.find((d) => d.uuid === rp.header.uuid);
if (dep) ok("BP depends on RP UUID");
else fail("BP missing dependency on RP header UUID");

// Script module entry
if (bp.modules[1].entry === "scripts/main.js") ok("Script entry is scripts/main.js");
else fail("Script entry incorrect");

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
