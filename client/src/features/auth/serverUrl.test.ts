import { describe, expect, it } from "vitest";
import { allowResolvedUrl, pageOrigin, pickDefaultServerUrl } from "./serverUrl";

describe("pageOrigin", () => {
  it("returns the page origin in a browser and nothing in Electron", () => {
    expect(pageOrigin({ location: { origin: "https://spots.example" } })).toBe("https://spots.example");
    expect(pageOrigin({ rf4: {}, location: { origin: "https://spots.example" } })).toBe("");
    expect(pageOrigin({ rf4Android: {}, location: { origin: "https://spots.example" } })).toBe("");
  });
});

describe("pickDefaultServerUrl", () => {
  it("uses the page origin only in production builds", () => {
    expect(pickDefaultServerUrl("", "https://spots.example", true)).toBe("https://spots.example");
    expect(pickDefaultServerUrl("", "https://spots.example", false)).toBe("http://127.0.0.1:3780");
    expect(pickDefaultServerUrl("https://pin.example", "https://spots.example", true)).toBe("https://pin.example");
  });
});

describe("allowResolvedUrl", () => {
  it("allows the page origin in production without an allowlist", () => {
    const parsed = new URL("https://spots.example");
    expect(allowResolvedUrl(parsed, [], "https://spots.example")).toBe(true);
    expect(allowResolvedUrl(parsed, [], "")).toBe(false);
    expect(allowResolvedUrl(new URL("http://127.0.0.1:3780"), [], "")).toBe(true);
    expect(allowResolvedUrl(parsed, ["https://other.example"], "https://spots.example")).toBe(false);
  });
});
