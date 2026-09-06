export type ActivityPost = {
  id: string;
  createdAt: string;
  authorNickname: string;
  fishName: string;
  waterbodyName: string;
};

export type ActivityComment = {
  id: string;
  postId: string;
  createdAt: string;
  authorNickname: string;
  excerpt: string;
  ownPost: boolean;
  favorited: boolean;
  fishName: string;
  waterbodyName: string;
};

export type ActivityFeed = {
  posts: ActivityPost[];
  comments: ActivityComment[];
};

export type NotifySettings = {
  windows: boolean;
  sound: boolean;
  whenFocused: boolean;
  newPosts: boolean;
  commentsOwn: boolean;
  commentsFavorite: boolean;
  commentsAll: boolean;
};

export type NotifyItem = {
  key: string;
  postId: string;
  title: string;
  body: string;
};

const KEY = (userId: string) => `rf4spots-notify:${userId}`;

export function defaultNotifySettings(): NotifySettings {
  const electron = typeof window !== "undefined" && Boolean(window.rf4);
  return {
    windows: electron,
    sound: true,
    whenFocused: false,
    newPosts: true,
    commentsOwn: true,
    commentsFavorite: true,
    commentsAll: false,
  };
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function parseNotifySettings(raw: unknown): NotifySettings {
  const base = defaultNotifySettings();
  if (!raw || typeof raw !== "object") return base;
  const v = raw as Partial<Record<keyof NotifySettings, unknown>>;
  return {
    windows: asBool(v.windows, base.windows),
    sound: asBool(v.sound, base.sound),
    whenFocused: asBool(v.whenFocused, base.whenFocused),
    newPosts: asBool(v.newPosts, base.newPosts),
    commentsOwn: asBool(v.commentsOwn, base.commentsOwn),
    commentsFavorite: asBool(v.commentsFavorite, base.commentsFavorite),
    commentsAll: asBool(v.commentsAll, base.commentsAll),
  };
}

export function loadNotifySettings(userId: string): NotifySettings {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return defaultNotifySettings();
    return parseNotifySettings(JSON.parse(raw) as unknown);
  } catch {
    return defaultNotifySettings();
  }
}

export function saveNotifySettings(userId: string, settings: NotifySettings) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function notifyChannelsOn(settings: NotifySettings) {
  return settings.windows || settings.sound;
}

export function notifyEventsOn(settings: NotifySettings) {
  return settings.newPosts || settings.commentsOwn || settings.commentsFavorite || settings.commentsAll;
}

function commentWanted(c: ActivityComment, settings: NotifySettings) {
  if (settings.commentsAll) return true;
  if (c.ownPost && settings.commentsOwn) return true;
  if (c.favorited && settings.commentsFavorite) return true;
  return false;
}

function commentTitle(c: ActivityComment) {
  if (c.ownPost) return "Комментарий к вашему посту";
  if (c.favorited) return "Комментарий к избранному";
  return "Новый комментарий";
}

function commentBody(c: ActivityComment) {
  const text = c.excerpt || "без текста";
  return `${c.authorNickname}: ${text}`;
}

function postBody(p: ActivityPost) {
  return `${p.authorNickname} · ${p.fishName} · ${p.waterbodyName}`;
}

function ruMore(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "уведомление";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "уведомления";
  return "уведомлений";
}

const MAX_TOASTS = 3;

export function planNotifications(
  feed: ActivityFeed,
  settings: NotifySettings,
  opts: { selectedId: string | null; focused: boolean; seenKeys: Set<string> },
): NotifyItem[] {
  if (!notifyChannelsOn(settings) || !notifyEventsOn(settings)) return [];
  if (opts.focused && !settings.whenFocused) return [];

  const items: NotifyItem[] = [];
  if (settings.newPosts) {
    for (const p of feed.posts) {
      const key = `p:${p.id}`;
      if (opts.seenKeys.has(key)) continue;
      items.push({ key, postId: p.id, title: "Новый пост", body: postBody(p) });
    }
  }
  for (const c of feed.comments) {
    if (!commentWanted(c, settings)) continue;
    if (opts.focused && opts.selectedId === c.postId) continue;
    const key = `c:${c.id}`;
    if (opts.seenKeys.has(key)) continue;
    items.push({ key, postId: c.postId, title: commentTitle(c), body: commentBody(c) });
  }

  if (items.length <= MAX_TOASTS) return items;
  const head = items.slice(0, MAX_TOASTS);
  const rest = items.length - MAX_TOASTS;
  head.push({
    key: `more:${items[items.length - 1].key}`,
    postId: "",
    title: "RF4 Spots",
    body: `Ещё ${rest} ${ruMore(rest)}`,
  });
  return head;
}
