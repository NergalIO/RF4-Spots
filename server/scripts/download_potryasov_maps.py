# -*- coding: utf-8 -*-
"""Download Potryasov 'Карта расстояний' images and save as PNG."""
from __future__ import annotations

import json
import re
import time
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAPS = ROOT / "assets" / "maps"
SEEDS = ROOT / "prisma" / "seeds"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

WATERBODIES = json.loads((SEEDS / "waterbodies.json").read_text(encoding="utf-8"))

# letter-square meters from Potryasov scale box / community
LETTER_M = {
    "mosquito": 37,
    "elk": 57,
    "rivulet": 44,
    "oldburg": 39,
    "belaya": 52,
    "kuori": 46,
    "bear": 42,
    "volkhov": 100,
    "donets": 89,
    "sura": 82,
    "ladoga": 45,
    "amber": 90,
    "archipelago": 298,
    "akhtuba": 97,
    "copper": 25,
    "tunguska": 119,
    "yama": 139,
    "norwegian": 497,
}


def fetch(url: str, referer: str | None = None) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Referer": referer or "http://potryasovgame.ru/",
            "Accept": "text/html,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def tab_rec_id(html: str) -> str | None:
    m = re.search(
        r'data-tab-rec-ids="(\d+)"[\s\S]{0,1200}?Карта расстояний',
        html,
    )
    return m.group(1) if m else None


def rec_chunk(html: str, rec_id: str) -> str:
    start = html.find(f'id="rec{rec_id}"')
    if start < 0:
        return ""
    nxt = html.find('id="rec', start + 12)
    return html[start:nxt] if nxt > 0 else html[start : start + 80000]


def images_in(html: str) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    for m in re.finditer(
        r"data-field-filewidth-value=\"(\d+)\"[\s\S]{0,2500}?data-original='(https://static\.tildacdn\.com/[^']+)'",
        html,
    ):
        found.append((int(m.group(1)), m.group(2)))
    for m in re.finditer(
        r"data-original='(https://static\.tildacdn\.com/[^']+)'",
        html,
    ):
        url = m.group(1)
        if not any(u == url for _, u in found):
            found.append((0, url))
    return found


def pick_url(html: str) -> str | None:
    rec_id = tab_rec_id(html)
    candidates: list[tuple[int, str]] = []
    if rec_id:
        candidates = images_in(rec_chunk(html, rec_id))
    if not candidates:
        candidates = images_in(html)
    filtered = [
        (w, u)
        for w, u in candidates
        if "Potraysov" not in u and "LOGO" not in u and "logo" not in u.lower()
    ]
    if not filtered:
        filtered = candidates
    if not filtered:
        return None
    filtered.sort(key=lambda x: x[0], reverse=True)
    return filtered[0][1]


def to_png(data: bytes, dest: Path) -> tuple[int, int]:
    img = Image.open(BytesIO(data)).convert("RGBA")
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="PNG", optimize=True)
    return img.size


def main() -> None:
    updated = []
    for wb in WATERBODIES:
        page = wb["source"]
        print(f"\n[{wb['id']}] {page}")
        html = fetch(page, page).decode("utf-8", errors="replace")
        url = pick_url(html)
        if not url:
            print("  NO IMAGE")
            updated.append(wb)
            continue
        print(f"  {url}")
        raw = fetch(url, page)
        png_name = f"{wb['id']}.png"
        w, h = to_png(raw, MAPS / png_name)
        pad = max(8, round(min(w, h) * 0.02))
        letter_m = LETTER_M.get(wb["id"], wb["metersPerCell"])
        # 10 in-game units per letter square on Potryasov 10×N grids
        units_per_square = 10
        meters_per_unit = round(letter_m / units_per_square, 3)
        wb = {
            **wb,
            "imageFile": png_name,
            "imageWidth": w,
            "imageHeight": h,
            "padLeft": pad,
            "padTop": pad,
            "padRight": pad,
            "padBottom": pad,
            "cellPx": round((min(w, h) - 2 * pad) / ((wb["xMax"] - wb["xMin"]) / units_per_square)),
            "metersPerCell": meters_per_unit,
            "letterSquareMeters": letter_m,
            "sourceImage": url,
        }
        print(f"  saved {png_name} {w}x{h} pad={pad} m/unit={meters_per_unit}")
        updated.append(wb)
        time.sleep(0.4)

    (SEEDS / "waterbodies.json").write_text(
        json.dumps(updated, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (MAPS / "manifest.json").write_text(
        json.dumps(updated, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("\nDone", sum(1 for w in updated if str(w.get("imageFile", "")).endswith(".png")), "png")


if __name__ == "__main__":
    main()
