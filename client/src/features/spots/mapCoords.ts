import type { Waterbody } from "@/types";

export type LatLngLike = { lat: number; lng: number };

export function pixelToGame(wb: Waterbody, latlng: LatLngLike) {
  const px = latlng.lng;
  const pyFromTop = wb.imageHeight - latlng.lat;
  const innerW = wb.imageWidth - wb.padLeft - wb.padRight;
  const innerH = wb.imageHeight - wb.padTop - wb.padBottom;
  const relX = (px - wb.padLeft) / innerW;
  const relY = (pyFromTop - wb.padTop) / innerH;
  const x = wb.xMin + relX * (wb.xMax - wb.xMin);
  const y = wb.yFlipped ? wb.yMax - relY * (wb.yMax - wb.yMin) : wb.yMin + relY * (wb.yMax - wb.yMin);
  return { x, y };
}

export function gameToLatLng(wb: Waterbody, x: number, y: number): LatLngLike {
  const innerW = wb.imageWidth - wb.padLeft - wb.padRight;
  const innerH = wb.imageHeight - wb.padTop - wb.padBottom;
  const relX = (x - wb.xMin) / (wb.xMax - wb.xMin);
  const relY = wb.yFlipped ? (wb.yMax - y) / (wb.yMax - wb.yMin) : (y - wb.yMin) / (wb.yMax - wb.yMin);
  const px = wb.padLeft + relX * innerW;
  const pyFromTop = wb.padTop + relY * innerH;
  return { lat: wb.imageHeight - pyFromTop, lng: px };
}
