import type { StoreApi } from "zustand";
import { ALL_WATERBODIES } from "../shared/constants";
import { peekCachedFish, peekCachedWaterbodies } from "../api/catalog";
import { processActivity, resetNotifyCursor } from "../notify/tick";
import { saveWaterbodyId } from "../shared/persist";
import { appIsHidden } from "../shared/platform";
import { detailActionAfterFeed, type FeedTouch } from "../features/spots/feedDelta";
import type { Store } from "./types";

const FORE_MS = 10_000;
const BACK_MS = 45_000;

let store: StoreApi<Store>;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollBusy = false;
let pendingSinceRev: number | null = null;

export function bindSync(api: StoreApi<Store>) {
  store = api;
}

async function applyFeedTouch(touch: FeedTouch | void) {
  const action = detailActionAfterFeed(store.getState().selectedId, touch);
  if (action === "close") {
    await store.getState().selectPost(null);
    return;
  }
  if (action === "refresh") await store.getState().refreshDetail({ skipList: true });
}

async function tickSync() {
  if (pollBusy) return;
  const { api, user, syncRev } = store.getState();
  if (!user) return;
  pollBusy = true;
  try {
    const { rev } = await api.catalog.sync();
    const changed = rev !== syncRev;
    if (appIsHidden()) {
      if (changed) {
        await processActivity(store);
        if (pendingSinceRev == null) pendingSinceRev = syncRev;
        store.setState({ syncRev: rev });
      }
      return;
    }
    const catchUpFrom = pendingSinceRev;
    pendingSinceRev = null;
    if (catchUpFrom != null) {
      await processActivity(store);
      const touch = await store.getState().refreshPosts({ sinceRev: catchUpFrom });
      await applyFeedTouch(touch);
      store.setState({ syncRev: rev });
      return;
    }
    if (changed) {
      await processActivity(store);
      const touch = await store.getState().refreshPosts({ sinceRev: syncRev });
      await applyFeedTouch(touch);
      store.setState({ syncRev: rev });
    }
  } catch {
    /* offline / stale token */
  } finally {
    pollBusy = false;
  }
}

function pollMs() {
  return appIsHidden() ? BACK_MS : FORE_MS;
}

function armTimer() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  pollTimer = setInterval(() => void tickSync(), pollMs());
}

function onVisibility() {
  armTimer();
  if (!appIsHidden()) void tickSync();
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  document.removeEventListener("visibilitychange", onVisibility);
}

export function stopPoll() {
  clearPoll();
  resetNotifyCursor();
  pendingSinceRev = null;
}

export function startPoll() {
  clearPoll();
  armTimer();
  document.addEventListener("visibilitychange", onVisibility);
}

function hydrateCatalogCache() {
  const { api, waterbodyId } = store.getState();
  const origin = api.baseUrl;
  const fish = peekCachedFish(origin);
  const waterbodies = peekCachedWaterbodies(origin);
  if (fish == null && waterbodies == null) return;
  const patch: Partial<Store> = {};
  if (fish) patch.fish = fish;
  if (waterbodies) {
    const saved = waterbodyId;
    const nextId =
      saved && (saved === ALL_WATERBODIES || waterbodies.some((w) => w.id === saved)) ? saved : ALL_WATERBODIES;
    saveWaterbodyId(nextId);
    patch.waterbodies = waterbodies;
    patch.waterbodyId = nextId;
  }
  store.setState(patch);
}

export async function loadCatalogAndPosts() {
  hydrateCatalogCache();
  const { api, waterbodyId } = store.getState();
  const [{ fish }, { waterbodies }, { rev }] = await Promise.all([
    api.catalog.fish(),
    api.catalog.waterbodies(),
    api.catalog.sync(),
  ]);
  const saved = waterbodyId;
  const nextId =
    saved && (saved === ALL_WATERBODIES || waterbodies.some((w) => w.id === saved)) ? saved : ALL_WATERBODIES;
  saveWaterbodyId(nextId);
  store.setState({ fish, waterbodies, waterbodyId: nextId, syncRev: rev });
  await store.getState().refreshPosts();
  resetNotifyCursor();
  startPoll();
}
