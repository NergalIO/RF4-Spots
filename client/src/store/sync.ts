import type { StoreApi } from "zustand";
import { ALL_WATERBODIES } from "../constants";
import { saveWaterbodyId } from "../persist";
import type { Store } from "./types";

const POLL_MS = 4000;
const HEARTBEAT_MS = 20_000;

let store: StoreApi<Store>;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let beatTimer: ReturnType<typeof setInterval> | null = null;
let pollBusy = false;

export function bindSync(api: StoreApi<Store>) {
  store = api;
}

async function tickPresence() {
  const { api, user } = store.getState();
  if (!user) return;
  try {
    await api.me();
  } catch {
    /* offline / stale token */
  }
}

async function tickSync() {
  if (pollBusy || document.hidden) return;
  const { api, user, syncStamp } = store.getState();
  if (!user) return;
  pollBusy = true;
  try {
    const { stamp } = await api.sync();
    if (stamp === syncStamp) return;
    store.setState({ syncStamp: stamp });
    await store.getState().refreshPosts();
    await store.getState().refreshMarkers();
    if (store.getState().selectedId) await store.getState().refreshDetail({ skipList: true });
  } catch {
    /* offline / stale token */
  } finally {
    pollBusy = false;
  }
}

function onVisibility() {
  if (!document.hidden) void tickSync();
}

export function stopPoll() {
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

export function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => void tickSync(), POLL_MS);
  beatTimer = setInterval(() => void tickPresence(), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", onVisibility);
  void tickPresence();
}

export async function loadCatalogAndPosts() {
  const { api, waterbodyId } = store.getState();
  const [{ fish }, { waterbodies }, { stamp }] = await Promise.all([
    api.fish(),
    api.waterbodies(),
    api.sync(),
  ]);
  const saved = waterbodyId;
  const nextId =
    saved && (saved === ALL_WATERBODIES || waterbodies.some((w) => w.id === saved)) ? saved : ALL_WATERBODIES;
  saveWaterbodyId(nextId);
  store.setState({ fish, waterbodies, waterbodyId: nextId, syncStamp: stamp });
  await Promise.all([store.getState().refreshPosts(), store.getState().refreshMarkers()]);
  startPoll();
}
