import type { User } from "../types";
import type { Http } from "./http";

export function authApi(http: Http) {
  return {
    authConfig: () => http.req<{ allowRegister: boolean; invites: boolean }>("/auth/config"),
    clientDownloads: () =>
      http.req<{
        installer: { name: string; url: string } | null;
        apk: { name: string; url: string } | null;
      }>("/updates/latest"),
    login: (nickname: string, password: string) =>
      http.req<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ nickname, password }),
      }),
    register: (nickname: string, password: string, invite?: string) =>
      http.req<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ nickname, password, invite: invite || undefined }),
      }),
    changePassword: (current: string, next: string) =>
      http.req<{ token: string; user: User }>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ current, next }),
      }),
    me: () => http.req<{ user: User }>("/auth/me"),
  };
}
