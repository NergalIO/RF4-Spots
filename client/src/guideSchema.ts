export type GuideKey = "reels" | "rods" | "hooks" | "fishWeights" | "alcohol" | "shopPrices" | "levels";
export type GuideFieldType = "string" | "number";
export type GuideField = { key: string; label: string; type: GuideFieldType };

export const GUIDE_FIELDS: Record<GuideKey, GuideField[]> = {
  reels: [
    { key: "name", label: "Название", type: "string" },
    { key: "category", label: "Категория", type: "string" },
    { key: "retrieve", label: "Смотка, м/мин", type: "number" },
    { key: "ratio", label: "Передатка", type: "string" },
    { key: "gearKg", label: "Шестерня, кг", type: "number" },
    { key: "dragKg", label: "Фрикцион, кг", type: "number" },
    { key: "weight", label: "Вес", type: "number" },
    { key: "capacity", label: "Шпуля", type: "string" },
    { key: "price", label: "Цена", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  rods: [
    { key: "name", label: "Название", type: "string" },
    { key: "category", label: "Категория", type: "string" },
    { key: "length", label: "Длина", type: "number" },
    { key: "test", label: "Тест", type: "string" },
    { key: "blankKg", label: "Бланк, кг", type: "number" },
    { key: "price", label: "Цена", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  hooks: [
    { key: "name", label: "Название", type: "string" },
    { key: "category", label: "Категория", type: "string" },
    { key: "size", label: "Размер", type: "string" },
    { key: "strengthKg", label: "Прочность, кг", type: "number" },
    { key: "notes", label: "Заметки", type: "string" },
  ],
  fishWeights: [
    { key: "name", label: "Рыба", type: "string" },
    { key: "qualifyingKg", label: "Зачётная, кг", type: "number" },
    { key: "uniqueKg", label: "Чатовая, кг", type: "number" },
    { key: "trophyKg", label: "Трофей, кг", type: "number" },
    { key: "rareTrophyKg", label: "Редкий трофей, кг", type: "number" },
  ],
  alcohol: [
    { key: "name", label: "Название", type: "string" },
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
