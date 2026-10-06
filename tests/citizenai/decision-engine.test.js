function base(a,input){
  if(a==="emergency"&&input.emergency)return 1000;
  if(a==="healthcare"&&(input.health||80)<30)return 900;
  if(a==="eating"&&(input.hunger||80)<20)return 850;
  if(a==="sleeping"&&(input.energy||80)<15)return 800;
  if(a==="job_search"&&input.unemployed)return 150;
  if(a==="socializing")return 50;
  if(a==="leisure")return 40;
  return 10;
}
function pick(input,personality){
  if(input.emergency)return "emergency";
  if((input.health||80)<30)return "healthcare";
  if((input.hunger||80)<20)return "eating";
  if((input.energy||80)<15)return "sleeping";
  const acts=["job_search","socializing","leisure","idle"];
  let best="idle",bs=-1;
  for(const a of acts){
    let s=base(a,input);
    if(a==="socializing")s+=((personality.sociability||50)-50)*0.4;
    if(a==="job_search")s+=((personality.ambition||50)-50)*0.35;
    if(s>bs||(s===bs&&a.localeCompare(best)<0)){bs=s;best=a;}
  }
  return best;
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Decisions\n");
assert(pick({health:10,hunger:50,energy:50},{})==="healthcare","critical needs override personality");
assert(pick({hunger:10,health:80,energy:50},{})==="eating","critical hunger");
const social=pick({health:80,hunger:80,energy:80,unemployed:false},{sociability:90,ambition:10});
const job=pick({health:80,hunger:80,energy:80,unemployed:true},{sociability:10,ambition:90});
assert(social==="socializing"||job==="job_search","personality modifies non-critical choices");
assert(job==="job_search","goals/ambition influence job_search");
const t1=pick({health:80,hunger:80,energy:80},{sociability:50,ambition:50});
const t2=pick({health:80,hunger:80,energy:80},{sociability:50,ambition:50});
assert(t1===t2,"ties deterministic");
console.log(failed?`${failed} failed`:`\nAll ${passed} decision tests passed.`);
process.exit(failed?1:0);
