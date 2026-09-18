import { describe, expect, it } from "vitest";
import { unreadOf, ruNewComments } from "./unread";
import type { Post } from "../../types";

function post(partial: Partial<Post> = {}): Post {
  return {
    id: "p1",
    coordX: 1,
    coordY: 2,
    catchType: "farm",
    catchDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    comment: "",
    tags: [],
    author: { id: "u1", nickname: "A", role: "player" },
    fish: { id: "f", name: "Щука" },
    waterbody: { id: "w", name: "Озеро" },
    commentsCount: 0,
    lastCommentAt: "",
    unreadComments: 0,
    unseen: false,
    favorited: false,
    likesCount: 0,
    dislikesCount: 0,
    userReaction: null,
    ...partial,
  };
}

describe("unreadOf", () => {
  it("marks unseen foreign post", () => {
    expect(unreadOf(post({ unseen: true })).kind).toBe("post");
  });

  it("ignores own unseen post when server says seen", () => {
    expect(unreadOf(post()).kind).toBe("none");
  });

  it("counts new comments", () => {
    expect(unreadOf(post({ unreadComments: 1 }))).toEqual({ kind: "comments", count: 1 });
  });
});

describe("ruNewComments", () => {
  it("picks the right plural", () => {
    expect(ruNewComments(1)).toBe("новый комментарий");
    expect(ruNewComments(2)).toBe("новых комментария");
    expect(ruNewComments(5)).toBe("новых комментариев");
  });
});
