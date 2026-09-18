import { describe, expect, it } from "vitest";
import { isUnseenPost } from "./unread.js";

describe("isUnseenPost", () => {
  const seeded = new Date("2026-02-01T00:00:00.000Z");
  const post = { id: "p1", userId: "author", createdAt: new Date("2026-03-01T00:00:00.000Z") };

  it("marks a later foreign post as unseen", () => {
    expect(isUnseenPost(post, "me", new Set(), seeded)).toBe(true);
  });

  it("ignores own posts and already seen ids", () => {
    expect(isUnseenPost(post, "author", new Set(), seeded)).toBe(false);
    expect(isUnseenPost(post, "me", new Set(["p1"]), seeded)).toBe(false);
  });
});
