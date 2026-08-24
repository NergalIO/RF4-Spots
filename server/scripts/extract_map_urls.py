import os
import re
from pathlib import Path

html = Path(os.environ["TEMP"], "rf4-mosquito.html").read_text(encoding="utf-8", errors="replace")
urls = set(re.findall(r"https://(?:static|thb)\.tildacdn\.com/[^\"'\s>]+", html))
print("count", len(urls))
for u in sorted(urls):
    low = u.lower()
    if any(x in low for x in (".png", ".jpg", ".jpeg", ".webp")):
        print(u)
print("--- data-original")
for u in sorted(set(re.findall(r'data-original="([^"]+)"', html))):
    print(u)
print("--- imgfield")
for u in sorted(set(re.findall(r'data-field-img-[^=]*value="([^"]+)"', html))):
    print(u)
print("--- filewidth images in t396")
# tilda zero block image elems
for m in re.finditer(r"data-elem-type='image'[\s\S]{0,800}?src='([^']+)'", html):
    print(m.group(1)[:200])
