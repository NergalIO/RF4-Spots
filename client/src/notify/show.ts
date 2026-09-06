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

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
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
  if (window.rf4?.showNotify) return "granted";
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function showNotifyItem(item: NotifyItem): Promise<boolean> {
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
  const unsub = window.rf4?.onNotifyClick?.((payload) => {
    dispatchOpenPost(payload.postId);
  });
  return () => unsub?.();
}
