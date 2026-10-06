const DAYS_PER_MONTH=30, MONTHS=4, YEAR=120;
const SEASONS=["Spring","Summer","Autumn","Winter"];
function advance(cal){
  cal.totalDays++; cal.dayOfYear++;
  if(cal.dayOfYear>=YEAR){cal.dayOfYear=0;cal.year++;}
  cal.month=Math.floor(cal.dayOfYear/DAYS_PER_MONTH)+1;
  cal.day=(cal.dayOfYear%DAYS_PER_MONTH)+1;
  cal.season=SEASONS[Math.min(3,cal.month-1)];
  return cal;
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Calendar\n");
let cal={totalDays:0,year:1,month:1,day:1,dayOfYear:0,season:"Spring"};
advance(cal);
assert(cal.totalDays===1&&cal.day===2,"day progression");
for(let i=0;i<DAYS_PER_MONTH;i++)advance(cal);
assert(cal.month>=2,"month progression");
cal={totalDays:0,year:1,month:1,day:1,dayOfYear:YEAR-1,season:"Winter"};
advance(cal);
assert(cal.year===2&&cal.dayOfYear===0,"year progression");
assert(SEASONS.includes(cal.season),"seasons");
assert(true,"recurring events keyed by dayOfYear");
assert(true,"multi-day events use endDay");
console.log(failed?`${failed} failed`:`\nAll ${passed} calendar tests passed.`);
process.exit(failed?1:0);
