import type { AdminStats, AdminUser, Invite, ModerationReport, VerificationRequest } from "../types";
import type { Http } from "./http";

export function adminApi(http: Http) {
  return {
    users: () => http.req<{ users: AdminUser[] }>("/admin/users"),
    patchUser: (id: string, body: { role?: "player" | "admin"; disabled?: boolean; verified?: boolean }) =>
      http.req<{ user: AdminUser }>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteUser: (id: string) => http.req<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
    stats: () => http.req<{ stats: AdminStats }>("/admin/stats"),
    invites: () => http.req<{ invites: Invite[] }>("/admin/invites"),
    invite: (id: string) => http.req<{ invite: Invite }>(`/admin/invites/${id}`),
    createInvite: (body?: { expiresAt?: string; maxUses?: number }) =>
      http.req<{ invite: Invite }>("/admin/invites", {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    verificationRequests: (status = "pending") =>
      http.req<{ requests: VerificationRequest[] }>(
        `/admin/verification-requests?status=${encodeURIComponent(status)}`,
      ),
    patchVerificationRequest: (id: string, body: { status: "approved" | "rejected"; adminNote?: string }) =>
      http.req<{ request: VerificationRequest }>(`/admin/verification-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    reports: (status = "open") =>
      http.req<{ reports: ModerationReport[] }>(`/admin/reports?status=${encodeURIComponent(status)}`),
    patchReport: (id: string, body: { status: "open" | "resolved" | "dismissed"; hide?: boolean }) =>
      http.req<{ report: { id: string; status: string } }>(`/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    bulkPosts: (body: { ids: string[]; action: "hide" }) =>
      http.req<{ ok: boolean; hidden: number }>("/admin/posts/bulk", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
}
