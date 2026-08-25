import { create } from "zustand";
import { ALL_WATERBODIES } from "./constants";
import { Api } from "./api";
import { DEFAULT_SERVER_URL, loadSession, saveSession } from "./session";
import { resolveServerUrl } from "./serverUrl";
import type { Filters, Fish, Post, User, Waterbody } from "./types";
import { markPostSeen, seedSeen, type SeenMap } from "./unread";

const emptyFilters = (): Filters => ({
  fishId: "",
  catchType: "",
  catchFrom: "",
  catchTo: "",
  uploadedFrom: "",
  uploadedTo: "",
  sort: "createdAt",
});

const POLL_MS = 4000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
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
  selectedId: string | null;
  detail: Post | null;
  filters: Filters;
  rulerOn: boolean;
  seen: SeenMap;
  syncStamp: string;
  boot: () => Promise<void>;
  login: (nickname: string, password: string, serverUrl: string) => Promise<void>;
  register: (nickname: string, password: string, serverUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  setWaterbody: (id: string) => Promise<void>;
  setFilters: (patch: Partial<Filters>) => Promise<void>;
  selectPost: (id: string | null) => Promise<void>;
  refreshPosts: () => Promise<void>;
  refreshDetail: (opts?: { skipList?: boolean }) => Promise<void>;
  markSeen: (post: Post) => void;
  toggleRuler: () => void;
  setError: (msg: string) => void;
};

export const useStore = create<Store>((set, get) => ({
  ready: false,
  api: new Api(DEFAULT_SERVER_URL, ""),
  user: null,
  error: "",
  fish: [],
  waterbodies: [],
  waterbodyId: "",
  posts: [],
  selectedId: null,
  detail: null,
  filters: emptyFilters(),
  rulerOn: false,
  seen: {},
  syncStamp: "",

  setError: (error) => set({ error }),
  toggleRuler: () => set({ rulerOn: !get().rulerOn }),

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

  register: async (nickname, password, serverUrl) => {
    const api = new Api(resolveServerUrl(serverUrl), "");
    const { token, user } = await api.register(nickname, password);
    const authed = new Api(api.baseUrl, token);
    await saveSession({ serverUrl: api.baseUrl, token });
    set({ api: authed, user, error: "" });
    await loadCatalogAndPosts();
  },

  logout: async () => {
    const { api } = get();
    stopPoll();
    await saveSession({ serverUrl: api.baseUrl, token: "" });
    set({
      user: null,
      api: new Api(api.baseUrl, ""),
      posts: [],
      detail: null,
      selectedId: null,
      fish: [],
      waterbodies: [],
      seen: {},
      syncStamp: "",
    });
  },

  setWaterbody: async (id) => {
    set({
      waterbodyId: id,
      selectedId: null,
      detail: null,
      rulerOn: id === ALL_WATERBODIES ? false : get().rulerOn,
    });
    await get().refreshPosts();
  },

  setFilters: async (patch) => {
    set({ filters: { ...get().filters, ...patch } });
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

  refreshPosts: async () => {
    const { api, waterbodyId, filters, selectedId, user } = get();
    if (!waterbodyId) return;
    const { posts } = await api.posts({
      waterbodyId: waterbodyId === ALL_WATERBODIES ? "" : waterbodyId,
      fishId: filters.fishId,
      catchType: filters.catchType,
      catchFrom: filters.catchFrom,
      catchTo: filters.catchTo,
      uploadedFrom: filters.uploadedFrom,
      uploadedTo: filters.uploadedTo,
      sort: filters.sort,
    });
    let seen = user ? seedSeen(user.id, posts) : get().seen;
    const selected = selectedId ? posts.find((p) => p.id === selectedId) : undefined;
    if (user && selected) seen = markPostSeen(user.id, selected);
    set({ posts, seen });
    if (selectedId && !posts.some((p) => p.id === selectedId)) {
      set({ selectedId: null, detail: null });
    }
  },

  refreshDetail: async (opts) => {
    const { selectedId, api } = get();
    if (!selectedId) return;
    const { post } = await api.post(selectedId);
    set({ detail: post });
    get().markSeen(post);
    if (!opts?.skipList) await get().refreshPosts();
  },
}));

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
  document.removeEventListener("visibilitychange", onVisibility);
}

function onVisibility() {
  if (!document.hidden) void tickSync();
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => void tickSync(), POLL_MS);
  document.addEventListener("visibilitychange", onVisibility);
}

async function loadCatalogAndPosts() {
  const { api, waterbodyId } = useStore.getState();
  const [{ fish }, { waterbodies }, { stamp }] = await Promise.all([
    api.fish(),
    api.waterbodies(),
    api.sync(),
  ]);
  const nextId =
    waterbodyId && (waterbodyId === ALL_WATERBODIES || waterbodies.some((w) => w.id === waterbodyId))
      ? waterbodyId
      : ALL_WATERBODIES;
  useStore.setState({ fish, waterbodies, waterbodyId: nextId, syncStamp: stamp });
  await useStore.getState().refreshPosts();
  startPoll();
}
