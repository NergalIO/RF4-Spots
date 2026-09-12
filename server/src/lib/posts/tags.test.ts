import { describe, expect, it } from "vitest";
import { POST_TAG_BOT, asAllowedTags, parseTagList } from "./tags.js";

describe("parseTagList", () => {
  it("reads a single tag, JSON and comma lists", () => {
    expect(parseTagList("Бот")).toEqual(["Бот"]);
    expect(parseTagList('["Бот"]')).toEqual(["Бот"]);
    expect(parseTagList("Бот, Бот")).toEqual(["Бот", "Бот"]);
    expect(parseTagList(["Бот", ""])).toEqual(["Бот"]);
    expect(parseTagList("")).toEqual([]);
  });
});

describe("asAllowedTags", () => {
  it("keeps only known tags and drops duplicates", () => {
    expect(asAllowedTags(["Бот", "Бот", "Другое"])).toEqual([POST_TAG_BOT]);
    expect(asAllowedTags("нет")).toEqual([]);
  });
});
