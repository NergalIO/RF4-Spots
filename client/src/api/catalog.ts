import type { ActivityFeed } from "../notify/settings";
import type { Fish, Waterbody } from "../types";
import type { Http } from "./http";

export function catalogApi(http: Http) {
  return {
    fish: () => http.req<{ fish: Fish[] }>("/fish"),
    waterbodies: () => http.req<{ waterbodies: Waterbody[] }>("/waterbodies"),
    sync: () => http.req<{ stamp: string }>("/sync"),
    activity: (since: string) => {
      const q = new URLSearchParams();
      if (since) q.set("since", since);
      return http.req<ActivityFeed>(`/activity?${q.toString()}`);
    },
  };
}
