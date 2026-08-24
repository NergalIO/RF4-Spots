import { ALL_WATERBODIES } from "./constants";

const CAFE_ORIGIN = "https://rf4-cafe.ru";

/** Our waterbody id → rf4-cafe.ru slug. оз. Медвежье на кафе нет. */
const CAFE_SLUG: Record<string, string> = {
  mosquito: "komarinoe",
  elk: "losinoe",
  rivulet: "vjunok",
  oldburg: "ostrog",
  belaya: "belaya",
  kuori: "kuori",
  volkhov: "volhov",
  donets: "donets",
  sura: "sura",
  ladoga: "ladoga",
  amber: "yantarnoe",
  archipelago: "archipelago",
  akhtuba: "ahtuba",
  copper: "mednoe",
  tunguska: "tunguska",
  yama: "yama",
  norwegian: "sea",
};

const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(CAFE_SLUG).map(([id, slug]) => [slug, id]),
);

export function cafeUrlForWaterbody(waterbodyId: string): string {
  const slug = waterbodyId && waterbodyId !== ALL_WATERBODIES ? CAFE_SLUG[waterbodyId] : "";
  return slug ? `${CAFE_ORIGIN}/${slug}` : `${CAFE_ORIGIN}/`;
}

export function waterbodyIdFromCafeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "rf4-cafe.ru" && parsed.hostname !== "www.rf4-cafe.ru") return null;
    const slug = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
    if (!slug) return ALL_WATERBODIES;
    return SLUG_TO_ID[slug] ?? null;
  } catch {
    return null;
  }
}
