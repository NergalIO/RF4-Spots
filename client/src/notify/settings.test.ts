import { describe, expect, it, beforeEach } from "vitest";
import {
  defaultNotifySettings,
  loadNotifySettings,
  parseNotifySettings,
  planNotifications,
  type ActivityFeed,
  type NotifySettings,
} from "./settings";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    },
  });
});

function settings(patch: Partial<NotifySettings> = {}): NotifySettings {
  return {
    ...defaultNotifySettings(),
    windows: true,
    sound: true,
    whenFocused: true,
    newPosts: true,
    commentsOwn: true,
    commentsFavorite: true,
    commentsAll: false,
    ...patch,
  };
}

function feed(partial: Partial<ActivityFeed> = {}): ActivityFeed {
  return {
    posts: [
      {
        id: "p1",
        createdAt: "2026-09-06T12:00:00.000Z",
        authorNickname: "Иван",
        fishName: "Щука",
        waterbodyName: "Яма",
      },
    ],
    comments: [
      {
        id: "c1",
        postId: "mine",
        createdAt: "2026-09-06T12:01:00.000Z",
        authorNickname: "Пётр",
        excerpt: "красава",
        ownPost: true,
        favorited: false,
        fishName: "Судак",
        waterbodyName: "Яма",
      },
      {
        id: "c2",
        postId: "fav",
        createdAt: "2026-09-06T12:02:00.000Z",
        authorNickname: "Оля",
        excerpt: "координаты?",
        ownPost: false,
        favorited: true,
        fishName: "Лещ",
        waterbodyName: "Озеро",
      },
      {
        id: "c3",
        postId: "other",
        createdAt: "2026-09-06T12:03:00.000Z",
        authorNickname: "Макс",
        excerpt: "ок",
        ownPost: false,
        favorited: false,
        fishName: "Карп",
        waterbodyName: "Река",
      },
    ],
    ...partial,
  };
}

const ctx = { selectedId: null as string | null, focused: false, seenKeys: new Set<string>() };

describe("parseNotifySettings", () => {
  it("fills defaults for a partial object", () => {
    expect(parseNotifySettings({ sound: false })).toMatchObject({ sound: false, newPosts: true, commentsOwn: true });
  });
});

describe("loadNotifySettings android migration", () => {
  it("turns on system notifications once for the Android WebView", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        rf4Android: {
          notifyPermission: () => "denied",
          requestNotifyPermission: () => undefined,
          showNotify: () => true,
        },
      },
    });
    try {
      localStorage.setItem("rf4spots-notify:u1", JSON.stringify({ windows: false, sound: true }));
      expect(loadNotifySettings("u1").windows).toBe(true);
      expect(JSON.parse(localStorage.getItem("rf4spots-notify:u1") ?? "{}").windows).toBe(true);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe("planNotifications", () => {
  it("emits a new post and comments on own and favorite posts", () => {
    const items = planNotifications(feed(), settings(), ctx);
    expect(items.map((i) => i.title)).toEqual([
      "Новый пост",
      "Комментарий к вашему посту",
      "Комментарий к избранному",
    ]);
    expect(items[0].body).toContain("Иван");
    expect(items[1].body).toContain("красава");
  });

  it("skips foreign comments unless commentsAll is on", () => {
    const off = planNotifications(feed(), settings({ newPosts: false }), ctx);
    expect(off.some((i) => i.postId === "other")).toBe(false);
    const on = planNotifications(feed(), settings({ newPosts: false, commentsAll: true }), ctx);
    expect(on.some((i) => i.postId === "other")).toBe(true);
  });

  it("does not notify while focused unless allowed", () => {
    expect(planNotifications(feed(), settings({ whenFocused: false }), { ...ctx, focused: true })).toEqual([]);
  });

  it("skips comments on the open post when focused", () => {
    const items = planNotifications(feed(), settings(), { ...ctx, focused: true, selectedId: "mine" });
    expect(items.some((i) => i.postId === "mine")).toBe(false);
    expect(items.some((i) => i.title === "Новый пост")).toBe(true);
  });

  it("does not repeat seen keys", () => {
    const items = planNotifications(feed(), settings(), { ...ctx, seenKeys: new Set(["p:p1", "c:c1"]) });
    expect(items.map((i) => i.key)).toEqual(["c:c2"]);
  });

  it("collapses a long batch", () => {
    const many: ActivityFeed = {
      posts: Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        createdAt: `2026-09-06T12:0${i}:00.000Z`,
        authorNickname: "Иван",
        fishName: "Щука",
        waterbodyName: "Яма",
      })),
      comments: [],
    };
    const items = planNotifications(many, settings(), ctx);
    expect(items).toHaveLength(4);
    expect(items[3].title).toBe("RF4 Spots");
    expect(items[3].body).toContain("Ещё 2");
  });
});
