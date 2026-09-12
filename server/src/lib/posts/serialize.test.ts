import { describe, expect, it } from "vitest";
import { stripImportedSource } from "./serialize.js";

describe("stripImportedSource", () => {
  it("drops the trailing VK source line and keeps inner breaks", () => {
    expect(stripImportedSource("первая\nвторая\n\nИсточник: https://vk.com/wall-1_2")).toBe("первая\nвторая");
  });

  it("leaves a normal comment untouched", () => {
    expect(stripImportedSource("клипса 20\nтемпература нормальная")).toBe("клипса 20\nтемпература нормальная");
  });
});
