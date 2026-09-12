import { BOOL_OPS, DATE_OPS, ENUM_OPS, pickOp } from "@/shared/filterOps";
import type { FilterKey } from "@/shared/persist";
import type { FilterOp, Filters } from "@/types";

export const FILTER_OPTIONS: { id: FilterKey; label: string }[] = [
  { id: "fish", label: "Вид рыбы" },
  { id: "catchType", label: "Тип поимки" },
  { id: "catchDate", label: "Дата поимки" },
  { id: "uploadedDate", label: "Дата загрузки" },
  { id: "mine", label: "Только мои" },
  { id: "favorite", label: "Избранное" },
  { id: "bot", label: "Бот" },
];

export const SORT_FIELDS: { id: Filters["sort"]; label: string }[] = [
  { id: "createdAt", label: "Дата загрузки" },
  { id: "catchDate", label: "Дата поимки" },
];

const OPS: Record<FilterKey, FilterOp[]> = {
  fish: ENUM_OPS,
  catchType: ENUM_OPS,
  catchDate: DATE_OPS,
  uploadedDate: DATE_OPS,
  mine: BOOL_OPS,
  favorite: BOOL_OPS,
  bot: BOOL_OPS,
};

const DEFAULT_OP: Record<FilterKey, FilterOp> = {
  fish: "eq",
  catchType: "eq",
  catchDate: "between",
  uploadedDate: "between",
  mine: "eq",
  favorite: "eq",
  bot: "eq",
};

export function opsFor(field: FilterKey): FilterOp[] {
  return OPS[field];
}

export function defaultOp(field: FilterKey): FilterOp {
  return DEFAULT_OP[field];
}

export function defaultsFor(field: FilterKey): Partial<Filters> {
  const op = defaultOp(field);
  if (field === "fish") return { fishId: "", fishOp: op };
  if (field === "catchType") return { catchType: "", catchTypeOp: op };
  if (field === "catchDate") return { catchFrom: "", catchTo: "", catchDateOp: op };
  if (field === "uploadedDate") return { uploadedFrom: "", uploadedTo: "", uploadedDateOp: op };
  if (field === "mine") return { mine: true, mineOp: op };
  if (field === "favorite") return { favorite: true, favoriteOp: op };
  return { bot: true, botOp: op };
}

export function clearField(field: FilterKey): Partial<Filters> {
  if (field === "fish") return { fishId: "" };
  if (field === "catchType") return { catchType: "" };
  if (field === "catchDate") return { catchFrom: "", catchTo: "" };
  if (field === "uploadedDate") return { uploadedFrom: "", uploadedTo: "" };
  if (field === "mine") return { mine: null };
  if (field === "favorite") return { favorite: null };
  return { bot: null };
}

export function opOf(filters: Filters, field: FilterKey): FilterOp {
  if (field === "fish") return pickOp(filters.fishOp, ENUM_OPS, "eq");
  if (field === "catchType") return pickOp(filters.catchTypeOp, ENUM_OPS, "eq");
  if (field === "catchDate") return pickOp(filters.catchDateOp, DATE_OPS, "between");
  if (field === "uploadedDate") return pickOp(filters.uploadedDateOp, DATE_OPS, "between");
  if (field === "mine") return pickOp(filters.mineOp, BOOL_OPS, "eq");
  if (field === "favorite") return pickOp(filters.favoriteOp, BOOL_OPS, "eq");
  return pickOp(filters.botOp, BOOL_OPS, "eq");
}

export function setOp(field: FilterKey, op: FilterOp): Partial<Filters> {
  if (field === "fish") return { fishOp: op };
  if (field === "catchType") return { catchTypeOp: op };
  if (field === "catchDate") {
    return op === "between" ? { catchDateOp: op } : { catchDateOp: op, catchTo: "" };
  }
  if (field === "uploadedDate") {
    return op === "between" ? { uploadedDateOp: op } : { uploadedDateOp: op, uploadedTo: "" };
  }
  if (field === "mine") return { mineOp: op };
  if (field === "favorite") return { favoriteOp: op };
  return { botOp: op };
}

export function fieldActive(filters: Filters, field: FilterKey) {
  if (field === "fish") return Boolean(filters.fishId);
  if (field === "catchType") return Boolean(filters.catchType);
  if (field === "catchDate") return Boolean(filters.catchFrom || filters.catchTo);
  if (field === "uploadedDate") return Boolean(filters.uploadedFrom || filters.uploadedTo);
  if (field === "mine") return filters.mine != null;
  if (field === "favorite") return filters.favorite != null;
  return filters.bot != null;
}

export function nextPostSort(
  current: Filters["sort"],
  currentDir: Filters["sortDir"],
  field: Filters["sort"],
): Pick<Filters, "sort" | "sortDir"> {
  if (current === field) {
    return { sort: field, sortDir: currentDir === "desc" ? "asc" : "desc" };
  }
  return { sort: field, sortDir: "desc" };
}

export function countActiveFilters(filters: Filters, slots: FilterKey[]) {
  return slots.filter((id) => fieldActive(filters, id)).length;
}

export function filtersToQuery(filters: Filters): Record<string, string> {
  const q: Record<string, string> = {
    fishId: filters.fishId,
    fishOp: filters.fishId ? opOf(filters, "fish") : "",
    catchType: filters.catchType,
    catchTypeOp: filters.catchType ? opOf(filters, "catchType") : "",
    catchFrom: filters.catchFrom,
    catchTo: filters.catchTo,
    catchDateOp: filters.catchFrom || filters.catchTo ? opOf(filters, "catchDate") : "",
    uploadedFrom: filters.uploadedFrom,
    uploadedTo: filters.uploadedTo,
    uploadedDateOp: filters.uploadedFrom || filters.uploadedTo ? opOf(filters, "uploadedDate") : "",
    sort: filters.sort,
    sortDir: filters.sortDir,
    mine: filters.mine == null ? "" : filters.mine ? "1" : "0",
    mineOp: filters.mine == null ? "" : opOf(filters, "mine"),
    favorite: filters.favorite == null ? "" : filters.favorite ? "1" : "0",
    favoriteOp: filters.favorite == null ? "" : opOf(filters, "favorite"),
    bot: filters.bot == null ? "" : filters.bot ? "1" : "0",
    botOp: filters.bot == null ? "" : opOf(filters, "bot"),
  };
  return q;
}
