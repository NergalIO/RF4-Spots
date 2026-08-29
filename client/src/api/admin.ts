import type { AdminStats, AdminUser, Invite, ModerationReport } from "../types";
import type { Http } from "./http";

export function adminApi(http: Http) {
  return {
    adminUsers: () => http.req<{ users: AdminUser[] }>("/admin/users"),
    adminPatchUser: (id: string, body: { role?: "player" | "admin"; disabled?: boolean }) =>
      http.req<{ user: AdminUser }>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    adminDeleteUser: (id: string) => http.req<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
    adminStats: () => http.req<{ stats: AdminStats }>("/admin/stats"),
    adminInvites: () => http.req<{ invites: Invite[] }>("/admin/invites"),
    adminCreateInvite: (expiresAt?: string) =>
      http.req<{ invite: Invite }>("/admin/invites", {
        method: "POST",
        body: JSON.stringify(expiresAt ? { expiresAt } : {}),
      }),
    adminReports: (status = "open") =>
      http.req<{ reports: ModerationReport[] }>(`/admin/reports?status=${encodeURIComponent(status)}`),
    adminPatchReport: (id: string, body: { status: "open" | "resolved" | "dismissed"; hide?: boolean }) =>
      http.req<{ report: { id: string; status: string } }>(`/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  };
}
