# -*- coding: utf-8 -*-
"""Pull RF4MAP start/end positions for each location."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / "prisma" / "seeds"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
PAT = re.compile(
    r'"id":(\d+),"name":"([^"]*)","startPositionX":(-?\d+),"startPositionY":(-?\d+),'
    r'"endPositionX":(-?\d+),"endPositionY":(-?\d+),"imageUrl":"([^"]+)"'
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def parse(html: str) -> dict | None:
    text = html.replace('\\"', '"').replace("\\/", "/")
    m = PAT.search(text)
    if not m:
        return None
    return {
        "id": int(m.group(1)),
        "name": m.group(2),
        "startPositionX": int(m.group(3)),
        "startPositionY": int(m.group(4)),
        "endPositionX": int(m.group(5)),
        "endPositionY": int(m.group(6)),
        "imageUrl": m.group(7),
    }


def main() -> None:
    waterbodies = json.loads((SEEDS / "waterbodies.json").read_text(encoding="utf-8"))
    ids = sorted({wb["rf4mapLocationId"] for wb in waterbodies if wb.get("rf4mapLocationId")})
    extra = [8, 14, 17, 20, 21, 22]
    print("ids", ids + extra)
    found: dict[int, dict] = {}
    for loc_id in ids + extra:
        try:
            html = fetch(f"https://rf4map.ru/location/{loc_id}")
        except Exception as err:
            print(loc_id, "ERR", err)
            continue
        rec = parse(html)
        print(loc_id, rec)
        if rec:
            found[loc_id] = rec
    (SEEDS / "rf4map_bounds.json").write_text(
        json.dumps({str(k): v for k, v in found.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("saved", len(found))


if __name__ == "__main__":
    main()
