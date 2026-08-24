# -*- coding: utf-8 -*-
"""Generate fish.json and SVG maps with RF4-style grids."""
from __future__ import annotations

import json
import math
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / "prisma" / "seeds"
MAPS = ROOT / "assets" / "maps"
SEEDS.mkdir(parents=True, exist_ok=True)
MAPS.mkdir(parents=True, exist_ok=True)

WB_ALIAS = {
    "Комариное": "mosquito",
    "Лосиное": "elk",
    "Вьюнок": "rivulet",
    "Острог": "oldburg",
    "Белая": "belaya",
    "Куори": "kuori",
    "Медвежье": "bear",
    "Волхов": "volkhov",
    "Донец": "donets",
    "Сура": "sura",
    "Ладожское": "ladoga",
    "Янтарное": "amber",
    "Архипелаг": "archipelago",
    "Ахтуба": "akhtuba",
    "Медное": "copper",
    "Тунгуска": "tunguska",
    "Яма": "yama",
    "Норвежское море": "norwegian",
    "Норвежское": "norwegian",
}

WATERBODIES = [
    {"id": "mosquito", "name": "оз. Комариное", "metersPerCell": 35, "xMin": 0, "xMax": 100, "yMin": 0, "yMax": 100, "rf4mapLocationId": 16, "kind": "lake", "sortOrder": 1, "source": "http://potryasovgame.ru/page110692736.html"},
    {"id": "elk", "name": "оз. Лосиное", "metersPerCell": 57, "xMin": 0, "xMax": 130, "yMin": 0, "yMax": 120, "rf4mapLocationId": 19, "kind": "lake", "sortOrder": 2, "source": "http://potryasovgame.ru/page110692966.html"},
    {"id": "rivulet", "name": "р. Вьюнок", "metersPerCell": 44, "xMin": 0, "xMax": 90, "yMin": 0, "yMax": 110, "rf4mapLocationId": 3, "kind": "river", "sortOrder": 3, "source": "http://potryasovgame.ru/page110693126.html"},
    {"id": "oldburg", "name": "оз. Старый Острог", "metersPerCell": 39, "xMin": 0, "xMax": 80, "yMin": 0, "yMax": 80, "rf4mapLocationId": 13, "kind": "lake", "sortOrder": 4, "source": "http://potryasovgame.ru/page110693326.html"},
    {"id": "belaya", "name": "р. Белая", "metersPerCell": 52, "xMin": 0, "xMax": 110, "yMin": 0, "yMax": 120, "rf4mapLocationId": 5, "kind": "river", "sortOrder": 5, "source": "http://potryasovgame.ru/page110693486.html"},
    {"id": "kuori", "name": "оз. Куори", "metersPerCell": 46, "xMin": 0, "xMax": 100, "yMin": 0, "yMax": 90, "rf4mapLocationId": 11, "kind": "lake", "sortOrder": 6, "source": "http://potryasovgame.ru/page110693686.html"},
    {"id": "bear", "name": "оз. Медвежье", "metersPerCell": 42, "xMin": 0, "xMax": 80, "yMin": 0, "yMax": 90, "rf4mapLocationId": 10, "kind": "lake", "sortOrder": 7, "source": "http://potryasovgame.ru/page110693816.html"},
    {"id": "volkhov", "name": "р. Волхов", "metersPerCell": 100, "xMin": 0, "xMax": 120, "yMin": 0, "yMax": 80, "rf4mapLocationId": 15, "kind": "river", "sortOrder": 8, "source": "http://potryasovgame.ru/page110694156.html"},
    {"id": "donets", "name": "р. Северский Донец", "metersPerCell": 89, "xMin": 0, "xMax": 110, "yMin": 0, "yMax": 100, "rf4mapLocationId": 9, "kind": "river", "sortOrder": 9, "source": "http://potryasovgame.ru/page110694346.html"},
    {"id": "sura", "name": "р. Сура", "metersPerCell": 82, "xMin": 0, "xMax": 100, "yMin": 0, "yMax": 90, "rf4mapLocationId": 2, "kind": "river", "sortOrder": 10, "source": "http://potryasovgame.ru/page110694486.html"},
    {"id": "ladoga", "name": "Ладожское оз.", "metersPerCell": 45, "xMin": 0, "xMax": 90, "yMin": 0, "yMax": 100, "rf4mapLocationId": 18, "kind": "lake", "sortOrder": 11, "source": "http://potryasovgame.ru/page110694716.html"},
    {"id": "amber", "name": "оз. Янтарное", "metersPerCell": 90, "xMin": 0, "xMax": 160, "yMin": 0, "yMax": 180, "rf4mapLocationId": 4, "kind": "lake", "sortOrder": 12, "source": "http://potryasovgame.ru/page110694856.html"},
    {"id": "archipelago", "name": "Ладожский архипелаг", "metersPerCell": 298, "xMin": 0, "xMax": 80, "yMin": 0, "yMax": 80, "rf4mapLocationId": None, "kind": "islands", "sortOrder": 13, "source": "http://potryasovgame.ru/page110695026.html"},
    {"id": "akhtuba", "name": "р. Ахтуба", "metersPerCell": 97, "xMin": 0, "xMax": 180, "yMin": 0, "yMax": 160, "rf4mapLocationId": 6, "kind": "river", "sortOrder": 14, "source": "http://potryasovgame.ru/page110695296.html"},
    {"id": "copper", "name": "оз. Медное", "metersPerCell": 25, "xMin": 0, "xMax": 80, "yMin": 0, "yMax": 80, "rf4mapLocationId": 7, "kind": "lake", "sortOrder": 15, "source": "http://potryasovgame.ru/page110695696.html"},
    {"id": "tunguska", "name": "р. Нижняя Тунгуска", "metersPerCell": 119, "xMin": 0, "xMax": 140, "yMin": 0, "yMax": 100, "rf4mapLocationId": 12, "kind": "river", "sortOrder": 16, "source": "http://potryasovgame.ru/page110695966.html"},
    {"id": "yama", "name": "р. Яма", "metersPerCell": 139, "xMin": 0, "xMax": 120, "yMin": 0, "yMax": 140, "rf4mapLocationId": 1, "kind": "river", "sortOrder": 17, "source": "http://potryasovgame.ru/page110696146.html"},
    {"id": "norwegian", "name": "Норвежское море", "metersPerCell": 497, "xMin": 0, "xMax": 100, "yMin": 0, "yMax": 80, "rf4mapLocationId": None, "kind": "sea", "sortOrder": 18, "source": "http://potryasovgame.ru/page110696306.html"},
]


def parse_fish(table_path: Path) -> list[dict]:
    text = table_path.read_text(encoding="utf-8")
    fish: list[dict] = []
    for line in text.splitlines():
        if not line.startswith("| ") or line.startswith("| Рыба") or line.startswith("| ---"):
            continue
        cols = [c.strip() for c in line.strip("|").split("|")]
        if len(cols) < 10:
            continue
        name = cols[0]
        if name in {"Рыба"} or not name or name.startswith("Если"):
            continue
        waters_raw = cols[-1]
        wbs: list[str] = []
        remaining = waters_raw
        for alias, slug in sorted(WB_ALIAS.items(), key=lambda kv: -len(kv[0])):
            if alias in remaining:
                wbs.append(slug)
                remaining = remaining.replace(alias, " ")
        fish.append({"name": name, "waterbodies": list(dict.fromkeys(wbs))})
    # unique by name, keep first
    seen = set()
    out = []
    for f in fish:
        if f["name"] in seen:
            continue
        seen.add(f["name"])
        out.append(f)
    return out


def land_path(kind: str, w: float, h: float) -> str:
    if kind == "sea":
        return f"M 0 0 H {w} V {h * 0.22} C {w * 0.7} {h * 0.08}, {w * 0.3} {h * 0.3}, 0 {h * 0.18} Z"
    if kind == "river":
        cx = w * 0.48
        return (
            f"M 0 0 H {w} V {h} H 0 Z "
            f"M {cx - w * 0.16} 0 "
            f"C {cx - w * 0.05} {h * 0.2}, {cx + w * 0.12} {h * 0.35}, {cx + w * 0.02} {h * 0.5} "
            f"C {cx - w * 0.12} {h * 0.68}, {cx + w * 0.1} {h * 0.82}, {cx} {h} "
            f"H {cx + w * 0.22} "
            f"C {cx + w * 0.28} {h * 0.8}, {cx + w * 0.08} {h * 0.62}, {cx + w * 0.2} {h * 0.48} "
            f"C {cx + w * 0.32} {h * 0.32}, {cx + w * 0.18} {h * 0.16}, {cx + w * 0.26} 0 Z"
        )
    if kind == "islands":
        blobs = []
        for i, (x, y, rx, ry) in enumerate([
            (0.22, 0.28, 0.14, 0.1),
            (0.55, 0.22, 0.18, 0.12),
            (0.72, 0.55, 0.16, 0.14),
            (0.3, 0.62, 0.2, 0.13),
            (0.5, 0.78, 0.12, 0.08),
        ]):
            blobs.append(f'<ellipse cx="{x*w:.1f}" cy="{y*h:.1f}" rx="{rx*w:.1f}" ry="{ry*h:.1f}"/>')
        return "ISLANDS:" + "".join(blobs)
    # lake
    return (
        f'<ellipse cx="{w*0.5:.1f}" cy="{h*0.5:.1f}" rx="{w*0.38:.1f}" ry="{h*0.36:.1f}"/>'
        f'<ellipse cx="{w*0.62:.1f}" cy="{h*0.42:.1f}" rx="{w*0.22:.1f}" ry="{h*0.2:.1f}"/>'
        f'<ellipse cx="{w*0.38:.1f}" cy="{h*0.6:.1f}" rx="{w*0.18:.1f}" ry="{h*0.16:.1f}"/>'
    )


def svg_for(wb: dict) -> tuple[str, int, int]:
    pad_l, pad_t, pad_r, pad_b = 46, 52, 18, 36
    cells_x = int(wb["xMax"] - wb["xMin"])
    cells_y = int(wb["yMax"] - wb["yMin"])
    cell = 10
    gw, gh = cells_x * cell, cells_y * cell
    W, H = gw + pad_l + pad_r, gh + pad_t + pad_b
    ox, oy = pad_l, pad_t

    land = land_path(wb["kind"], gw, gh)
    if land.startswith("ISLANDS:"):
        islands = land[len("ISLANDS:"):]
        water_fill = f'<rect x="{ox}" y="{oy}" width="{gw}" height="{gh}" fill="#0b3a52"/>'
        land_el = f'<g transform="translate({ox} {oy})" fill="#1c4632" stroke="#2d6a4a" stroke-width="1.2">{islands}</g>'
    elif wb["kind"] == "sea":
        water_fill = f'<rect x="{ox}" y="{oy}" width="{gw}" height="{gh}" fill="#0a3550"/>'
        land_el = f'<g transform="translate({ox} {oy})"><path d="{land}" fill="#1a3d2c"/></g>'
    elif wb["kind"] == "river":
        water_fill = f'<rect x="{ox}" y="{oy}" width="{gw}" height="{gh}" fill="#173528"/>'
        land_el = f'<g transform="translate({ox} {oy})"><path d="{land.split(" Z M ",1)[1] if " Z M " in land else land}" fill="#0b3d55"/></g>'
        # simpler river band
        land_el = (
            f'<rect x="{ox}" y="{oy}" width="{gw}" height="{gh}" fill="#1a3f2d"/>'
            f'<path transform="translate({ox} {oy})" d="M {gw*0.38:.0f} 0 C {gw*0.5:.0f} {gh*0.25:.0f}, {gw*0.3:.0f} {gh*0.45:.0f}, {gw*0.42:.0f} {gh*0.6:.0f} C {gw*0.55:.0f} {gh*0.78:.0f}, {gw*0.4:.0f} {gh*0.9:.0f}, {gw*0.46:.0f} {gh} '
            f'H {gw*0.62:.0f} C {gw*0.58:.0f} {gh*0.88:.0f}, {gw*0.7:.0f} {gh*0.72:.0f}, {gw*0.58:.0f} {gh*0.55:.0f} C {gw*0.46:.0f} {gh*0.38:.0f}, {gw*0.66:.0f} {gh*0.2:.0f}, {gw*0.58:.0f} 0 Z" fill="#0b3d55"/>'
        )
        water_fill = ""
    else:
        water_fill = f'<rect x="{ox}" y="{oy}" width="{gw}" height="{gh}" fill="#173528"/>'
        land_el = f'<g transform="translate({ox} {oy})" fill="#0b3d55" stroke="#1a6a7a" stroke-width="1">{land}</g>'

    lines = []
    labels = []
    for i in range(cells_x + 1):
        x = ox + i * cell
        major = i % 10 == 0
        stroke = "#d4b46a" if major else "#7a8a90"
        opac = 0.55 if major else 0.18
        sw = 1.1 if major else 0.5
        lines.append(f'<line x1="{x}" y1="{oy}" x2="{x}" y2="{oy+gh}" stroke="{stroke}" stroke-opacity="{opac}" stroke-width="{sw}"/>')
        if major:
            labels.append(f'<text x="{x}" y="{oy+gh+16}" fill="#c9d6c8" font-size="10" text-anchor="middle">{int(wb["xMin"])+i}</text>')
    for j in range(cells_y + 1):
        y = oy + j * cell
        major = j % 10 == 0
        stroke = "#d4b46a" if major else "#7a8a90"
        opac = 0.55 if major else 0.18
        sw = 1.1 if major else 0.5
        lines.append(f'<line x1="{ox}" y1="{y}" x2="{ox+gw}" y2="{y}" stroke="{stroke}" stroke-opacity="{opac}" stroke-width="{sw}"/>')
        if major:
            # Y increases downward to match RF4MAP-style overlays
            labels.append(f'<text x="{ox-8}" y="{y+3}" fill="#c9d6c8" font-size="10" text-anchor="end">{int(wb["yMin"])+j}</text>')

    box_x, box_y = W - 148, 8
    m = wb["metersPerCell"]
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <rect width="{W}" height="{H}" fill="#07131c"/>
  <text x="{pad_l}" y="22" fill="#e8d7a3" font-family="Georgia, serif" font-size="16">{wb["name"]}</text>
  <text x="{pad_l}" y="38" fill="#8aa0a8" font-family="Segoe UI, sans-serif" font-size="10">координаты X:Y как в игре · сетка {m:g} м</text>
  {water_fill}
  {land_el}
  <rect x="{ox}" y="{oy}" width="{gw}" height="{gh}" fill="none" stroke="#d4b46a" stroke-opacity="0.7"/>
  {''.join(lines)}
  {''.join(labels)}
  <g>
    <rect x="{box_x}" y="{box_y}" width="132" height="36" rx="4" fill="#0c1c24" stroke="#d4b46a"/>
    <rect x="{box_x+8}" y="{box_y+8}" width="20" height="20" fill="none" stroke="#e8d7a3" stroke-width="1.5"/>
    <text x="{box_x+36}" y="{box_y+16}" fill="#e8d7a3" font-size="10" font-family="Segoe UI, sans-serif">клетка сетки</text>
    <text x="{box_x+36}" y="{box_y+30}" fill="#f0e6c8" font-size="12" font-family="Segoe UI, sans-serif" font-weight="700">{m:g} × {m:g} м</text>
  </g>
</svg>
'''
    return svg, W, H


def main() -> None:
    table = Path(r"C:\Users\Nergal\.cursor\projects\c-Users-Nergal-Desktop-RF4-Spots\agent-tools\5f1297ec-21f8-4377-a427-19e1a4981f10.txt")
    if table.exists():
        fish = parse_fish(table)
        (SEEDS / "fish.json").write_text(json.dumps(fish, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"fish: {len(fish)}")

    pngs = list(MAPS.glob("*.png"))
    if pngs:
        print(f"skip SVG maps: {len(pngs)} png already in {MAPS}")
        return

    maps_meta = []
    for wb in WATERBODIES:
        svg, W, H = svg_for(wb)
        fname = f"{wb['id']}.svg"
        (MAPS / fname).write_text(svg, encoding="utf-8")
        rec = {
            **wb,
            "imageFile": fname,
            "imageWidth": W,
            "imageHeight": H,
            "padLeft": 46,
            "padTop": 52,
            "padRight": 18,
            "padBottom": 36,
            "cellPx": 10,
            "yFlipped": False,
        }
        maps_meta.append(rec)
    (SEEDS / "waterbodies.json").write_text(json.dumps(maps_meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (MAPS / "manifest.json").write_text(json.dumps(maps_meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"maps: {len(maps_meta)}")


if __name__ == "__main__":
    main()
