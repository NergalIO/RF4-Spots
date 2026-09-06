import { describe, expect, it } from "vitest";
import { tallyVotes } from "./votes.js";

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
