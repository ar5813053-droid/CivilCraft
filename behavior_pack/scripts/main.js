/**
 * CivilCraft — Phase 1 entry point.
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

Logger.info("CivilCraft Phase 1 loading…");

// --- Bootstrap ---
loadWorldData();
initializeJobs();
initializeSchedules();
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
            "§6CivilCraft commands:§r !cc status | manage | population | jobs | village | save"
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

Logger.info("CivilCraft Phase 1 ready.");
