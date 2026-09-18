import type { Post } from "../../types";

export type UnreadKind = "none" | "post" | "comments";

export type Unread = { kind: UnreadKind; count: number };

export function unreadOf(post: Post): Unread {
  if (post.unreadComments > 0) return { kind: "comments", count: post.unreadComments };
  if (post.unseen) return { kind: "post", count: 0 };
  return { kind: "none", count: 0 };
}

export function markPostRead(post: Post): Post {
  return { ...post, unreadComments: 0, unseen: false };
}

export function ruNewComments(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return "новый комментарий";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "новых комментария";
  return "новых комментариев";
}
