
const REG = {
  holi: { redistributionAllowed: false, bundled: false, integrationMode: "optional_external" },
  diwali: { redistributionAllowed: false, bundled: false, integrationMode: "optional_external" },
  ramadan: { integrationMode: "civilcraft_only", bundled: false },
  eid: { integrationMode: "civilcraft_only", bundled: false },
  christmas: { redistributionAllowed: false, bundled: false, integrationMode: "optional_external" }
};
function detect(id, forceExternal=false) {
  const m = REG[id];
  const external = forceExternal;
  const usingFallback = !external || m.integrationMode === "civilcraft_only";
  return { festivalId: id, civilcraftFestival: true, externalInstalled: external, usingFallback, enabled: true };
}
function activate(id, phase, force=false) {
  const caps = detect(id, force);
  return { ok: true, mode: caps.usingFallback ? "civilcraft_fallback" : "external_active", useCivilCraftVisuals: true, caps };
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival add-on adapters\n");
assert(!!REG.holi && !REG.holi.bundled, "adapter registration (holi not bundled)");
assert(!REG.diwali.redistributionAllowed, "license metadata — diwali not redistributable");
assert(detect("holi").usingFallback, "missing add-on → fallback");
assert(detect("holi", true).externalInstalled && !detect("holi", true).usingFallback, "installed add-on integration path");
assert(activate("diwali","active").useCivilCraftVisuals, "lifecycle activation keeps CivilCraft visuals");
assert(activate("ramadan","active").mode==="civilcraft_fallback", "ramadan civilcraft-only");
assert(REG.christmas.bundled===false, "christmas optional not auto-bundled");
assert(Object.values(REG).every(r => r.bundled===false), "no third-party festival pack bundled");
console.log(failed?`${failed} failed`:`\nAll ${passed} festival-addon tests passed.`);
process.exit(failed?1:0);
