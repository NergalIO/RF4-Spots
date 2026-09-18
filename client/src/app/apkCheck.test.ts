import { describe, expect, it, beforeEach } from "vitest";
import { rememberApkCheck, readCachedApkLatest, shouldFetchApkCheck, APK_CHECK_MS } from "./apkCheck";

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

describe("apkCheck", () => {
  it("fetches when nothing is stored", () => {
    expect(shouldFetchApkCheck(1_000)).toBe(true);
  });

  it("skips a repeat check within 30 minutes and remembers the latest version", () => {
    rememberApkCheck("3.6.1", 1_000);
    expect(readCachedApkLatest()).toBe("3.6.1");
    expect(shouldFetchApkCheck(1_000 + APK_CHECK_MS - 1)).toBe(false);
    expect(shouldFetchApkCheck(1_000 + APK_CHECK_MS)).toBe(true);
  });
});
