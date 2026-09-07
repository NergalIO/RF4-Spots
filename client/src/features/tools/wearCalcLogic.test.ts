import { describe, expect, it } from "vitest";
import { buildResultRows, computeWeakest, hookLabel, minDefined, parseKg } from "./wearCalcLogic";

describe("wearCalcLogic", () => {
  it("parses positive kilograms", () => {
    expect(parseKg("12,5")).toBe(12.5);
    expect(parseKg("0")).toBe(null);
    expect(parseKg("abc")).toBe(null);
  });

  it("picks the minimum defined value", () => {
    expect(minDefined([null, 4, 2, null])).toBe(2);
    expect(minDefined([null, null])).toBe(null);
  });

  it("builds hook labels and finds the weakest part", () => {
    expect(hookLabel({ name: "CHK", size: "S10" })).toBe("CHK S10");
    const rows = buildResultRows({
      blankKg: 10,
      gearKg: 4,
      dragKg: 8,
      hookKg: 6,
      line: 5,
      leader: null,
      rodWear: 0,
      gearWear: 0,
      dragWear: 0,
      hookWear: 0,
      lineWear: 0,
      leaderWear: 0,
    });
    const { weakest, warn } = computeWeakest(rows);
    expect(weakest?.id).toBe("gear");
    expect(warn).toBe(true);
  });
});
