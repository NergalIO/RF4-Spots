export const TAB_KEY = "rf4spots-main-tab";
export const MAIN_TABS = ["spots", "stats", "cafe", "tools", "admin"] as const;
export type MainTab = (typeof MAIN_TABS)[number];

export const TAB_ITEMS: { id: MainTab; label: string; short: string }[] = [
  { id: "spots", label: "Споты", short: "Споты" },
  { id: "stats", label: "Статистика", short: "Стата" },
  { id: "cafe", label: "Кафе", short: "Кафе" },
  { id: "tools", label: "Полезные функции", short: "Функции" },
  { id: "admin", label: "Админ", short: "Админ" },
];

export function tabCaption(tab: MainTab) {
  if (tab === "stats") return "статистика улова";
  if (tab === "cafe") return "заказы кафе";
  if (tab === "tools") return "полезные функции";
  if (tab === "admin") return "админка";
  return "точки ловли";
}
