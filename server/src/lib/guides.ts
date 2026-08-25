export const GUIDE_KEYS = [
  "reels",
  "rods",
  "hooks",
  "fishWeights",
  "alcohol",
  "shopPrices",
  "levels",
] as const;

export type GuideKey = (typeof GUIDE_KEYS)[number];
export type GuideValue = string | number | null;
export type GuideRow = Record<string, GuideValue>;

export type GuideField = {
  key: string;
  type: "string" | "number";
};

export const GUIDE_FIELDS: Record<GuideKey, GuideField[]> = {
  reels: [
    { key: "name", type: "string" },
    { key: "category", type: "string" },
    { key: "retrieve", type: "number" },
    { key: "test", type: "string" },
    { key: "testMod", type: "string" },
    { key: "ratio", type: "string" },
    { key: "ratioMod", type: "string" },
    { key: "gearKg", type: "number" },
    { key: "gearKgMod", type: "number" },
    { key: "dragKg", type: "number" },
    { key: "dragKgMod", type: "number" },
    { key: "weight", type: "number" },
    { key: "capacity", type: "string" },
    { key: "price", type: "number" },
    { key: "notes", type: "string" },
  ],
  rods: [
    { key: "name", type: "string" },
    { key: "category", type: "string" },
    { key: "length", type: "number" },
    { key: "test", type: "string" },
    { key: "blankKg", type: "number" },
    { key: "price", type: "number" },
    { key: "notes", type: "string" },
  ],
  hooks: [
    { key: "name", type: "string" },
    { key: "category", type: "string" },
    { key: "size", type: "string" },
    { key: "strengthKg", type: "number" },
    { key: "notes", type: "string" },
  ],
  fishWeights: [
    { key: "name", type: "string" },
    { key: "qualifyingKg", type: "number" },
    { key: "uniqueKg", type: "number" },
    { key: "trophyKg", type: "number" },
    { key: "rareTrophyKg", type: "number" },
  ],
  alcohol: [
    { key: "name", type: "string" },
    { key: "source", type: "string" },
    { key: "waterbody", type: "string" },
    { key: "expPct", type: "number" },
    { key: "maxPct", type: "number" },
    { key: "hours", type: "number" },
    { key: "portions", type: "number" },
    { key: "price", type: "number" },
    { key: "ostrogPrice", type: "number" },
    { key: "portionPrice", type: "number" },
    { key: "scCost", type: "number" },
    { key: "pricePerExp", type: "number" },
    { key: "pricePerSc", type: "number" },
    { key: "notes", type: "string" },
  ],
  shopPrices: [
    { key: "waterbody", type: "string" },
    { key: "fishMarket", type: "string" },
    { key: "tackleShop", type: "string" },
    { key: "tackleShop2", type: "string" },
    { key: "brandedShop", type: "string" },
    { key: "workshop", type: "string" },
    { key: "brandedWorkshop", type: "string" },
    { key: "generalStore", type: "string" },
    { key: "grocery", type: "string" },
    { key: "grocery2", type: "string" },
  ],
  levels: [
    { key: "level", type: "number" },
    { key: "xp", type: "number" },
    { key: "xpTotal", type: "number" },
    { key: "points", type: "number" },
    { key: "pointsTotal", type: "number" },
    { key: "waterAccess", type: "string" },
  ],
};

export function isGuideKey(value: string): value is GuideKey {
  return (GUIDE_KEYS as readonly string[]).includes(value);
}

export function emptyGuideRow(key: GuideKey): GuideRow {
  const row: GuideRow = {};
  for (const field of GUIDE_FIELDS[key]) {
    row[field.key] = field.type === "number" ? null : "";
  }
  return row;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function normalizeGuideRows(key: GuideKey, raw: unknown): GuideRow[] {
  if (!Array.isArray(raw)) {
    throw new Error("Ожидался массив строк");
  }
  return raw.map((item) => {
    const src = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const row: GuideRow = {};
    for (const field of GUIDE_FIELDS[key]) {
      const value = src[field.key];
      row[field.key] = field.type === "number" ? asNumber(value) : value == null ? "" : String(value);
    }
    return row;
  });
}
