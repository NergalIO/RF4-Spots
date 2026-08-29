import { describe, expect, it } from "vitest";
import { nextSortOrder, parseKeepScreenshots } from "./screenshots.js";

describe("parseKeepScreenshots", () => {
  it("treats empty as no keep filter", () => {
    expect(parseKeepScreenshots(null)).toEqual({ ok: true, ids: undefined });
    expect(parseKeepScreenshots("")).toEqual({ ok: true, ids: undefined });
  });

  it("parses a json id list", () => {
    expect(parseKeepScreenshots(JSON.stringify(["a", "b"]))).toEqual({ ok: true, ids: ["a", "b"] });
  });

  it("rejects non-string and invalid json", () => {
    expect(parseKeepScreenshots(["a"])).toEqual({ ok: false });
    expect(parseKeepScreenshots("{")).toEqual({ ok: false });
    expect(parseKeepScreenshots(JSON.stringify([""]))).toEqual({ ok: false });
  });
});

describe("nextSortOrder", () => {
  it("starts at 0 when none exist", () => {
    expect(nextSortOrder(null)).toBe(0);
    expect(nextSortOrder(undefined)).toBe(0);
  });

  it("increments the current max", () => {
    expect(nextSortOrder(3)).toBe(4);
  });
});
