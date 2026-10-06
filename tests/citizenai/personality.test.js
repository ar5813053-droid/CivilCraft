const { generatePersonality, TRAITS, hashId } = (() => {
  const TRAITS = ["sociability","ambition","riskTolerance","frugality","generosity","discipline","curiosity","independence","civicDuty","familyFocus"];
  function hashId(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function generatePersonality(citizenId) {
    const traits = {};
    for (const t of TRAITS) traits[t] = hashId(`${citizenId}::${t}`) % 101;
    return traits;
  }
  return { generatePersonality, TRAITS, hashId };
})();
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Personality\n");
const a = generatePersonality("v1");
const b = generatePersonality("v1");
assert(TRAITS.every(t => a[t] === b[t]), "same ID → same traits");
assert(TRAITS.every(t => a[t] >= 0 && a[t] <= 100), "values 0–100");
const c = generatePersonality("v2");
assert(TRAITS.some(t => a[t] !== c[t]), "different IDs → variation");
console.log(failed?`${failed} failed`:`\nAll ${passed} personality tests passed.`);
process.exit(failed?1:0);
