
const FESTIVAL_APPEARANCE={
  christmas:{civilian:"festival_christmas_civilian",farmer:"festival_christmas_farmer",default:"festival_christmas_civilian"},
  diwali:{civilian:"festival_diwali_civilian",default:"festival_diwali_civilian"}
};
function select(fid,job,vid){
  const m=FESTIVAL_APPEARANCE[fid];if(!m)return null;
  if(job&&m[job])return m[job];
  return m.default;
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival appearance\n");
assert(select("christmas","farmer","v1")==="festival_christmas_farmer","profession + festival variant");
assert(select("christmas","citizen","v1")==="festival_christmas_civilian","civilian festival");
assert(select("christmas","farmer","v1")===select("christmas","farmer","v1"),"deterministic");
assert(select("diwali","trader","v2")==="festival_diwali_civilian"||select("diwali","trader","v2"),"diwali");
assert(select(null,"farmer","v1")===null,"no festival → no festival outfit");
const restored="civilcraft_farmer";
assert(restored==="civilcraft_farmer","restoration to profession");
console.log(failed?`${failed} failed`:`\nAll ${passed} appearance tests passed.`);
process.exit(failed?1:0);
