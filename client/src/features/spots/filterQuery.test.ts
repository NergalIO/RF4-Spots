import { describe, expect, it } from "vitest";
import { emptyFilters } from "@/shared/persist";
import { countActiveFilters, filtersToQuery, opOf } from "./filterQuery";

describe("filtersToQuery", () => {
  it("omits inactive mine/favorite and sends operators for filled fields", () => {
    const q = filtersToQuery({
      ...emptyFilters(),
      q: "щука",
      qOp: "notContains",
      fishId: "f1",
      fishOp: "neq",
      mine: false,
      mineOp: "eq",
    });
    expect(q.q).toBe("щука");
    expect(q.qOp).toBe("notContains");
    expect(q.fishId).toBe("f1");
    expect(q.fishOp).toBe("neq");
    expect(q.mine).toBe("0");
    expect(q.favorite).toBe("");
  });
});

describe("countActiveFilters", () => {
  it("counts only visible slots with a value", () => {
    const filters = { ...emptyFilters(), q: "x", fishId: "f1" };
    expect(countActiveFilters(filters, ["search"])).toBe(1);
    expect(countActiveFilters(filters, ["search", "fish"])).toBe(2);
    expect(countActiveFilters(filters, ["catchDate"])).toBe(0);
  });
});

describe("opOf", () => {
  it("falls back to the field default", () => {
    expect(opOf(emptyFilters(), "search")).toBe("contains");
    expect(opOf(emptyFilters(), "catchDate")).toBe("between");
  });
});
