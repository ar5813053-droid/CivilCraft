#!/usr/bin/env python3
"""Package CivilCraft .mcaddon, .mcpack, and .mcworld for release."""
import json, os, shutil, zipfile, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
BP_UUID = "2a27c2cc-b7d6-4ac4-9637-95c770a6d3be"
RP_UUID = "9296565a-743a-4368-9426-d469027a5956"
VERSION = [1, 30, 0]


def zip_dir(src, z, prefix=""):
    src = Path(src)
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__", "node_modules")]
        for f in files:
            full = Path(root) / f
            arc = str(Path(prefix) / full.relative_to(src)).replace("\\", "/")
            z.write(full, arc)


def main():
    OUT.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT / "CivilCraft.mcaddon", "w", zipfile.ZIP_DEFLATED) as z:
        zip_dir(ROOT / "behavior_pack", z, "CivilCraft_BP")
        zip_dir(ROOT / "resource_pack", z, "CivilCraft_RP")

    for name, folder in [("CivilCraft-BP.mcpack", "behavior_pack"), ("CivilCraft-RP.mcpack", "resource_pack")]:
        with zipfile.ZipFile(OUT / name, "w", zipfile.ZIP_DEFLATED) as z:
            zip_dir(ROOT / folder, z, "")

    wd = OUT / "world_staging"
    if wd.exists():
        shutil.rmtree(wd)
    bp_dest = wd / "behavior_packs" / "CivilCraft_BP"
    rp_dest = wd / "resource_packs" / "CivilCraft_RP"
    shutil.copytree(ROOT / "behavior_pack", bp_dest)
    shutil.copytree(ROOT / "resource_pack", rp_dest)
    (wd / "levelname.txt").write_text("CivilCraft Capital")
    (wd / "world_behavior_packs.json").write_text(
        json.dumps([{"pack_id": BP_UUID, "version": VERSION}], indent=2)
    )
    (wd / "world_resource_packs.json").write_text(
        json.dumps([{"pack_id": RP_UUID, "version": VERSION}], indent=2)
    )
    # History files help some clients treat packs as actively selected
    (wd / "world_behavior_pack_history.json").write_text(
        json.dumps([{"pack_id": BP_UUID, "version": VERSION}], indent=2)
    )
    (wd / "world_resource_pack_history.json").write_text(
        json.dumps([{"pack_id": RP_UUID, "version": VERSION}], indent=2)
    )
    with open(wd / "level.dat", "wb") as f:
        f.write(struct.pack("<ii", 10, 0))
    (wd / "IMPORT.txt").write_text(
        "CivilCraft by ItsZack95\n"
        "1) Import this .mcworld if your device accepts it\n"
        "2) Or import CivilCraft.mcaddon, create a Flat world, enable both packs, run: !cc build capital\n"
        "Capital also builds automatically on first player spawn when scripts load.\n"
    )
    with zipfile.ZipFile(OUT / "CivilCraft-Complete.mcworld", "w", zipfile.ZIP_DEFLATED) as z:
        zip_dir(wd, z, "")
    print("Packaged into", OUT)
    for p in OUT.glob("CivilCraft*"):
        if p.is_file():
            print(p.name, p.stat().st_size)


if __name__ == "__main__":
    main()
