function applyDemand(fest,keys,phase){
  const applied=[];
  const map={bread:fest.effects?.demandBread||0,wheat:fest.effects?.demandWheat||0};
  for(const [g,a] of Object.entries(map)){
    if(!a)continue;
    const k=`${phase}_demand_${g}`;
    if(keys[k])continue;
    keys[k]=true;applied.push(g);
  }
  return applied;
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival economy\n");
const keys={};
const fest={effects:{demandBread:10,demandWheat:5}};
assert(applyDemand(fest,keys,"active").includes("bread"),"festival → demand");
assert(applyDemand(fest,keys,"active").length===0,"idempotent demand");
assert(keys.active_demand_bread===true,"keys set");
console.log(failed?`${failed} failed`:`\nAll ${passed} festival-economy tests passed.`);
process.exit(failed?1:0);
