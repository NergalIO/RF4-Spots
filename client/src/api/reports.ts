import type { Http } from "./http";

export function reportsApi(http: Http) {
  return {
    create: (body: { postId?: string; commentId?: string; reason: string }) =>
      http.req<{ report: { id: string } }>("/reports", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
}
