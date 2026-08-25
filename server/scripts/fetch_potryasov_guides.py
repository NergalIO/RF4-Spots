"""Download public Potryasov RF4 tables into prisma/seeds/guides/*.json"""
from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "prisma" / "seeds" / "guides"
FISH_JSON = HERE.parent / "prisma" / "seeds" / "fish.json"

CSV_SOURCES = {
    "alcohol": "https://docs.google.com/spreadsheets/d/e/2PACX-1vS6iyivV7CfazYBMI5V7fLDXcoMCqxx17dDxf-EpJsFJ3RVJhCw06lo9Ksd45gfT5ZSCQpG7C0VaqdM/pub?gid=192246136&single=true&output=csv",
    "levels": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSweJlt78Ew-owrFDsoNHlnA79eSvW_oB22eVRVKgTOXHCOStryUyHPEL-qeP_uamdLg-JtFHt8cNq-/pub?gid=1831337336&single=true&output=csv",
    "shopPrices": "https://docs.google.com/spreadsheets/d/e/2PACX-1vS3TUXjtj1vN-ij7-opl3b7qT4P9qHYkO8o8zVS-ksGRgG-yycx9JWeH3l2XJwHlTI8_IHTfG882P2s/pub?gid=870950263&single=true&output=csv",
}

REEL_PAGES = [
    ("http://potryasovgame.ru/page114271846.html", "Безынерционные"),
    ("http://potryasovgame.ru/page119038106.html", "Силовые"),
    ("http://potryasovgame.ru/page119039366.html", "Байткастинговые"),
    ("http://potryasovgame.ru/page119040226.html", "Низкопрофильные"),
]

ROD_PAGES = [
    ("http://potryasovgame.ru/page119041286.html", "Поплавочные"),
    ("http://potryasovgame.ru/page119043766.html", "Фидерные"),
    ("http://potryasovgame.ru/page119046076.html", "Спиннинговые"),
    ("http://potryasovgame.ru/page119059186.html", "Кастинговые"),
    ("http://potryasovgame.ru/page119059876.html", "Морские"),
    ("http://potryasovgame.ru/page119071226.html", "Нахлыстовые"),
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Referer": "http://potryasovgame.ru/",
            "Accept-Language": "ru,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        return res.read()


def fetch_text(url: str) -> str:
    raw = fetch(url)
    for enc in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", "replace")


def parse_num(value: str | None) -> float | None:
    text = (value or "").strip().replace("\xa0", " ").replace(" ", "")
    if not text or text in {".", "-", "—", "?", "нет"}:
        return None
    text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", "-", "."}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def read_csv(url: str) -> tuple[list[str], list[list[str]]]:
    text = fetch_text(url)
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect=dialect)
    rows = [r for r in reader if any(c.strip() for c in r)]
    if not rows:
        return [], []
    return [c.strip() for c in rows[0]], rows[1:]


def dump(name: str, rows: list) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{name}: {len(rows)} rows -> {path.name}")


def col(header: list[str], row: list[str], *needles: str) -> str:
    lower = [h.lower() for h in header]
    for needle in needles:
        for i, h in enumerate(lower):
            if needle in h:
                return row[i].strip() if i < len(row) else ""
    return ""


def map_alcohol(header: list[str], rows: list[list[str]]) -> list[dict]:
    out = []
    for row in rows:
        name = col(header, row, "название") or (row[0].strip() if row else "")
        if not name:
            continue
        price = parse_num(row[7]) if len(row) > 7 else parse_num(col(header, row, "цена"))
        out.append({
            "name": name,
            "source": col(header, row, "источник"),
            "waterbody": col(header, row, "водоём", "водоем"),
            "expPct": parse_num(col(header, row, "опыт %") or (row[3] if len(row) > 3 else "")),
            "maxPct": parse_num(col(header, row, "максимум") or (row[4] if len(row) > 4 else "")),
            "hours": parse_num(col(header, row, "часов") or (row[5] if len(row) > 5 else "")),
            "portions": parse_num(col(header, row, "порций") or (row[6] if len(row) > 6 else "")),
            "price": price,
            "ostrogPrice": parse_num(col(header, row, "острог") or (row[8] if len(row) > 8 else "")),
            "portionPrice": parse_num(col(header, row, "порция") or (row[9] if len(row) > 9 else "")),
            "scCost": parse_num(col(header, row, "затрат") or (row[10] if len(row) > 10 else "")),
            "pricePerExp": parse_num(col(header, row, "1% опыта") or (row[11] if len(row) > 11 else "")),
            "pricePerSc": parse_num(col(header, row, "на сч") or (row[12] if len(row) > 12 else "")),
            "notes": "",
        })
    return out


def map_levels(header: list[str], rows: list[list[str]]) -> list[dict]:
    out = []
    for row in rows:
        level = parse_num(col(header, row, "уровень") or (row[0] if row else ""))
        if level is None:
            continue
        out.append({
            "level": int(level),
            "xp": parse_num(row[1] if len(row) > 1 else ""),
            "xpTotal": parse_num(col(header, row, "сумма опыта") or (row[2] if len(row) > 2 else "")),
            "points": parse_num(col(header, row, "очки") or (row[3] if len(row) > 3 else "")),
            "pointsTotal": parse_num(col(header, row, "сумма очков") or (row[4] if len(row) > 4 else "")),
            "waterAccess": col(header, row, "доступ") or (row[5] if len(row) > 5 else ""),
        })
    return out


def map_shops(header: list[str], rows: list[list[str]]) -> list[dict]:
    keys = [
        "waterbody",
        "fishMarket",
        "tackleShop",
        "tackleShop2",
        "brandedShop",
        "workshop",
        "brandedWorkshop",
        "generalStore",
        "grocery",
        "grocery2",
    ]
    out = []
    for row in rows:
        if not row or not row[0].strip():
            continue
        item = {k: (row[i].strip() if i < len(row) else "") for i, k in enumerate(keys)}
        out.append(item)
    return out


def parse_calc_options(html: str, category: str, kind: str) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for m in re.finditer(r'<option[^>]*value="([^"]+)"', html, re.I):
        raw = re.sub(r"\s+", " ", m.group(1)).strip()
        if " = " not in raw:
            continue
        name, kg_s = raw.rsplit(" = ", 1)
        name = name.strip()
        kg = parse_num(kg_s)
        if kg is None or not name or re.fullmatch(r"\d+%", name):
            continue
        key = f"{category}|{name}"
        if key in seen:
            continue
        seen.add(key)
        if kind == "reel":
            rows.append({
                "name": name,
                "category": category,
                "retrieve": None,
                "ratio": "",
                "gearKg": kg,
                "dragKg": None,
                "weight": None,
                "capacity": "",
                "price": None,
                "notes": "",
            })
        else:
            rows.append({
                "name": name,
                "category": category,
                "length": None,
                "test": "",
                "blankKg": kg,
                "price": None,
                "notes": "",
            })
    return rows


def collect(pages: list[tuple[str, str]], kind: str) -> list[dict]:
    all_rows: list[dict] = []
    for url, category in pages:
        try:
            html = fetch_text(url)
        except Exception as exc:
            print("fail", category, exc)
            continue
        parsed = parse_calc_options(html, category, kind)
        print(kind, category, len(parsed))
        all_rows.extend(parsed)
    return all_rows


def main() -> None:
    h, rows = read_csv(CSV_SOURCES["alcohol"])
    dump("alcohol", map_alcohol(h, rows))
    h, rows = read_csv(CSV_SOURCES["levels"])
    dump("levels", map_levels(h, rows))
    h, rows = read_csv(CSV_SOURCES["shopPrices"])
    dump("shopPrices", map_shops(h, rows))
    dump("reels", collect(REEL_PAGES, "reel"))
    dump("rods", collect(ROD_PAGES, "rod"))

    fish_rows = []
    if FISH_JSON.exists():
        for item in json.loads(FISH_JSON.read_text(encoding="utf-8")):
            fish_rows.append({
                "name": item["name"],
                "qualifyingKg": None,
                "uniqueKg": None,
                "trophyKg": None,
                "rareTrophyKg": None,
            })
    dump("fishWeights", fish_rows)


if __name__ == "__main__":
    main()
