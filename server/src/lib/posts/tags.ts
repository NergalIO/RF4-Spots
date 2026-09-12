export const POST_TAG_BOT = "Бот";
export const ALLOWED_POST_TAGS = [POST_TAG_BOT] as const;
export type AllowedPostTag = (typeof ALLOWED_POST_TAGS)[number];

const allowed = new Set<string>(ALLOWED_POST_TAGS);

export function parseTagList(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap((item) => parseTagList(item));
  if (typeof value !== "string") return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed.flatMap((item) => parseTagList(item));
    } catch {
      /* comma-separated fallback */
    }
  }
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function asAllowedTags(value: unknown): AllowedPostTag[] {
  const unique = new Set<AllowedPostTag>();
  for (const tag of parseTagList(value)) {
    if (allowed.has(tag)) unique.add(tag as AllowedPostTag);
  }
  return [...unique];
}
