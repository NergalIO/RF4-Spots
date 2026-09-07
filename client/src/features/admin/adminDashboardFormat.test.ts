import { describe, expect, it } from "vitest";
import { cmpHint, fmtDay } from "./adminDashboardFormat";

describe("adminDashboardFormat", () => {
  it("formats a day as dd.mm", () => {
    expect(fmtDay("2026-09-07")).toBe("07.09");
  });

  it("describes a delta against the previous period", () => {
    expect(cmpHint(5, 5, "вчера")).toBe("как вчера");
    expect(cmpHint(8, 5, "вчера")).toBe("+3 к вчера");
    expect(cmpHint(2, 5, "вчера")).toBe("-3 к вчера");
  });
});
