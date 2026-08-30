import type { CatchType } from "../types";

export const CATCH_LABEL: Record<CatchType, string> = {
  farm: "Фарм",
  trophy: "Трофей",
  farm_trophy: "Фарм с трофеями",
};

export function roundCoord(n: number) {
  return Math.round(n * 10) / 10;
}

export function fmtCoord(x: number, y: number) {
  return `${roundCoord(x)}:${roundCoord(y)}`;
}

export { fmtDateTime, fmtWhen } from "../time";
