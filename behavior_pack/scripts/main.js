/**
 * CivilCraft — entry point (Player Citizen & Banking).
 *
 * Responsibilities:
 * - Bootstrap subsystems in dependency order
 * - Register world/entity event handlers
 * - Provide a small set of development chat commands
 *
 * Keep this file thin; business logic lives in modules.
 */

import { world, system } from "@minecraft/server";
import { Logger } from "./core/logger.js";
import { loadWorldData, saveWorldData } from "./core/data-store.js";
import { initializeJobs } from "./jobs/index.js";
import { initializeSchedules } from "./schedules/schedule-manager.js";
import { startSimulation, onEntityAvailable, getSimulationSnapshot } from "./simulation/simulation-manager.js";
import { forceManageNearPlayers, ensureManaged } from "./villagers/villager-manager.js";
import { getAllVillagers, getPopulation } from "./villagers/villager-registry.js";
import { getAllJobs } from "./jobs/job-registry.js";
import { DEBUG } from "./core/constants.js";
import { initializeEconomy, getEconomySnapshot, formatEconomyStatusLines } from "./economy/economy-manager.js";
import { getAllGoods } from "./economy/goods-registry.js";
import { getAllShops } from "./economy/shops.js";
import { getRecentTransactions } from "./economy/transactions.js";
import { getBalance, formatMoney } from "./economy/wallet.js";
import { getPriceSnapshot } from "./economy/prices.js";
import { CURRENCY_SYMBOL } from "./economy/economy-data.js";
import { initializeGovernment, formatGovernmentLines, getGovernmentSnapshot } from "./government/government-manager.js";
import { appoint, getGovernment } from "./government/leadership.js";
import { createProject } from "./government/public-spending.js";
import {
  initializeJustice,
  formatJusticeLines,
  getJustice,
  reportViolation,
  getAllLaws,
  getLaw,
  getLegalStatus
} from "./justice/justice-manager.js";
import { issueFine } from "./justice/penalties.js";
import { initializePolice, formatPoliceLines, getPolice } from "./police/police-manager.js";
import { hireOfficer, getOfficerByVillager } from "./police/officers.js";
import { setRank, getAllRanks } from "./police/ranks.js";
import { reportCrime } from "./police/arrests.js";
import { initializeEmergency, formatEmergencyLines, getEmergencyStore, createEmergency } from "./emergency/emergency-manager.js";
import { initializeHealthcare, formatHealthLines, getHealthcare } from "./healthcare/healthcare-manager.js";
import { setHealth } from "./healthcare/health-records.js";
import { treatVillager } from "./healthcare/treatments.js";
import { createClinic } from "./healthcare/clinics.js";
import { initializeEducation, formatEducationLines, getEducation } from "./education/education-manager.js";
import { enrollStudent, graduate } from "./education/students.js";
import { createSchool } from "./education/schools.js";
import { initializeSettlements, formatSettlementLines, getSettlement, getSettlementStore, evaluateGrowth } from "./settlements/settlement-manager.js";
import { typeForPopulation } from "./settlements/settlement-types.js";
import { initializeInfrastructure, formatInfraLines, getInfrastructure } from "./infrastructure/infrastructure-manager.js";
import { initializeHousing, formatHousingLines, getHousing } from "./housing/housing-manager.js";
import { initializePopulation, formatPopulationLines, getPopulationStore } from "./population/population-manager.js";
import { initializeDailyLife, formatDailyLines, getDailyLife } from "./dailylife/daily-life-manager.js";
import { ROUTINES } from "./dailylife/routines.js";
import { getHouseholdFoodStatus, evaluateHouseholdFood } from "./dailylife/food.js";
import { evaluateCitizenConsumption, getConsumptionStatus } from "./dailylife/consumption.js";
import { initializeEmployment, formatEmploymentLines, getEmploymentStore, hireCitizen } from "./employment/employment-manager.js";
import { initializeBusinessOperations, formatBusinessLines, runShopPayroll, ensureBusinessOps, getVacancies } from "./economy/business-operations.js";
import { initializeBusinessProduction } from "./economy/business-production.js";
import { initializeLogistics, getLogisticsStore } from "./logistics/logistics-manager.js";
import { createRoute } from "./logistics/routes.js";
import { createShipment } from "./logistics/shipments.js";
import { initializeUtilities, getUtilitiesStore } from "./utilities/utilities-manager.js";
import { initializeSocial, getSocialStore } from "./social/social-manager.js";
import { initializePolitics, getPoliticsStore } from "./politics/politics-manager.js";
import { listParties } from "./politics/parties.js";
import { initializeNations, getNationsStore } from "./nations/nation-manager.js";
import { initializeCivilization, getCivilizationStore, formatCivilizationLines } from "./civilization/civilization-manager.js";
import { initializeAppearance } from "./appearance/appearance-manager.js";
import { initializeBanking, getBankingStore, openAccount, deposit, withdraw, transfer, getAccount, statementLines } from "./banking/banking-manager.js";
import { initializePlayerSystem, getOrCreateProfile, formatProfile, playerBuy, playerSell, getPlayersStore } from "./player/player-manager.js";
import { getBalance } from "./economy/wallet.js";
import { getAllShops } from "./economy/shops.js";
import { selectAppearance } from "./civilization/appearance.js";
import { listNations, getNation } from "./nations/nation-registry.js";
import { getRelation } from "./nations/diplomacy.js";
import { getShop, getAllShops } from "./economy/shops.js";
import { getAllJobs } from "./jobs/job-registry.js";

Logger.info("CivilCraft Player systems loading…");

// --- Bootstrap ---
loadWorldData();
initializeJobs();
initializeSchedules();
initializeEconomy();
initializeGovernment();
initializeJustice();
initializePolice();
initializeEmergency();
initializeHealthcare();
initializeEducation();
initializeSettlements();
initializeInfrastructure();
initializeHousing();
initializePopulation();
initializeDailyLife();
initializeEmployment();
initializeBusinessOperations();
initializeBusinessProduction();
initializeLogistics();
initializeUtilities();
initializeSocial();
initializePolitics();
initializeNations();
initializeCivilization();
initializeAppearance();
initializeBanking();
initializePlayerSystem();
startSimulation();

// --- Entity lifecycle ---
world.afterEvents.entitySpawn.subscribe((event) => {
  onEntityAvailable(event.entity);
});

// entityLoad is available on modern Script API; guard for safety
if (world.afterEvents.entityLoad) {
  world.afterEvents.entityLoad.subscribe((event) => {
    onEntityAvailable(event.entity);
  });
}

// Persist on player leave / script shutdown best-effort
world.afterEvents.playerLeave.subscribe(() => {
  saveWorldData();
});

system.beforeEvents?.shutdown?.subscribe?.(() => {
  saveWorldData();
});

// --- Development / debug commands ---
// chatSend may be unavailable on some API versions; guard so the pack still loads.
if (DEBUG && world.beforeEvents && world.beforeEvents.chatSend) {
  world.beforeEvents.chatSend.subscribe((event) => {
    const message = event.message.trim().toLowerCase();
    if (!message.startsWith("!cc ")) return;

    event.cancel = true;
    const player = event.sender;
    const args = message.slice(4).split(/\s+/);
    const cmd = args[0];

    try {
      switch (cmd) {
        case "help":
          player.sendMessage(
            "§6CivilCraft:§r status manage population jobs village list save"
          );
          player.sendMessage(
            "§6Economy:§r economy money prices goods shops transactions"
          );
          player.sendMessage(
            "§6Government:§r government leader treasury taxes budget departments approval govtransactions"
          );
          player.sendMessage(
            "§6Justice:§r justice laws law violations cases case legal fine justiceevents"
          );
          player.sendMessage(
            "§6Police:§r police officers officer stations patrols arrests policeevents"
          );
          player.sendMessage(
            "§6Emergency:§r dispatch emergencies emergency"
          );
          break;

        case "status": {
          const snap = getSimulationSnapshot();
          player.sendMessage(
            `§aCivilCraft§r pop=${snap.population} households=${snap.households} villages=${snap.villages}`
          );
          if (snap.defaultVillage) {
            const v = snap.defaultVillage;
            player.sendMessage(
              `§7Village "${v.name}": happiness≈${v.averageHappiness}, jobs=${JSON.stringify(v.jobCounts)}`
            );
          }
          break;
        }

        case "manage": {
          const n = forceManageNearPlayers(48);
          player.sendMessage(`§aManaged ${n} nearby villagers.`);
          break;
        }

        case "population":
          player.sendMessage(`§aRegistered population: ${getPopulation()}`);
          break;

        case "jobs": {
          const jobs = getAllJobs().map((j) => j.id).join(", ");
          player.sendMessage(`§aJobs: ${jobs}`);
          break;
        }

        case "village": {
          const snap = getSimulationSnapshot();
          player.sendMessage(JSON.stringify(snap.defaultVillage ?? {}, null, 0));
          break;
        }

        case "list": {
          const list = getAllVillagers()
            .slice(0, 10)
            .map((v) => `${v.name}[${v.profession}/${v.currentActivity}]`)
            .join(", ");
          player.sendMessage(list || "§7No managed villagers yet. Use !cc manage");
          break;
        }

        case "save":
          saveWorldData();
          player.sendMessage("§aWorld data saved.");
          break;

        case "economy": {
          for (const line of formatEconomyStatusLines()) {
            player.sendMessage(line);
          }
          break;
        }

        case "money": {
          const villagers = getAllVillagers();
          const total = villagers.reduce((s, v) => s + getBalance(v), 0);
          const top = [...villagers]
            .sort((a, b) => getBalance(b) - getBalance(a))
            .slice(0, 5)
            .map((v) => `${v.name}: ${formatMoney(getBalance(v), CURRENCY_SYMBOL)}`)
            .join(" | ");
          player.sendMessage(
            `§aTotal villager money: ${formatMoney(total, CURRENCY_SYMBOL)}§r`
          );
          player.sendMessage(top || "§7No villagers");
          break;
        }

        case "prices": {
          const snap = getPriceSnapshot();
          for (const p of snap) {
            player.sendMessage(
              `§e${p.id}§r ${p.price}${CURRENCY_SYMBOL} (base ${p.base}, s:${p.supply} d:${p.demand})`
            );
          }
          break;
        }

        case "goods": {
          const list = getAllGoods()
            .map((g) => `${g.id}[${g.category}/${g.basePrice}${CURRENCY_SYMBOL}]`)
            .join(", ");
          player.sendMessage(list || "§7No goods");
          break;
        }

        case "shops": {
          const shops = getAllShops();
          if (shops.length === 0) {
            player.sendMessage("§7No shops");
            break;
          }
          for (const s of shops.slice(0, 8)) {
            player.sendMessage(
              `§b${s.name}§r (${s.type}) bal:${s.balance}${CURRENCY_SYMBOL} open:${s.open} owner:${s.ownerId ? "yes" : "no"}`
            );
          }
          break;
        }

        case "transactions": {
          const txs = getRecentTransactions(8);
          if (txs.length === 0) {
            player.sendMessage("§7No recent transactions");
            break;
          }
          for (const t of txs) {
            player.sendMessage(
              `§7${t.type}§r ${t.goodId || "-"} x${t.quantity} total:${t.total}${CURRENCY_SYMBOL} (${t.reason})`
            );
          }
          break;
        }

        case "government":
        case "approval": {
          for (const line of formatGovernmentLines()) player.sendMessage(line);
          break;
        }

        case "leader": {
          const snap = getGovernmentSnapshot();
          if (!snap.ready) {
            player.sendMessage("§cNo government");
            break;
          }
          const gov = getGovernment();
          const first = getAllVillagers()[0];
          if (args[1] === "appoint" && args[2] && first) {
            const role = args[2];
            const result = appoint(role, first.id);
            player.sendMessage(result.ok ? `§aAppointed ${first.name} as ${role}` : `§c${result.error}`);
            break;
          }
          player.sendMessage(`Mayor: ${snap.mayor}`);
          player.sendMessage("§7Use !cc leader appoint mayor|deputy_mayor|treasurer");
          if (gov?.leadership) {
            player.sendMessage(`Deputy: ${gov.leadership.deputy_mayor?.villagerId || "vacant"}`);
            player.sendMessage(`Treasurer: ${gov.leadership.treasurer?.villagerId || "vacant"}`);
          }
          break;
        }

        case "treasury": {
          const snap = getGovernmentSnapshot();
          player.sendMessage(
            snap.ready
              ? `§aTreasury ${snap.treasury}${CURRENCY_SYMBOL}  in collected ${snap.collected}  spent ${snap.spent}`
              : "§cNo treasury"
          );
          break;
        }

        case "taxes": {
          const gov = getGovernment();
          if (!gov) {
            player.sendMessage("§cNo government");
            break;
          }
          if (args[1] && !Number.isNaN(Number(args[1]))) {
            const rate = Math.max(0, Math.min(50, Math.floor(Number(args[1]))));
            gov.taxPolicy.ratePercent = rate;
            player.sendMessage(`§aTax rate set to ${rate}%`);
            break;
          }
          player.sendMessage(
            `Rate ${gov.taxPolicy.ratePercent}%  threshold ${gov.taxPolicy.threshold}  max ${gov.taxPolicy.maxTax}  collected ${gov.taxCollected}`
          );
          break;
        }

        case "budget": {
          const snap = getGovernmentSnapshot();
          if (!snap.ready) break;
          player.sendMessage(
            `PW ${snap.budget.public_works}  Admin ${snap.budget.administration}  Reserve ${snap.budget.reserve}`
          );
          if (args[1] === "project") {
            const result = createProject({ type: "maintenance", cost: 20, name: "Road maintenance" });
            player.sendMessage(result.ok ? `§aFunded ${result.project.id}` : `§c${result.error}`);
          }
          break;
        }

        case "departments": {
          const snap = getGovernmentSnapshot();
          if (!snap.ready) break;
          for (const d of snap.departments) {
            player.sendMessage(`${d.enabled ? "§a" : "§7"}${d.name}§r head:${d.head || "none"}`);
          }
          break;
        }

        case "govtransactions": {
          const snap = getGovernmentSnapshot();
          const txs = snap.transactions || [];
          if (txs.length === 0) {
            player.sendMessage("§7No government transactions");
            break;
          }
          for (const t of txs) {
            player.sendMessage(`§7${t.type}§r ${t.amount}${CURRENCY_SYMBOL} ${t.reason}`);
          }
          break;
        }

        case "justice": {
          for (const line of formatJusticeLines()) player.sendMessage(line);
          break;
        }

        case "laws": {
          player.sendMessage(getAllLaws().map((l) => l.id).join(", "));
          break;
        }

        case "law": {
          const law = getLaw(args[1]);
          player.sendMessage(law ? `${law.name} sev ${law.severity} fine ${law.fine}` : "§cUnknown law");
          break;
        }

        case "violations": {
          const list = (getJustice().violations || []).slice(-5);
          player.sendMessage(list.map((v) => `${v.lawId}:${v.status}`).join(" | ") || "§7None");
          break;
        }

        case "cases": {
          const list = (getJustice().cases || []).slice(-5);
          player.sendMessage(list.map((c) => `${c.caseId}:${c.status}`).join(" | ") || "§7None");
          break;
        }

        case "case": {
          const found = (getJustice().cases || []).find((c) => c.caseId === args[1]);
          player.sendMessage(found ? `${found.caseId} ${found.status}` : "§cNo case");
          break;
        }

        case "legal": {
          const id = args[1] || getAllVillagers()[0]?.id;
          player.sendMessage(id ? `${id}: ${getLegalStatus(getJustice(), id)}` : "§7No villager");
          break;
        }

        case "fine": {
          const id = args[1] || getAllVillagers()[0]?.id;
          if (!id) {
            player.sendMessage("§cNo villager");
            break;
          }
          const result = issueFine(getJustice(), id, "theft");
          player.sendMessage(result.ok ? `§aFine ${result.penalty.amount} (${result.penalty.status})` : `§c${result.error}`);
          break;
        }

        case "justiceevents": {
          const events = (getJustice().events || []).slice(-6);
          player.sendMessage(events.map((e) => e.type).join(", ") || "§7None");
          break;
        }

        case "police": {
          if (args[1] === "hire") {
            const id = args[2] || getAllVillagers()[0]?.id;
            const result = id ? hireOfficer(getPolice(), id, "recruit") : { ok: false, error: "no_villager" };
            player.sendMessage(result.ok ? `§aHired ${id}` : `§c${result.error}`);
            break;
          }
          if (args[1] === "rank") {
            const officer = getOfficerByVillager(getPolice(), args[2]);
            const result = setRank(officer, args[3]);
            player.sendMessage(result.ok ? `§aRank ${args[3]}` : `§c${result.error}`);
            break;
          }
          if (args[1] === "report") {
            const officer = getPolice().officers[0];
            const result = officer
              ? reportCrime(getPolice(), { officerId: officer.officerId, lawId: args[3] || "theft", offenderVillagerId: args[2] })
              : { ok: false, error: "no_officer" };
            player.sendMessage(result.ok ? "§aReported" : `§c${result.error}`);
            break;
          }
          for (const line of formatPoliceLines()) player.sendMessage(line);
          break;
        }

        case "officers":
          player.sendMessage(getPolice().officers.map((o) => `${o.villagerId}:${o.rank}`).join(", ") || "§7None");
          break;

        case "officer": {
          const officer = getOfficerByVillager(getPolice(), args[1]);
          player.sendMessage(officer ? `${officer.rank} ${officer.status}` : "§cNo officer");
          break;
        }

        case "stations":
          player.sendMessage(getPolice().stations.map((s) => s.name).join(", ") || "§7None");
          break;

        case "patrols":
          player.sendMessage(getPolice().patrols.map((p) => `${p.patrolId}:${p.status}`).join(", ") || "§7None");
          break;

        case "arrests":
          player.sendMessage(String(getPolice().arrests.length));
          break;

        case "policeevents":
          player.sendMessage(getPolice().events.slice(-6).map((e) => e.type).join(", ") || "§7None");
          break;

        case "dispatch":
        case "emergencies":
          for (const line of formatEmergencyLines()) player.sendMessage(line);
          break;

        case "emergency": {
          if (args[1] === "create") {
            const result = createEmergency(getEmergencyStore(), { type: args[2] || "crime", priority: "normal" });
            player.sendMessage(result.ok ? `§a${result.emergency.emergencyId} ${result.emergency.status}` : `§c${result.error}`);
            break;
          }
          const found = getEmergencyStore().emergencies.find((e) => e.emergencyId === args[1]);
          player.sendMessage(found ? `${found.type} ${found.status}` : "§cNo emergency");
          break;
        }

        case "health":
        case "healthcare":
        case "medical": {
          if (args[1] === "set") {
            const result = setHealth(getHealthcare(), args[2], Number(args[3]));
            player.sendMessage(result.ok ? `§aHealth ${result.record.health}` : `§c${result.error}`);
            break;
          }
          if (args[1] === "treat") {
            const result = treatVillager(getHealthcare(), { villagerId: args[2], conditionId: "minor_illness" });
            player.sendMessage(result.ok ? "§aTreated" : `§c${result.error}`);
            break;
          }
          for (const line of formatHealthLines()) player.sendMessage(line);
          break;
        }

        case "patient": {
          const record = getHealthcare().records.find((r) => r.villagerId === args[1]);
          player.sendMessage(record ? `${record.health} ${record.status}` : "§cNo record");
          break;
        }

        case "clinics":
          player.sendMessage(getHealthcare().clinics.map((c) => c.name).join(", ") || "§7None");
          break;

        case "clinic": {
          if (args[1] === "create") {
            const result = createClinic(getHealthcare(), args.slice(2).join(" ") || "Clinic");
            player.sendMessage(result.ok ? `§a${result.clinic.clinicId}` : `§c${result.error}`);
          }
          break;
        }

        case "education": {
          if (args[1] === "enroll") {
            const result = enrollStudent(getEducation(), args[2]);
            player.sendMessage(result.ok ? "§aEnrolled" : `§c${result.error}`);
            break;
          }
          if (args[1] === "graduate") {
            const record = getEducation().records.find((r) => r.villagerId === args[2]);
            if (record) record.graduationProgress = 100;
            const result = graduate(record);
            player.sendMessage(result.ok ? `§a${result.record.educationLevel}` : `§c${result.error || "missing"}`);
            break;
          }
          for (const line of formatEducationLines()) player.sendMessage(line);
          break;
        }

        case "student": {
          const record = getEducation().records.find((r) => r.villagerId === args[1]);
          player.sendMessage(record ? `${record.educationLevel} progress ${record.graduationProgress}` : "§cNo student");
          break;
        }

        case "schools":
          player.sendMessage(getEducation().schools.map((s) => s.name).join(", ") || "§7None");
          break;

        case "school": {
          if (args[1] === "create") {
            const result = createSchool(getEducation(), args.slice(2).join(" ") || "School");
            player.sendMessage(result.ok ? `§a${result.school.schoolId}` : `§c${result.error}`);
          }
          break;
        }

        case "teachers":
          player.sendMessage(String(getEducation().teachers.length));
          break;

        case "classes":
          player.sendMessage(getEducation().classes.map((c) => c.subject).join(", ") || "§7None");
          break;

        case "settlements":
        case "settlement":
        case "city": {
          if (args[1] === "info" || args[1] === "stats") {
            const lines = formatSettlementLines(args[2] || "settlement_main");
            for (const line of lines) player.sendMessage(line);
            break;
          }
          if (args[1] === "upgrade") {
            const settlement = getSettlement(args[2] || "settlement_main");
            if (!settlement) {
              player.sendMessage("§cNo settlement");
              break;
            }
            settlement.population = args[2] === "metro" ? 1000 : settlement.population + 100;
            settlement.type = typeForPopulation(settlement.population, settlement.type);
            player.sendMessage(`§a${settlement.type}`);
            break;
          }
          for (const line of formatSettlementLines(args[1] && args[1] !== "settlement" ? args[1] : "settlement_main")) {
            player.sendMessage(line);
          }
          break;
        }

        case "infrastructure": {
          if (args[1] === "info") {
            const record = getInfrastructure().records.find((r) => r.id === args[2]);
            player.sendMessage(record ? `${record.type} cap ${record.capacity}` : "§cNo infrastructure");
            break;
          }
          for (const line of formatInfraLines()) player.sendMessage(line);
          break;
        }

        case "roads":
          player.sendMessage(getInfrastructure().roads.map((r) => r.id).join(", ") || "§7None");
          break;

        case "population":
        case "demographics":
        case "births":
        case "deaths":
          for (const line of formatPopulationLines()) player.sendMessage(line);
          break;

        case "household": {
          const household = getPopulationStore().households.find((h) => h.id === args[1]);
          player.sendMessage(household ? `${household.id} ${household.status} size ${household.size}` : `§7Households ${getPopulationStore().households.length}`);
          break;
        }

        case "houses":
        case "housing":
        case "house": {
          if (args[1] && args[1] !== "stats") {
            const house = getHousing().houses.find((h) => h.id === args[1]);
            player.sendMessage(house ? `${house.type} ${house.status}` : "§cNo house");
            break;
          }
          for (const line of formatHousingLines()) player.sendMessage(line);
          break;
        }

        case "family":
          player.sendMessage(`§7Relationships ${getPopulationStore().relationships.length}`);
          break;

        case "migrate":
          player.sendMessage(`§7Migrations ${getPopulationStore().migrations.length}`);
          break;

        case "daily":
        case "activity":
        case "needs":
        case "happiness":
        case "stress": {
          const lines = formatDailyLines(args[1]);
          for (const line of lines) player.sendMessage(line);
          break;
        }

        case "attendance":
          player.sendMessage(`§7Attendance rows ${getDailyLife().attendance.length}`);
          break;

        case "routines":
          player.sendMessage(ROUTINES.join(", "));
          break;

        case "food": {
          const household = getPopulationStore().households.find((h) => h.id === args[2] || h.id === args[1]);
          if (!household) {
            player.sendMessage(`§7Food results ${getDailyLife().food?.recentResults?.length || 0}`);
            break;
          }
          const members = getAllVillagers().filter((v) => household.memberIds?.includes(v.id));
          if (args[1] === "buy") {
            const result = evaluateHouseholdFood(getDailyLife(), household, members, {}, Math.floor(Date.now() / 86400000));
            player.sendMessage(result.purchased ? "§aPurchased" : `§c${result.reason}`);
            break;
          }
          const status = getHouseholdFoodStatus(household, members, {}, Math.floor(Date.now() / 86400000), getDailyLife().food?.householdCooldowns);
          player.sendMessage(`food ${status.foodAvailable} need ${status.needsPurchase}`);
          break;
        }







        case "help":
          player.sendMessage("§e!cc profile|bank|shop|jobs|housing|health|politics|election|validate");
          break;
        case "profile":
        case "status": {
          const pr = getOrCreateProfile(player);
          for (const line of formatProfile(pr)) player.sendMessage(line);
          break;
        }
        case "bank": {
          const pr = getOrCreateProfile(player);
          const bank = getBankingStore();
          const sub = (args[1] || "balance").toLowerCase();
          if (sub === "deposit") {
            const amt = Number(args[2]);
            const r = deposit(bank, pr.id, pr, amt);
            player.sendMessage(r.ok ? `§aDeposited ${amt}. Bank ${r.balance}` : `§c${r.error}`);
          } else if (sub === "withdraw") {
            const amt = Number(args[2]);
            const r = withdraw(bank, pr.id, pr, amt);
            player.sendMessage(r.ok ? `§aWithdrew ${amt}. Wallet ${r.wallet}` : `§c${r.error}`);
          } else if (sub === "transfer") {
            const targetName = args[2];
            const amt = Number(args[3]);
            const target = [...world.getAllPlayers()].find((p) => p.name === targetName);
            if (!target) { player.sendMessage("§cTarget player not online"); break; }
            const tp = getOrCreateProfile(target);
            const r = transfer(bank, pr.id, tp.id, amt);
            player.sendMessage(r.ok ? `§aTransferred ${amt}` : `§c${r.error}`);
          } else if (sub === "statement" || sub === "account") {
            const acc = getAccount(bank, pr.id) || openAccount(bank, pr.id).account;
            for (const line of statementLines(acc)) player.sendMessage(line);
          } else {
            const acc = getAccount(bank, pr.id);
            player.sendMessage(acc ? `§6Bank§r ${getBalance(acc)} ₡ wallet ${getBalance(pr)} ₡` : "§cNo account");
          }
          break;
        }
        case "shop": {
          const pr = getOrCreateProfile(player);
          const sub = (args[1] || "list").toLowerCase();
          if (sub === "list") {
            for (const s of getAllShops().slice(0, 10)) {
              player.sendMessage(`${s.id} ${s.type || ""} bal ${s.money ?? s.balance ?? 0}`);
            }
          } else if (sub === "buy") {
            const r = playerBuy(pr, args[2], args[3], Number(args[4] || 1), (args[5] || "wallet").toLowerCase());
            player.sendMessage(r.ok ? "§aPurchase ok" : `§c${r.error || "failed"}`);
          } else if (sub === "sell") {
            const r = playerSell(pr, args[2], args[3], Number(args[4] || 1));
            player.sendMessage(r.ok ? `§aSold for ${r.total}` : `§c${r.error}`);
          }
          break;
        }
        case "jobs":
        case "job":
          player.sendMessage("§7Use employment system: !cc employment | job status via profile");
          break;
        case "housing":
          player.sendMessage("§7Housing via !cc population / existing housing records");
          break;

        case "validate": {
          const civ = getCivilizationStore();
          const data = getWorldData();
          player.sendMessage(`§6Validate§r v${data.version || "?"} score ${civ.score}`);
          player.sendMessage(`pop ${Object.keys(data.villagers||{}).length} events ${civ.events.length}`);
          player.sendMessage(`emp ${data.employment?.stats?.employed||0} shops ${(data.economy&&data.economy.shops)?Object.keys(data.economy.shops).length:0}`);
          break;
        }
        case "civilization":
        case "world": {
          for (const line of formatCivilizationLines()) player.sendMessage(line);
          break;
        }
        case "events":
          player.sendMessage(`§7World events ${getCivilizationStore().events.length}`);
          break;
        case "appearance": {
          const v = getAllVillagers().find((x) => x.id === args[1]) || getAllVillagers()[0];
          player.sendMessage(v ? selectAppearance(v) : "§cNo villager");
          break;
        }

        case "politics":
        case "parties":
          player.sendMessage((getPoliticsStore().parties || []).map((p) => p.id).join(", "));
          break;
        case "election":
          player.sendMessage(`§7Elections ${getPoliticsStore().elections.length}`);
          break;
        case "candidates":
          player.sendMessage(`§7Candidates ${getPoliticsStore().candidates.length}`);
          break;
        case "nations":
          player.sendMessage((getNationsStore().nations || []).map((n) => n.id).join(", "));
          break;
        case "diplomacy": {
          const a = args[1] || "nation_main";
          const b = args[2];
          if (!b) { player.sendMessage(`§7Nations ${getNationsStore().nations.length}`); break; }
          const rel = getRelation(getNationsStore(), a, b);
          player.sendMessage(rel ? `${rel.score} ${rel.state}` : "§7neutral");
          break;
        }
        case "treaties":
          player.sendMessage(`§7Treaties ${getNationsStore().treaties.length}`);
          break;
        case "trade":
          player.sendMessage(`§7Trade orders ${getNationsStore().tradeOrders.length}`);
          break;

        case "logistics":
          player.sendMessage(`§7Routes ${getLogisticsStore().routes.length} shipments ${getLogisticsStore().shipments.length}`);
          break;
        case "utilities":
          player.sendMessage(`§7Utility quality ${getUtilitiesStore().stats.averageQuality}`);
          break;
        case "opinion":
        case "social":
          player.sendMessage(`§7Approval ${getSocialStore().opinion.governmentApproval} economy ${getSocialStore().opinion.economicConfidence}`);
          break;

        case "business": {
          if (args[1] === "payroll" && args[2]) {
            const shop = getShop(args[2]);
            if (!shop) { player.sendMessage("§cNo shop"); break; }
            const result = runShopPayroll(shop, { employment: getEmploymentStore(), villagers: Object.fromEntries(getAllVillagers().map(v => [v.id, v])) }, Math.floor(Date.now() / 86400000), true);
            player.sendMessage(`paid ${result.paid} unpaid ${result.unpaid}`);
            break;
          }
          if (args[1] === "employees" && args[2]) {
            const shop = getShop(args[2]);
            player.sendMessage((shop?.employeeVillagerIds || []).join(", ") || "§7None");
            break;
          }
          if (args[1] === "finance" && args[2]) {
            const lines = formatBusinessLines(args[2]);
            for (const line of lines) player.sendMessage(line);
            break;
          }
          if (args[1] === "vacancies" && args[2]) {
            const shop = getShop(args[2]);
            player.sendMessage(shop ? `vac ${getVacancies(shop)}` : "§cNo shop");
            break;
          }
          const lines = formatBusinessLines(args[1]);
          for (const line of lines) player.sendMessage(line);
          break;
        }

        case "employment":
        case "unemployment": {
          const lines = formatEmploymentLines(args[1]);
          for (const line of lines) player.sendMessage(line);
          break;
        }

        case "jobs": {
          if (args[1] === "available") {
            const opens = getEmploymentStore().opportunities || [];
            player.sendMessage(opens.map((o) => `${o.jobId}:${o.open}`).join(", ") || "§7None");
            break;
          }
          player.sendMessage(getAllJobs().map((j) => j.id).join(", "));
          break;
        }

        case "hire": {
          const villager = getAllVillagers().find((v) => v.id === args[1]);
          if (!villager || !args[2]) {
            player.sendMessage("§cUsage: !cc hire <villagerId> <jobId>");
            break;
          }
          const result = hireCitizen(getEmploymentStore(), {
            villager,
            jobId: args[2],
            employerType: "self_employed",
            employerId: "self_" + args[2],
            dayStamp: Math.floor(Date.now() / 86400000),
            educationLevel: "none",
            health: 80,
            force: true
          });
          player.sendMessage(result.ok ? "§aHired" : `§c${result.error}`);
          break;
        }

        case "payroll":
          player.sendMessage(`§7Unpaid ${getEmploymentStore().unpaid?.length || 0}`);
          break;

        case "consume": {
          const villager = getAllVillagers().find((v) => v.id === args[1]) || getAllVillagers()[0];
          if (!villager) {
            player.sendMessage("§cNo villager");
            break;
          }
          const store = getDailyLife();
          const state = store.states.find((s) => s.villagerId === villager.id);
          const needs = state?.needs || { hunger: 50 };
          if (args[1] === "status") {
            const status = getConsumptionStatus(villager, needs.hunger, Math.floor(Date.now() / 86400000), store.consumption?.citizenCooldowns);
            player.sendMessage(`hunger ${needs.hunger} food ${status.foodAvailable || "none"}`);
            break;
          }
          const result = evaluateCitizenConsumption(store, villager, needs, Math.floor(Date.now() / 86400000));
          player.sendMessage(`${result.reason} ${result.hungerBefore}->${result.hungerAfter}`);
          break;
        }

        default:
          player.sendMessage("§cUnknown command. Try !cc help");
      }
    } catch (e) {
      Logger.error("Command error", e);
      player.sendMessage("§cCommand failed — check content log.");
    }
  });
} else if (DEBUG) {
  Logger.warn("chatSend event unavailable — debug commands disabled.");
}

Logger.info("CivilCraft Player systems ready.");
