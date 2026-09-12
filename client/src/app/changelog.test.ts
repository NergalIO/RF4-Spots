import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareSemver, markChangelogSeen, parseChanges, shouldShowChangelog, unseenChangelog } from "./changelog";

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

const SAMPLE = `версия 3.5.1

Клиент:
- список обновлений берётся с сервера

версия 3.4.8

Фильтры:
- строки фильтра собраны как поле — действие — значение

Уведомления:
- в android появляются системные уведомления
`;

describe("compareSemver", () => {
  it("orders dotted versions", () => {
    expect(compareSemver("3.4.7", "3.4.6")).toBe(1);
    expect(compareSemver("3.4.6", "3.4.7")).toBe(-1);
    expect(compareSemver("3.4.7", "3.4.7")).toBe(0);
    expect(compareSemver("3.10.0", "3.9.9")).toBe(1);
  });
});

describe("parseChanges", () => {
  it("groups versions, sections and bullets", () => {
    const entries = parseChanges(SAMPLE);
    expect(entries.map((e) => e.version)).toEqual(["3.5.1", "3.4.8"]);
    expect(entries[1].sections.map((s) => s.title)).toEqual(["Фильтры", "Уведомления"]);
    expect(entries[0].sections[0].items[0]).toContain("сервера");
  });

  it("parses the server updates/changes file", () => {
    const text = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../../server/updates/changes"), "utf8");
    const entries = parseChanges(text);
    expect(entries[0]?.version).toBe("3.5.1");
    expect(entries.some((e) => e.version === "3.4.8")).toBe(true);
    expect(entries.every((e) => e.sections.some((s) => s.items.length))).toBe(true);
  });
});

describe("unseenChangelog", () => {
  const entries = parseChanges(SAMPLE);

  it("shows only the current version on first launch", () => {
    expect(unseenChangelog("3.5.1", entries).map((e) => e.version)).toEqual(["3.5.1"]);
  });

  it("shows versions newer than the last seen one", () => {
    markChangelogSeen("3.4.8");
    expect(unseenChangelog("3.5.1", entries).map((e) => e.version)).toEqual(["3.5.1"]);
    markChangelogSeen("3.4.5");
    expect(unseenChangelog("3.5.1", entries).map((e) => e.version)).toEqual(["3.5.1", "3.4.8"]);
    expect(shouldShowChangelog("3.4.5", entries)).toBe(false);
  });
});
