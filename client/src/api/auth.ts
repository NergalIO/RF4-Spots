import type { User, VerificationRequest } from "../types";
import type { Http } from "./http";

export function authApi(http: Http) {
  return {
    config: () => http.req<{ allowRegister: boolean }>("/auth/config"),
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
    register: (nickname: string, password: string) =>
      http.req<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ nickname, password }),
      }),
    changePassword: (current: string, next: string) =>
      http.req<{ token: string; user: User }>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ current, next }),
      }),
    me: () => http.req<{ user: User }>("/auth/me"),
    verifyCode: (code: string) =>
      http.req<{ token: string; user: User }>("/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    verificationRequests: (since?: string) => {
      const q = new URLSearchParams();
      if (since) q.set("since", since);
      const suffix = q.toString() ? `?${q}` : "";
      return http.req<{ requests: VerificationRequest[] }>(`/auth/verification-requests${suffix}`);
    },
    createVerificationRequest: (message?: string) =>
      http.req<{ request: VerificationRequest }>("/auth/verification-requests", {
        method: "POST",
        body: JSON.stringify({ message: message ?? "" }),
      }),
  };
}
