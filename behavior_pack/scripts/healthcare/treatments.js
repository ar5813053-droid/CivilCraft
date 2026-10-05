/**
 * Treatment charges the villager wallet. Unpaid bills stay outstanding.
 */

import { markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { transferMoney, TxType } from "../economy/transactions.js";
import { getTreasury, hydrateTreasury } from "../government/treasury.js";
import { getCondition, statusFromHealth, MAX_BILLS } from "./healthcare-data.js";
import { ensureHealthRecord } from "./health-records.js";
import { pushMedicalEvent } from "./medical-events.js";

export function treatVillager(store, input) {
  if (!store) return { ok: false, error: "no_healthcare" };
  const condition = getCondition(input?.conditionId || "minor_illness");
  if (!condition || !condition.enabled) return { ok: false, error: "unknown_condition" };
  const clinic = store.clinics.find((c) => c.clinicId === (input.clinicId || "central_clinic"));
  if (!clinic) return { ok: false, error: "missing_clinic" };
  const staff = store.staff.find((s) => s.villagerId === input.staffId) || store.staff.find((s) => s.status === "available");
  if (!staff) return { ok: false, error: "no_staff" };
  const villager = getVillager(input.villagerId);
  if (!villager) return { ok: false, error: "missing_villager" };

  const record = ensureHealthRecord(store, input.villagerId);
  const cost = condition.treatmentCost;
  const treasury = getTreasury(store.jurisdiction);
  let paidBy = "villager";
  if ((villager.money || 0) < cost && treasury) {
    hydrateTreasury(treasury);
    if ((treasury.balance || 0) >= cost) {
      const subsidy = transferMoney(treasury, { id: clinic.clinicId, money: 0 }, cost, TxType.GOVERNMENT_HEALTHCARE, "clinic_subsidy");
      if (subsidy.ok) paidBy = "government";
    }
  }
  if (paidBy === "villager") {
    const pay = transferMoney(villager, { id: clinic.clinicId, money: 0 }, cost, TxType.MEDICAL_EXPENSE, condition.id);
    if (!pay.ok) {
      store.bills.push({ villagerId: input.villagerId, amount: cost, status: "outstanding", conditionId: condition.id, timestamp: Date.now() });
      if (store.bills.length > MAX_BILLS) store.bills = store.bills.slice(-MAX_BILLS);
      pushMedicalEvent(store, "unpaid_bill", input.villagerId);
      markDirty();
      return { ok: false, error: "insufficient_funds", bill: store.bills[store.bills.length - 1] };
    }
  }
  record.health = Math.min(100, record.health + condition.healthImpact);
  record.condition = record.health >= 80 ? null : condition.id;
  record.status = statusFromHealth(record.health);
  record.lastTreatmentAt = Date.now();
  record.clinicId = clinic.clinicId;
  record.doctorId = staff.villagerId;
  record.medicalVisits += 1;
  record.medicalExpenses += cost;
  staff.patientsTreated += 1;
  store.stats.treatments = (store.stats.treatments || 0) + 1;
  store.stats.expenses = (store.stats.expenses || 0) + cost;
  pushMedicalEvent(store, "treated", input.villagerId);
  markDirty();
  return { ok: true, record, cost, paidBy };
}
