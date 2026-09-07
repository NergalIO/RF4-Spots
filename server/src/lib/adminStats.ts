import { computeAdminStats, ONLINE_WINDOW_MS } from "./adminStats/compute.js";

const STATS_TTL_MS = 15_000;
let statsCache: { at: number; value: Awaited<ReturnType<typeof computeAdminStats>> } | null = null;

export async function collectAdminStats() {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache.value;
  const value = await computeAdminStats();
  statsCache = { at: Date.now(), value };
  return value;
}

export function clearAdminStatsCache() {
  statsCache = null;
}

export { ONLINE_WINDOW_MS };
