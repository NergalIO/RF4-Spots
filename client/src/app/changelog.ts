export type ChangelogSection = {
  title: string;
  items: string[];
};

export type ChangelogEntry = {
  version: string;
  sections: ChangelogSection[];
};

const SEEN_KEY = "rf4spots-seen-version";
const VERSION_RE = /^версия\s+(\d+\.\d+\.\d+)\s*$/i;
const SECTION_RE = /^(.+):\s*$/;
const ITEM_RE = /^[-•]\s+(.+)$/;

export function compareSemver(a: string, b: string) {
  const left = a.split(".").map((n) => parseInt(n, 10) || 0);
  const right = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export function readSeenVersion() {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markChangelogSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    /* ignore */
  }
}

export function parseChanges(text: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let section: ChangelogSection | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const version = line.match(VERSION_RE);
    if (version) {
      current = { version: version[1], sections: [] };
      entries.push(current);
      section = null;
      continue;
    }
    if (!current) continue;
    const item = line.match(ITEM_RE);
    if (item) {
      if (!section) {
        section = { title: "", items: [] };
        current.sections.push(section);
      }
      section.items.push(item[1].trim());
      continue;
    }
    const heading = line.match(SECTION_RE);
    if (heading) {
      section = { title: heading[1].trim(), items: [] };
      current.sections.push(section);
    }
  }
  return entries.filter((entry) => entry.sections.some((block) => block.items.length));
}

export function unseenChangelog(current: string, entries: ChangelogEntry[]): ChangelogEntry[] {
  const seen = readSeenVersion();
  if (!seen) return entries.filter((e) => e.version === current);
  return entries.filter((e) => compareSemver(e.version, seen) > 0 && compareSemver(e.version, current) <= 0);
}

export function shouldShowChangelog(current: string, entries: ChangelogEntry[]) {
  return unseenChangelog(current, entries).length > 0;
}

export async function loadServerChangelog(baseUrl: string): Promise<{ ok: boolean; entries: ChangelogEntry[] }> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/updates/changes`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return { ok: true, entries: parseChanges(await res.text()) };
  } catch {
    return { ok: false, entries: [] };
  }
}
