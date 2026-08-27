import { prisma } from "./prisma.js";
import { extractCafeFishNames } from "./cafeParse.js";
import { cafeUrlForWaterbody } from "./cafeSlugs.js";

type CacheEntry = { at: number; names: string[] };

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export async function cafeOrdersForWaterbody(waterbodyId: string): Promise<{
  waterbodyId: string;
  url: string | null;
  names: string[];
}> {
  const url = cafeUrlForWaterbody(waterbodyId);
  if (!url) return { waterbodyId, url: null, names: [] };

  const hit = cache.get(waterbodyId);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { waterbodyId, url, names: hit.names };
  }

  const catalog = await prisma.fishSpecies.findMany({ select: { name: true } });
  const catalogNames = catalog.map((f) => f.name);

  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "RF4Spots/2.2 (cafe orders)" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) html = await res.text();
  } catch {
    html = "";
  }

  const names = html ? extractCafeFishNames(html, catalogNames) : (hit?.names ?? []);
  cache.set(waterbodyId, { at: Date.now(), names });
  return { waterbodyId, url, names };
}
