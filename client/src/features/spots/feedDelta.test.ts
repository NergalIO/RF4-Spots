import { describe, expect, it } from "vitest";
import {
  detailActionAfterFeed,
  feedTouchFromDelta,
  FULL_FEED_RELOAD,
  mergeFeedDelta,
  patchMarkers,
  patchPostMetaFromDetail,
} from "./feedDelta";
import type { Post } from "../../types";

function post(partial: Partial<Post> & Pick<Post, "id" | "createdAt">): Post {
  return {
    coordX: 1,
    coordY: 2,
    catchType: "farm",
    catchDate: partial.createdAt,
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

describe("mergeFeedDelta", () => {
  it("replaces existing posts and drops deleted ids", () => {
    const a = post({ id: "a", createdAt: "2026-02-01T00:00:00.000Z", comment: "old" });
    const b = post({ id: "b", createdAt: "2026-01-01T00:00:00.000Z" });
    const next = mergeFeedDelta(
      [a, b],
      [post({ id: "a", createdAt: a.createdAt, comment: "new", unreadComments: 2 })],
      ["b"],
      "createdAt",
      "desc",
    );
    expect(next.map((p) => p.id)).toEqual(["a"]);
    expect(next[0].comment).toBe("new");
    expect(next[0].unreadComments).toBe(2);
  });

  it("inserts a newer post and ignores an older one outside the window", () => {
    const loaded = post({ id: "a", createdAt: "2026-02-01T00:00:00.000Z" });
    const newer = post({ id: "n", createdAt: "2026-03-01T00:00:00.000Z" });
    const older = post({ id: "o", createdAt: "2025-01-01T00:00:00.000Z" });
    const next = mergeFeedDelta([loaded], [newer, older], [], "createdAt", "desc");
    expect(next.map((p) => p.id)).toEqual(["n", "a"]);
  });
});

describe("detailActionAfterFeed", () => {
  it("does not refresh the open post when the delta is about another catch", () => {
    const touch = feedTouchFromDelta([{ id: "other" }], [], []);
    expect(detailActionAfterFeed("open", touch)).toBe("none");
    expect(detailActionAfterFeed("open", FULL_FEED_RELOAD)).toBe("refresh");
    expect(detailActionAfterFeed("open", feedTouchFromDelta([{ id: "open" }]))).toBe("refresh");
    expect(detailActionAfterFeed("open", feedTouchFromDelta([], ["open"]))).toBe("close");
    expect(detailActionAfterFeed("open", feedTouchFromDelta([], [], ["open"]))).toBe("close");
    expect(detailActionAfterFeed(null, touch)).toBe("none");
  });
});

describe("patchPostMetaFromDetail", () => {
  it("updates list counts without copying the comment thread", () => {
    const listed = post({ id: "a", createdAt: "2026-02-01T00:00:00.000Z", commentsCount: 0 });
    const detail = post({
      id: "a",
      createdAt: listed.createdAt,
      commentsCount: 2,
      lastCommentAt: "2026-02-02T00:00:00.000Z",
      comments: [
        {
          id: "c1",
          text: "hi",
          createdAt: "2026-02-02T00:00:00.000Z",
          updatedAt: "2026-02-02T00:00:00.000Z",
          author: listed.author,
          screenshots: [],
        },
      ],
    });
    const next = patchPostMetaFromDetail([listed], detail);
    expect(next[0].commentsCount).toBe(2);
    expect(next[0].lastCommentAt).toBe("2026-02-02T00:00:00.000Z");
    expect(next[0].comments).toBeUndefined();
  });
});

describe("patchMarkers", () => {
  it("upserts and removes markers", () => {
    const next = patchMarkers(
      [
        { id: "a", n: 1 },
        { id: "b", n: 2 },
      ],
      [{ id: "a", n: 9 }],
      ["b"],
    );
    expect(next).toEqual([{ id: "a", n: 9 }]);
  });
});
