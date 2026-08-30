import { describe, expect, it } from "vitest";
import { APK_NAME_RE, INSTALLER_NAME_RE, escapeHtml, installerNameFromYml, pickNewestName } from "./updateArtifacts.js";

describe("updateArtifacts", () => {
  it("reads installer path from latest.yml", () => {
    expect(installerNameFromYml("version: 3.0.0\npath: RF4Spots-Setup-3.0.0.exe\n")).toBe("RF4Spots-Setup-3.0.0.exe");
    expect(installerNameFromYml("files:\n  - url: RF4Spots-Setup-3.0.1.exe\n")).toBe("RF4Spots-Setup-3.0.1.exe");
  });

  it("matches packaged names", () => {
    expect(INSTALLER_NAME_RE.test("RF4Spots-Setup-3.0.0.exe")).toBe(true);
    expect(INSTALLER_NAME_RE.test("RF4Spots-3.0.0.apk")).toBe(false);
    expect(APK_NAME_RE.test("RF4Spots-3.0.0.apk")).toBe(true);
    expect(APK_NAME_RE.test("RF4Spots-Setup-3.0.0.exe")).toBe(false);
    expect(APK_NAME_RE.test("app-release.apk")).toBe(false);
  });

  it("picks the newest stamped name", () => {
    expect(
      pickNewestName([
        { name: "a", mtime: 1 },
        { name: "b", mtime: 8 },
        { name: "c", mtime: 3 },
      ]),
    ).toBe("b");
    expect(pickNewestName([])).toBe("");
  });

  it("escapes html", () => {
    expect(escapeHtml(`<a href="x">`)).toBe("&lt;a href=&quot;x&quot;&gt;");
  });
});
