import { describe, expect, it, afterEach } from "vitest";
import { isAndroidApp, isBrowserClient, isMobileLayout } from "./platform";

const realNav = globalThis.navigator;
const realWin = globalThis.window;
const realLoc = globalThis.location;

afterEach(() => {
  if (realNav) Object.defineProperty(globalThis, "navigator", { configurable: true, value: realNav });
  if (realWin) Object.defineProperty(globalThis, "window", { configurable: true, value: realWin });
  else delete (globalThis as { window?: unknown }).window;
  if (realLoc) Object.defineProperty(globalThis, "location", { configurable: true, value: realLoc });
});

function stubBrowser(opts: { ua?: string; rf4?: boolean; android?: boolean; mobileQuery?: boolean; narrow?: boolean }) {
  const location = { search: opts.mobileQuery ? "?mobile" : "", origin: "https://spots.example" };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: opts.ua ?? "Mozilla/5.0" },
  });
  Object.defineProperty(globalThis, "location", { configurable: true, value: location });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      rf4: opts.rf4 ? { showNotify: () => true } : undefined,
      rf4Android: opts.android ? {} : undefined,
      location,
      matchMedia: (query: string) => ({
        matches: Boolean(opts.narrow) && query.includes("860"),
        addEventListener() {},
        removeEventListener() {},
      }),
    },
  });
}

describe("platform", () => {
  it("treats RF4SpotsAndroid as the APK, not a desktop browser", () => {
    stubBrowser({ ua: "Mozilla/5.0 RF4SpotsAndroid", android: true });
    expect(isAndroidApp()).toBe(true);
    expect(isBrowserClient()).toBe(false);
    expect(isMobileLayout()).toBe(true);
  });

  it("uses the mobile layout in a narrow browser without native bridges", () => {
    stubBrowser({ narrow: true });
    expect(isAndroidApp()).toBe(false);
    expect(isBrowserClient()).toBe(true);
    expect(isMobileLayout()).toBe(true);
  });

  it("keeps the desktop layout in Electron", () => {
    stubBrowser({ rf4: true, narrow: true });
    expect(isBrowserClient()).toBe(false);
    expect(isMobileLayout()).toBe(false);
  });
});
