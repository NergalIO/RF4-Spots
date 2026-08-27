import { describe, expect, it } from "vitest";
import { sniffImage } from "./upload.js";

describe("sniffImage", () => {
  it("detects jpeg", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("jpeg");
  });

  it("detects png", () => {
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
  });

  it("rejects random bytes", () => {
    expect(sniffImage(Buffer.from("hello"))).toBeNull();
  });
});
