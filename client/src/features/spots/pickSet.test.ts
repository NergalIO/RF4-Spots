import { describe, expect, it } from "vitest";
import { nextPickedIds, ruPosts } from "./pickSet";

const ids = ["a", "b", "c", "d"];

describe("nextPickedIds", () => {
  it("toggles a single card", () => {
    expect(nextPickedIds(ids, [], "b", false, null)).toEqual({ next: ["b"], anchor: "b" });
    expect(nextPickedIds(ids, ["b"], "b", false, "b")).toEqual({ next: [], anchor: "b" });
  });

  it("shift-click fills the range from the last card", () => {
    expect(nextPickedIds(ids, ["b"], "d", true, "b").next.sort()).toEqual(["b", "c", "d"]);
  });
});

describe("ruPosts", () => {
  it("picks the right plural", () => {
    expect(ruPosts(1)).toBe("пост");
    expect(ruPosts(2)).toBe("поста");
    expect(ruPosts(5)).toBe("постов");
  });
});
