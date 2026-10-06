const fs = require("fs");
const path = require("path");
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Resource texture references\n");
const ent = JSON.parse(fs.readFileSync("resource_pack/entity/civilcraft_citizen.entity.json","utf8"));
const tex = ent["minecraft:client_entity"].description.textures;
let missing=0;
for (const [k,v] of Object.entries(tex)) {
  const p = path.join("resource_pack", v + ".png");
  if (!fs.existsSync(p)) { missing++; console.error(" missing", p); }
}
assert(Object.keys(tex).length >= 70, ">=70 texture keys");
assert(missing===0, "all texture files exist");
const bp = JSON.parse(fs.readFileSync("behavior_pack/manifest.json","utf8"));
const rp = JSON.parse(fs.readFileSync("resource_pack/manifest.json","utf8"));
assert(bp.header.name==="CivilCraft", "BP name CivilCraft");
assert(rp.header.uuid===bp.dependencies.find(d=>d.uuid).uuid, "BP depends on RP uuid");
assert(fs.existsSync("behavior_pack/pack_icon.png"), "BP pack_icon");
assert(fs.existsSync("resource_pack/pack_icon.png"), "RP pack_icon");
assert(bp.metadata.authors.includes("ItsZack95"), "creator ItsZack95");
console.log(failed?`${failed} failed`:`\nAll ${passed} resource tests passed.`);
process.exit(failed?1:0);
