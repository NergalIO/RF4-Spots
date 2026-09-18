import type { ActivityFeed } from "../notify/settings";
import type { Fish, Waterbody } from "../types";
import { loadWithEtag, normalizeOrigin, readEtagRecord } from "./etagCache";
import type { Http } from "./http";

const FISH_KEY = "rf4spots-fish";
const WATER_KEY = "rf4spots-waterbodies";

function isFishPayload(value: unknown): value is { fish: Fish[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { fish?: unknown }).fish));
}

function isWaterPayload(value: unknown): value is { waterbodies: Waterbody[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { waterbodies?: unknown }).waterbodies));
}

export function peekCachedFish(origin: string): Fish[] | null {
  return readEtagRecord(FISH_KEY, normalizeOrigin(origin), isFishPayload)?.data.fish ?? null;
}

export function peekCachedWaterbodies(origin: string): Waterbody[] | null {
  return readEtagRecord(WATER_KEY, normalizeOrigin(origin), isWaterPayload)?.data.waterbodies ?? null;
}

export function catalogApi(http: Http) {
  const origin = () => normalizeOrigin(http.baseUrl);
  return {
    async fish() {
      const cached = readEtagRecord(FISH_KEY, origin(), isFishPayload);
      return loadWithEtag({
        key: FISH_KEY,
        origin: origin(),
        etag: cached?.etag,
        cached: cached?.data,
        isData: isFishPayload,
        req: (etag) => http.reqEtag<{ fish: Fish[] }>("/fish", etag),
      });
    },
    async waterbodies() {
      const cached = readEtagRecord(WATER_KEY, origin(), isWaterPayload);
      return loadWithEtag({
        key: WATER_KEY,
        origin: origin(),
        etag: cached?.etag,
        cached: cached?.data,
        isData: isWaterPayload,
        req: (etag) => http.reqEtag<{ waterbodies: Waterbody[] }>("/waterbodies", etag),
      });
    },
    sync: () => http.req<{ rev: number }>("/sync"),
    activity: (since: string) => {
      const q = new URLSearchParams();
      if (since) q.set("since", since);
      return http.req<ActivityFeed>(`/activity?${q.toString()}`);
    },
  };
}
