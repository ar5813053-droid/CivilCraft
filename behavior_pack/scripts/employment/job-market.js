/**
 * Cached job opportunities from existing employers. No entity scans.
 */

import { getAllJobs } from "../jobs/job-registry.js";
import { getAllShops } from "../economy/shops.js";
import { DEFAULT_CAPACITY, MAX_OPPORTUNITIES } from "./employment-data.js";

/**
 * Build opportunity list from jobs, soft caps, and current employment fills.
 * @param {object} store employment store
 * @param {object} [data] world data (police/healthcare/education counts)
 */
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
  const openShops = shops.filter((s) => s.open !== false).length;

  const openings = [];
  for (const job of getAllJobs()) {
    if (!job?.id || job.id === "citizen") continue;
    const capacity = DEFAULT_CAPACITY[job.id] ?? 10;
    let filled = employedCounts[job.id] || 0;
    // Prefer specialized module headcounts when present
    if (job.id === "police_officer") filled = Math.max(filled, policeStaff);
    if (["healer", "nurse", "doctor"].includes(job.id)) {
      // Share medical capacity pool loosely
      filled = Math.max(filled, Math.floor(medicalStaff / 3));
    }
    if (job.id === "teacher") filled = Math.max(filled, teachers);
    if (job.id === "trader") filled = Math.max(filled, openShops);

    const open = Math.max(0, capacity - filled);
    if (open <= 0) continue;

    let employerType = "self_employed";
    let employerId = `self_${job.id}`;
    if (["police_officer"].includes(job.id)) {
      employerType = "government";
      employerId = "municipal_main";
    } else if (["healer", "nurse", "doctor", "teacher"].includes(job.id)) {
      employerType = "government";
      employerId = "municipal_main";
    } else if (job.id === "trader" && openShops > 0) {
      employerType = "business";
      employerId = shops.find((s) => s.open !== false)?.id || "shop";
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
