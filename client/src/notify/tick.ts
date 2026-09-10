import type { StoreApi } from "zustand";
import type { ActivityFeed } from "./settings";
import { loadNotifySettings, notifyChannelsOn, notifyEventsOn, planNotifications } from "./settings";
import { playNotifySound } from "./sound";
import { showNotifyItem } from "./show";
import { appIsFocused } from "@/shared/platform";
import type { Store } from "../store/types";

const seenKeys = new Set<string>();
let sinceIso = "";

export function resetNotifyCursor() {
  sinceIso = new Date().toISOString();
  seenKeys.clear();
}

function remember(keys: string[]) {
  for (const k of keys) seenKeys.add(k);
  if (seenKeys.size > 400) seenKeys.clear();
}

function advanceSince(feed: ActivityFeed) {
  const times = [sinceIso, ...feed.posts.map((p) => p.createdAt), ...feed.comments.map((c) => c.createdAt)];
  times.sort();
  sinceIso = times[times.length - 1] || new Date().toISOString();
}

export async function processActivity(store: StoreApi<Store>) {
  const { api, user, selectedId } = store.getState();
  if (!user) return;
  if (!sinceIso) resetNotifyCursor();
  const settings = loadNotifySettings(user.id);
  if (!notifyChannelsOn(settings) || !notifyEventsOn(settings)) {
    sinceIso = new Date().toISOString();
    return;
  }
  try {
    const feed = await api.catalog.activity(sinceIso);
    advanceSince(feed);
    const items = planNotifications(feed, settings, {
      selectedId,
      focused: appIsFocused(),
      seenKeys,
    });
    if (!items.length) return;
    remember(items.map((i) => i.key));
    if (settings.windows) {
      for (const item of items) await showNotifyItem(item, { silent: !settings.sound });
    }
    const nativeAndroidSound = Boolean(window.rf4Android) && settings.windows;
    if (settings.sound && !nativeAndroidSound) playNotifySound();
  } catch {
    /* offline / stale token */
  }
}

export async function previewNotification(userId: string, postId?: string) {
  const settings = loadNotifySettings(userId);
  const item = {
    key: "preview",
    postId: postId ?? "",
    title: "RF4 Spots",
    body: "Тестовое уведомление",
  };
  if (settings.windows) await showNotifyItem(item, { silent: !settings.sound });
  const nativeAndroidSound = Boolean(window.rf4Android) && settings.windows;
  if (settings.sound && !nativeAndroidSound) playNotifySound();
  if (!settings.windows && !settings.sound) await showNotifyItem(item);
}
