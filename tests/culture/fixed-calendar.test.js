const DAYS=120;
const SCHEDULE=[
  {festivalId:"holi",startDayOfYear:20,durationDays:2,preparationDays:3,closingDays:1},
  {festivalId:"diwali",startDayOfYear:55,durationDays:3,preparationDays:5,closingDays:1},
  {festivalId:"ramadan",startDayOfYear:70,durationDays:10,preparationDays:3,closingDays:1},
  {festivalId:"eid",startDayOfYear:80,durationDays:3,preparationDays:2,closingDays:1},
  {festivalId:"christmas",startDayOfYear:110,durationDays:3,preparationDays:5,closingDays:1}
];
function occurrenceKey(id,y){return `${id}:y${y}`;}
function prepStart(year,e){return (year-1)*DAYS+Math.max(0,e.startDayOfYear-(e.preparationDays||0));}
function activeStart(year,e){return (year-1)*DAYS+e.startDayOfYear;}
function phaseFor(total,year,e){
  const ps=prepStart(year,e),as=activeStart(year,e);
  const ae=as+(e.durationDays||1)-1,ce=ae+(e.closingDays||0);
  if(total<ps||total>ce)return null;
  if(total<as)return "preparation";
  if(total<=ae)return "active";
  if(total<=ce)return "closing";
  return null;
}
function upcoming(doy,year){
  const items=[];
  for(const e of SCHEDULE){
    if(e.startDayOfYear>=doy)items.push({id:e.festivalId,year,doy:e.startDayOfYear});
  }
  for(const e of SCHEDULE){
    if(e.startDayOfYear<doy)items.push({id:e.festivalId,year:year+1,doy:e.startDayOfYear});
  }
  return items.sort((a,b)=>a.year-b.year||a.doy-b.doy);
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Fixed yearly festival calendar\n");

assert(SCHEDULE.find(e=>e.festivalId==="holi").startDayOfYear===20,"Holi day 20");
assert(SCHEDULE.find(e=>e.festivalId==="diwali").startDayOfYear===55,"Diwali day 55");
assert(SCHEDULE.find(e=>e.festivalId==="ramadan").startDayOfYear===70,"Ramadan day 70");
assert(SCHEDULE.find(e=>e.festivalId==="eid").startDayOfYear===80,"Eid day 80");
assert(SCHEDULE.find(e=>e.festivalId==="christmas").startDayOfYear===110,"Christmas day 110");

const diwali=SCHEDULE.find(e=>e.festivalId==="diwali");
assert(phaseFor(50,1,diwali)==="preparation","Day 50 Diwali preparation");
assert(phaseFor(55,1,diwali)==="active","Day 55 Diwali active");
assert(phaseFor(57,1,diwali)==="active","Day 57 still active");
assert(phaseFor(58,1,diwali)==="closing","Day 58 closing");
assert(phaseFor(59,1,diwali)===null,"Day 59 ended");

const completed={};
completed[occurrenceKey("diwali",1)]=true;
assert(completed[occurrenceKey("diwali",1)]&&!completed[occurrenceKey("diwali",2)],"year-scoped completion");
assert(occurrenceKey("diwali",1)!==occurrenceKey("diwali",2),"recurs next year key");

assert(phaseFor(0,2,diwali)===null,"year2 day0 no diwali");
assert(phaseFor(55+DAYS,2,diwali)==="active","year2 diwali active via totalDays");

const up=upcoming(56,1);
assert(up[0].id==="ramadan"||up.some(x=>x.id==="ramadan"),"upcoming after diwali");
assert(up.some(x=>x.id==="holi"&&x.year===2),"Holi next year after day 56");
assert(up.some(x=>x.id==="christmas"&&x.year===1),"Christmas same year");

// year rollover
assert(phaseFor(119,1,SCHEDULE.find(e=>e.festivalId==="christmas"))===null,"after christmas");
const holi=SCHEDULE.find(e=>e.festivalId==="holi");
assert(phaseFor(DAYS+17,2,holi)==="preparation","year2 holi prep");
assert(phaseFor(DAYS+20,2,holi)==="active","year2 holi active");

// no skip day 1
assert(phaseFor(1,1,holi)===null,"day1 no festival");
assert(phaseFor(17,1,holi)==="preparation","holi prep day 17");

// eid after ramadan window
const eid=SCHEDULE.find(e=>e.festivalId==="eid");
const ram=SCHEDULE.find(e=>e.festivalId==="ramadan");
assert(phaseFor(75,1,ram)==="active"&&phaseFor(75,1,eid)===null,"eid not during mid-ramadan");
assert(phaseFor(80,1,eid)==="active","eid day 80");

console.log(failed?`${failed} failed`:`\nAll ${passed} fixed-calendar tests passed.`);
process.exit(failed?1:0);
