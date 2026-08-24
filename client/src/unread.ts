import type { Post } from "./types";

export type SeenMap = Record<string, string>;

type Stored = { seeded: boolean; at: SeenMap };

function key(userId: string) {
  return `rf4spots-seen:${userId}`;
}

function empty(): Stored {
  return { seeded: false, at: {} };
}

export function loadSeen(userId: string): Stored {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return { seeded: Boolean(parsed.seeded), at: parsed.at && typeof parsed.at === "object" ? parsed.at : {} };
  } catch {
    return empty();
  }
}

export function saveSeen(userId: string, data: Stored) {
  localStorage.setItem(key(userId), JSON.stringify(data));
}

export function seedSeen(userId: string, posts: Post[]): SeenMap {
  const data = loadSeen(userId);
  if (!data.seeded) {
    const now = new Date().toISOString();
    const at: SeenMap = { ...data.at };
    for (const p of posts) at[p.id] = now;
    saveSeen(userId, { seeded: true, at });
    return at;
  }
  return data.at;
}

export function markPostSeen(userId: string, post: Post): SeenMap {
  const data = loadSeen(userId);
  const times = (post.commentsMeta ?? []).map((c) => c.createdAt);
  times.push(new Date().toISOString());
  const at = { ...data.at, [post.id]: times.sort()[times.length - 1] };
  saveSeen(userId, { seeded: true, at });
  return at;
}

export type UnreadKind = "none" | "post" | "comments";

export type Unread = { kind: UnreadKind; count: number };

export function unreadOf(post: Post, seen: SeenMap, userId: string): Unread {
  const others = (post.commentsMeta ?? []).filter((c) => c.userId !== userId);
  const lastSeen = seen[post.id];
  if (!lastSeen) {
    const count = others.length;
    if (count > 0) return { kind: "comments", count };
    if (post.author.id === userId) return { kind: "none", count: 0 };
    return { kind: "post", count: 0 };
  }
  const count = others.filter((c) => c.createdAt > lastSeen).length;
  if (count > 0) return { kind: "comments", count };
  return { kind: "none", count: 0 };
}

export function ruNewComments(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "новый комментарий";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "новых комментария";
  return "новых комментариев";
}
