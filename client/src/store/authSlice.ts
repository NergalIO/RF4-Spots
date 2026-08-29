import type { StateCreator } from "zustand";
import { Api } from "../api";
import { DEFAULT_SERVER_URL, loadSession, saveSession } from "../session";
import { resolveServerUrl } from "../serverUrl";
import { loadCatalogAndPosts, stopPoll } from "./sync";
import type { Store } from "./types";

export type AuthSlice = Pick<
  Store,
  "ready" | "api" | "user" | "error" | "boot" | "login" | "register" | "logout" | "setToken" | "setError"
>;

export const createAuthSlice: StateCreator<Store, [], [], AuthSlice> = (set, get) => ({
  ready: false,
  api: new Api(DEFAULT_SERVER_URL, ""),
  user: null,
  error: "",
  setError: (error) => set({ error }),

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
});
