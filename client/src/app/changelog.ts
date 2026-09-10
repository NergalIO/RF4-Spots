export type ChangelogEntry = {
  version: string;
  items: string[];
};

const SEEN_KEY = "rf4spots-seen-version";
const VERSION_RE = /Update client version to (\d+\.\d+\.\d+)/i;

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

export function commitItems(message: string): string[] {
  const first = message.split("\n")[0]?.trim() ?? "";
  let text = first.replace(VERSION_RE, "").replace(/^,?\s*/, "");
  text = text.replace(/\s*These changes aim to.*$/i, "");
  text = text.replace(/\s*This update (improves|streamlines).*?$/i, "");
  const parts = text
    .split(/\.\s+|;\s+|,\s+and\s+/)
    .map((part) => part.replace(/\.$/, "").trim())
    .filter((part) => part.length > 8);
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(part.charAt(0).toUpperCase() + part.slice(1));
  }
  return items;
}

export function changelogFromCommits(commits: { message: string }[], current: string): ChangelogEntry[] {
  const groups = new Map<string, string[]>();
  const order: string[] = [];
  const ensure = (version: string) => {
    if (groups.has(version)) return;
    groups.set(version, []);
    order.push(version);
  };
  let version = current;
  ensure(current);
  for (const commit of commits) {
    const bump = commit.message.match(VERSION_RE)?.[1];
    if (bump) version = bump;
    ensure(version);
    const items = commitItems(commit.message);
    const bucket = groups.get(version);
    if (!bucket) continue;
    for (const item of items) {
      if (!bucket.includes(item)) bucket.push(item);
    }
  }
  return order
    .map((ver) => ({ version: ver, items: groups.get(ver) ?? [] }))
    .filter((entry) => entry.items.length > 0);
}

export function unseenChangelog(current: string, entries: ChangelogEntry[]): ChangelogEntry[] {
  const seen = readSeenVersion();
  if (!seen) return entries.filter((e) => e.version === current);
  return entries.filter((e) => compareSemver(e.version, seen) > 0 && compareSemver(e.version, current) <= 0);
}

export function shouldShowChangelog(current: string, entries: ChangelogEntry[]) {
  return unseenChangelog(current, entries).length > 0;
}
