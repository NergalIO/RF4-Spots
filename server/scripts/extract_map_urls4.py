import os
import re
from pathlib import Path

html = Path(os.environ["TEMP"], "rf4-mosquito.html").read_text(encoding="utf-8", errors="replace")

# dump around each filewidth 972
positions = [m.start() for m in re.finditer("data-field-filewidth-value=\"972\"", html)]
print("972 count", len(positions))
for i, pos in enumerate(positions):
    chunk = html[max(0, pos - 300) : pos + 2500]
    print(f"\n===== {i} pos {pos} =====")
    urls = re.findall(r"https://(?:static|thb)\.tildacdn\.com/[^\"'\s>]+", chunk)
    for u in urls:
        print("URL", u)
    srcs = re.findall(r"src=['\"]([^'\"]+)['\"]", chunk)
    for u in srcs:
        print("SRC", u[:200])
    # img atom
    if "tn-atom__img" in chunk:
        print("has tn-atom__img")
    if "t-bgimg" in chunk:
        print("has t-bgimg")
    # print a bit of the img tag
    img = re.search(r"<img[^>]{0,800}>", chunk)
    if img:
        print("IMG", img.group(0)[:400])

print("\n--- tabs / layers")
for s in ["Карта грунтов", "Карта расстояний", "Информация", "t-store", "t-slds", "t396__elem"]:
    print(s, html.count(s))
