import { describe, expect, it, beforeEach } from "vitest";
import { readPersistedTab } from "./usePersistedTab";

const allowed = ["spots", "stats", "cafe", "tools", "admin"] as const;
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
      clear: () => mem.clear(),
    },
  });
});

describe("readPersistedTab", () => {
  it("returns fallback when empty", () => {
    expect(readPersistedTab("k", allowed, "spots")).toBe("spots");
  });

  it("returns stored allowed value", () => {
    localStorage.setItem("k", "tools");
    expect(readPersistedTab("k", allowed, "spots")).toBe("tools");
  });

  it("migrates session to tools", () => {
    localStorage.setItem("k", "session");
    expect(
      readPersistedTab("k", allowed, "spots", (v) => (v === "session" ? "tools" : undefined)),
    ).toBe("tools");
  });

  it("ignores unknown values", () => {
    localStorage.setItem("k", "nope");
    expect(readPersistedTab("k", allowed, "spots")).toBe("spots");
  });
});
