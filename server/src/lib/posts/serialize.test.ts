import { describe, expect, it } from "vitest";
import { mapPost, stripImportedSource } from "./serialize.js";

describe("stripImportedSource", () => {
  it("drops the trailing VK source line and keeps inner breaks", () => {
    expect(stripImportedSource("первая\nвторая\n\nИсточник: https://vk.com/wall-1_2")).toBe("первая\nвторая");
  });

  it("leaves a normal comment untouched", () => {
    expect(stripImportedSource("клипса 20\nтемпература нормальная")).toBe("клипса 20\nтемпература нормальная");
  });
});

describe("mapPost", () => {
  const row = {
    id: "p1",
    coordX: 1,
    coordY: 2,
    catchType: "farm" as const,
    catchDate: new Date("2026-01-01T00:00:00.000Z"),
    comment: "клёв",
    weightKg: null,
    bait: "",
    tags: [],
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    user: { id: "u1", nickname: "A" },
    fish: { id: "f1", name: "Щука" },
    waterbody: { id: "w1", name: "Озеро" },
  };

  it("maps a list row without screenshots and with ready vote counts", () => {
    const mapped = mapPost(row, "u1", { likesCount: 4, dislikesCount: 1, userReaction: "like" });
    expect(mapped.screenshots).toEqual([]);
    expect(mapped.likesCount).toBe(4);
    expect(mapped.dislikesCount).toBe(1);
    expect(mapped.userReaction).toBe("like");
    expect(mapped.favorited).toBe(false);
  });
});
