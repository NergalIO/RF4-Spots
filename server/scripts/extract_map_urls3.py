import os
import re
from pathlib import Path

html = Path(os.environ["TEMP"], "rf4-mosquito.html").read_text(encoding="utf-8", errors="replace")
idx = html.find("Карта расстояний")
print("idx", idx)
chunk = html[max(0, idx - 2000) : idx + 8000]
Path(os.environ["TEMP"], "rf4-chunk.html").write_text(chunk, encoding="utf-8")
print("chunk len", len(chunk))
print("static urls in chunk:")
for u in re.findall(r"https://static\.tildacdn\.com/[^\"'\s>]+", chunk):
    print(u)
print("bgimg", "t-bgimg" in chunk, "tn-atom" in chunk)
print("data-original in chunk", re.findall(r"data-original=\"([^\"]+)\"", chunk)[:10])
print("src in chunk")
for u in re.findall(r"src=['\"]([^'\"]+)['\"]", chunk):
    if "tilda" in u or u.endswith((".jpg", ".png", ".webp")):
        print(u[:180])

# all t-bgimg originals on page
print("--- all t-bgimg")
for m in re.finditer(r't-bgimg[^>]+data-original="([^"]+)"', html):
    print(m.group(1))
print("--- filewidth")
for m in re.finditer(r'data-field-filewidth-value="(\d+)"[\s\S]{0,400}data-field-fileheight-value="(\d+)"', html):
    print(m.group(1), m.group(2), html[m.start():m.start()+200].replace("\n"," ")[:120])
