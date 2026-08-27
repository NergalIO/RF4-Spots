import { describe, expect, it } from "vitest";
import { unreadOf, ruNewComments } from "./unread";
import type { Post } from "./types";

function post(partial: Partial<Post> = {}): Post {
  return {
    id: "p1",
    coordX: 1,
    coordY: 2,
    catchType: "farm",
    catchDate: "2026-01-01",
    comment: "",
    weightKg: null,
    bait: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    author: { id: "u1", nickname: "A", role: "player" },
    fish: { id: "f", name: "Щука" },
    waterbody: { id: "w", name: "Озеро" },
    screenshots: [],
    commentsCount: 0,
    commentsMeta: [],
    favorited: false,
    ...partial,
  };
}

describe("unreadOf", () => {
  it("marks unseen foreign post", () => {
    expect(unreadOf(post(), {}, "me").kind).toBe("post");
  });

  it("ignores own unseen post", () => {
    expect(unreadOf(post(), {}, "u1").kind).toBe("none");
  });

  it("counts new comments", () => {
    const p = post({
      commentsMeta: [{ id: "c", createdAt: "2026-02-01T00:00:00.000Z", userId: "other" }],
    });
    expect(unreadOf(p, { p1: "2026-01-01T00:00:00.000Z" }, "u1")).toEqual({ kind: "comments", count: 1 });
  });
});

describe("ruNewComments", () => {
  it("picks the right plural", () => {
    expect(ruNewComments(1)).toBe("новый комментарий");
    expect(ruNewComments(2)).toBe("новых комментария");
    expect(ruNewComments(5)).toBe("новых комментариев");
  });
});
