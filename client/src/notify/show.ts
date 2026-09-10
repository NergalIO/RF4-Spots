import type { NotifyItem } from "./settings";

export const OPEN_POST_EVENT = "rf4-open-post";

export function dispatchOpenPost(postId: string) {
  if (!postId) return;
  window.dispatchEvent(new CustomEvent(OPEN_POST_EVENT, { detail: { postId } }));
}

function html5Notify(item: NotifyItem) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const n = new Notification(item.title, { body: item.body, silent: true });
  n.onclick = () => {
    n.close();
    void window.rf4?.focusApp?.();
    window.focus();
    dispatchOpenPost(item.postId);
  };
  return true;
}

function androidPermission(): NotificationPermission | "unsupported" {
  const raw = window.rf4Android?.notifyPermission() ?? "unsupported";
  if (raw === "granted" || raw === "denied" || raw === "default") return raw;
  return "unsupported";
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  const android = window.rf4Android;
  if (android) {
    if (androidPermission() === "granted") return "granted";
    return await new Promise((resolve) => {
      const finish = (state: string) => {
        window.clearTimeout(timer);
        window.__rf4NotifyPermission = undefined;
        resolve(state === "granted" ? "granted" : "denied");
      };
      const timer = window.setTimeout(() => finish(android.notifyPermission()), 20000);
      window.__rf4NotifyPermission = finish;
      android.requestNotifyPermission();
    });
  }
  if (window.rf4?.showNotify) return "granted";
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  if (window.rf4Android) return androidPermission();
  if (window.rf4?.showNotify) return "granted";
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function showNotifyItem(item: NotifyItem, opts?: { silent?: boolean }): Promise<boolean> {
  const silent = opts?.silent ?? true;
  if (window.rf4Android) {
    try {
      if (window.rf4Android.notifyPermission() !== "granted") return false;
      return window.rf4Android.showNotify(item.title, item.body, item.postId || "", silent);
    } catch {
      return false;
    }
  }
  if (window.rf4?.showNotify) {
    try {
      const ok = await window.rf4.showNotify({ title: item.title, body: item.body, postId: item.postId });
      if (ok) return true;
    } catch {
      /* fall through to HTML5 */
    }
  }
  return html5Notify(item);
}

export function bindNotifyClicks() {
  window.__rf4NotifyClicked = (postId) => dispatchOpenPost(postId);
  const unsub = window.rf4?.onNotifyClick?.((payload) => {
    dispatchOpenPost(payload.postId);
  });
  return () => {
    window.__rf4NotifyClicked = undefined;
    unsub?.();
  };
}
