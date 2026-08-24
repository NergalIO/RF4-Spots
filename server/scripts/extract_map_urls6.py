import os
from pathlib import Path

html = Path(os.environ["TEMP"], "rf4-mosquito.html").read_text(encoding="utf-8", errors="replace")
start = html.find('id="rec1800357001"')
# next rec
nxt = html.find('id="rec', start + 10)
print("start", start, "next", nxt, "len", nxt - start)
chunk = html[start:nxt]
Path(os.environ["TEMP"], "rec-map.html").write_text(chunk, encoding="utf-8")
print(chunk[:2500])
