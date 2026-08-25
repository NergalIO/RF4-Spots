"""Download public RF4 tables into prisma/seeds/guides/*.json.

Sources:
- Potryasov Google Sheets (alcohol, levels, shop prices, reel catalogs with Мод)
- Potryasov wear-calculator pages (gearKg / blankKg fallback)
- FarmTrof open catalogs (reels, rods, hooks, fish weights)
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
    "hooks": "https://rr4farmtrof.com/pages/knowledge-base/hook-strength.php",
    "fish": "https://rr4farmtrof.com/pages/knowledge-base/fish-weight.php",
}

REEL_PAGES = [
    ("http://potryasovgame.ru/page114271846.html", "Безынерционные"),
    ("http://potryasovgame.ru/page119038106.html", "Силовые"),
    ("http://potryasovgame.ru/page119039366.html", "Байткастинговые"),
    ("http://potryasovgame.ru/page119040226.html", "Низкопрофильные"),
]

# Interactive tables (Google Sheets) with a Мод column after each upgradeable spec.
REEL_TABLE_PAGES = [
    ("http://potryasovgame.ru/page110667406.html", "Безынерционные"),
    ("http://potryasovgame.ru/page113477996.html", "Силовые"),
    ("http://potryasovgame.ru/page113477646.html", "Байткастинговые"),
    ("http://potryasovgame.ru/page113478266.html", "Низкопрофильные"),
]

REEL_SHEET_BASE = {
    "название": "name",
    "тест": "test",
    "передаточное число": "ratio",
    "фрикцион": "dragKg",
    "шестерня": "gearKg",
    "скорость": "_speed",
}

REEL_SHEET_STRINGS = {"name", "test", "testMod", "ratio", "ratioMod"}
REEL_SHEET_NUMBERS = {"dragKg", "dragKgMod", "gearKg", "gearKgMod"}

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

ROD_TYPE = {
    "маховое": "Маховое",
    "болонское": "Болонское",
    "матчевое": "Матчевое",
    "фидер": "Фидерное",
    "фидерное": "Фидерное",
    "пикер": "Пикерное",
    "пикерное": "Пикерное",
    "карповое": "Карповое",
    "сподовое": "Сподовое",
    "маркерное": "Маркерное",
    "спиннинг": "Спиннинговое",
    "спиннинговое": "Спиннинговое",
    "кастинговое": "Кастинговое",
    "джерк": "Джерковое",
    "джерковое": "Джерковое",
    "морское донное": "Морское донное",
    "пилкер": "Пилкерное",
    "пилкерное": "Пилкерное",
    "нахлыстовое": "Нахлыстовое",
}

ROD_GROUP = {
    "поплавочные": "Поплавочные",
    "фидерные": "Фидерное",
    "спиннинговые": "Спиннинговое",
    "кастинговые": "Кастинговое",
    "морские": "Морские",
    "морское": "Морские",
    "нахлыстовые": "Нахлыстовое",
}

ROD_PREFIXES = (
    "морское донное",
    "пилкерное",
    "пилкер",
    "джерковое",
    "джерк",
    "маховое",
    "болонское",
    "матчевое",
    "фидерное",
    "пикерное",
    "карповое",
    "спиннинговое",
    "кастинговое",
    "нахлыстовое",
    "сподовое",
    "маркерное",
    "морское",
)

PREFIX_RE = re.compile(
    r"^(" + "|".join(ROD_PREFIXES) + r")\s*[-–:]\s*",
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


def empty_reel(name: str = "", category: str = "") -> dict:
    return {
        "name": name,
        "category": category,
        "retrieve": None,
        "test": "",
        "testMod": "",
        "ratio": "",
        "ratioMod": "",
        "gearKg": None,
        "gearKgMod": None,
        "dragKg": None,
        "dragKgMod": None,
        "weight": None,
        "capacity": "",
        "price": None,
        "notes": "",
    }


def is_blank_spec(value: str) -> bool:
    text = (value or "").strip().replace("\xa0", " ")
    return text.lower() in {"", "-", "—", "–", ".", "?", "нет", "нет данных"}


def clean_text_spec(value: str) -> str:
    text = html_lib.unescape(value or "").replace("\xa0", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return "" if is_blank_spec(text) else text


def clean_test(value: str) -> str:
    text = clean_text_spec(value)
    text = re.sub(r"\s*г\.?$", "", text, flags=re.I).strip()
    return "" if is_blank_spec(text) else text


def find_sheet_csv(page_html: str) -> str | None:
    for m in re.finditer(
        r"https://docs\.google\.com/spreadsheets/d/e/[A-Za-z0-9_-]+/pub\?[^\s\"'<>]+",
        page_html,
    ):
        url = html_lib.unescape(m.group(0).replace("\\/", "/"))
        url = url.split('"')[0].split("'")[0].rstrip("\\")
        if "output=csv" in url:
            return url
    return None


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
            row = empty_reel(name, category)
            row["gearKg"] = kg
            rows.append(row)
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


def parse_reel_mod_sheet(header: list[str], rows: list[list[str]], category: str) -> list[dict]:
    """Pair each «Мод» column with the previous spec (тест, передатка, фрикцион, шестерня)."""
    fields: list[str | None] = []
    last: str | None = None
    for raw in header:
        title = re.sub(r"\s+", " ", raw.strip().lower())
        if title in {"мод", "моды"}:
            fields.append(f"{last}Mod" if last else None)
            continue
        last = REEL_SHEET_BASE.get(title)
        fields.append(last)

    out: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        item = empty_reel("", category)
        for i, field in enumerate(fields):
            if not field or field.startswith("_"):
                continue
            raw = row[i].strip() if i < len(row) else ""
            if field == "name":
                item["name"] = html_lib.unescape(raw).strip()
                continue
            if field == "test" or field == "testMod":
                value = clean_test(raw)
            elif field in REEL_SHEET_STRINGS:
                value = clean_text_spec(raw)
            elif field in REEL_SHEET_NUMBERS:
                value = None if is_blank_spec(raw) else clean_num(raw)
            else:
                continue
            if value in (None, ""):
                continue
            item[field] = value
        name = str(item.get("name") or "")
        key = norm_name(name)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def collect_reel_catalogs() -> list[dict]:
    all_rows: list[dict] = []
    for url, category in REEL_TABLE_PAGES:
        try:
            page_html = fetch_text(url, referer="http://potryasovgame.ru/")
        except Exception as exc:
            print("fail catalog", category, exc)
            continue
        csv_url = find_sheet_csv(page_html)
        if not csv_url:
            print("no sheet", category)
            continue
        header, rows = read_csv(csv_url)
        parsed = parse_reel_mod_sheet(header, rows, category)
        print("reel catalog", category, len(parsed))
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


def fold_key(value: str) -> str:
    text = html_lib.unescape(value or "").replace("\xa0", " ").strip().lower().replace("ё", "е")
    return re.sub(r"\s+", " ", text)


def rod_type_label(raw: str) -> str:
    key = fold_key(raw)
    return ROD_TYPE.get(key) or ROD_GROUP.get(key) or ""


def split_rod_prefix(name: str) -> tuple[str, str]:
    text = html_lib.unescape(name or "").replace("\xa0", " ").strip()
    m = PREFIX_RE.match(text)
    if not m:
        return text, ""
    rest = text[m.end() :].strip()
    return (rest or text), m.group(1)


def polish_rods(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        item = dict(row)
        name, prefix = split_rod_prefix(str(item.get("name") or ""))
        item["name"] = name
        category = (
            rod_type_label(prefix)
            or rod_type_label(str(item.get("notes") or ""))
            or rod_type_label(str(item.get("category") or ""))
            or str(item.get("category") or "").strip()
        )
        if category:
            item["category"] = category
        note = str(item.get("notes") or "").strip()
        if not note or rod_type_label(note) == item.get("category"):
            item["notes"] = ""
        else:
            item["notes"] = note
        out.append(item)
    index: dict[str, int] = {}
    unique: list[dict] = []
    for src in out:
        key = norm_name(str(src.get("name") or ""))
        if not key:
            continue
        i = index.get(key)
        if i is None:
            index[key] = len(unique)
            unique.append(src)
            continue
        fill_empty_fields(unique[i], src)
    return unique


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
        row = empty_reel(name, category)
        row["retrieve"] = retrieve
        row["test"] = clean_test(inner_val(block, "test"))
        row["ratio"] = ratio
        row["gearKg"] = gear
        row["dragKg"] = drag
        row["capacity"] = size
        row["price"] = price
        row["notes"] = "; ".join(dict.fromkeys(notes))
        rows.append(row)
    return rows


def parse_farmtrof_rods(page_html: str) -> list[dict]:
    rows = []
    seen: set[str] = set()
    for block in articles(page_html):
        name_m = re.search(r'class="rk-name">([^<]+)', block)
        name = html_lib.unescape(name_m.group(1)).strip() if name_m else ""
        if not name:
            continue
        name, prefix = split_rod_prefix(name)
        key = norm_name(name)
        if not key or key in seen:
            continue
        seen.add(key)
        raw_type = attr(block, "type")
        category = rod_type_label(prefix) or rod_type_label(raw_type) or "Спиннинговое"
        length = clean_num(attr(block, "length") or inner_val(block, "length"))
        test = inner_val(block, "test")
        blank = clean_num(attr(block, "strength") or inner_val(block, "strength"))
        price = clean_num(attr(block, "price"))
        note = "" if rod_type_label(raw_type) in {category, ""} else raw_type
        rows.append({
            "name": name,
            "category": category,
            "length": length,
            "test": test,
            "blankKg": blank,
            "price": price,
            "notes": note,
        })
    return rows


def parse_js_const_array(page_html: str, name: str) -> list:
    marker = f"const {name} = "
    start = page_html.find(marker)
    if start < 0:
        raise RuntimeError(f"{name} array not found")
    data, _end = json.JSONDecoder().raw_decode(page_html[start + len(marker):])
    if not isinstance(data, list):
        raise RuntimeError(f"{name} is not an array")
    return data


def hook_note(raw_value: object) -> str:
    text = str(raw_value or "").replace("\xa0", " ").strip()
    if any(ch in text for ch in "+~≈"):
        return text
    return ""


def parse_farmtrof_hooks(page_html: str) -> list[dict]:
    rows = []
    for item in parse_js_const_array(page_html, "HOOKS"):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        category = str(item.get("type") or "").strip()
        sizes = item.get("sizes") if isinstance(item.get("sizes"), dict) else {}
        raw = item.get("raw") if isinstance(item.get("raw"), dict) else {}
        keys = list(sizes.keys())
        for key in raw:
            if key not in sizes:
                keys.append(key)
        if not name or not keys:
            continue
        for size_key in keys:
            size = str(size_key).strip()
            if not size:
                continue
            kg = sizes.get(size_key, raw.get(size_key))
            rows.append({
                "name": name,
                "category": category,
                "size": size,
                "strengthKg": clean_num(kg),
                "notes": hook_note(raw.get(size_key, "")),
            })
    return rows


def parse_farmtrof_fish(page_html: str) -> list[dict]:
    data = parse_js_const_array(page_html, "FISHES")
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


def fill_empty_fields(dst: dict, src: dict) -> None:
    for field, value in src.items():
        if value in (None, ""):
            continue
        if dst.get(field) in (None, ""):
            dst[field] = value


def merge_by_name(primary: list[dict], extra: list[dict]) -> list[dict]:
    index = {norm_name(str(row.get("name") or "")): i for i, row in enumerate(primary)}
    out = [dict(row) for row in primary]

    for src in extra:
        key = norm_name(str(src.get("name") or ""))
        if not key:
            continue
        i = index.get(key)
        if i is None:
            variants = [idx for name, idx in index.items() if name.startswith(key + " ")]
            if variants:
                for idx in variants:
                    fill_empty_fields(out[idx], src)
                continue
            index[key] = len(out)
            out.append(dict(src))
            continue
        fill_empty_fields(out[i], src)
    return out


def apply_to_prefixed_names(rows: list[dict], extra: list[dict]) -> list[dict]:
    """Copy specs onto longer names (7-Years, colourways) when the short catalog name exists."""
    out = [dict(row) for row in rows]
    index = [(norm_name(str(row.get("name") or "")), i) for i, row in enumerate(out)]
    for src in extra:
        key = norm_name(str(src.get("name") or ""))
        if not key:
            continue
        for name, i in index:
            if name.startswith(key + " "):
                fill_empty_fields(out[i], src)
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
    hook_html = fetch_text(FARMTROF["hooks"])
    fish_html = fetch_text(FARMTROF["fish"])
    farm_reels = parse_farmtrof_reels(reel_html)
    farm_rods = parse_farmtrof_rods(rod_html)
    farm_hooks = parse_farmtrof_hooks(hook_html)
    print("farmtrof reels", len(farm_reels), "rods", len(farm_rods), "hooks", len(farm_hooks))
    dump("hooks", farm_hooks)

    potryasov_reels = collect(REEL_PAGES, "reel")
    potryasov_rods = collect(ROD_PAGES, "rod")
    reel_catalog = collect_reel_catalogs()
    reels = merge_by_name(merge_by_name(farm_reels, potryasov_reels), reel_catalog)
    dump("reels", apply_to_prefixed_names(reels, reel_catalog))
    dump("rods", polish_rods(merge_by_name(farm_rods, potryasov_rods)))

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
