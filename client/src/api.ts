import type {
  AdminUser,
  CatchType,
  CommentItem,
  Fish,
  GuideDataset,
  GuideRow,
  Invite,
  ModerationReport,
  Post,
  PostMarker,
  User,
  Waterbody,
} from "./types";

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

  authConfig() {
    return this.req<{ allowRegister: boolean; invites: boolean }>("/auth/config");
  }

  login(nickname: string, password: string) {
    return this.req<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ nickname, password }),
    });
  }

  register(nickname: string, password: string, invite?: string) {
    return this.req<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ nickname, password, invite: invite || undefined }),
    });
  }

  changePassword(current: string, next: string) {
    return this.req<{ token: string; user: User }>("/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ current, next }),
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
    return this.req<{ posts: Post[]; nextCursor: string | null }>(`/posts?${q.toString()}`);
  }

  markers(waterbodyId: string) {
    const q = new URLSearchParams();
    if (waterbodyId) q.set("waterbodyId", waterbodyId);
    return this.req<{ markers: PostMarker[] }>(`/posts/markers?${q.toString()}`);
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

  setFavorite(id: string, on: boolean) {
    return this.req<{ ok: boolean; favorited: boolean }>(`/posts/${id}/favorite`, {
      method: on ? "POST" : "DELETE",
    });
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

  report(body: { postId?: string; commentId?: string; reason: string }) {
    return this.req<{ report: { id: string } }>("/reports", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  cafeOrders(waterbodyId: string) {
    return this.req<{ waterbodyId: string; url: string | null; names: string[] }>(
      `/cafe/orders?waterbodyId=${encodeURIComponent(waterbodyId)}`,
    );
  }

  adminUsers() {
    return this.req<{ users: AdminUser[] }>("/admin/users");
  }

  adminPatchUser(id: string, body: { role?: "player" | "admin"; disabled?: boolean }) {
    return this.req<{ user: AdminUser }>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  adminInvites() {
    return this.req<{ invites: Invite[] }>("/admin/invites");
  }

  adminCreateInvite(expiresAt?: string) {
    return this.req<{ invite: Invite }>("/admin/invites", {
      method: "POST",
      body: JSON.stringify(expiresAt ? { expiresAt } : {}),
    });
  }

  adminReports(status = "open") {
    return this.req<{ reports: ModerationReport[] }>(`/admin/reports?status=${encodeURIComponent(status)}`);
  }

  adminPatchReport(id: string, body: { status: "open" | "resolved" | "dismissed"; hide?: boolean }) {
    return this.req<{ report: { id: string; status: string } }>(`/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  guides() {
    return this.req<{ datasets: GuideDataset[] }>("/guides");
  }

  guide(key: string) {
    return this.req<GuideDataset>(`/guides/${key}`);
  }

  saveGuide(key: string, rows: GuideRow[]) {
    return this.req<GuideDataset>(`/guides/${key}`, {
      method: "PUT",
      body: JSON.stringify({ rows }),
    });
  }

  addGuideRow(key: string, row: GuideRow) {
    return this.req<GuideDataset>(`/guides/${key}/row`, {
      method: "POST",
      body: JSON.stringify(row),
    });
  }

  updateGuideRow(key: string, index: number, row: GuideRow) {
    return this.req<GuideDataset>(`/guides/${key}/row/${index}`, {
      method: "PUT",
      body: JSON.stringify(row),
    });
  }

  deleteGuideRow(key: string, index: number) {
    return this.req<GuideDataset>(`/guides/${key}/row/${index}`, { method: "DELETE" });
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
