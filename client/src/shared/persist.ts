import { ALL_WATERBODIES } from "./constants";
import type { Filters } from "./types";

const WB_KEY = "rf4spots-waterbody";
const FILTER_KEY = "rf4spots-filters";
const SLOTS_KEY = "rf4spots-filter-slots";

export function emptyFilters(): Filters {
  return {
    fishId: "",
    catchType: "",
    catchFrom: "",
    catchTo: "",
    uploadedFrom: "",
    uploadedTo: "",
    sort: "createdAt",
    mine: false,
    favorite: false,
    q: "",
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

export function loadFilters(): Filters {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return emptyFilters();
    const parsed = JSON.parse(raw) as Partial<Filters>;
    return { ...emptyFilters(), ...parsed, sort: parsed.sort === "catchDate" ? "catchDate" : "createdAt" };
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

export type FilterKey =
  | "fish"
  | "catchType"
  | "catchDate"
  | "uploadedDate"
  | "sort"
  | "mine"
  | "favorite"
  | "search";

export function loadFilterSlots(): FilterKey[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is FilterKey => typeof id === "string");
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
