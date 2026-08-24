import os
import re
from pathlib import Path

html = Path(os.environ["TEMP"], "rf4-mosquito.html").read_text(encoding="utf-8", errors="replace")

# Find tab rec for Карта расстояний
for m in re.finditer(r'data-tab-rec-ids="(\d+)"[\s\S]{0,400}?t1281__title-text">([^<]+)', html):
    print(m.group(1), m.group(2))

print("\n--- rec1800357001 images")
idx = html.find('id="rec1800357001"')
print("rec idx", idx)
chunk = html[idx: idx + 15000] if idx >= 0 else ""
for u in re.findall(r"data-original='([^']+)'", chunk):
    print("orig", u)
for u in re.findall(r"https://static\.tildacdn\.com/[^\"'\s>]+", chunk):
    print("static", u)
