import { describe, expect, it } from "vitest";
import { guideTableWidth, nextSort } from "./guideTableColumns";
import type { GuideField } from "@/features/tools/guideSchema";

const fields: GuideField[] = [
  { key: "name", label: "Название", type: "string" },
  { key: "test", label: "Тест", type: "string" },
];

describe("guideTableColumns", () => {
  it("adds pick and delete column widths", () => {
    const widths = { name: 220, test: 110 };
    expect(guideTableWidth(fields, widths, {})).toBe(330);
    expect(guideTableWidth(fields, widths, { pick: true, del: true })).toBe(330 + 44 + 40);
  });

  it("toggles sort direction on the same column", () => {
    expect(nextSort("name", "asc", "name")).toEqual({ key: "name", dir: "desc" });
    expect(nextSort("name", "desc", "test")).toEqual({ key: "test", dir: "asc" });
  });
});
