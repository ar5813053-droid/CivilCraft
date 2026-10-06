/** Phase 21 resource pack validation. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "../..");
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Resource pack\n");

const rp = JSON.parse(fs.readFileSync(path.join(root, "resource_pack/manifest.json"), "utf8"));
const bp = JSON.parse(fs.readFileSync(path.join(root, "behavior_pack/manifest.json"), "utf8"));
assert(rp.header && rp.header.uuid, "manifests present");
assert(Array.isArray(rp.header.version), "resource pack version array");
assert(fs.existsSync(path.join(root, "resource_pack/entity/civilcraft_citizen.entity.json")), "client entity");
assert(fs.existsSync(path.join(root, "behavior_pack/entities/civilcraft_citizen.json")), "behavior entity");
assert(fs.existsSync(path.join(root, "resource_pack/render_controllers/civilcraft_citizen.render_controllers.json")), "render controller");

const client = JSON.parse(fs.readFileSync(path.join(root, "resource_pack/entity/civilcraft_citizen.entity.json"), "utf8"));
const textures = client["minecraft:client_entity"].description.textures;
const required = ["farmer", "police", "doctor", "teacher", "mayor", "civilian"];
for (const k of required) {
  assert(textures[k], `role texture mapping ${k}`);
  const rel = textures[k].replace(/^textures\//, "") + ".png";
  assert(fs.existsSync(path.join(root, "resource_pack/textures", rel)), `texture file ${rel}`);
}
const rc = JSON.parse(fs.readFileSync(path.join(root, "resource_pack/render_controllers/civilcraft_citizen.render_controllers.json"), "utf8"));
assert(rc.render_controllers["controller.render.civilcraft_citizen"], "render controller reference");
assert(fs.existsSync(path.join(root, "assets/LICENSES.md")), "license metadata");
const beh = JSON.parse(fs.readFileSync(path.join(root, "behavior_pack/entities/civilcraft_citizen.json"), "utf8"));
assert(beh["minecraft:entity"].description.identifier === "civilcraft:citizen", "entity identifier");
assert(beh["minecraft:entity"].description.properties["civilcraft:role_index"], "role_index property");

console.log(failed ? `${failed} failed` : `\nAll ${passed} resource-pack tests passed.`);
process.exit(failed ? 1 : 0);
