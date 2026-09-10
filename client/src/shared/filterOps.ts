import type { FilterOp } from "@/types";

export const OP_LABELS: Record<FilterOp, string> = {
  eq: "равно",
  neq: "не равно",
  gt: "больше",
  gte: "больше или равно",
  lt: "меньше",
  lte: "меньше или равно",
  between: "между",
  contains: "содержит",
  notContains: "не содержит",
};

export const TEXT_OPS: FilterOp[] = ["contains", "notContains", "eq", "neq"];
export const ENUM_OPS: FilterOp[] = ["eq", "neq"];
export const DATE_OPS: FilterOp[] = ["eq", "neq", "gt", "gte", "lt", "lte", "between"];
export const NUMBER_OPS: FilterOp[] = ["eq", "neq", "gt", "gte", "lt", "lte", "between"];
export const BOOL_OPS: FilterOp[] = ["eq", "neq"];

export function isFilterOp(value: unknown): value is FilterOp {
  return typeof value === "string" && value in OP_LABELS;
}

export function pickOp(value: unknown, allowed: FilterOp[], fallback: FilterOp): FilterOp {
  return isFilterOp(value) && allowed.includes(value) ? value : fallback;
}

export function dateOpUsesRange(op: FilterOp) {
  return op === "between";
}
