import { describe, expect, it, beforeEach } from "vitest";
import { loadWithEtag, readEtagRecord, writeEtagRecord } from "./etagCache";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    },
  });
});

function isFish(value: unknown): value is { fish: { id: string }[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { fish?: unknown }).fish));
}

describe("etagCache", () => {
  it("ignores a record from another origin", () => {
    writeEtagRecord("k", "http://a", `"1"`, { fish: [{ id: "f1" }] });
    expect(readEtagRecord("k", "http://b", isFish)).toBeNull();
    expect(readEtagRecord("k", "http://a", isFish)?.data.fish[0].id).toBe("f1");
  });

  it("returns cached data on 304", async () => {
    writeEtagRecord("k", "http://a", `"1"`, { fish: [{ id: "f1" }] });
    const data = await loadWithEtag({
      key: "k",
      origin: "http://a",
      etag: `"1"`,
      isData: isFish,
      cached: { fish: [{ id: "f1" }] },
      req: async () => ({ notModified: true as const }),
    });
    expect(data.fish[0].id).toBe("f1");
  });

  it("stores a fresh payload", async () => {
    const data = await loadWithEtag({
      key: "k",
      origin: "http://a",
      etag: undefined,
      isData: isFish,
      req: async () => ({ notModified: false as const, data: { fish: [{ id: "f2" }] }, etag: `"2"` }),
    });
    expect(data.fish[0].id).toBe("f2");
    expect(readEtagRecord("k", "http://a", isFish)?.etag).toBe(`"2"`);
  });
});
