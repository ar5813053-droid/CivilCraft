import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultCulture, normalizeCulture, FESTIVAL_DEFS, YEAR_LENGTH } from "./culture-data.js";
import { scheduleEvent } from "../events/event-manager.js";
import { publish } from "../events/event-bus.js";
import { recordDemand } from "../economy/prices.js";
import { rememberCivilization } from "../memory/memory-manager.js";

let initialized = false;
export const CULTURE_INTERVAL = 2400;

export function initializeCulture() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.culture = data.culture ? normalizeCulture(data.culture) : createDefaultCulture();
  system.runInterval(() => {
    try {
      tickCulture(data);
    } catch (e) {
      Logger.error("Culture tick failed", e);
    }
  }, CULTURE_INTERVAL);
  Logger.info("Culture manager initialized.");
}

export function getCultureStore() {
  const data = getWorldData();
  if (!data.culture) data.culture = createDefaultCulture();
  return data.culture;
}

function tickCulture(data) {
  const store = data.culture;
  store.calendarDay = (store.calendarDay || 0) + 1;
  if (store.calendarDay >= YEAR_LENGTH) {
    store.calendarDay = 0;
    store.year = (store.year || 1) + 1;
  }
  const doy = store.calendarDay;
  for (const def of FESTIVAL_DEFS) {
    const active = store.activeFestivals.some((f) => f.id === def.id && f.status === "active");
    if (doy === def.dayOfYear && !active) {
      startFestival(store, def);
    }
    const fest = store.activeFestivals.find((f) => f.id === def.id && f.status === "active");
    if (fest && doy >= fest.endDay) {
      endFestival(store, fest);
    }
  }
  markDirty();
}

function startFestival(store, def) {
  const fest = {
    id: def.id,
    nameKey: def.nameKey,
    status: "active",
    startDay: store.calendarDay,
    endDay: store.calendarDay + (def.duration || 2),
    year: store.year,
    themes: def.themes || []
  };
  store.activeFestivals.push(fest);
  scheduleEvent({
    type: "festival",
    nameKey: def.nameKey,
    startDay: Math.floor(Date.now() / 86400000),
    endDay: Math.floor(Date.now() / 86400000) + (def.duration || 2)
  });
  // Market demand bump for food during festivals
  if ((def.themes || []).includes("food") || (def.themes || []).includes("market")) {
    try {
      recordDemand("bread", 5);
      recordDemand("wheat", 3);
    } catch {
      /* prices module optional at import time */
    }
  }
  publish("FESTIVAL_STARTED", { festivalId: def.id, nameKey: def.nameKey });
  rememberCivilization("festival_started", { id: def.id, nameKey: def.nameKey, year: store.year });
  store.stats.festivalsHeld = (store.stats.festivalsHeld || 0) + 1;
  Logger.info(`Festival started: ${def.nameKey}`);
}

function endFestival(store, fest) {
  fest.status = "completed";
  store.history.push({ ...fest });
  if (store.history.length > 40) store.history = store.history.slice(-40);
  store.activeFestivals = store.activeFestivals.filter((f) => f.status === "active");
  publish("FESTIVAL_ENDED", { festivalId: fest.id });
  rememberCivilization("festival_ended", { id: fest.id, nameKey: fest.nameKey });
}
