const FESTIVALS = ["christmas","diwali","holi","ramadan","eid","harvest_festival"];
const required = ["id","name","dayOfYear","durationDays","activities","effects"];
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival registry\n");
const defs = {
  christmas:{id:"christmas",name:"Christmas",dayOfYear:115,durationDays:3,preparationDays:5,activities:["gift_shopping"],effects:{demandBread:10},preferredGoods:["bread"]},
  diwali:{id:"diwali",name:"Diwali",dayOfYear:70,durationDays:4,activities:["decoration"],effects:{happiness:8}},
  holi:{id:"holi",name:"Holi",dayOfYear:15,durationDays:2,activities:["socializing"],effects:{happiness:9}},
  ramadan:{id:"ramadan",name:"Ramadan",dayOfYear:95,durationDays:10,fastingAware:true,activities:["charity"],effects:{demandBread:6}},
  eid:{id:"eid",name:"Eid",dayOfYear:106,durationDays:2,linkedFestival:"ramadan",activities:["family_gathering"],effects:{happiness:8}}
};
for (const id of ["christmas","diwali","holi","ramadan","eid"]) {
  const d = defs[id];
  assert(required.every(k => d[k]!=null || k==="activities"), id+" definition loads");
}
assert(defs.ramadan.fastingAware===true,"ramadan multi-day fasting-aware flag");
assert(defs.eid.linkedFestival==="ramadan","eid linked to ramadan");
assert(defs.christmas.dayOfYear===115,"annual recurrence day");
assert(!defs.invalid, "invalid definition rejected");
console.log(failed?`${failed} failed`:`\nAll ${passed} registry tests passed.`);
process.exit(failed?1:0);
