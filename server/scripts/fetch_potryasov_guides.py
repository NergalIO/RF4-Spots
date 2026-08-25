"""Download public RF4 tables into prisma/seeds/guides/*.json.

Sources:
- Potryasov Google Sheets (alcohol, levels, shop prices)
- Potryasov wear-calculator pages (gearKg / blankKg fallback)
- FarmTrof open catalogs (reels, rods, fish weights)
"""
from __future__ import annotations

import csv
import html as html_lib
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

FARMTROF = {
    "reels": "https://rr4farmtrof.com/pages/knowledge-base/reel-specs.php",
    "rods": "https://rr4farmtrof.com/pages/knowledge-base/rod-specs.php",
    "fish": "https://rr4farmtrof.com/pages/knowledge-base/fish-weight.php",
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

REEL_CAT = {
    "безынерционные": "Безынерционные",
    "силовые мультипликаторные": "Силовые",
    "силовые": "Силовые",
    "байткастинговые классические": "Байткастинговые",
    "байткастинговые": "Байткастинговые",
    "байткастинговые низкопрофильные": "Низкопрофильные",
    "низкопрофильные": "Низкопрофильные",
}

ROD_CAT = {
    "маховое": "Поплавочные",
    "болонское": "Поплавочные",
    "матчевое": "Поплавочные",
    "поплавочные": "Поплавочные",
    "фидер": "Фидерные",
    "фидерные": "Фидерные",
    "пикер": "Фидерные",
    "карповое": "Фидерные",
    "сподовое": "Фидерные",
    "маркерное": "Фидерные",
    "спиннинг": "Спиннинговые",
    "спиннинговые": "Спиннинговые",
    "кастинговое": "Кастинговые",
    "кастинговые": "Кастинговые",
    "джерковое": "Кастинговые",
    "морское донное": "Морские",
    "пилкерное": "Морские",
    "морские": "Морские",
    "нахлыстовое": "Нахлыстовые",
    "нахлыстовые": "Нахлыстовые",
}

PREFIX_RE = re.compile(
    r"^(маховое|болонское|матчевое|фидерное|пикерное|карповое|спиннинговое|кастинговое|"
    r"джерковое|морское|пилкерное|нахлыстовое|сподовое|маркерное)\s*[-–:]\s*",
    re.I,
)


def fetch(url: str, referer: str = "https://rr4farmtrof.com/") -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Referer": referer,
            "Accept-Language": "ru,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        return res.read()


def fetch_text(url: str, referer: str = "https://rr4farmtrof.com/") -> str:
    raw = fetch(url, referer=referer)
    for enc in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", "replace")


def parse_num(value: str | None) -> float | None:
    text = (value or "").strip().replace("\xa0", " ").replace(" ", "")
    if not text or text in {".", "-", "—", "?", "нет", "≈"}:
        return None
    text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", "-", "."}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def clean_num(value) -> float | int | None:
    if value is None or value == "":
        return None
    if isinstance(value, str):
        n = parse_num(value)
    else:
        try:
            n = float(value)
        except (TypeError, ValueError):
            return None
    if n is None or not (n == n):  # NaN
        return None
    rounded = round(n, 3)
    if abs(rounded - round(rounded)) < 1e-9:
        as_int = int(round(rounded))
        if abs(n - as_int) < 1e-6:
            return as_int
    return rounded


def read_csv(url: str) -> tuple[list[str], list[list[str]]]:
    text = fetch_text(url, referer="http://potryasovgame.ru/")
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


def parse_calc_options(page_html: str, category: str, kind: str) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for m in re.finditer(r'<option[^>]*value="([^"]+)"', page_html, re.I):
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
            page_html = fetch_text(url, referer="http://potryasovgame.ru/")
        except Exception as exc:
            print("fail", category, exc)
            continue
        parsed = parse_calc_options(page_html, category, kind)
        print(kind, "potryasov", category, len(parsed))
        all_rows.extend(parsed)
    return all_rows


def norm_name(value: str) -> str:
    text = html_lib.unescape(value or "").replace("ё", "е").replace("Ё", "Е")
    text = PREFIX_RE.sub("", text.strip())
    text = text.lower()
    text = re.sub(r"[^a-z0-9а-я]+", " ", text)
    return " ".join(text.split())


def attr(block: str, key: str) -> str:
    m = re.search(rf'data-{re.escape(key)}="([^"]*)"', block)
    return html_lib.unescape(m.group(1)).strip() if m else ""


def inner_val(block: str, data_t: str) -> str:
    m = re.search(
        rf'data-t="{re.escape(data_t)}"[^>]*>.*?<span class="rk-val">([^<]*)',
        block,
        re.S,
    )
    return html_lib.unescape(m.group(1)).strip() if m else ""


def articles(page_html: str) -> list[str]:
    parts = page_html.split('<article class="rk-card"')
    out = []
    for part in parts[1:]:
        end = part.find("</article>")
        if end < 0:
            continue
        out.append('<article class="rk-card"' + part[:end] + "</article>")
    return out


def map_cat(raw: str, table: dict[str, str], fallback: str) -> str:
    key = re.sub(r"\s+", " ", (raw or "").strip().lower())
    return table.get(key, fallback if fallback else raw.strip())


def parse_farmtrof_reels(page_html: str) -> list[dict]:
    rows = []
    seen: set[str] = set()
    for block in articles(page_html):
        name_m = re.search(r'class="rk-name">([^<]+)', block)
        name = html_lib.unescape(name_m.group(1)).strip() if name_m else ""
        if not name:
            continue
        key = norm_name(name)
        if not key or key in seen:
            continue
        seen.add(key)
        category = map_cat(attr(block, "cat"), REEL_CAT, "Безынерционные")
        ratio = inner_val(block, "gear") or ""
        gear = clean_num(inner_val(block, "gearstr") or attr(block, "mech"))
        drag = clean_num(attr(block, "friction") or inner_val(block, "friction"))
        retrieve = clean_num(attr(block, "speed") or inner_val(block, "speed"))
        price = clean_num(attr(block, "price"))
        size = attr(block, "size")
        notes = []
        if ("защит" in block and ("солён" in block or "солен" in block)):
            notes.append("Защита от соли")
        abil = attr(block, "abil")
        if abil:
            notes.append(abil)
        rows.append({
            "name": name,
            "category": category,
            "retrieve": retrieve,
            "ratio": ratio,
            "gearKg": gear,
            "dragKg": drag,
            "weight": None,
            "capacity": size,
            "price": price,
            "notes": "; ".join(dict.fromkeys(notes)),
        })
    return rows


def parse_farmtrof_rods(page_html: str) -> list[dict]:
    rows = []
    seen: set[str] = set()
    for block in articles(page_html):
        name_m = re.search(r'class="rk-name">([^<]+)', block)
        name = html_lib.unescape(name_m.group(1)).strip() if name_m else ""
        if not name:
            continue
        key = norm_name(name)
        if not key or key in seen:
            continue
        seen.add(key)
        raw_type = attr(block, "type")
        category = map_cat(raw_type, ROD_CAT, "Спиннинговые")
        length = clean_num(attr(block, "length") or inner_val(block, "length"))
        test = inner_val(block, "test")
        blank = clean_num(attr(block, "strength") or inner_val(block, "strength"))
        price = clean_num(attr(block, "price"))
        rows.append({
            "name": name,
            "category": category,
            "length": length,
            "test": test,
            "blankKg": blank,
            "price": price,
            "notes": raw_type,
        })
    return rows


def parse_farmtrof_fish(page_html: str) -> list[dict]:
    m = re.search(r"const FISHES = (\[.*?\]);", page_html, re.S)
    if not m:
        raise RuntimeError("FISHES array not found on farmtrof fish page")
    data = json.loads(m.group(1))
    rows = []
    seen: set[str] = set()
    for item in data:
        name = str(item.get("fish_name") or "").strip()
        key = norm_name(name)
        if not name or key in seen:
            continue
        seen.add(key)
        rows.append({
            "name": name,
            "qualifyingKg": clean_num(item.get("zachet_weight")),
            "uniqueKg": clean_num(item.get("chat_weight")),
            "trophyKg": clean_num(item.get("trophy_weight")),
            "rareTrophyKg": clean_num(item.get("rare_trophy_weight")),
        })
    return rows


def merge_by_name(primary: list[dict], extra: list[dict]) -> list[dict]:
    index = {norm_name(str(row.get("name") or "")): i for i, row in enumerate(primary)}
    out = [dict(row) for row in primary]

    def fill_row(dst: dict, src: dict) -> None:
        for field, value in src.items():
            if value in (None, ""):
                continue
            if dst.get(field) in (None, ""):
                dst[field] = value

    for src in extra:
        key = norm_name(str(src.get("name") or ""))
        if not key:
            continue
        i = index.get(key)
        if i is None:
            variants = [idx for name, idx in index.items() if name.startswith(key + " ")]
            if variants:
                for idx in variants:
                    fill_row(out[idx], src)
                continue
            index[key] = len(out)
            out.append(dict(src))
            continue
        fill_row(out[i], src)
    return out


def main() -> None:
    h, rows = read_csv(CSV_SOURCES["alcohol"])
    dump("alcohol", map_alcohol(h, rows))
    h, rows = read_csv(CSV_SOURCES["levels"])
    dump("levels", map_levels(h, rows))
    h, rows = read_csv(CSV_SOURCES["shopPrices"])
    dump("shopPrices", map_shops(h, rows))

    reel_html = fetch_text(FARMTROF["reels"])
    rod_html = fetch_text(FARMTROF["rods"])
    fish_html = fetch_text(FARMTROF["fish"])
    farm_reels = parse_farmtrof_reels(reel_html)
    farm_rods = parse_farmtrof_rods(rod_html)
    print("farmtrof reels", len(farm_reels), "rods", len(farm_rods))

    potryasov_reels = collect(REEL_PAGES, "reel")
    potryasov_rods = collect(ROD_PAGES, "rod")
    dump("reels", merge_by_name(farm_reels, potryasov_reels))
    dump("rods", merge_by_name(farm_rods, potryasov_rods))

    fish_rows = parse_farmtrof_fish(fish_html)
    if FISH_JSON.exists():
        extra = []
        for item in json.loads(FISH_JSON.read_text(encoding="utf-8")):
            extra.append({
                "name": item["name"],
                "qualifyingKg": None,
                "uniqueKg": None,
                "trophyKg": None,
                "rareTrophyKg": None,
            })
        fish_rows = merge_by_name(fish_rows, extra)
    dump("fishWeights", fish_rows)


if __name__ == "__main__":
    main()
