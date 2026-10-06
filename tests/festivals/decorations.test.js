
const REPLACEABLE=new Set(["minecraft:air","minecraft:short_grass"]);
function place(records,p){
  if(!REPLACEABLE.has(p.originalBlock||"minecraft:air"))return false;
  p.placed=true;p.owner="civilcraft";records.push(p);return true;
}
function cleanup(records,fid){
  let restored=0;const rem=[];
  for(const r of records){
    if(r.festivalId!==fid){rem.push(r);continue;}
    if(r.owner==="civilcraft")restored++;
  }
  return {restored,remaining:rem};
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Decorations\n");
const rec=[];
assert(place(rec,{festivalId:"diwali",originalBlock:"minecraft:air",placedBlock:"minecraft:lantern"}),"place on air");
assert(!place(rec,{festivalId:"diwali",originalBlock:"minecraft:chest",placedBlock:"minecraft:lantern"}),"refuse chest");
const c=cleanup(rec,"diwali");
assert(c.restored===1,"cleanup restores owned");
assert(c.remaining.length===0,"records cleared");
console.log(failed?`${failed} failed`:`\nAll ${passed} decorations tests passed.`);
process.exit(failed?1:0);
