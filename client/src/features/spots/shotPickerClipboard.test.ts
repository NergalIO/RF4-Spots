import { describe, expect, it } from "vitest";
import { isImageFile, namedImage } from "./shotPickerClipboard";

describe("shotPickerClipboard", () => {
  it("keeps an already named image file", () => {
    const file = new File(["x"], "shot.png", { type: "image/png" });
    expect(namedImage(file)).toBe(file);
  });

  it("assigns a screenshot name when the file has none", () => {
    const file = new File(["x"], "", { type: "image/jpeg" });
    expect(namedImage(file).name).toMatch(/^screenshot-\d+\.jpg$/);
  });

  it("accepts image types and extensions", () => {
    expect(isImageFile(new File(["x"], "a.webp", { type: "image/webp" }))).toBe(true);
    expect(isImageFile(new File(["x"], "notes.txt", { type: "text/plain" }))).toBe(false);
  });
});
