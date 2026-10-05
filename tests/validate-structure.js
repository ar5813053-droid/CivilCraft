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
