import { describe, expect, it } from "vitest";
import { emptyFilter, rowPasses } from "./guideTableLogic";
import type { GuideField } from "@/features/tools/guideSchema";

const num: GuideField = { key: "price", label: "Цена", type: "number" };
const name: GuideField = { key: "name", label: "Название", type: "string", filter: "search" };

describe("rowPasses", () => {
  it("applies numeric operators", () => {
    const row = { price: 10 };
    expect(rowPasses(row, num, { ...emptyFilter(num), op: "gt", from: "8" })).toBe(true);
    expect(rowPasses(row, num, { ...emptyFilter(num), op: "gt", from: "10" })).toBe(false);
    expect(rowPasses(row, num, { ...emptyFilter(num), op: "between", from: "5", to: "12" })).toBe(true);
  });

  it("applies text contains / not contains", () => {
    const row = { name: "Shimano" };
    expect(rowPasses(row, name, { ...emptyFilter(name), op: "contains", text: "ima" })).toBe(true);
    expect(rowPasses(row, name, { ...emptyFilter(name), op: "notContains", text: "ima" })).toBe(false);
    expect(rowPasses(row, name, { ...emptyFilter(name), op: "eq", text: "Shimano" })).toBe(true);
  });
});
