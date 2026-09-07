import type { GuideRow } from "@/types";
import { asText } from "@/features/tools/guideSchema";
import { maxWearUntil, remainBase, remainLinear } from "@/features/tools/wear";

export type PickOpt = { index: number; name: string; category: string; search?: string };

export function options(rows: GuideRow[]): PickOpt[] {
  return rows
    .map((row, index) => ({ index, name: asText(row.name), category: asText(row.category) }))
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function hookLabel(row: GuideRow | undefined) {
  if (!row) return "";
  const name = asText(row.name);
  const size = asText(row.size);
  return [name, size].filter(Boolean).join(" ");
}

export function hookOptions(rows: GuideRow[]): PickOpt[] {
  return rows
    .map((row, index) => ({
      index,
      name: hookLabel(row),
      category: asText(row.category),
      search: `${asText(row.name)} ${asText(row.size)} ${asText(row.category)}`.toLowerCase(),
    }))
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function parseKg(text: string) {
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function minDefined(values: Array<number | null>) {
  const nums = values.filter((n): n is number => n != null);
  return nums.length ? Math.min(...nums) : null;
}

export type WearResultRow = { id: string; name: string; stock: number | null; left: number | null };

export function buildResultRows(input: {
  blankKg: number;
  gearKg: number;
  dragKg: number | null;
  hookKg: number | null;
  line: number | null;
  leader: number | null;
  rodWear: number;
  gearWear: number;
  dragWear: number;
  hookWear: number;
  lineWear: number;
  leaderWear: number;
}): WearResultRow[] {
  const blankLeft = input.blankKg ? remainBase(input.blankKg, input.rodWear) : null;
  const gearLeft = input.gearKg ? remainBase(input.gearKg, input.gearWear) : null;
  const dragLeft = input.dragKg != null ? remainLinear(input.dragKg, input.dragWear) : null;
  const hookLeft = input.hookKg != null && input.hookKg > 0 ? remainLinear(input.hookKg, input.hookWear) : null;
  const lineLeft = input.line != null ? remainLinear(input.line, input.lineWear) : null;
  const leaderLeft = input.leader != null ? remainLinear(input.leader, input.leaderWear) : null;
  return [
    { id: "blank", name: "Удилище", stock: input.blankKg || null, left: blankLeft },
    { id: "gear", name: "Механизм катушки", stock: input.gearKg || null, left: gearLeft },
    { id: "drag", name: "Фрикцион", stock: input.dragKg, left: dragLeft },
    { id: "hook", name: "Крючок", stock: input.hookKg, left: hookLeft },
    { id: "line", name: "Леска", stock: input.line, left: lineLeft },
    { id: "leader", name: "Поводок", stock: input.leader, left: leaderLeft },
  ];
}

export function computeWeakest(rows: WearResultRow[]) {
  const loadRows = rows.filter((row) => row.id !== "drag" && row.left != null);
  const weakest = loadRows.reduce<WearResultRow | null>(
    (best, row) => (!best || (row.left ?? Infinity) < (best.left ?? Infinity) ? row : best),
    null,
  );
  const others = loadRows.filter((row) => row.id !== "gear");
  const weakestOther = others.reduce<WearResultRow | null>(
    (best, row) => (!best || (row.left ?? Infinity) < (best.left ?? Infinity) ? row : best),
    null,
  );
  const gearLeft = rows.find((row) => row.id === "gear")?.left ?? null;
  const warn = Boolean(gearLeft && weakestOther?.left != null && weakestOther.left > gearLeft);
  const weakestExcept = (id: string) => minDefined(loadRows.filter((row) => row.id !== id).map((row) => row.left));
  return { loadRows, weakest, weakestOther, warn, weakestExcept };
}

export function safeWear(stockKg: number, targetKg: number | null) {
  return stockKg ? maxWearUntil(stockKg, targetKg ?? NaN) : null;
}
