import type { CatchType } from "../types";

export const CATCH_LABEL: Record<CatchType, string> = {
  farm: "Фарм",
  trophy: "Трофей",
  farm_trophy: "Фарм с трофеями",
};

export function fmtCoord(x: number, y: number) {
  const rx = Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1);
  const ry = Math.abs(y - Math.round(y)) < 0.05 ? String(Math.round(y)) : y.toFixed(1);
  return `${rx}:${ry}`;
}

export { fmtDateTime, fmtWhen } from "../time";
