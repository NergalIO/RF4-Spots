import { describe, expect, it } from "vitest";
import { collectVoteCounts, tallyVotes } from "./votes.js";

describe("tallyVotes", () => {
  it("counts likes and dislikes and picks the viewer's vote", () => {
    expect(
      tallyVotes(
        [
          { userId: "a", value: "like" },
          { userId: "b", value: "like" },
          { userId: "c", value: "dislike" },
        ],
        "c",
      ),
    ).toEqual({ likesCount: 2, dislikesCount: 1, userReaction: "dislike" });
  });

  it("returns null reaction when the viewer has not voted", () => {
    expect(tallyVotes([{ userId: "a", value: "like" }], "me")).toEqual({
      likesCount: 1,
      dislikesCount: 0,
      userReaction: null,
    });
  });
});

describe("collectVoteCounts", () => {
  it("groups like and dislike counts by post", () => {
    const map = collectVoteCounts([
      { postId: "p1", value: "like", _count: { _all: 3 } },
      { postId: "p1", value: "dislike", _count: { _all: 1 } },
      { postId: "p2", value: "like", _count: { _all: 2 } },
    ]);
    expect(map.get("p1")).toEqual({ likesCount: 3, dislikesCount: 1 });
    expect(map.get("p2")).toEqual({ likesCount: 2, dislikesCount: 0 });
  });
});
