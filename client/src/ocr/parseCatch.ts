export type CatchType = "farm" | "trophy" | "farm_trophy";

export type ParsedCatch = {
  fishName: string | null;
  fishId: string | null;
  weightKg: number | null;
  catchType: CatchType | null;
};

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseCatch(
  ocrText: string,
  catalog: { id: string; name: string }[],
): ParsedCatch {
  const text = normalize(ocrText);
  const lower = text.toLowerCase();

  let catchType: CatchType | null = null;
  if (/уникальн/i.test(text)) catchType = "trophy";
  else if (/трофейн/i.test(text)) catchType = "trophy";
  else if (/обычн/i.test(text)) catchType = "farm";

  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(кг|kg)/i);
  const grams = text.match(/(\d+(?:[.,]\d+)?)\s*(г|g)\b/i);
  let weightKg: number | null = null;
  if (weightMatch) {
    const n = Number(weightMatch[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) weightKg = n;
  } else if (grams) {
    const n = Number(grams[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) weightKg = n / 1000;
  }

  const sorted = [...catalog].filter((f) => f.name.trim().length >= 3).sort((a, b) => b.name.length - a.name.length);
  let fishName: string | null = null;
  let fishId: string | null = null;
  for (const fish of sorted) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(fish.name)}([^\\p{L}\\p{N}]|$)`, "iu");
    if (re.test(text) || lower.includes(fish.name.toLowerCase())) {
      fishName = fish.name;
      fishId = fish.id;
      break;
    }
  }

  return { fishName, fishId, weightKg, catchType };
}

export function catchDedupeKey(parsed: ParsedCatch) {
  const w = parsed.weightKg != null ? parsed.weightKg.toFixed(2) : "";
  return `${(parsed.fishName || "").toLowerCase()}|${w}`;
}
