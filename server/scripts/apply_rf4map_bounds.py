# -*- coding: utf-8 -*-
"""Apply RF4MAP start/end positions onto local waterbody seeds."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / "prisma" / "seeds"
MAPS = ROOT / "assets" / "maps"

waterbodies = json.loads((SEEDS / "waterbodies.json").read_text(encoding="utf-8"))
bounds = json.loads((SEEDS / "rf4map_bounds.json").read_text(encoding="utf-8"))

# Archipelago is RF4MAP location 14
for wb in waterbodies:
    if wb["id"] == "archipelago" and wb.get("rf4mapLocationId") is None:
        wb["rf4mapLocationId"] = 14

updated = 0
for wb in waterbodies:
    loc_id = wb.get("rf4mapLocationId")
    rec = bounds.get(str(loc_id)) if loc_id is not None else None
    wb["yFlipped"] = True
    if not rec:
        print(f"skip bounds {wb['id']}")
        continue
    x0, x1 = rec["startPositionX"], rec["endPositionX"]
    y0, y1 = rec["startPositionY"], rec["endPositionY"]
    wb["xMin"] = x0
    wb["xMax"] = x1
    wb["yMin"] = y0
    wb["yMax"] = y1
    span = max(abs(x1 - x0), 1)
    letter = wb.get("letterSquareMeters") or wb["metersPerCell"]
    # 10 letter squares across the mapped image
    wb["metersPerCell"] = round(letter / (span / 10), 3)
    inner = min(wb["imageWidth"], wb["imageHeight"]) - wb["padLeft"] - wb["padRight"]
    wb["cellPx"] = round(inner / 10)
    updated += 1
    print(
        f"{wb['id']:14} {wb['name']:22} X {x0}:{x1}  Y {y0}:{y1}  "
        f"m/unit={wb['metersPerCell']}"
    )

(SEEDS / "waterbodies.json").write_text(
    json.dumps(waterbodies, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
(MAPS / "manifest.json").write_text(
    json.dumps(waterbodies, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"updated {updated}/{len(waterbodies)}")
