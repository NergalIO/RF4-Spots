import { describe, expect, it } from "vitest";
import { extractCafeFishNames } from "./cafeParse.js";

describe("extractCafeFishNames", () => {
  const catalog = ["Щука", "Окунь", "Белый амур", "Амур", "Карп"];

  it("finds longest names first", () => {
    const html = "<div>Нужен Белый амур и щука</div>";
    expect(extractCafeFishNames(html, catalog)).toEqual(["Белый амур", "Щука"]);
  });

  it("ignores scripts", () => {
    const html = "<script>Щука</script><p>Окунь</p>";
    expect(extractCafeFishNames(html, catalog)).toEqual(["Окунь"]);
  });

  it("returns empty for blank html", () => {
    expect(extractCafeFishNames("", catalog)).toEqual([]);
  });
});
