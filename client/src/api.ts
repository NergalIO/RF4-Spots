import type { CatchType, CommentItem, Fish, Post, User, Waterbody } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class Api {
  constructor(
    public baseUrl: string,
    public token: string,
  ) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) {
      throw new ApiError(res.status, data.error || `Ошибка ${res.status}`);
    }
    return data;
  }

  fileUrl(path: string) {
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }

  login(nickname: string, password: string) {
    return this.req<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ nickname, password }),
    });
  }

  register(nickname: string, password: string) {
    return this.req<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ nickname, password }),
    });
  }

  me() {
    return this.req<{ user: User }>("/auth/me");
  }

  fish() {
    return this.req<{ fish: Fish[] }>("/fish");
  }

  waterbodies() {
    return this.req<{ waterbodies: Waterbody[] }>("/waterbodies");
  }

  sync() {
    return this.req<{ stamp: string }>("/sync");
  }

  posts(params: Record<string, string>) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
    return this.req<{ posts: Post[] }>(`/posts?${q.toString()}`);
  }

  post(id: string) {
    return this.req<{ post: Post }>(`/posts/${id}`);
  }

  createPost(fd: FormData) {
    return this.req<{ post: Post }>("/posts", { method: "POST", body: fd });
  }

  updatePost(id: string, fd: FormData) {
    return this.req<{ post: Post }>(`/posts/${id}`, { method: "PATCH", body: fd });
  }

  deletePost(id: string) {
    return this.req<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" });
  }

  addComment(postId: string, fd: FormData) {
    return this.req<{ comment: CommentItem }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: fd,
    });
  }

  deleteComment(id: string) {
    return this.req<{ ok: boolean }>(`/comments/${id}`, { method: "DELETE" });
  }
}

export const CATCH_LABEL: Record<CatchType, string> = {
  farm: "Фарм",
  trophy: "Трофей",
  farm_trophy: "Фарм с трофеями",
};

export function fmtCoord(x: number, y: number) {
  const rx = Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1);
  const ry = Math.abs(y - Math.round(y)) < 0.05 ? String(Math.round(y)) : y.toFixed(1);
  return `${rx}:${ry}`;
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU");
}

export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}
