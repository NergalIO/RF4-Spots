import type { StatKind, StatRow, StatsPayload } from "./types";

const BASE = "https://rf4-stat.ru";
const DELAY_MS = 650;
const TTL_MS = 20 * 60 * 1000;
const MAX_PAGES = 20;
const MAX_CACHE = 80;

type CacheEntry = { at: number; data: Omit<StatsPayload, "cached"> };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<StatsPayload>>();
let chain: Promise<unknown> = Promise.resolve();
let lastNet = 0;
let warmed = false;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

function parseIntLoose(text: string): number | null {
  const m = /(\d[\d\s\u00a0]*)/.exec(text || "");
  if (!m) return null;
  const digits = m[1].replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function parseWeightG(text: string): number | null {
  const m = /(\d[\d\s\u00a0]*)\s*г/i.exec(text || "");
  if (!m) return null;
  const digits = m[1].replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function labeledInt(text: string, label: string): number | null {
  const m = new RegExp(`${label}\\s*:?\\s*([\\d\\s\\u00a0]+)`, "i").exec(text);
  if (!m) return parseIntLoose(text);
  const digits = m[1].replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

export function parseRows(html: string, kind: StatKind): StatRow[] {
  const rows: StatRow[] = [];
  const rowRe = /<tr\s+class="load-row">(.*?)<\/tr>/gis;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(html))) {
    const block = rowMatch[1];
    const tds: string[] = [];
    const tdRe = /<td\b[^>]*>(.*?)<\/td>/gis;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRe.exec(block))) tds.push(tdMatch[1]);
    if (tds.length < 6) continue;
    const texts = tds.map(stripTags);
    const img = /<img[^>]+src="([^"]+)"/i.exec(tds[1] ?? "");
    const extra = texts[7] ?? "";
    const species = /Видов рыб\s*(\d+)/i.exec(extra);
    const slug = /href="fish\/([a-z0-9_]+)"/i.exec(block);
    rows.push({
      location: texts[0] ?? "",
      name: texts[2] ?? "",
      catch: labeledInt(texts[3] ?? "", "Улов"),
      posts: labeledInt(texts[4] ?? "", "Посты"),
      maxWeightG: parseWeightG(texts[5] ?? ""),
      avgWeightG: kind === "baits" ? parseWeightG(texts[6] ?? "") : null,
      fishSpecies: species ? Number(species[1]) : null,
      fishSlug: slug?.[1] ?? "",
      icon: img?.[1] ?? "",
    });
  }
  return rows;
}

function extractPeriod(html: string) {
  const m = /Период выборки:\s*<a[^>]*>([^<]+)<\/a>/i.exec(html || "");
  return m ? stripTags(m[1]) : "";
}

function buildUrl(path: string, days: number, location: string, bait: string, fish: string) {
  const q = new URLSearchParams({
    days: String(days),
    hours: "0",
    location: `!${location}`,
  });
  if (bait) q.set("bait", `!${bait}`);
  if (fish) q.set("fish", `!${fish}`);
  return `${BASE}${path}?${q.toString()}`;
}

async function http(url: string, body?: string, referer?: string) {
  const wait = DELAY_MS - (Date.now() - lastNet);
  if (wait > 0) await sleep(wait);
  const fetchPage = window.rf4?.statFetch;
  if (!fetchPage) {
    throw new Error("Статистика доступна в приложении RF4 Spots, не в браузере");
  }
  lastNet = Date.now();
  const res = await fetchPage({
    url,
    method: body ? "POST" : "GET",
    body,
    referer,
  });
  lastNet = Date.now();
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    throw new Error("RF4-STAT временно ограничил запросы, подождите минуту и обновите");
  }
  if (!res.ok) {
    throw new Error(res.error || `RF4-STAT ответил ${res.status}`);
  }
  return { url: res.url || url, html: res.html };
}

async function warmup() {
  try {
    await http(`${BASE}/`);
  } catch {
    /* cookies can still be set on the first table request */
  }
  warmed = true;
}

async function paginate(kind: StatKind, days: number, location: string, bait: string, fish: string) {
  if (!warmed) await warmup();
  const path = kind === "baits" ? "/baits/" : "/fish/";
  const start = buildUrl(path, days, location, bait, fish);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const first = await http(start);
      const rows = parseRows(first.html, kind);
      const period = extractPeriod(first.html);
      let page = 1;
      let html = first.html;
      let finalUrl = first.url;
      while (page < MAX_PAGES && parseRows(html, kind).length >= 100) {
        page += 1;
        const next = await http(finalUrl, `ajax=1&page=${page}`, finalUrl);
        const chunk = parseRows(next.html, kind);
        if (!chunk.length) break;
        rows.push(...chunk);
        html = next.html;
        if (chunk.length < 100) break;
      }
      return { rows, period, sourceUrl: start };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("не в браузере") || msg.includes("Некорректный")) throw err;
      warmed = false;
      await sleep(6000 * attempt);
      await warmup();
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Не удалось загрузить статистику RF4-STAT");
}

export async function loadRf4Stat(input: {
  kind: StatKind;
  waterbodyId: string;
  waterbody: string;
  days: number;
  bait?: string;
  fish?: string;
  refresh?: boolean;
}): Promise<StatsPayload> {
  const bait = (input.bait ?? "").trim();
  const fish = (input.fish ?? "").trim();
  const days = Math.min(30, Math.max(1, Math.round(input.days)));
  const key = [input.kind, input.waterbodyId, days, bait, fish].join("|");
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < TTL_MS && !(input.refresh && now - hit.at > 15_000)) {
    return { ...hit.data, cached: true };
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = enqueue(async () => {
    const { rows, period, sourceUrl } = await paginate(input.kind, days, input.waterbody, bait, fish);
    const data: Omit<StatsPayload, "cached"> = {
      source: BASE,
      sourceUrl,
      period,
      fetchedAt: new Date().toISOString(),
      kind: input.kind,
      waterbodyId: input.waterbodyId,
      waterbody: input.waterbody,
      days,
      bait,
      fish,
      rows,
    };
    cache.set(key, { at: Date.now(), data });
    if (cache.size > MAX_CACHE) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    return { ...data, cached: false };
  });
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
