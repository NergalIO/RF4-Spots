import type { CommentItem } from "../types";
import type { Http } from "./http";

export function commentsApi(http: Http) {
  return {
    add: (postId: string, fd: FormData) =>
      http.req<{ comment: CommentItem }>(`/posts/${postId}/comments`, { method: "POST", body: fd }),
    remove: (id: string) => http.req<{ ok: boolean }>(`/comments/${id}`, { method: "DELETE" }),
  };
}
