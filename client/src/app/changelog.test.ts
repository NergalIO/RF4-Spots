import { describe, expect, it, beforeEach } from "vitest";
import { changelogFromCommits, commitItems, compareSemver, markChangelogSeen, shouldShowChangelog, unseenChangelog } from "./changelog";

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

describe("compareSemver", () => {
  it("orders dotted versions", () => {
    expect(compareSemver("3.4.7", "3.4.6")).toBe(1);
    expect(compareSemver("3.4.6", "3.4.7")).toBe(-1);
    expect(compareSemver("3.4.7", "3.4.7")).toBe(0);
    expect(compareSemver("3.10.0", "3.9.9")).toBe(1);
  });
});

describe("commitItems", () => {
  it("splits a version bump message into feature bullets", () => {
    const items = commitItems(
      "Update client version to 3.4.6, remove redundant update check on app launch, and enhance splash screen functionality. These changes aim to streamline the user experience during application startup.",
    );
    expect(items.some((item) => /update check/i.test(item))).toBe(true);
    expect(items.some((item) => /splash screen/i.test(item))).toBe(true);
    expect(items.some((item) => /These changes aim/i.test(item))).toBe(false);
  });
});

describe("changelogFromCommits", () => {
  it("groups commits by client version bumps, newest first", () => {
    const entries = changelogFromCommits(
      [
        {
          message:
            "Update client version to 3.4.6, remove redundant update check on app launch, and enhance splash screen functionality.",
        },
        {
          message: "Update client version to 3.4.5, enhance map pin functionality to display counts for multiple markers.",
        },
        { message: "Refactor API endpoints for admin and auth functionalities." },
      ],
      "3.4.7",
    );
    expect(entries.map((e) => e.version)).toEqual(["3.4.6", "3.4.5"]);
    expect(entries[0].items.length).toBeGreaterThan(0);
    expect(entries[1].items.some((item) => /map pin/i.test(item))).toBe(true);
  });
});

describe("unseenChangelog", () => {
  const entries = changelogFromCommits(
    [
      { message: "Update client version to 3.4.7, add android notifications." },
      { message: "Update client version to 3.4.6, fix splash transparency." },
    ],
    "3.4.7",
  );

  it("shows only the current version on first launch", () => {
    expect(unseenChangelog("3.4.7", entries).map((e) => e.version)).toEqual(["3.4.7"]);
  });

  it("shows versions newer than the last seen one", () => {
    markChangelogSeen("3.4.5");
    expect(unseenChangelog("3.4.7", entries).map((e) => e.version)).toEqual(["3.4.7", "3.4.6"]);
    expect(shouldShowChangelog("3.4.5", entries)).toBe(false);
  });
});
