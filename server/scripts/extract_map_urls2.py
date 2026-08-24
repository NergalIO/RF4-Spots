import os
import re
from pathlib import Path

html = Path(os.environ["TEMP"], "rf4-mosquito.html").read_text(encoding="utf-8", errors="replace")

# Find zero-block image elements with sizes
pattern = re.compile(
    r"data-elem-type=['\"]image['\"]([\s\S]{0,2500}?)(?:data-elem-type|</div>)",
    re.I,
)
print("image elems", len(pattern.findall(html)))

# img src with nearby width
for m in re.finditer(
    r"data-field-width-value=\"(\d+)\"[\s\S]{0,400}?data-field-height-value=\"(\d+)\"[\s\S]{0,800}?src=['\"]([^'\"]+)",
    html,
):
    w, h, src = m.group(1), m.group(2), m.group(3)
    if int(w) >= 400 or int(h) >= 400:
        print(f"{w}x{h} {src[:160]}")

print("--- zoom urls")
for u in set(re.findall(r"data-zoom-target=['\"]([^'\"]+)", html)):
    print(u)
for u in set(re.findall(r"data-img-zoom-url=['\"]([^'\"]+)", html)):
    print(u)
for u in set(re.findall(r"data-original-img=['\"]([^'\"]+)", html)):
    print(u)

print("--- context Карта")
idx = html.find("Карта расстояний")
print("idx", idx)
if idx >= 0:
    chunk = html[max(0, idx - 500) : idx + 2500]
    for u in re.findall(r"https://static\.tildacdn\.com/[^\"'\s>]+", chunk):
        print("near title", u)
    Path(os.environ["TEMP"], "rf4-chunk.html").write_text(chunk, encoding="utf-8")
