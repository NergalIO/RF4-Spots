import { describe, expect, it, vi } from "vitest";

vi.mock("../s3.js", () => ({
  presignGet: vi.fn(async (key: string) => `https://s3.example/${key}?sig=1`),
  s3SignedTtlSec: () => 3600,
}));

import {
  excerptComment,
  extractImportedSourceUrl,
  mapDetailPost,
  mapListPost,
  stripImportedSource,
} from "./serialize.js";

describe("stripImportedSource", () => {
  it("drops the trailing VK source line and keeps inner breaks", () => {
    expect(stripImportedSource("первая\nвторая\n\nИсточник: https://vk.com/wall-1_2")).toBe("первая\nвторая");
  });

  it("leaves a normal comment untouched", () => {
    expect(stripImportedSource("клипса 20\nтемпература нормальная")).toBe("клипса 20\nтемпература нормальная");
  });
});

describe("extractImportedSourceUrl", () => {
  it("reads the trailing VK source URL", () => {
    expect(extractImportedSourceUrl("текст\n\nИсточник: https://vk.com/wall-1_2")).toBe("https://vk.com/wall-1_2");
  });

  it("returns null when there is no source line", () => {
    expect(extractImportedSourceUrl("просто комментарий")).toBeNull();
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
    commentExcerpt: "клёв",
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
    expect(mapped.comment).toBe("клёв");
    expect(mapped.likesCount).toBe(4);
    expect(mapped.dislikesCount).toBe(1);
    expect(mapped.userReaction).toBe("like");
    expect(mapped.favorited).toBe(false);
    expect(mapped.unreadComments).toBe(2);
    expect(mapped.unseen).toBe(true);
    expect(mapped.commentsCount).toBe(3);
  });

  it("maps detail screenshots and full comment", async () => {
    const mapped = await mapDetailPost(
      {
        ...row,
        screenshots: [{ id: "s1", objectKey: "shots/a.jpg", sortOrder: 0 }],
      },
      "полный текст",
    );
    expect(mapped.screenshots).toEqual([{ id: "s1", url: "https://s3.example/shots/a.jpg?sig=1" }]);
    expect(mapped.comment).toBe("полный текст");
    expect(mapped.unreadComments).toBe(0);
    expect(mapped.sourceUrl).toBeNull();
  });

  it("exposes sourceUrl from comment or stored field", async () => {
    const fromComment = await mapDetailPost(row, "клёв\n\nИсточник: https://vk.com/wall-9_9");
    expect(fromComment.sourceUrl).toBe("https://vk.com/wall-9_9");
    expect(fromComment.comment).toBe("клёв");
    const fromField = await mapDetailPost({ ...row, sourceUrl: "https://vk.com/wall-1_1" }, "клёв");
    expect(fromField.sourceUrl).toBe("https://vk.com/wall-1_1");
  });
});
