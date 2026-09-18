import { describe, expect, it } from "vitest";
import { excerptComment, mapDetailPost, mapListPost, stripImportedSource } from "./serialize.js";

describe("stripImportedSource", () => {
  it("drops the trailing VK source line and keeps inner breaks", () => {
    expect(stripImportedSource("первая\nвторая\n\nИсточник: https://vk.com/wall-1_2")).toBe("первая\nвторая");
  });

  it("leaves a normal comment untouched", () => {
    expect(stripImportedSource("клипса 20\nтемпература нормальная")).toBe("клипса 20\nтемпература нормальная");
  });
});

describe("excerptComment", () => {
  it("keeps short comments", () => {
    expect(excerptComment("клёв")).toBe("клёв");
  });

  it("truncates long comments", () => {
    const text = "а".repeat(300);
    const excerpt = excerptComment(text);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThan(text.length);
  });
});

describe("mapListPost", () => {
  const row = {
    id: "p1",
    userId: "u1",
    coordX: 1,
    coordY: 2,
    catchType: "farm" as const,
    catchDate: new Date("2026-01-01T00:00:00.000Z"),
    comment: "клёв",
    tags: [],
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    commentsCount: 3,
    lastCommentAt: new Date("2026-01-03T00:00:00.000Z"),
    likesCount: 4,
    dislikesCount: 1,
    user: { id: "u1", nickname: "A" },
    fish: { id: "f1", name: "Щука" },
    waterbody: { id: "w1", name: "Озеро" },
    votes: [{ value: "like" as const }],
  };

  it("maps a list row without screenshots", () => {
    const mapped = mapListPost(row, { unreadComments: 2, unseen: true });
    expect(mapped).not.toHaveProperty("screenshots");
    expect(mapped.likesCount).toBe(4);
    expect(mapped.dislikesCount).toBe(1);
    expect(mapped.userReaction).toBe("like");
    expect(mapped.favorited).toBe(false);
    expect(mapped.unreadComments).toBe(2);
    expect(mapped.unseen).toBe(true);
    expect(mapped.commentsCount).toBe(3);
  });

  it("maps detail screenshots and full comment", () => {
    const mapped = mapDetailPost({
      ...row,
      screenshots: [{ id: "s1", filename: "a.jpg", sortOrder: 0 }],
    });
    expect(mapped.screenshots).toEqual([{ id: "s1", url: "/uploads/a.jpg" }]);
    expect(mapped.unreadComments).toBe(0);
  });
});
