/**
 * Budget categories and public-works project records.
 * Spending always reduces treasury. No negative balances.
 */

import { generateId } from "../core/utils.js";
import { sanitizeMoney } from "../economy/wallet.js";
import { markDirty } from "../core/data-store.js";
import { getGovernment } from "./leadership.js";
import { expenseFromTreasury, hydrateTreasury } from "./treasury.js";
import { BudgetCategory, MAX_PROJECTS } from "./government-data.js";
import { Logger } from "../core/logger.js";

const ACTIVE_CATEGORIES = [
  BudgetCategory.PUBLIC_WORKS,
  BudgetCategory.ADMINISTRATION,
  BudgetCategory.RESERVE
];

/**
 * Moves unallocated treasury into budget categories.
 * Default split: 40% public works, 20% administration, remainder reserve.
 * Only allocates funds not already earmarked.
 * @param {string} [govId]
 */
export function allocateBudget(govId) {
  const gov = getGovernment(govId);
  if (!gov) return { ok: false, error: "no_government" };
  hydrateTreasury(gov.treasury);

  const earmarked =
    sanitizeMoney(gov.budget.public_works) +
    sanitizeMoney(gov.budget.administration) +
    sanitizeMoney(gov.budget.reserve);
  const free = Math.max(0, sanitizeMoney(gov.treasury.balance) - earmarked);
  if (free <= 0) return { ok: true, allocated: 0 };

  const works = Math.floor(free * 0.4);
  const admin = Math.floor(free * 0.2);
  const reserve = free - works - admin;
  gov.budget.public_works = sanitizeMoney(gov.budget.public_works + works);
  gov.budget.administration = sanitizeMoney(gov.budget.administration + admin);
  gov.budget.reserve = sanitizeMoney(gov.budget.reserve + reserve);
  gov.departments.public_works.budgetAllocation = gov.budget.public_works;
  gov.departments.finance.budgetAllocation = gov.budget.administration;
  markDirty();
  return { ok: true, allocated: free };
}

/**
 * Spends from a budget category. Rejects if category or treasury lacks funds.
 * @param {string} category
 * @param {number} amount
 * @param {string} reason
 * @param {string} [govId]
 */
export function spendFromBudget(category, amount, reason, govId) {
  const gov = getGovernment(govId);
  if (!gov) return { ok: false, error: "no_government" };
  if (!ACTIVE_CATEGORIES.includes(category)) return { ok: false, error: "invalid_category" };

  const cost = sanitizeMoney(amount);
  if (cost <= 0) return { ok: false, error: "invalid_amount" };
  if (sanitizeMoney(gov.budget[category]) < cost) {
    return { ok: false, error: "budget_insufficient" };
  }

  hydrateTreasury(gov.treasury);
  const exp = expenseFromTreasury(gov.treasury, cost, reason || `spend:${category}`);
  if (!exp.ok) return { ok: false, error: exp.error || "treasury_insufficient" };

  gov.budget[category] = sanitizeMoney(gov.budget[category] - cost);
  if (category === BudgetCategory.PUBLIC_WORKS) {
    gov.departments.public_works.budgetAllocation = gov.budget.public_works;
  }
  gov.lastUpdated = Date.now();
  markDirty();
  return { ok: true, amount: cost };
}

/**
 * Creates a public-works project and funds it if the budget allows.
 * @param {{ type: string, cost: number, name?: string }} spec
 * @param {string} [govId]
 */
export function createProject(spec, govId) {
  const gov = getGovernment(govId);
  if (!gov) return { ok: false, error: "no_government" };
  const type = spec?.type;
  if (!["road", "public_building", "maintenance"].includes(type)) {
    return { ok: false, error: "invalid_project_type" };
  }
  const cost = sanitizeMoney(spec.cost);
  if (cost <= 0) return { ok: false, error: "invalid_cost" };

  const spend = spendFromBudget(
    BudgetCategory.PUBLIC_WORKS,
    cost,
    `project:${type}`,
    gov.id
  );
  if (!spend.ok) return spend;

  const project = {
    id: generateId("prj"),
    type,
    name: spec.name || type,
    cost,
    budgetCategory: BudgetCategory.PUBLIC_WORKS,
    status: "funded",
    createdAt: Date.now(),
    completedAt: null
  };
  gov.projects.push(project);
  if (gov.projects.length > MAX_PROJECTS) {
    gov.projects = gov.projects.slice(-MAX_PROJECTS);
  }
  markDirty();
  Logger.info(`Public works project funded: ${project.name} (${cost})`);
  return { ok: true, project };
}

/**
 * Marks the oldest funded project complete (data-only; no world edits).
 * @param {string} [govId]
 */
export function completeOldestProject(govId) {
  const gov = getGovernment(govId);
  if (!gov) return null;
  const project = gov.projects.find((p) => p.status === "funded");
  if (!project) return null;
  project.status = "completed";
  project.completedAt = Date.now();
  markDirty();
  return project;
}
