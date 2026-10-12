import { afterEach, describe, expect, it } from "vitest";
import { postPayloadKey, resetS3Client, shotObjectKey, contentTypeForExt } from "./s3.js";

afterEach(() => {
  resetS3Client();
});

describe("s3 key helpers", () => {
  it("builds post payload keys", () => {
    expect(postPayloadKey("abc")).toBe("posts/abc.json");
  });

  it("normalizes shot keys", () => {
    expect(shotObjectKey("uuid.jpg")).toBe("shots/uuid.jpg");
    expect(shotObjectKey("shots/uuid.jpg")).toBe("shots/uuid.jpg");
  });

  it("rejects path traversal in shot keys", () => {
    expect(() => shotObjectKey("../x.jpg")).toThrow();
  });

  it("maps content types", () => {
    expect(contentTypeForExt(".png")).toBe("image/png");
    expect(contentTypeForExt(".jpg")).toBe("image/jpeg");
  });
});
