/**
 * CivilCraft BOOTSTRAP — entrypoint with ZERO local imports.
 * Full systems load via dynamic import("./civilcraft-app.js").
 */
import { world, system } from "@minecraft/server";

const runtime = {
  loaded: true,
  chatOk: false,
  heartbeat: 0,
  appLoaded: false,
  lastError: null,
  api: "2.9.0",
  failed: []
};

globalThis.__civilcraftRuntime = runtime;

function safeSend(player, msg) {
  try {
    player.sendMessage(msg);
  } catch (_) {}
}

function handleBootstrapCommand(player, parts) {
  const cmd = (parts[0] || "help").toLowerCase();
  if (cmd === "ping") {
    safeSend(player, "§aCivilCraft runtime OK");
    return true;
  }
  if (cmd === "runtime") {
    safeSend(player, "§6CivilCraft Runtime");
    safeSend(player, "Script: §aACTIVE");
    safeSend(player, "Bootstrap: §aOK");
    safeSend(player, "Chat: " + (runtime.chatOk ? "§aOK" : "§cFAIL"));
    safeSend(player, "App: " + (runtime.appLoaded ? "§aLOADED" : "§eLOADING"));
    safeSend(player, "API expect: " + runtime.api);
    safeSend(player, "Heartbeat: " + runtime.heartbeat);
    if (runtime.lastError) safeSend(player, "§cLast error: " + String(runtime.lastError).slice(0, 80));
    if (runtime.failed.length) safeSend(player, "§cFailed: " + runtime.failed.slice(0, 5).join(", "));
    return true;
  }
  if (cmd === "help") {
    safeSend(player, "§6CivilCraft:§r !cc ping | !cc runtime | !cc help");
    if (!runtime.appLoaded) safeSend(player, "§eFull systems still loading…");
    return true;
  }
  try {
    if (typeof globalThis.__civilcraftHandleCommand === "function") {
      globalThis.__civilcraftHandleCommand(player, parts);
      return true;
    }
  } catch (e) {
    runtime.lastError = String(e);
    safeSend(player, "§cCommand error (see !cc runtime)");
    return true;
  }
  safeSend(player, "§eCivilCraft systems loading — try !cc ping or wait a few seconds");
  return true;
}

function onChat(event) {
  try {
    const raw = event.message != null ? String(event.message) : "";
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (!lower.startsWith("!cc")) return;
    try { event.cancel = true; } catch (_) {}
    const player = event.sender;
    if (!player) return;
    const parts = trimmed.slice(3).trim().split(/\s+/).filter(Boolean);
    handleBootstrapCommand(player, parts.length ? parts : ["help"]);
  } catch (e) {
    runtime.lastError = String(e);
    try { console.error("[CivilCraft] chat: " + e); } catch (_) {}
  }
}

function registerChat() {
  let ok = false;
  try {
    if (world.beforeEvents && world.beforeEvents.chatSend) {
      world.beforeEvents.chatSend.subscribe(onChat);
      ok = true;
      console.warn("[CivilCraft] chatSend beforeEvents registered");
    }
  } catch (e) {
    runtime.lastError = "beforeEvents.chatSend: " + e;
  }
  try {
    if (!ok && world.afterEvents && world.afterEvents.chatSend) {
      world.afterEvents.chatSend.subscribe(onChat);
      ok = true;
      console.warn("[CivilCraft] chatSend afterEvents registered");
    }
  } catch (e) {
    runtime.lastError = "afterEvents.chatSend: " + e;
  }
  runtime.chatOk = ok;
  if (!ok) console.error("[CivilCraft] NO chat event available");
}

registerChat();
try { console.warn("[CivilCraft] bootstrap active — @minecraft/server 2.9.0"); } catch (_) {}

try {
  world.afterEvents.playerSpawn.subscribe(function (ev) {
    system.runTimeout(function () {
      safeSend(ev.player, "§aCivilCraft script loaded. Use !cc ping");
    }, 20);
  });
} catch (e) {
  runtime.lastError = "playerSpawn: " + e;
}

system.runInterval(function () {
  runtime.heartbeat += 1;
}, 200);

system.run(function () {
  import("./civilcraft-app.js")
    .then(function () {
      runtime.appLoaded = true;
      console.warn("[CivilCraft] civilcraft-app.js loaded");
    })
    .catch(function (e) {
      runtime.lastError = String(e);
      runtime.failed.push("civilcraft-app");
      console.error("[CivilCraft] APP LOAD FAILED: " + e);
      try {
        world.getAllPlayers().forEach(function (p) {
          safeSend(p, "§cCivilCraft systems failed to load. !cc ping still works.");
        });
      } catch (_) {}
    });
});
