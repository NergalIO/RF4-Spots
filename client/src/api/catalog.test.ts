import { describe, expect, it, beforeEach } from "vitest";
import { writeEtagRecord } from "./etagCache";
import { peekCachedFish, peekCachedWaterbodies } from "./catalog";

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

describe("catalog cache", () => {
  it("shows cached fish and waterbodies for the same server only", () => {
    writeEtagRecord("rf4spots-fish", "http://a", `"1"`, { fish: [{ id: "f1", name: "Щука", waterbodies: [] }] });
    writeEtagRecord("rf4spots-waterbodies", "http://a", `"1"`, {
      waterbodies: [
        {
          id: "w1",
          name: "Озеро",
          metersPerCell: 1,
          xMin: 0,
          xMax: 1,
          yMin: 0,
          yMax: 1,
          yFlipped: false,
          imageWidth: 1,
          imageHeight: 1,
          padLeft: 0,
          padTop: 0,
          padRight: 0,
          padBottom: 0,
          mapUrl: "/m",
        },
      ],
    });
    expect(peekCachedFish("http://a/")?.[0].id).toBe("f1");
    expect(peekCachedWaterbodies("http://a")?.[0].id).toBe("w1");
    expect(peekCachedFish("http://other")).toBeNull();
    expect(peekCachedWaterbodies("http://other")).toBeNull();
  });
});
