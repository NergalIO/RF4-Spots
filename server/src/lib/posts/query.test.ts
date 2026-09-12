import { describe, expect, it } from "vitest";
import { listOrder, postsListWhere } from "./query.js";

const user = "u1";

describe("postsListWhere", () => {
  it("keeps legacy equality filters", () => {
    const where = postsListWhere({ fishId: "f1", catchType: "farm", mine: "1" }, user);
    expect(where.fishId).toBe("f1");
    expect(where.catchType).toBe("farm");
    expect(where.userId).toBe(user);
  });

  it("supports not-equal fish and inverted mine", () => {
    const where = postsListWhere({ fishId: "f1", fishOp: "neq", mine: "0" }, user);
    expect(where.fishId).toEqual({ not: "f1" });
    expect(where.userId).toEqual({ not: user });
  });

  it("filters posts that have or lack the bot tag", () => {
    const withBot = postsListWhere({ bot: "1" }, user);
    const withoutBot = postsListWhere({ bot: "0" }, user);
    expect(withBot.AND).toEqual(expect.arrayContaining([expect.objectContaining({ tags: { has: "Бот" } })]));
    expect(withoutBot.AND).toEqual(
      expect.arrayContaining([expect.objectContaining({ NOT: { tags: { has: "Бот" } } })]),
    );
  });

  it("wraps search contains in AND so it can combine with other clauses", () => {
    const where = postsListWhere({ q: "щука", qOp: "contains" }, user);
    expect(Array.isArray(where.AND)).toBe(true);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([expect.objectContaining({ comment: expect.anything() })]),
        }),
      ]),
    );
  });
});

describe("listOrder", () => {
  it("defaults to createdAt descending", () => {
    expect(listOrder({})).toEqual({ sort: "createdAt", dir: "desc" });
  });

  it("honors catchDate ascending", () => {
    expect(listOrder({ sort: "catchDate", sortDir: "asc" })).toEqual({ sort: "catchDate", dir: "asc" });
  });
});
