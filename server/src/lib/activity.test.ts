import { describe, expect, it } from "vitest";
import { commentExcerpt, parseActivitySince } from "./activity.js";

describe("parseActivitySince", () => {
  const now = Date.parse("2026-09-06T12:00:00.000Z");

  it("falls back when the query is missing", () => {
    expect(parseActivitySince(undefined, now).toISOString()).toBe("2026-09-06T11:59:30.000Z");
  });

  it("caps very old timestamps", () => {
    expect(parseActivitySince("2026-01-01T00:00:00.000Z", now).toISOString()).toBe("2026-09-06T11:30:00.000Z");
  });

  it("keeps a recent timestamp", () => {
    expect(parseActivitySince("2026-09-06T11:50:00.000Z", now).toISOString()).toBe("2026-09-06T11:50:00.000Z");
  });
});

describe("commentExcerpt", () => {
  it("collapses whitespace", () => {
    expect(commentExcerpt("  привет\nмир  ")).toBe("привет мир");
  });

  it("truncates long text", () => {
    const t = "а".repeat(90);
    expect(commentExcerpt(t)).toBe(`${"а".repeat(79)}…`);
  });
});
