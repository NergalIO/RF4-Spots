import type { GuideDataset, GuideRow } from "../types";
import type { Http } from "./http";

const GUIDE_CACHE = "rf4spots-guide:";

type CachedGuide = { updatedAt: string; etag: string | null; rows: GuideRow[] };

function cacheKey(key: string) {
  return `${GUIDE_CACHE}${key}`;
}

export function loadCachedGuide(key: string): CachedGuide | null {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedGuide>;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.updatedAt !== "string") return null;
    return { updatedAt: parsed.updatedAt, etag: parsed.etag ?? null, rows: parsed.rows };
  } catch {
    return null;
  }
}

export function saveCachedGuide(key: string, data: CachedGuide) {
  localStorage.setItem(cacheKey(key), JSON.stringify(data));
}

export function guidesApi(http: Http) {
  return {
    list: () => http.req<{ datasets: { key: string; updatedAt: string }[] }>("/guides"),
    async get(key: string) {
      const cached = loadCachedGuide(key);
      const result = await http.reqEtag<GuideDataset>(`/guides/${key}`, cached?.etag ?? undefined);
      if (result.notModified) {
        return { key, updatedAt: cached?.updatedAt ?? "", rows: cached?.rows ?? [] };
      }
      saveCachedGuide(key, { updatedAt: result.data.updatedAt, etag: result.etag, rows: result.data.rows });
      return result.data;
    },
    save: (key: string, rows: GuideRow[]) =>
      http.req<GuideDataset>(`/guides/${key}`, {
        method: "PUT",
        body: JSON.stringify({ rows }),
      }).then((saved) => {
        saveCachedGuide(key, { updatedAt: saved.updatedAt, etag: `"${saved.updatedAt || "empty"}"`, rows: saved.rows });
        return saved;
      }),
    addRow: (key: string, row: GuideRow) =>
      http.req<GuideDataset>(`/guides/${key}/row`, {
        method: "POST",
        body: JSON.stringify(row),
      }),
    updateRow: (key: string, index: number, row: GuideRow) =>
      http.req<GuideDataset>(`/guides/${key}/row/${index}`, {
        method: "PUT",
        body: JSON.stringify(row),
      }),
    deleteRow: (key: string, index: number) =>
      http.req<GuideDataset>(`/guides/${key}/row/${index}`, { method: "DELETE" }),
  };
}
