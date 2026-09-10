import { BOOL_OPS, DATE_OPS, ENUM_OPS, pickOp } from "./filterOps";
import { ALL_WATERBODIES } from "./constants";
import type { FilterOp, Filters } from "../types";

const WB_KEY = "rf4spots-waterbody";
const FILTER_KEY = "rf4spots-filters";
const SLOTS_KEY = "rf4spots-filter-slots";

const FILTER_KEYS = ["fish", "catchType", "catchDate", "uploadedDate", "mine", "favorite"] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export function emptyFilters(): Filters {
  return {
    fishId: "",
    fishOp: "eq",
    catchType: "",
    catchTypeOp: "eq",
    catchFrom: "",
    catchTo: "",
    catchDateOp: "between",
    uploadedFrom: "",
    uploadedTo: "",
    uploadedDateOp: "between",
    sort: "createdAt",
    sortDir: "desc",
    mine: null,
    mineOp: "eq",
    favorite: null,
    favoriteOp: "eq",
    q: "",
    qOp: "contains",
  };
}

export function loadWaterbodyId(): string {
  try {
    return localStorage.getItem(WB_KEY) || ALL_WATERBODIES;
  } catch {
    return ALL_WATERBODIES;
  }
}

export function saveWaterbodyId(id: string) {
  try {
    localStorage.setItem(WB_KEY, id);
  } catch {
    /* ignore */
  }
}

function readTriBool(value: unknown, enabled: boolean): boolean | null {
  if (value === true || value === "1") return true;
  if (value === false || value === "0") return enabled ? false : null;
  return null;
}

export function parseFilters(raw: unknown, slots: FilterKey[] = []): Filters {
  const base = emptyFilters();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Partial<Filters> & { mineOp?: FilterOp; favoriteOp?: FilterOp };
  const hasMineOp = parsed.mineOp != null;
  const hasFavOp = parsed.favoriteOp != null;
  return {
    ...base,
    ...parsed,
    fishId: typeof parsed.fishId === "string" ? parsed.fishId : "",
    fishOp: pickOp(parsed.fishOp, ENUM_OPS, "eq"),
    catchType: parsed.catchType === "farm" || parsed.catchType === "trophy" || parsed.catchType === "farm_trophy" ? parsed.catchType : "",
    catchTypeOp: pickOp(parsed.catchTypeOp, ENUM_OPS, "eq"),
    catchFrom: typeof parsed.catchFrom === "string" ? parsed.catchFrom : "",
    catchTo: typeof parsed.catchTo === "string" ? parsed.catchTo : "",
    catchDateOp: pickOp(parsed.catchDateOp, DATE_OPS, "between"),
    uploadedFrom: typeof parsed.uploadedFrom === "string" ? parsed.uploadedFrom : "",
    uploadedTo: typeof parsed.uploadedTo === "string" ? parsed.uploadedTo : "",
    uploadedDateOp: pickOp(parsed.uploadedDateOp, DATE_OPS, "between"),
    sort: parsed.sort === "catchDate" ? "catchDate" : "createdAt",
    sortDir: parsed.sortDir === "asc" ? "asc" : "desc",
    mine: readTriBool(parsed.mine, hasMineOp || slots.includes("mine")),
    mineOp: pickOp(parsed.mineOp, BOOL_OPS, "eq"),
    favorite: readTriBool(parsed.favorite, hasFavOp || slots.includes("favorite")),
    favoriteOp: pickOp(parsed.favoriteOp, BOOL_OPS, "eq"),
    q: "",
    qOp: "contains",
  };
}

export function loadFilters(): Filters {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return emptyFilters();
    return parseFilters(JSON.parse(raw) as unknown, loadFilterSlots());
  } catch {
    return emptyFilters();
  }
}

export function saveFilters(filters: Filters) {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export function isFilterKey(id: unknown): id is FilterKey {
  return typeof id === "string" && (FILTER_KEYS as readonly string[]).includes(id);
}

export function loadFilterSlots(): FilterKey[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFilterKey);
  } catch {
    return [];
  }
}

export function saveFilterSlots(slots: FilterKey[]) {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}
