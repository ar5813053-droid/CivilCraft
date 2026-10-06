/**
 * Cached job opportunities. Private shop vacancies take precedence over soft caps.
 */

import { getAllJobs } from "../jobs/job-registry.js";
import { getAllShops } from "../economy/shops.js";
import { ensureBusinessOps, getVacancies } from "../economy/business-operations.js";
import { DEFAULT_CAPACITY, MAX_OPPORTUNITIES } from "./employment-data.js";

export function refreshOpportunities(store, data = {}) {
  const employedCounts = {};
  for (const rec of store.records || []) {
    if (rec.status !== "employed" || !rec.jobId) continue;
    employedCounts[rec.jobId] = (employedCounts[rec.jobId] || 0) + 1;
  }

  const policeStaff = data.police?.officers?.length || 0;
  const medicalStaff = data.healthcare?.staff?.length || 0;
  const teachers = data.education?.teachers?.length || 0;
  const shops = typeof getAllShops === "function" ? getAllShops() : [];

  const openings = [];

  for (const shop of shops) {
    ensureBusinessOps(shop);
    const vac = getVacancies(shop);
    if (vac <= 0 || !shop.active) continue;
    openings.push({
      jobId: "trader",
      employerType: "business",
      employerId: shop.id,
      capacity: shop.employeeCapacity,
      filled: shop.employeeVillagerIds.length,
      open: vac
    });
  }

  for (const job of getAllJobs()) {
    if (!job?.id || job.id === "citizen") continue;
    if (job.id === "trader") continue;

    const capacity = DEFAULT_CAPACITY[job.id] ?? 10;
    let filled = employedCounts[job.id] || 0;
    if (job.id === "police_officer") filled = Math.max(filled, policeStaff);
    if (["healer", "nurse", "doctor"].includes(job.id)) {
      filled = Math.max(filled, Math.floor(medicalStaff / 3));
    }
    if (job.id === "teacher") filled = Math.max(filled, teachers);

    const open = Math.max(0, capacity - filled);
    if (open <= 0) continue;

    let employerType = "self_employed";
    let employerId = `self_${job.id}`;
    if (["police_officer", "healer", "nurse", "doctor", "teacher"].includes(job.id)) {
      employerType = "government";
      employerId = "municipal_main";
    }

    openings.push({
      jobId: job.id,
      employerType,
      employerId,
      capacity,
      filled,
      open
    });
  }

  store.opportunities = openings.slice(0, MAX_OPPORTUNITIES);
  store.stats.openings = store.opportunities.reduce((s, o) => s + o.open, 0);
  store.lastMarketRefresh = Date.now();
  return store.opportunities;
}

export function getOpenings(store) {
  return store?.opportunities || [];
}
