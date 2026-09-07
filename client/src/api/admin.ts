import type { AdminStats, AdminUser, Invite, ModerationReport } from "../types";
import type { Http } from "./http";

export function adminApi(http: Http) {
  return {
    users: () => http.req<{ users: AdminUser[] }>("/admin/users"),
    patchUser: (id: string, body: { role?: "player" | "admin"; disabled?: boolean }) =>
      http.req<{ user: AdminUser }>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteUser: (id: string) => http.req<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
    stats: () => http.req<{ stats: AdminStats }>("/admin/stats"),
    invites: () => http.req<{ invites: Invite[] }>("/admin/invites"),
    createInvite: (expiresAt?: string) =>
      http.req<{ invite: Invite }>("/admin/invites", {
        method: "POST",
        body: JSON.stringify(expiresAt ? { expiresAt } : {}),
      }),
    reports: (status = "open") =>
      http.req<{ reports: ModerationReport[] }>(`/admin/reports?status=${encodeURIComponent(status)}`),
    patchReport: (id: string, body: { status: "open" | "resolved" | "dismissed"; hide?: boolean }) =>
      http.req<{ report: { id: string; status: string } }>(`/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  };
}
