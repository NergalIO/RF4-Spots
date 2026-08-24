import { create } from "zustand";
import { ALL_WATERBODIES } from "./constants";
import { Api } from "./api";
import { DEFAULT_SERVER_URL, loadSession, saveSession } from "./session";
import type { Filters, Fish, Post, User, Waterbody } from "./types";

const emptyFilters = (): Filters => ({
  fishId: "",
  catchType: "",
  catchFrom: "",
  catchTo: "",
  uploadedFrom: "",
  uploadedTo: "",
  sort: "createdAt",
});

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
  boot: () => Promise<void>;
  login: (nickname: string, password: string, serverUrl: string) => Promise<void>;
  register: (nickname: string, password: string, serverUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  setWaterbody: (id: string) => Promise<void>;
  setFilters: (patch: Partial<Filters>) => Promise<void>;
  selectPost: (id: string | null) => Promise<void>;
  refreshPosts: () => Promise<void>;
  refreshDetail: () => Promise<void>;
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

  setError: (error) => set({ error }),
  toggleRuler: () => set({ rulerOn: !get().rulerOn }),

  boot: async () => {
    const session = await loadSession();
    const api = new Api(session.serverUrl, session.token);
    set({ api, ready: true });
    if (!session.token) return;
    try {
      const { user } = await api.me();
      set({ user });
      await loadCatalogAndPosts();
    } catch {
      await saveSession({ serverUrl: session.serverUrl, token: "" });
      set({ user: null, api: new Api(session.serverUrl, "") });
    }
  },

  login: async (nickname, password, serverUrl) => {
    const api = new Api(serverUrl.replace(/\/$/, ""), "");
    const { token, user } = await api.login(nickname, password);
    const authed = new Api(api.baseUrl, token);
    await saveSession({ serverUrl: api.baseUrl, token });
    set({ api: authed, user, error: "" });
    await loadCatalogAndPosts();
  },

  register: async (nickname, password, serverUrl) => {
    const api = new Api(serverUrl.replace(/\/$/, ""), "");
    const { token, user } = await api.register(nickname, password);
    const authed = new Api(api.baseUrl, token);
    await saveSession({ serverUrl: api.baseUrl, token });
    set({ api: authed, user, error: "" });
    await loadCatalogAndPosts();
  },

  logout: async () => {
    const { api } = get();
    await saveSession({ serverUrl: api.baseUrl, token: "" });
    set({
      user: null,
      api: new Api(api.baseUrl, ""),
      posts: [],
      detail: null,
      selectedId: null,
      fish: [],
      waterbodies: [],
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
  },

  refreshPosts: async () => {
    const { api, waterbodyId, filters, selectedId } = get();
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
    set({ posts });
    if (selectedId && !posts.some((p) => p.id === selectedId)) {
      set({ selectedId: null, detail: null });
    }
  },

  refreshDetail: async () => {
    const { selectedId, api } = get();
    if (!selectedId) return;
    const { post } = await api.post(selectedId);
    set({ detail: post });
    await get().refreshPosts();
  },
}));

async function loadCatalogAndPosts() {
  const { api, waterbodyId } = useStore.getState();
  const [{ fish }, { waterbodies }] = await Promise.all([api.fish(), api.waterbodies()]);
  const nextId =
    waterbodyId && (waterbodyId === ALL_WATERBODIES || waterbodies.some((w) => w.id === waterbodyId))
      ? waterbodyId
      : ALL_WATERBODIES;
  useStore.setState({ fish, waterbodies, waterbodyId: nextId });
  await useStore.getState().refreshPosts();
}
