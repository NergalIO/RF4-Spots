const MAX_AGE_MS = 30 * 60 * 1000;
const EXCERPT_MAX = 80;

export function parseActivitySince(raw: unknown, now = Date.now()): Date {
  const parsed = typeof raw === "string" ? new Date(raw) : new Date(Number.NaN);
  const fallback = new Date(now - 30_000);
  const since = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  return new Date(Math.max(since.getTime(), now - MAX_AGE_MS));
}

export function commentExcerpt(text: string, max = EXCERPT_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
