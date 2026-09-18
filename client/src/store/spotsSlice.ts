import type { StateCreator } from "zustand";
import { ALL_WATERBODIES } from "../shared/constants";
import { loadFilters, loadWaterbodyId, saveFilters, saveWaterbodyId } from "../shared/persist";
import { filtersToQuery } from "../features/spots/filterQuery";
import { markersFromPosts } from "../features/spots/mapMarkerGroups";
import { markPostSeen, seedSeen } from "../features/spots/unread";
import type { Post } from "../types";
import type { Store } from "./types";

let listGen = 0;

function extraFromSelection(waterbodyId: string, posts: Post[], selectedId: string | null, detail: Post | null) {
  if (!selectedId || !detail || detail.id !== selectedId) return null;
  if (detail.waterbody.id !== waterbodyId) return null;
  if (posts.some((p) => p.id === selectedId)) return null;
  return detail;
}

function feedMarkers(waterbodyId: string, posts: Post[], extra?: Post | null) {
  if (!waterbodyId || waterbodyId === ALL_WATERBODIES) return [];
  const markers = markersFromPosts(posts);
  if (extra && extra.waterbody.id === waterbodyId && !markers.some((m) => m.id === extra.id)) {
    return [...markers, ...markersFromPosts([extra])];
  }
  return markers;
}

function pinIfMissing(waterbodyId: string, markers: ReturnType<typeof feedMarkers>, post: Post) {
  if (!waterbodyId || waterbodyId === ALL_WATERBODIES) return null;
  if (post.waterbody.id !== waterbodyId) return null;
  if (markers.some((m) => m.id === post.id)) return null;
  return [...markers, ...markersFromPosts([post])];
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
  | "seen"
  | "syncStamp"
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
  seen: {},
  syncStamp: "",
  flyToId: null,
  toggleRuler: () => set({ rulerOn: !get().rulerOn }),
  clearFlyTo: () => set({ flyToId: null }),

  markSeen: (post) => {
    const user = get().user;
    if (!user) return;
    set({ seen: markPostSeen(user.id, post) });
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

  selectPost: async (id) => {
    set({ selectedId: id });
    if (!id) {
      set({ detail: null });
      return;
    }
    const { api } = get();
    const { post } = await api.posts.get(id);
    set({ detail: post });
    get().markSeen(post);
  },

  refreshPosts: async (opts) => {
    const { api, waterbodyId, filters, selectedId, user, nextCursor } = get();
    if (!waterbodyId) return;
    const gen = opts?.append ? listGen : ++listGen;
    const { posts, nextCursor: cursor } = await api.posts.list({
      waterbodyId: waterbodyId === ALL_WATERBODIES ? "" : waterbodyId,
      ...filtersToQuery(filters),
      take: "50",
      cursor: opts?.append && nextCursor ? nextCursor : "",
    });
    if (gen !== listGen || get().waterbodyId !== waterbodyId || !get().user) return;
    const merged = opts?.append ? [...get().posts, ...posts] : posts;
    let seen = user ? seedSeen(user.id, merged) : get().seen;
    const selected = selectedId ? merged.find((p) => p.id === selectedId) : undefined;
    if (user && selected) seen = markPostSeen(user.id, selected);
    const extra = opts?.extra ?? (opts?.append ? extraFromSelection(waterbodyId, merged, selectedId, get().detail) : null);
    set({
      posts: merged,
      nextCursor: cursor,
      seen,
      markers: feedMarkers(waterbodyId, merged, extra),
    });
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
    if (!opts?.skipList) await get().refreshPosts();
  },

  openOnMap: async (post) => {
    if (get().waterbodyId !== post.waterbody.id) {
      set({ detail: post, selectedId: post.id });
      await get().setWaterbody(post.waterbody.id, { keepPostId: post.id });
    } else {
      const nextMarkers = pinIfMissing(get().waterbodyId, get().markers, post);
      if (nextMarkers) set({ markers: nextMarkers });
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
