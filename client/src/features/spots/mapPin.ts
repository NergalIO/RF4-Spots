import L from "leaflet";
import type { CatchType } from "@/types";

const iconCache = new Map<string, L.DivIcon>();

export function pin(active: boolean, catchType: CatchType, count = 1) {
  const badge = count > 99 ? "99+" : String(count);
  const classes = `${catchType}${active ? " on" : ""}`;
  const key = `${classes}:${badge}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const many = count > 1;
  const html = many
    ? `<span class="map-pin-wrap"><span class="map-pin ${classes}"></span><span class="map-pin-count">${badge}</span></span>`
    : `<span class="map-pin ${classes}"></span>`;
  const icon = L.divIcon({
    className: "",
    iconSize: many ? [26, 26] : [18, 18],
    iconAnchor: many ? [13, 13] : [9, 9],
    html,
  });
  iconCache.set(key, icon);
  return icon;
}
