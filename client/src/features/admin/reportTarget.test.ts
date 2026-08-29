import { describe, expect, it } from "vitest";
import { reportCaption, reportPostId } from "./reportTarget";
import type { ModerationReport } from "@/types";

const user = { id: "u1", nickname: "n", role: "player" as const };

function base(patch: Partial<ModerationReport> = {}): ModerationReport {
  return {
    id: "r1",
    reason: "spam",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
    reporter: user,
    resolvedBy: null,
    post: null,
    comment: null,
    ...patch,
  };
}

describe("reportPostId", () => {
  it("uses visible post", () => {
    expect(
      reportPostId(base({ post: { id: "p1", excerpt: "", fishName: "Щука", deleted: false } })),
    ).toBe("p1");
  });

  it("skips hidden post", () => {
    expect(
      reportPostId(base({ post: { id: "p1", excerpt: "", fishName: "Щука", deleted: true } })),
    ).toBeNull();
  });

  it("uses comment parent", () => {
    expect(
      reportPostId(base({ comment: { id: "c1", postId: "p2", excerpt: "hi", deleted: false } })),
    ).toBe("p2");
  });
});

describe("reportCaption", () => {
  it("marks hidden post", () => {
    expect(reportCaption(base({ post: { id: "p1", excerpt: "", fishName: "Щука", deleted: true } }))).toContain(
      "скрыт",
    );
  });
});
