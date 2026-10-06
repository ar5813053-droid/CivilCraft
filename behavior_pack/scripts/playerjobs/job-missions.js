import { MISSION_STATUSES, MAX_MISSIONS } from "./player-job-data.js";
import { getQty, addItem, ensureInventory } from "../economy/inventory.js";
import { getShop } from "../economy/shops.js";
import { markDirty } from "../core/data-store.js";
import { publish } from "../events/event-bus.js";
import { EventType } from "../events/event-types.js";

let missionSeq = 0;

export function createMission(partial) {
  missionSeq += 1;
  return {
    id: partial.id || `mission_${Date.now()}_${missionSeq}`,
    playerId: partial.playerId,
    jobId: partial.jobId,
    employerId: partial.employerId || null,
    employerType: partial.employerType || "business",
    type: partial.type || "delivery",
    titleKey: partial.titleKey || partial.type,
    objectives: partial.objectives || {},
    progress: partial.progress || {},
    reward: Math.max(1, Math.min(50, Math.floor(partial.reward || 10))),
    status: MISSION_STATUSES.AVAILABLE,
    createdDay: partial.dayStamp ?? Math.floor(Date.now() / 86400000),
    completedDay: null
  };
}

/**
 * Generate missions from real state only.
 */
export function generateMissionsForJob(store, profile, employment, data) {
  const out = [];
  if (!profile || !employment?.jobId) return out;
  const jobId = employment.jobId;
  const day = Math.floor(Date.now() / 86400000);

  if (["trader", "worker", "farmer"].includes(jobId)) {
    const shops = Object.values(data.economy?.shops || {});
    const withBread = shops.find((s) => getQty(s.inventory, "bread") >= 2);
    const lowBread = shops.find((s) => getQty(s.inventory, "bread") < 3 && s.id !== withBread?.id);
    if (withBread && lowBread) {
      out.push(
        createMission({
          playerId: profile.id,
          jobId,
          employerId: employment.employerId,
          employerType: employment.employerType,
          type: "delivery",
          titleKey: "deliver_bread",
          objectives: {
            goodId: "bread",
            quantity: 2,
            sourceShopId: withBread.id,
            destShopId: lowBread.id
          },
          reward: 12,
          dayStamp: day
        })
      );
    }
  }

  if (jobId === "farmer") {
    out.push(
      createMission({
        playerId: profile.id,
        jobId,
        employerId: employment.employerId,
        type: "farming",
        titleKey: "supply_wheat",
        objectives: { goodId: "wheat", quantity: 5, action: "deliver_to_employer_stock" },
        reward: 10,
        dayStamp: day
      })
    );
  }

  if (jobId === "police_officer") {
    const open = (data.justice?.cases || []).find((c) => c.status === "open" || c.status === "investigating");
    if (open) {
      out.push(
        createMission({
          playerId: profile.id,
          jobId,
          employerId: employment.employerId || "police_dept",
          employerType: "government",
          type: "police",
          titleKey: "investigate_case",
          objectives: { caseId: open.id },
          reward: 15,
          dayStamp: day
        })
      );
    }
  }

  if (["healer", "nurse", "doctor"].includes(jobId)) {
    const patients = (data.healthcare?.patients || data.healthcare?.records || []);
    const needy = Array.isArray(patients) ? patients.find((p) => (p.health ?? 100) < 60) : null;
    if (needy) {
      out.push(
        createMission({
          playerId: profile.id,
          jobId,
          employerId: employment.employerId || "clinic_main",
          employerType: "government",
          type: "medical",
          titleKey: "treat_patient",
          objectives: { patientId: needy.id || needy.villagerId },
          reward: 14,
          dayStamp: day
        })
      );
    }
  }

  if (jobId === "teacher") {
    out.push(
      createMission({
        playerId: profile.id,
        jobId,
        employerId: employment.employerId || "school_main",
        employerType: "government",
        type: "education",
        titleKey: "conduct_class",
        objectives: { sessions: 1 },
        reward: 12,
        dayStamp: day
      })
    );
  }

  // Only keep if not already active same type
  const activeTypes = new Set(
    (store.missions || [])
      .filter((m) => m.playerId === profile.id && ["available", "accepted", "active"].includes(m.status))
      .map((m) => m.type + m.titleKey)
  );
  for (const m of out) {
    if (activeTypes.has(m.type + m.titleKey)) continue;
    store.missions.push(m);
  }
  if (store.missions.length > MAX_MISSIONS) store.missions = store.missions.slice(-MAX_MISSIONS);
  return out;
}

export function acceptMission(store, playerId, missionId) {
  const m = (store.missions || []).find((x) => x.id === missionId && x.playerId === playerId);
  if (!m) return { ok: false, error: "not_found" };
  if (m.status !== MISSION_STATUSES.AVAILABLE) return { ok: false, error: "invalid_status" };
  m.status = MISSION_STATUSES.ACTIVE;
  markDirty();
  return { ok: true, mission: m };
}

export function abandonMission(store, playerId, missionId) {
  const m = (store.missions || []).find((x) => x.id === missionId && x.playerId === playerId);
  if (!m) return { ok: false, error: "not_found" };
  if (m.status === MISSION_STATUSES.COMPLETED) return { ok: false, error: "already_completed" };
  m.status = MISSION_STATUSES.CANCELLED;
  markDirty();
  return { ok: true };
}

/**
 * Complete mission with civilization side effects. Idempotent.
 */
export function completeMission(store, playerId, missionId, profile, data, payFn) {
  const m = (store.missions || []).find((x) => x.id === missionId && x.playerId === playerId);
  if (!m) return { ok: false, error: "not_found" };
  if (m.status === MISSION_STATUSES.COMPLETED) return { ok: false, error: "already_completed" };
  if (m.status !== MISSION_STATUSES.ACTIVE && m.status !== MISSION_STATUSES.ACCEPTED) {
    return { ok: false, error: "not_active" };
  }
  if ((store.completedIds || []).includes(m.id)) return { ok: false, error: "already_completed" };

  // Apply world effects
  if (m.type === "delivery" && m.objectives?.sourceShopId && m.objectives?.destShopId) {
    const src = getShop(m.objectives.sourceShopId);
    const dest = getShop(m.objectives.destShopId);
    const q = m.objectives.quantity || 1;
    const g = m.objectives.goodId || "bread";
    if (src && dest && getQty(src.inventory, g) >= q) {
      ensureInventory(src);
      ensureInventory(dest);
      src.inventory[g] = (src.inventory[g] || 0) - q;
      dest.inventory[g] = (dest.inventory[g] || 0) + q;
    } else {
      return { ok: false, error: "objective_not_met" };
    }
  }

  if (m.type === "farming" && m.objectives?.goodId) {
    const empId = m.employerId;
    const shop = empId ? getShop(empId) : null;
    const stock = shop || data.economy;
    if (stock) {
      ensureInventory(stock);
      addItem(stock.inventory || (stock.inventory = {}), m.objectives.goodId, m.objectives.quantity || 5);
    }
  }

  if (m.type === "medical" && m.objectives?.patientId && data.healthcare) {
    const list = data.healthcare.patients || data.healthcare.records || [];
    const p = Array.isArray(list) ? list.find((x) => (x.id || x.villagerId) === m.objectives.patientId) : null;
    if (p) p.health = Math.min(100, (p.health || 50) + 15);
  }

  if (m.type === "education" && data.education) {
    data.education.stats = data.education.stats || {};
    data.education.stats.sessions = (data.education.stats.sessions || 0) + 1;
  }

  if (m.type === "police" && m.objectives?.caseId && data.justice?.cases) {
    const c = data.justice.cases.find((x) => x.id === m.objectives.caseId);
    if (c && c.status === "open") c.status = "investigating";
  }

  m.status = MISSION_STATUSES.COMPLETED;
  m.completedDay = Math.floor(Date.now() / 86400000);
  store.completedIds.push(m.id);
  if (store.completedIds.length > 200) store.completedIds = store.completedIds.slice(-200);
  store.stats.missionsCompleted = (store.stats.missionsCompleted || 0) + 1;

  const perf = store.performance[playerId] || {
    missionsCompleted: 0,
    missionsFailed: 0,
    attendance: 100,
    salaryEarned: 0
  };
  perf.missionsCompleted += 1;
  store.performance[playerId] = perf;

  if (typeof payFn === "function") {
    const paid = payFn(profile, m.reward, m);
    if (paid?.ok) {
      perf.salaryEarned = (perf.salaryEarned || 0) + m.reward;
    }
  }

  publish(EventType.PLAYER_MISSION_COMPLETED, {
    source: "playerjobs",
    actorId: playerId,
    metadata: { missionId: m.id, jobId: m.jobId, type: m.type, reward: m.reward }
  });

  markDirty();
  return { ok: true, mission: m, reward: m.reward };
}
