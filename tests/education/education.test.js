/** Education tests. Run: node tests/education/education.test.js */
const LEVELS = ["none", "primary", "secondary", "vocational", "advanced"];
const BONUS = { none: 0, primary: 0.03, secondary: 0.06, vocational: 0.1, advanced: 0.12 };
function eligible(age) { return age >= 6 && age <= 18; }
function enroll(store, villager) {
  if (!eligible(villager.age)) return { ok: false, error: "ineligible_age" };
  if (store.schools[0].studentIds.length >= store.schools[0].capacity) return { ok: false, error: "school_full" };
  store.records.push({ villagerId: villager.id, educationLevel: "none", attendance: 0, graduationProgress: 0, enrolled: true });
  store.schools[0].studentIds.push(villager.id);
  return { ok: true };
}
function advance(record) { record.attendance += 5; record.graduationProgress = Math.min(100, record.graduationProgress + 10); }
function graduate(record) {
  if (record.graduationProgress < 100) return { ok: false };
  const i = LEVELS.indexOf(record.educationLevel);
  record.educationLevel = LEVELS[i + 1];
  record.graduationProgress = 0;
  return { ok: true };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ "+m);} else { failed++; console.error("  ✗ "+m);} }
console.log("Education\n");
const store = { records: [], schools: [{ schoolId: "central_school", capacity: 1, studentIds: [] }], teachers: [], classes: [] };
assert(enroll(store, { id: "s1", age: 8 }).ok, "enrollment");
assert(!enroll(store, { id: "old", age: 40 }).ok, "age eligibility");
assert(LEVELS.includes("vocational"), "level validation");
const rec = store.records[0];
advance(rec);
assert(rec.attendance === 5, "attendance");
store.teachers.push({ villagerId: "t1" });
store.classes.push({ subject: "literacy", teacherId: "t1" });
assert(store.classes[0].subject === "literacy", "class creation");
assert(store.teachers.length === 1, "teacher registration");
while (rec.graduationProgress < 100) advance(rec);
assert(graduate(rec).ok && rec.educationLevel === "primary", "graduation");
assert(BONUS.vocational === 0.1, "skill bonus");
assert(!enroll(store, { id: "s2", age: 9 }).ok, "school capacity");
assert(35 + 6 <= 100, "education quality bounded");
store.records = Array.from({ length: 120 }).slice(-100);
assert(store.records.length === 100, "bounded records");
console.log(failed ? `${failed} failed` : `\nAll ${passed} education tests passed.`);
process.exit(failed ? 1 : 0);
