import { describe, expect, it } from "vitest";
import { ANDROID_WEBVIEW_ORIGIN, corsOrigins } from "./security.js";

describe("corsOrigins", () => {
  it("always allows the Android WebView origin", () => {
    expect(corsOrigins()).toContain(ANDROID_WEBVIEW_ORIGIN);
  });
});
