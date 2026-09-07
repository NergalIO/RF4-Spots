export type GuideKey = "reels" | "rods" | "hooks" | "fishWeights" | "alcohol" | "shopPrices" | "levels";
export type GuideFieldType = "string" | "number";
export type GuideField = { key: string; label: string; type: GuideFieldType; filter?: "range" | "search" };

export const GUIDE_FIELDS: Record<GuideKey, GuideField[]> = {
  reels: [
    { key: "name", label: "Название", type: "string", filter: "search" },
    { key: "category", label: "Категория", type: "string" },
    { key: "retrieve", label: "Смотка, м/мин", type: "number" },
    { key: "test", label: "Тест", type: "string", filter: "range" },
    { key: "testMod", label: "Теста*", type: "string", filter: "range" },
    { key: "ratio", label: "Передатка", type: "string", filter: "range" },
    { key: "ratioMod", label: "Передатка*", type: "string", filter: "range" },
    { key: "gearKg", label: "Шестерня, кг", type: "number" },
    { key: "gearKgMod", label: "Механизм*", type: "number" },
    { key: "dragKg", label: "Фрикцион, кг", type: "number" },
    { key: "dragKgMod", label: "Фрикцион*", type: "number" },
    { key: "weight", label: "Вес", type: "number" },
    { key: "capacity", label: "Шпуля", type: "string", filter: "range" },
    { key: "price", label: "Цена", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  rods: [
    { key: "name", label: "Название", type: "string", filter: "search" },
    { key: "category", label: "Категория", type: "string" },
    { key: "length", label: "Длина", type: "number" },
    { key: "test", label: "Тест", type: "string", filter: "range" },
    { key: "blankKg", label: "Бланк, кг", type: "number" },
    { key: "price", label: "Цена", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  hooks: [
    { key: "name", label: "Название", type: "string", filter: "search" },
    { key: "category", label: "Категория", type: "string" },
    { key: "size", label: "Размер", type: "string" },
    { key: "strengthKg", label: "Прочность, кг", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  fishWeights: [
    { key: "name", label: "Рыба", type: "string", filter: "search" },
    { key: "qualifyingKg", label: "Зачётная, кг", type: "number" },
    { key: "uniqueKg", label: "Чатовая, кг", type: "number" },
    { key: "trophyKg", label: "Трофей, кг", type: "number" },
    { key: "rareTrophyKg", label: "Редкий трофей, кг", type: "number" },
  ],
  alcohol: [
    { key: "name", label: "Название", type: "string", filter: "search" },
    { key: "source", label: "Источник", type: "string" },
    { key: "waterbody", label: "Водоём", type: "string" },
    { key: "expPct", label: "Опыт %", type: "number" },
    { key: "maxPct", label: "Максимум %", type: "number" },
    { key: "hours", label: "Часов", type: "number" },
    { key: "portions", label: "Порций", type: "number" },
    { key: "price", label: "Цена", type: "number" },
    { key: "ostrogPrice", label: "Острог", type: "number" },
    { key: "portionPrice", label: "Порция", type: "number" },
    { key: "scCost", label: "СЧ, монеты", type: "number" },
    { key: "pricePerExp", label: "Цена за 1% опыта", type: "number" },
    { key: "pricePerSc", label: "Цена за 1% на СЧ", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  shopPrices: [
    { key: "waterbody", label: "Водоём", type: "string" },
    { key: "fishMarket", label: "Рыбный рынок", type: "string" },
    { key: "tackleShop", label: "Рыболовный", type: "string" },
    { key: "tackleShop2", label: "Рыболовный 2", type: "string" },
    { key: "brandedShop", label: "Фирменный", type: "string" },
    { key: "workshop", label: "Мастерская", type: "string" },
    { key: "brandedWorkshop", label: "Фирм. мастерская", type: "string" },
    { key: "generalStore", label: "Промтовары", type: "string" },
    { key: "grocery", label: "Продуктовый", type: "string" },
    { key: "grocery2", label: "Продуктовый 2", type: "string" },
  ],
  levels: [
    { key: "level", label: "Уровень", type: "number" },
    { key: "xp", label: "Опыт", type: "number" },
    { key: "xpTotal", label: "Сумма опыта", type: "number" },
    { key: "points", label: "Очки", type: "number" },
    { key: "pointsTotal", label: "Сумма очков", type: "number" },
    { key: "waterAccess", label: "Доступ к водоёму", type: "string" },
  ],
};

export function emptyGuideRow(key: GuideKey) {
  const row: Record<string, string | number | null> = {};
  for (const field of GUIDE_FIELDS[key]) row[field.key] = field.type === "number" ? null : "";
  return row;
}

export function asNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function asText(value: unknown) {
  return value == null ? "" : String(value);
}

export function usesRangeFilter(field: GuideField) {
  return field.type === "number" || field.filter === "range";
}

export function usesSearchFilter(field: GuideField) {
  return field.filter === "search" || field.key === "name";
}

/** Parse "12", "3,2", "5,8:1", "2–18 г" into a numeric interval. */
export function parseNumericRange(value: unknown): { min: number; max: number } | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? { min: value, max: value } : null;
  }
  const text = String(value).trim().replace(/\u00a0/g, " ").replace(",", ".");
  if (!text) return null;
  const direct = Number(text);
  if (Number.isFinite(direct)) return { min: direct, max: direct };
  const ratios = [...text.matchAll(/(\d+(?:\.\d+)?)\s*:\s*\d/g)].map((m) => Number(m[1]));
  if (ratios.length) return { min: Math.min(...ratios), max: Math.max(...ratios) };
  const nums = [...text.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}
