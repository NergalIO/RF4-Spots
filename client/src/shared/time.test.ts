import { describe, expect, it } from "vitest";
import { fmtWhen } from "./time";

describe("fmtWhen", () => {
  const now = new Date("2026-08-29T12:00:00.000Z");

  it("uses relative time under 24 hours", () => {
    expect(fmtWhen("2026-08-29T11:59:30.000Z", now)).toBe("только что");
    expect(fmtWhen("2026-08-29T11:59:00.000Z", now)).toBe("минуту назад");
    expect(fmtWhen("2026-08-29T11:05:00.000Z", now)).toBe("55 минут назад");
    expect(fmtWhen("2026-08-29T11:00:00.000Z", now)).toBe("час назад");
    expect(fmtWhen("2026-08-29T09:00:00.000Z", now)).toBe("3 часа назад");
  });

  it("uses full date after 24 hours", () => {
    expect(fmtWhen("2026-08-27T12:00:00.000Z", now)).toMatch(/27/);
  });
});
