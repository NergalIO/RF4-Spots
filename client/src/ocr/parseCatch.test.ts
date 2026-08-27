import { describe, expect, it } from "vitest";
import { catchDedupeKey, parseCatch } from "./parseCatch";

const catalog = [
  { id: "1", name: "Щука" },
  { id: "2", name: "Окунь" },
  { id: "3", name: "Белый амур" },
];

describe("parseCatch", () => {
  it("reads fish, weight and trophy", () => {
    const parsed = parseCatch("Трофейная Щука 4,25 кг", catalog);
    expect(parsed.fishName).toBe("Щука");
    expect(parsed.weightKg).toBe(4.25);
    expect(parsed.catchType).toBe("trophy");
  });

  it("prefers longer fish names", () => {
    const parsed = parseCatch("Пойман Белый амур 12 кг", catalog);
    expect(parsed.fishName).toBe("Белый амур");
  });

  it("dedupes by name and weight", () => {
    const a = parseCatch("Щука 2 кг", catalog);
    const b = parseCatch("щука 2.00 кг", catalog);
    expect(catchDedupeKey(a)).toBe(catchDedupeKey(b));
  });
});
