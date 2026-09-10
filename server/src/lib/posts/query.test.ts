import { describe, expect, it } from "vitest";
import { postsListWhere } from "./query.js";

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
