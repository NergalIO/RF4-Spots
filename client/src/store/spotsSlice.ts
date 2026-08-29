import type { StateCreator } from "zustand";
import { ALL_WATERBODIES } from "../constants";
import { loadFilters, loadWaterbodyId, saveFilters, saveWaterbodyId } from "../persist";
import { markPostSeen, seedSeen } from "../unread";
import type { Store } from "./types";

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
  | "refreshMarkers"
  | "refreshDetail"
  | "openOnMap"
  | "toggleFavorite"
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
    set({
      waterbodyId: id,
      selectedId: opts?.keepPostId ?? null,
      detail: opts?.keepPostId ? get().detail : null,
      rulerOn: id === ALL_WATERBODIES ? false : get().rulerOn,
      posts: [],
      nextCursor: null,
    });
    await Promise.all([get().refreshPosts(), get().refreshMarkers()]);
    if (opts?.keepPostId) await get().selectPost(opts.keepPostId);
  },

  setFilters: async (patch) => {
    const filters = { ...get().filters, ...patch };
    saveFilters(filters);
    set({ filters, posts: [], nextCursor: null });
    await get().refreshPosts();
  },

  selectPost: async (id) => {
    set({ selectedId: id });
    if (!id) {
      set({ detail: null });
      return;
    }
    const { api } = get();
    const { post } = await api.post(id);
    set({ detail: post });
    get().markSeen(post);
  },

  refreshPosts: async (opts) => {
    const { api, waterbodyId, filters, selectedId, user, nextCursor } = get();
    if (!waterbodyId) return;
    const { posts, nextCursor: cursor } = await api.posts({
      waterbodyId: waterbodyId === ALL_WATERBODIES ? "" : waterbodyId,
      fishId: filters.fishId,
      catchType: filters.catchType,
      catchFrom: filters.catchFrom,
      catchTo: filters.catchTo,
      uploadedFrom: filters.uploadedFrom,
      uploadedTo: filters.uploadedTo,
      sort: filters.sort,
      mine: filters.mine ? "1" : "",
      favorite: filters.favorite ? "1" : "",
      q: filters.q,
      take: "50",
      cursor: opts?.append && nextCursor ? nextCursor : "",
    });
    const merged = opts?.append ? [...get().posts, ...posts] : posts;
    let seen = user ? seedSeen(user.id, merged) : get().seen;
    const selected = selectedId ? merged.find((p) => p.id === selectedId) : undefined;
    if (user && selected) seen = markPostSeen(user.id, selected);
    set({ posts: merged, nextCursor: cursor, seen });
    if (selectedId && !opts?.append && !merged.some((p) => p.id === selectedId) && get().detail?.id !== selectedId) {
      /* keep detail if opened from map marker not yet in this page */
    }
  },

  loadMorePosts: async () => {
    if (!get().nextCursor) return;
    await get().refreshPosts({ append: true });
  },

  refreshMarkers: async () => {
    const { api, waterbodyId } = get();
    if (!waterbodyId || waterbodyId === ALL_WATERBODIES) {
      set({ markers: [] });
      return;
    }
    const { markers } = await api.markers(waterbodyId);
    set({ markers });
  },

  refreshDetail: async (opts) => {
    const { selectedId, api } = get();
    if (!selectedId) return;
    const { post } = await api.post(selectedId);
    set({ detail: post });
    get().markSeen(post);
    if (!opts?.skipList) await get().refreshPosts();
  },

  openOnMap: async (post) => {
    set({ flyToId: post.id });
    if (get().waterbodyId !== post.waterbody.id) {
      await get().setWaterbody(post.waterbody.id, { keepPostId: post.id });
    } else {
      await get().selectPost(post.id);
    }
  },

  toggleFavorite: async (post) => {
    const { api } = get();
    const { favorited } = await api.setFavorite(post.id, !post.favorited);
    set({
      posts: get().posts.map((p) => (p.id === post.id ? { ...p, favorited } : p)),
      detail: get().detail?.id === post.id ? { ...get().detail!, favorited } : get().detail,
    });
    if (get().filters.favorite && !favorited) await get().refreshPosts();
  },
});
