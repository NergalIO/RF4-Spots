import type { Post, PostMarker } from "../types";
import type { Http } from "./http";

export function postsApi(http: Http) {
  return {
    list(params: Record<string, string>) {
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
    get: (id: string) => http.req<{ post: Post }>(`/posts/${id}`),
    create: (fd: FormData) => http.req<{ post: Post }>("/posts", { method: "POST", body: fd }),
    update: (id: string, fd: FormData) => http.req<{ post: Post }>(`/posts/${id}`, { method: "PATCH", body: fd }),
    remove: (id: string) => http.req<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" }),
    setFavorite: (id: string, on: boolean) =>
      http.req<{ ok: boolean; favorited: boolean }>(`/posts/${id}/favorite`, {
        method: on ? "POST" : "DELETE",
      }),
    setVote: (id: string, value: "like" | "dislike" | null) =>
      http.req<{
        ok: boolean;
        userReaction: "like" | "dislike" | null;
        likesCount: number;
        dislikesCount: number;
      }>(`/posts/${id}/vote`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
  };
}
