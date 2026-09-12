import { describe, expect, it } from "vitest";
import { emptyFilters, parseFilters } from "@/shared/persist";
import { countActiveFilters, filtersToQuery, nextPostSort, opOf } from "./filterQuery";

describe("filtersToQuery", () => {
  it("omits inactive mine/favorite and sends operators for filled fields", () => {
    const q = filtersToQuery({
      ...emptyFilters(),
      fishId: "f1",
      fishOp: "neq",
      mine: false,
      mineOp: "eq",
      sort: "catchDate",
      sortDir: "asc",
    });
    expect(q.q).toBeUndefined();
    expect(q.fishId).toBe("f1");
    expect(q.fishOp).toBe("neq");
    expect(q.mine).toBe("0");
    expect(q.favorite).toBe("");
    expect(q.bot).toBe("");
    expect(q.sort).toBe("catchDate");
    expect(q.sortDir).toBe("asc");
  });

  it("does not send leftover search text", () => {
    expect(parseFilters({ q: "щука" }).q).toBe("");
    expect(filtersToQuery({ ...emptyFilters(), q: "щука" }).q).toBeUndefined();
  });

  it("sends the bot tag filter when the slot is filled", () => {
    const q = filtersToQuery({ ...emptyFilters(), bot: true, botOp: "neq" });
    expect(q.bot).toBe("1");
    expect(q.botOp).toBe("neq");
  });
});

describe("countActiveFilters", () => {
  it("counts only visible slots with a value", () => {
    const filters = { ...emptyFilters(), fishId: "f1", favorite: true };
    expect(countActiveFilters(filters, ["fish"])).toBe(1);
    expect(countActiveFilters(filters, ["fish", "favorite"])).toBe(2);
    expect(countActiveFilters(filters, ["catchDate"])).toBe(0);
  });
});

describe("opOf", () => {
  it("falls back to the field default", () => {
    expect(opOf(emptyFilters(), "catchDate")).toBe("between");
    expect(opOf(emptyFilters(), "fish")).toBe("eq");
  });
});

describe("nextPostSort", () => {
  it("sorts a new field descending, then toggles on repeat", () => {
    expect(nextPostSort("createdAt", "desc", "catchDate")).toEqual({ sort: "catchDate", sortDir: "desc" });
    expect(nextPostSort("catchDate", "desc", "catchDate")).toEqual({ sort: "catchDate", sortDir: "asc" });
    expect(nextPostSort("catchDate", "asc", "catchDate")).toEqual({ sort: "catchDate", sortDir: "desc" });
  });
});
