import type { Post } from "../../types";

function sortValue(post: Post, sort: "createdAt" | "catchDate") {
  return sort === "catchDate" ? post.catchDate : post.createdAt;
}

function comparePosts(a: Post, b: Post, sort: "createdAt" | "catchDate", dir: "asc" | "desc") {
  const av = sortValue(a, sort);
  const bv = sortValue(b, sort);
  if (av !== bv) {
    const lt = av < bv;
    if (dir === "asc") return lt ? -1 : 1;
    return lt ? 1 : -1;
  }
  if (a.id === b.id) return 0;
  const idLt = a.id < b.id;
  if (dir === "asc") return idLt ? -1 : 1;
  return idLt ? 1 : -1;
}

function belongsInWindow(post: Post, loaded: Post[], sort: "createdAt" | "catchDate", dir: "asc" | "desc") {
  if (!loaded.length) return true;
  const edge = loaded[loaded.length - 1];
  const pv = sortValue(post, sort);
  const ev = sortValue(edge, sort);
  if (dir === "desc") return pv > ev || (pv === ev && post.id >= edge.id);
  return pv < ev || (pv === ev && post.id <= edge.id);
}

export function mergeFeedDelta(
  posts: Post[],
  upserts: Post[],
  removeIds: string[],
  sort: "createdAt" | "catchDate",
  dir: "asc" | "desc",
): Post[] {
  const drop = new Set(removeIds);
  const map = new Map(posts.filter((p) => !drop.has(p.id)).map((p) => [p.id, p]));
  const loaded = [...map.values()].sort((a, b) => comparePosts(a, b, sort, dir));
  for (const post of upserts) {
    if (drop.has(post.id)) continue;
    const prev = map.get(post.id);
    if (prev) {
      map.set(post.id, {
        ...prev,
        ...post,
        comments: post.comments ?? prev.comments,
        screenshots: post.screenshots ?? prev.screenshots,
      });
    } else if (belongsInWindow(post, loaded, sort, dir)) {
      map.set(post.id, post);
    }
  }
  return [...map.values()].sort((a, b) => comparePosts(a, b, sort, dir));
}

export type FeedTouch = {
  reload: boolean;
  upsertIds: string[];
  removedIds: string[];
};

export const FULL_FEED_RELOAD: FeedTouch = { reload: true, upsertIds: [], removedIds: [] };

export function feedTouchFromDelta(
  posts: { id: string }[],
  deletedIds?: string[],
  droppedIds?: string[],
): FeedTouch {
  return {
    reload: false,
    upsertIds: posts.map((p) => p.id),
    removedIds: [...(deletedIds ?? []), ...(droppedIds ?? [])],
  };
}

export function shouldCloseDetail(selectedId: string | null, touch: FeedTouch): boolean {
  return Boolean(selectedId && touch.removedIds.includes(selectedId));
}

export function shouldRefreshDetail(selectedId: string | null, touch: FeedTouch): boolean {
  if (!selectedId || shouldCloseDetail(selectedId, touch)) return false;
  if (touch.reload) return true;
  return touch.upsertIds.includes(selectedId);
}

export function detailActionAfterFeed(selectedId: string | null, touch: FeedTouch | void): "none" | "close" | "refresh" {
  if (!selectedId || !touch) return "none";
  if (shouldCloseDetail(selectedId, touch)) return "close";
  if (shouldRefreshDetail(selectedId, touch)) return "refresh";
  return "none";
}

export function patchPostMetaFromDetail(posts: Post[], detail: Post): Post[] {
  return posts.map((p) =>
    p.id !== detail.id
      ? p
      : {
          ...p,
          commentsCount: detail.commentsCount,
          lastCommentAt: detail.lastCommentAt,
          unreadComments: detail.unreadComments,
          unseen: false,
        },
  );
}

export function patchMarkers<T extends { id: string }>(
  markers: T[],
  upserts: T[],
  removeIds: string[],
): T[] {
  const drop = new Set(removeIds);
  const map = new Map(markers.filter((m) => !drop.has(m.id)).map((m) => [m.id, m]));
  for (const marker of upserts) {
    if (drop.has(marker.id)) continue;
    map.set(marker.id, marker);
  }
  return [...map.values()];
}
