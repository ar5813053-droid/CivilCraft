import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultSocial, normalizeSocial } from "./social-data.js";
import { computeOpinionTargets, applyOpinion } from "./public-opinion.js";
import { reportEvent } from "./media.js";
import { getUtilitiesStore } from "../utilities/utilities-manager.js";
import { averageQuality } from "../utilities/utility-services.js";
import { getEmploymentStore } from "../employment/employment-manager.js";

export const SOCIAL_INTERVAL_TICKS = 2400;
let initialized = false;

export function initializeSocial() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.social = data.social ? normalizeSocial(data.social) : createDefaultSocial();
  system.runInterval(() => {
    try {
      processSocial(data);
    } catch (e) {
      Logger.error("Social tick failed", e);
    }
  }, SOCIAL_INTERVAL_TICKS);
  Logger.info("Social manager initialized.");
}

export function getSocialStore() {
  const data = getWorldData();
  if (!data.social) data.social = createDefaultSocial();
  return data.social;
}

function processSocial(data) {
  const store = data.social;
  const emp = getEmploymentStore();
  const employed = emp.stats?.employed || 0;
  const unemployed = emp.stats?.unemployed || 0;
  const total = Math.max(1, employed + unemployed);
  const util = getUtilitiesStore();
  const net = util.networks?.[0];
  const targets = computeOpinionTargets({
    employmentRate: employed / total,
    pricePressure: 0,
    policeCoverage: Math.min(1, (data.police?.officers?.length || 0) / 10),
    crimeRate: Math.min(1, (data.justice?.violations?.length || 0) / 50),
    healthcareQuality: data.healthcare?.stats?.quality ?? 50,
    educationQuality: data.education?.stats?.quality ?? 50,
    utilityQuality: averageQuality(net),
    socialParticipation: 0.5
  });
  applyOpinion(store, targets);

  // Reflect government approval if government store exists
  if (data.government) {
    data.government.approval = store.opinion.governmentApproval;
  }

  // Bounded real-event media
  if ((data.emergency?.active || []).length > 0) {
    reportEvent(store, { type: "local_news", headlineKey: "emergency_active", severity: 3 });
  }
  store.stats.interactions = (store.stats.interactions || 0) + 1;
  markDirty();
}
