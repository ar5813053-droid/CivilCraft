/**
 * CivilCraft — entry point (Phase 5 Police & Emergency).
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

Logger.info("CivilCraft Phase 5 loading…");

// --- Bootstrap ---
loadWorldData();
initializeJobs();
initializeSchedules();
initializeEconomy();
initializeGovernment();
initializeJustice();
initializePolice();
initializeEmergency();
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

Logger.info("CivilCraft Phase 5 ready.");
