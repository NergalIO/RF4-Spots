export const CAFE_ORIGIN = "https://rf4-cafe.ru";

export const CAFE_SLUG: Record<string, string> = {
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

export function cafeUrlForWaterbody(waterbodyId: string): string | null {
  const slug = CAFE_SLUG[waterbodyId];
  return slug ? `${CAFE_ORIGIN}/${slug}` : null;
}
