import type { GuideRow } from "@/types";
import type { FilterOp } from "@/types";
import { NUMBER_OPS, TEXT_OPS, ENUM_OPS, pickOp } from "@/shared/filterOps";
import {
  asNum,
  asText,
  parseNumericRange,
  usesRangeFilter,
  usesSearchFilter,
  type GuideField,
} from "@/features/tools/guideSchema";

export const PICK_W = 44;
export const DEL_W = 40;
export const MIN_COL = 72;
export const SELECT_MAX = 48;

export type FilterValue = { op: FilterOp; text: string; from: string; to: string };

export function opsForGuide(field: GuideField): FilterOp[] {
  if (usesRangeFilter(field)) return NUMBER_OPS;
  if (usesSearchFilter(field)) return TEXT_OPS;
  return [...ENUM_OPS, "contains", "notContains"];
}

export function defaultGuideOp(field?: GuideField): FilterOp {
  if (!field) return "eq";
  if (usesRangeFilter(field)) return "between";
  if (usesSearchFilter(field)) return "contains";
  return "eq";
}

export function emptyFilter(field?: GuideField): FilterValue {
  return { op: defaultGuideOp(field), text: "", from: "", to: "" };
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
  if (usesRangeFilter(field)) {
    if (value.op === "between") return Boolean(value.from.trim() || value.to.trim());
    return Boolean(value.from.trim() || value.text.trim());
  }
  return Boolean(value.text);
}

function numberPasses(range: { min: number; max: number }, op: FilterOp, from: string, to: string, text: string) {
  if (op === "between") {
    const min = asNum(from);
    const max = asNum(to);
    if (min == null && max == null) return true;
    if (min != null && range.max < min) return false;
    if (max != null && range.min > max) return false;
    return true;
  }
  const n = asNum(from || text);
  if (n == null) return true;
  if (op === "eq") return range.min === n && range.max === n;
  if (op === "neq") return range.min !== n || range.max !== n;
  if (op === "gt") return range.min > n;
  if (op === "gte") return range.min >= n;
  if (op === "lt") return range.max < n;
  if (op === "lte") return range.max <= n;
  return true;
}

function textPasses(cell: string, op: FilterOp, query: string) {
  if (!query) return true;
  const value = cell.toLowerCase();
  const q = query.toLowerCase();
  if (op === "contains") return value.includes(q);
  if (op === "notContains") return !value.includes(q);
  if (op === "neq") return cell !== query && value !== q;
  return cell === query || value === q;
}

export function rowPasses(row: GuideRow, field: GuideField, value: FilterValue) {
  const op = pickOp(value.op, opsForGuide(field), defaultGuideOp(field));
  if (usesRangeFilter(field)) {
    if (!filterActive(field, value)) return true;
    const range = parseNumericRange(row[field.key]);
    if (!range) return false;
    return numberPasses(range, op, value.from, value.to, value.text);
  }
  return textPasses(asText(row[field.key]), op, value.text.trim());
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
