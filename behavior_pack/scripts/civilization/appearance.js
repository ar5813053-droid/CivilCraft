/**
 * Deterministic role-based appearance keys for resource-pack mapping.
 * No random reshuffle on reload.
 */

export const ROLE_APPEARANCE = Object.freeze({
  farmer: "civilcraft_farmer",
  worker: "civilcraft_worker",
  builder: "civilcraft_builder",
  trader: "civilcraft_trader",
  doctor: "civilcraft_doctor",
  nurse: "civilcraft_nurse",
  healer: "civilcraft_doctor",
  teacher: "civilcraft_teacher",
  police_officer: "civilcraft_police",
  emergency_worker: "civilcraft_emergency",
  mayor: "civilcraft_mayor",
  president: "civilcraft_leader",
  soldier: "civilcraft_soldier",
  student: "civilcraft_student",
  citizen: "civilcraft_civilian",
  civilian: "civilcraft_civilian"
});

export const CIVILIAN_VARIANTS = [
  "civilcraft_civilian_a",
  "civilcraft_civilian_b",
  "civilcraft_civilian_c",
  "civilcraft_civilian_d"
];

/** Simple string hash for deterministic variant selection. */
export function hashId(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * @param {object} villager
 * @param {object} [context] employment / leadership
 * @returns {string} texture key
 */
export function selectAppearance(villager, context = {}) {
  if (!villager) return ROLE_APPEARANCE.civilian;
  const job = context.jobId || villager.profession || "citizen";
  if (context.isMayor) return ROLE_APPEARANCE.mayor;
  if (context.isLeader) return ROLE_APPEARANCE.president;
  if (ROLE_APPEARANCE[job]) return ROLE_APPEARANCE[job];
  const stage = villager.lifeStage || "adult";
  if (stage === "child" || stage === "teenager") return ROLE_APPEARANCE.student;
  const variant = CIVILIAN_VARIANTS[hashId(villager.id) % CIVILIAN_VARIANTS.length];
  return variant;
}

export function appearanceOnRoleChange(oldJob, newJob, villagerId) {
  const key = ROLE_APPEARANCE[newJob] || CIVILIAN_VARIANTS[hashId(villagerId) % CIVILIAN_VARIANTS.length];
  return { from: ROLE_APPEARANCE[oldJob] || ROLE_APPEARANCE.civilian, to: key };
}
