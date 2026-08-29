import type { CommentItem, Fish, Post, PostMarker, Waterbody } from "../types";
import type { Http } from "./http";

export function catalogApi(http: Http) {
  return {
    fish: () => http.req<{ fish: Fish[] }>("/fish"),
    waterbodies: () => http.req<{ waterbodies: Waterbody[] }>("/waterbodies"),
    sync: () => http.req<{ stamp: string }>("/sync"),
  };
}

export function postsApi(http: Http) {
  return {
    posts(params: Record<string, string>) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v) q.set(k, v);
      }
      return http.req<{ posts: Post[]; nextCursor: string | null }>(`/posts?${q.toString()}`);
    },
    markers(waterbodyId: string) {
      const q = new URLSearchParams();
      if (waterbodyId) q.set("waterbodyId", waterbodyId);
      return http.req<{ markers: PostMarker[] }>(`/posts/markers?${q.toString()}`);
    },
    post: (id: string) => http.req<{ post: Post }>(`/posts/${id}`),
    createPost: (fd: FormData) => http.req<{ post: Post }>("/posts", { method: "POST", body: fd }),
    updatePost: (id: string, fd: FormData) => http.req<{ post: Post }>(`/posts/${id}`, { method: "PATCH", body: fd }),
    deletePost: (id: string) => http.req<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" }),
    setFavorite: (id: string, on: boolean) =>
      http.req<{ ok: boolean; favorited: boolean }>(`/posts/${id}/favorite`, {
        method: on ? "POST" : "DELETE",
      }),
    addComment: (postId: string, fd: FormData) =>
      http.req<{ comment: CommentItem }>(`/posts/${postId}/comments`, { method: "POST", body: fd }),
    deleteComment: (id: string) => http.req<{ ok: boolean }>(`/comments/${id}`, { method: "DELETE" }),
    report: (body: { postId?: string; commentId?: string; reason: string }) =>
      http.req<{ report: { id: string } }>("/reports", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
}
