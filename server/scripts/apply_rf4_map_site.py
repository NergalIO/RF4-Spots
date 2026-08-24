# -*- coding: utf-8 -*-
"""Apply calibration and map images from https://rf4-map.ru/map/"""
from __future__ import annotations

import json
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / "prisma" / "seeds"
MAPS = ROOT / "assets" / "maps"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
BASE = "https://rf4-map.ru"

SITE_TO_WB = {
    "komarinoe": "mosquito",
    "losinoe": "elk",
    "vyunok": "rivulet",
    "old_burg": "oldburg",
    "belaya": "belaya",
    "kuori": "kuori",
    "bear": "bear",
    "volkhov": "volkhov",
    "donets": "donets",
    "sura": "sura",
    "ladoga": "ladoga",
    "amber": "amber",
    "archipelago": "archipelago",
    "ahtuba": "akhtuba",
    "copper": "copper",
    "tunguska": "tunguska",
    "yama": "yama",
    "norway": "norwegian",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Referer": f"{BASE}/map/", "Accept": "*/*"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def main() -> None:
    raw = fetch(f"{BASE}/data/maps.json")
    site_maps = json.loads(raw.decode("utf-8"))
    (SEEDS / "rf4_map_site.json").write_bytes(raw)

    waterbodies = json.loads((SEEDS / "waterbodies.json").read_text(encoding="utf-8"))
    by_id = {w["id"]: w for w in waterbodies}

    for rec in site_maps:
        wb_id = SITE_TO_WB.get(rec["id"])
        if not wb_id or wb_id not in by_id:
            print("skip", rec["id"])
            continue
        wb = by_id[wb_id]
        lt = rec["game_coords"]["left_top"]
        rb = rec["game_coords"]["right_bottom"]
        src = rec["src"] if rec["src"].startswith("http") else BASE + rec["src"]
        print(f"[{wb_id}] {src}")
        try:
            data = fetch(src)
            im = Image.open(BytesIO(data)).convert("RGBA")
            fname = f"{wb_id}.png"
            dest = MAPS / fname
            im.save(dest, format="PNG", optimize=True)
            w, h = im.size
            print(f"  saved {fname} {w}x{h}")
        except Exception as err:
            print("  image fail", err)
            fname = wb.get("imageFile", f"{wb_id}.png")
            w, h = wb.get("imageWidth", 972), wb.get("imageHeight", 972)

        y_top, y_bot = float(lt[1]), float(rb[1])
        wb.update(
            {
                "xMin": round(float(lt[0]), 4),
                "xMax": round(float(rb[0]), 4),
                "yMin": round(min(y_top, y_bot), 4),
                "yMax": round(max(y_top, y_bot), 4),
                "yFlipped": y_top > y_bot,
                "padLeft": 0,
                "padTop": 0,
                "padRight": 0,
                "padBottom": 0,
                "metersPerCell": float(rec.get("distance_scale") or wb.get("metersPerCell") or 5),
                "imageFile": fname,
                "imageWidth": w,
                "imageHeight": h,
                "cellPx": round(min(w, h) / 10),
                "rf4MapSiteId": rec["id"],
                "sourceImage": src,
            }
        )

    (SEEDS / "waterbodies.json").write_text(
        json.dumps(waterbodies, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (MAPS / "manifest.json").write_text(
        json.dumps(waterbodies, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("done")


if __name__ == "__main__":
    main()
