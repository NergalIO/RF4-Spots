import { changelogFromCommits, type ChangelogEntry } from "./changelog";

const REPO = "NergalIO/RF4-Spots";
const CACHE_KEY = "rf4spots-github-changelog";
const COMMITS_URL = `https://api.github.com/repos/${REPO}/commits`;

type Cache = { at: number; current: string; entries: ChangelogEntry[] };

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    if (!Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

async function fetchCommitPage(page: number): Promise<{ rows: { message: string }[]; done: boolean }> {
  const res = await fetch(`${COMMITS_URL}?per_page=100&page=${page}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const batch = (await res.json()) as { commit?: { message?: string } }[];
  if (!Array.isArray(batch)) return { rows: [], done: true };
  const rows: { message: string }[] = [];
  for (const row of batch) {
    const message = row.commit?.message ?? "";
    if (!message || /^Merge /i.test(message)) continue;
    rows.push({ message });
  }
  return { rows, done: batch.length < 100 };
}

export async function fetchGithubChangelog(current: string): Promise<ChangelogEntry[]> {
  const commits: { message: string }[] = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await fetchCommitPage(page);
    commits.push(...batch.rows);
    if (batch.done) break;
  }
  return changelogFromCommits(commits, current);
}

export async function loadGithubChangelog(current: string): Promise<{ ok: boolean; entries: ChangelogEntry[] }> {
  const cached = readCache();
  try {
    const entries = await fetchGithubChangelog(current);
    writeCache({ at: Date.now(), current, entries });
    return { ok: true, entries };
  } catch {
    return { ok: false, entries: cached?.entries ?? [] };
  }
}
