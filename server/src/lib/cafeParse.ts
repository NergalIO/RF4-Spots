function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest catalog names first so «Белый амур» wins over «амур». */
export function extractCafeFishNames(html: string, catalogNames: string[]): string[] {
  let text = htmlToText(html);
  if (!text) return [];
  const found: string[] = [];
  const sorted = [...catalogNames].filter((n) => n.trim().length >= 3).sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}([^\\p{L}\\p{N}]|$)`, "iu");
    if (re.test(text)) {
      found.push(name);
      text = text.replace(re, "$1 $2");
    }
  }
  return found;
}
