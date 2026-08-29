import type { GuideRow } from "@/types";
import {
  asNum,
  asText,
  parseNumericRange,
  usesRangeFilter,
  usesSearchFilter,
  type GuideField,
} from "@/guideSchema";

export const PICK_W = 44;
export const DEL_W = 40;
export const MIN_COL = 72;
export const SELECT_MAX = 48;

export type FilterValue = { text: string; from: string; to: string };

export function emptyFilter(): FilterValue {
  return { text: "", from: "", to: "" };
}

export function uniqueTexts(rows: GuideRow[], key: string) {
  const set = new Set<string>();
  for (const row of rows) {
    const value = asText(row[key]).trim();
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

export function filterActive(field: GuideField, value: FilterValue | undefined) {
  if (!value) return false;
  if (usesRangeFilter(field)) return Boolean(value.from.trim() || value.to.trim());
  return Boolean(value.text);
}

export function rowPasses(row: GuideRow, field: GuideField, value: FilterValue) {
  if (usesRangeFilter(field)) {
    const from = asNum(value.from);
    const to = asNum(value.to);
    if (from == null && to == null) return true;
    const range = parseNumericRange(row[field.key]);
    if (!range) return false;
    if (from != null && range.max < from) return false;
    if (to != null && range.min > to) return false;
    return true;
  }
  if (!value.text) return true;
  const query = value.text.trim().toLowerCase();
  if (usesSearchFilter(field)) {
    return asText(row[field.key]).toLowerCase().includes(query);
  }
  return asText(row[field.key]) === value.text;
}

export function cellText(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
}

export function defaultWidth(field: GuideField) {
  if (field.key === "name") return 220;
  if (field.key === "notes") return 160;
  if (field.key === "category") return 140;
  if (field.key === "size") return 80;
  if (
    field.key === "test" ||
    field.key === "testMod" ||
    field.key === "ratio" ||
    field.key === "ratioMod" ||
    field.key === "capacity"
  ) {
    return 110;
  }
  return field.type === "number" ? 96 : 130;
}

export function loadWidths(datasetKey: string, fields: GuideField[]): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const field of fields) defaults[field.key] = defaultWidth(field);
  try {
    const raw = localStorage.getItem(`rf4spots-guide-cols:${datasetKey}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const next = { ...defaults };
    for (const field of fields) {
      const n = Number(parsed[field.key]);
      if (Number.isFinite(n)) next[field.key] = Math.max(MIN_COL, Math.round(n));
    }
    return next;
  } catch {
    return defaults;
  }
}

export function sortIndexed(
  data: GuideRow[],
  fields: GuideField[],
  slots: string[],
  values: Record<string, FilterValue>,
  sortKey: string,
  sortDir: "asc" | "desc",
) {
  const list = data.map((row, index) => ({ row, index }));
  const filtered = list.filter(({ row }) => {
    for (const field of fields) {
      if (!slots.includes(field.key)) continue;
      const spec = values[field.key] ?? emptyFilter();
      if (!rowPasses(row, field, spec)) return false;
    }
    return true;
  });
  const dir = sortDir === "asc" ? 1 : -1;
  const sortField = fields.find((field) => field.key === sortKey);
  filtered.sort((a, b) => {
    const av = a.row[sortKey];
    const bv = b.row[sortKey];
    if (sortField && usesRangeFilter(sortField)) {
      const an = parseNumericRange(av)?.min;
      const bn = parseNumericRange(bv)?.min;
      if (an == null && bn == null) return 0;
      if (an == null) return 1;
      if (bn == null) return -1;
      return (an - bn) * dir;
    }
    const an = typeof av === "number" ? av : Number(av);
    const bn = typeof bv === "number" ? bv : Number(bv);
    if (Number.isFinite(an) && Number.isFinite(bn) && av !== "" && bv !== "") return (an - bn) * dir;
    return asText(av).localeCompare(asText(bv), "ru") * dir;
  });
  return filtered;
}
