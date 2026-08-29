import { create } from "zustand";
import { ALL_WATERBODIES } from "./constants";
import { Api } from "./api";
import { DEFAULT_SERVER_URL, loadSession, saveSession } from "./session";
import { resolveServerUrl } from "./serverUrl";
import { loadFilters, loadWaterbodyId, saveFilters, saveWaterbodyId } from "./persist";
import type { Filters, Fish, Post, PostMarker, User, Waterbody } from "./types";
import { markPostSeen, seedSeen, type SeenMap } from "./unread";

const POLL_MS = 4000;
const HEARTBEAT_MS = 20_000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let beatTimer: ReturnType<typeof setInterval> | null = null;
let pollBusy = false;

type Store = {
  ready: boolean;
  api: Api;
  user: User | null;
  error: string;
  fish: Fish[];
  waterbodies: Waterbody[];
  waterbodyId: string;
  posts: Post[];
  markers: PostMarker[];
  nextCursor: string | null;
  selectedId: string | null;
  detail: Post | null;
  filters: Filters;
  rulerOn: boolean;
  seen: SeenMap;
  syncStamp: string;
  flyToId: string | null;
  boot: () => Promise<void>;
  login: (nickname: string, password: string, serverUrl: string) => Promise<void>;
  register: (nickname: string, password: string, serverUrl: string, invite?: string) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string, user: User) => Promise<void>;
  setWaterbody: (id: string, opts?: { keepPostId?: string }) => Promise<void>;
  setFilters: (patch: Partial<Filters>) => Promise<void>;
  selectPost: (id: string | null) => Promise<void>;
  refreshPosts: (opts?: { append?: boolean }) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  refreshMarkers: () => Promise<void>;
  refreshDetail: (opts?: { skipList?: boolean }) => Promise<void>;
  openOnMap: (post: Post) => Promise<void>;
  toggleFavorite: (post: Post) => Promise<void>;
  markSeen: (post: Post) => void;
  toggleRuler: () => void;
  setError: (msg: string) => void;
  clearFlyTo: () => void;
};

export const useStore = create<Store>((set, get) => ({
  ready: false,
  api: new Api(DEFAULT_SERVER_URL, ""),
  user: null,
  error: "",
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

  setError: (error) => set({ error }),
  toggleRuler: () => set({ rulerOn: !get().rulerOn }),
  clearFlyTo: () => set({ flyToId: null }),

  markSeen: (post) => {
    const user = get().user;
    if (!user) return;
    set({ seen: markPostSeen(user.id, post) });
  },

  boot: async () => {
    const session = await loadSession();
    if (!session.token) {
      set({ api: new Api(session.serverUrl, ""), ready: true, user: null });
      return;
    }
    const api = new Api(session.serverUrl, session.token);
    try {
      const { user } = await api.me();
      set({ api, user, ready: true });
    } catch {
      stopPoll();
      await saveSession({ serverUrl: session.serverUrl, token: "" });
      set({ user: null, api: new Api(session.serverUrl, ""), ready: true, seen: {}, syncStamp: "" });
      return;
    }
    try {
      await loadCatalogAndPosts();
    } catch {
      set({ error: "Не удалось загрузить данные с сервера" });
    }
  },

  login: async (nickname, password, serverUrl) => {
    const api = new Api(resolveServerUrl(serverUrl), "");
    const { token, user } = await api.login(nickname, password);
    const authed = new Api(api.baseUrl, token);
    await saveSession({ serverUrl: api.baseUrl, token });
    set({ api: authed, user, error: "" });
    await loadCatalogAndPosts();
  },

  register: async (nickname, password, serverUrl, invite) => {
    const api = new Api(resolveServerUrl(serverUrl), "");
    const { token, user } = await api.register(nickname, password, invite);
    const authed = new Api(api.baseUrl, token);
    await saveSession({ serverUrl: api.baseUrl, token });
    set({ api: authed, user, error: "" });
    await loadCatalogAndPosts();
  },

  setToken: async (token, user) => {
    const { api } = get();
    const authed = new Api(api.baseUrl, token);
    await saveSession({ serverUrl: api.baseUrl, token });
    set({ api: authed, user });
  },

  logout: async () => {
    const { api } = get();
    stopPoll();
    await saveSession({ serverUrl: api.baseUrl, token: "" });
    set({
      user: null,
      api: new Api(api.baseUrl, ""),
      posts: [],
      markers: [],
      detail: null,
      selectedId: null,
      fish: [],
      waterbodies: [],
      seen: {},
      syncStamp: "",
      nextCursor: null,
    });
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
}));

async function tickPresence() {
  const { api, user } = useStore.getState();
  if (!user) return;
  try {
    await api.me();
  } catch {
    /* offline / stale token */
  }
}

async function tickSync() {
  if (pollBusy || document.hidden) return;
  const { api, user, syncStamp } = useStore.getState();
  if (!user) return;
  pollBusy = true;
  try {
    const { stamp } = await api.sync();
    if (stamp === syncStamp) return;
    useStore.setState({ syncStamp: stamp });
    await useStore.getState().refreshPosts();
    await useStore.getState().refreshMarkers();
    if (useStore.getState().selectedId) await useStore.getState().refreshDetail({ skipList: true });
  } catch {
    /* offline / stale token */
  } finally {
    pollBusy = false;
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (beatTimer) {
    clearInterval(beatTimer);
    beatTimer = null;
  }
  document.removeEventListener("visibilitychange", onVisibility);
}

function onVisibility() {
  if (!document.hidden) void tickSync();
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => void tickSync(), POLL_MS);
  beatTimer = setInterval(() => void tickPresence(), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", onVisibility);
  void tickPresence();
}

async function loadCatalogAndPosts() {
  const { api, waterbodyId } = useStore.getState();
  const [{ fish }, { waterbodies }, { stamp }] = await Promise.all([
    api.fish(),
    api.waterbodies(),
    api.sync(),
  ]);
  const saved = waterbodyId;
  const nextId =
    saved && (saved === ALL_WATERBODIES || waterbodies.some((w) => w.id === saved)) ? saved : ALL_WATERBODIES;
  saveWaterbodyId(nextId);
  useStore.setState({ fish, waterbodies, waterbodyId: nextId, syncStamp: stamp });
  await Promise.all([useStore.getState().refreshPosts(), useStore.getState().refreshMarkers()]);
  startPoll();
}
