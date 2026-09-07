import L from "leaflet";
import type { CatchType } from "@/types";

const iconCache = new Map<string, L.DivIcon>();

export function pin(active: boolean, catchType: CatchType) {
  const classes = `${catchType}${active ? " on" : ""}`;
  const cached = iconCache.get(classes);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span class="map-pin ${classes}"></span>`,
  });
  iconCache.set(classes, icon);
  return icon;
}
