import type { StateCreator } from "zustand";
import { ALL_WATERBODIES } from "../shared/constants";
import { loadFilters, loadWaterbodyId, saveFilters, saveWaterbodyId } from "../shared/persist";
import { filtersToQuery } from "../features/spots/filterQuery";
import { markersFromPosts } from "../features/spots/mapMarkerGroups";
import {
  feedTouchFromDelta,
  FULL_FEED_RELOAD,
  mergeFeedDelta,
  patchMarkers,
  patchPostMetaFromDetail,
  type FeedTouch,
} from "../features/spots/feedDelta";
import type { Filters, Post, PostMarker } from "../types";
import type { Store } from "./types";

let listGen = 0;

function extraFromSelection(waterbodyId: string, posts: Post[], selectedId: string | null, detail: Post | null) {
  if (!selectedId || !detail || detail.id !== selectedId) return null;
  if (detail.waterbody.id !== waterbodyId) return null;
  if (posts.some((p) => p.id === selectedId)) return null;
  return detail;
}

function pinIfMissing(waterbodyId: string, markers: PostMarker[], post: Post) {
  if (!waterbodyId || waterbodyId === ALL_WATERBODIES) return markers;
  if (post.waterbody.id !== waterbodyId) return markers;
  if (markers.some((m) => m.id === post.id)) return markers;
  return [...markers, ...markersFromPosts([post])];
}

function queryParams(waterbodyId: string, filters: Filters) {
  return {
    waterbodyId: waterbodyId === ALL_WATERBODIES ? "" : waterbodyId,
    ...filtersToQuery(filters),
  };
}

function markerFromPost(post: Post): PostMarker {
  return {
    id: post.id,
    coordX: post.coordX,
    coordY: post.coordY,
    catchType: post.catchType,
    fishName: post.fish.name,
  };
}

export type SpotsSlice = Pick<
  Store,
  | "fish"
  | "waterbodies"
  | "waterbodyId"
  | "posts"
  | "markers"
  | "nextCursor"
  | "selectedId"
  | "detail"
  | "filters"
  | "rulerOn"
  | "syncRev"
  | "flyToId"
  | "setWaterbody"
  | "setFilters"
  | "selectPost"
  | "refreshPosts"
  | "loadMorePosts"
  | "refreshDetail"
  | "openOnMap"
  | "toggleFavorite"
  | "toggleVote"
  | "markSeen"
  | "toggleRuler"
  | "clearFlyTo"
>;

export const createSpotsSlice: StateCreator<Store, [], [], SpotsSlice> = (set, get) => ({
  fish: [],
  waterbodies: [],
  waterbodyId: loadWaterbodyId(),
  posts: [],
  markers: [],
  nextCursor: null,
  selectedId: null,
  detail: null,
  filters: loadFilters(),
  rulerOn: false,
  syncRev: 0,
  flyToId: null,
  toggleRuler: () => set({ rulerOn: !get().rulerOn }),
  clearFlyTo: () => set({ flyToId: null }),

  markSeen: (post) => {
    set({
      posts: get().posts.map((p) => (p.id === post.id ? { ...p, unreadComments: 0, unseen: false } : p)),
      detail: get().detail?.id === post.id ? { ...get().detail!, unreadComments: 0, unseen: false } : get().detail,
    });
  },

  setWaterbody: async (id, opts) => {
    saveWaterbodyId(id);
    const extra = opts?.keepPostId ? get().detail : null;
    set({
      waterbodyId: id,
      selectedId: opts?.keepPostId ?? null,
      detail: extra,
      rulerOn: id === ALL_WATERBODIES ? false : get().rulerOn,
      posts: [],
      markers: [],
      nextCursor: null,
    });
    await get().refreshPosts({ extra });
    if (opts?.keepPostId) await get().selectPost(opts.keepPostId);
  },

  setFilters: async (patch) => {
    const filters = { ...get().filters, ...patch };
    saveFilters(filters);
    set({ filters, nextCursor: null });
    await get().refreshPosts();
  },

  selectPost: async (id, opts) => {
    if (!id) {
      set({ selectedId: null, detail: null });
      return;
    }
    const current = get().detail;
    if (
      !opts?.reload &&
      get().selectedId === id &&
      current?.id === id &&
      Array.isArray(current.comments)
    ) {
      return;
    }
    set({ selectedId: id });
    const { post } = await get().api.posts.get(id);
    set({ detail: post });
    get().markSeen(post);
  },

  refreshPosts: async (opts) => {
    const { api, waterbodyId, filters, selectedId, nextCursor } = get();
    if (!waterbodyId) return;
    if (opts?.local) {
      const post = opts.local;
      const merged = mergeFeedDelta(get().posts, [post], [], filters.sort, filters.sortDir);
      let markers = get().markers;
      if (waterbodyId !== ALL_WATERBODIES && post.waterbody.id === waterbodyId) {
        markers = patchMarkers(markers, [markerFromPost(post)], []);
      } else if (waterbodyId === ALL_WATERBODIES) {
        markers = [];
      }
      set({ posts: merged, markers });
      return { reload: false, upsertIds: [post.id], removedIds: [] } satisfies FeedTouch;
    }
    const gen = opts?.append ? listGen : ++listGen;
    const base = queryParams(waterbodyId, filters);

    if (opts?.sinceRev != null) {
      const delta = await api.posts.list({ ...base, sinceRev: String(opts.sinceRev) });
      if (gen !== listGen || get().waterbodyId !== waterbodyId || !get().user) return;
      if (delta.reload) {
        return get().refreshPosts();
      }
      const removeIds = [...(delta.deletedIds ?? []), ...(delta.droppedIds ?? [])];
      const merged = mergeFeedDelta(get().posts, delta.posts, removeIds, filters.sort, filters.sortDir);
      const extra = extraFromSelection(waterbodyId, merged, selectedId, get().detail);
      let markers = get().markers;
      if (waterbodyId !== ALL_WATERBODIES) {
        const upserts = delta.posts.filter((p) => p.waterbody.id === waterbodyId).map(markerFromPost);
        markers = patchMarkers(markers, upserts, removeIds);
        if (extra) markers = pinIfMissing(waterbodyId, markers, extra);
      } else {
        markers = [];
      }
      set({
        posts: merged,
        syncRev: delta.rev,
        markers,
      });
      return feedTouchFromDelta(delta.posts, delta.deletedIds, delta.droppedIds);
    }

    const [{ posts, nextCursor: cursor, rev }, markerRes] = await Promise.all([
      api.posts.list({
        ...base,
        take: "50",
        cursor: opts?.append && nextCursor ? nextCursor : "",
      }),
      opts?.append || waterbodyId === ALL_WATERBODIES
        ? Promise.resolve({ markers: get().markers })
        : api.posts.markers(base),
    ]);
    if (gen !== listGen || get().waterbodyId !== waterbodyId || !get().user) return;
    const merged = opts?.append ? [...get().posts, ...posts] : posts;
    const extra = opts?.extra ?? (opts?.append ? extraFromSelection(waterbodyId, merged, selectedId, get().detail) : null);
    let markers = waterbodyId === ALL_WATERBODIES ? [] : markerRes.markers;
    if (extra) markers = pinIfMissing(waterbodyId, markers, extra);
    set({
      posts: merged,
      nextCursor: cursor,
      syncRev: rev,
      markers,
    });
    return opts?.append ? feedTouchFromDelta(posts) : FULL_FEED_RELOAD;
  },

  loadMorePosts: async () => {
    if (!get().nextCursor) return;
    await get().refreshPosts({ append: true });
  },

  refreshDetail: async (opts) => {
    const { selectedId, api } = get();
    if (!selectedId) return;
    const { post } = await api.posts.get(selectedId);
    set({ detail: post });
    get().markSeen(post);
    if (opts?.skipList) {
      const seen = get().detail;
      if (seen) set({ posts: patchPostMetaFromDetail(get().posts, seen) });
      return;
    }
    await get().refreshPosts();
  },

  openOnMap: async (post) => {
    if (get().waterbodyId !== post.waterbody.id) {
      set({ detail: post, selectedId: post.id });
      await get().setWaterbody(post.waterbody.id, { keepPostId: post.id });
    } else {
      set({ markers: pinIfMissing(get().waterbodyId, get().markers, post) });
      await get().selectPost(post.id);
    }
    set({ flyToId: post.id });
  },

  toggleFavorite: async (post) => {
    const { api } = get();
    const { favorited } = await api.posts.setFavorite(post.id, !post.favorited);
    set({
      posts: get().posts.map((p) => (p.id === post.id ? { ...p, favorited } : p)),
      detail: get().detail?.id === post.id ? { ...get().detail!, favorited } : get().detail,
    });
    if (get().filters.favorite && !favorited) await get().refreshPosts();
  },

  toggleVote: async (post, value) => {
    const { api } = get();
    const next = post.userReaction === value ? null : value;
    const { userReaction, likesCount, dislikesCount } = await api.posts.setVote(post.id, next);
    const patch = { userReaction, likesCount, dislikesCount };
    set({
      posts: get().posts.map((p) => (p.id === post.id ? { ...p, ...patch } : p)),
      detail: get().detail?.id === post.id ? { ...get().detail!, ...patch } : get().detail,
    });
  },
});
