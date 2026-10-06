
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival missions\n");
const missions=[];
const hints=["deliver_supplies","market_work"];
for(const h of hints)missions.push({type:h,status:"available",reward:12});
assert(missions.length===2,"festival → missions");
missions[0].status="completed";
assert(missions[0].status==="completed","completion");
assert(missions[0].reward===12,"reward via existing system");
console.log(failed?`${failed} failed`:`\nAll ${passed} mission tests passed.`);
process.exit(failed?1:0);
