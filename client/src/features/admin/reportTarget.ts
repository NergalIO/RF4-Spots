import type { ModerationReport } from "@/types";

export function reportPostId(r: ModerationReport): string | null {
  if (r.post && !r.post.deleted) return r.post.id;
  if (r.comment && !r.comment.deleted) return r.comment.postId;
  return null;
}

export function reportCaption(r: ModerationReport): string {
  if (r.post) return `Пост: ${r.post.fishName}${r.post.deleted ? " (скрыт)" : ""}`;
  if (r.comment) return `Комментарий${r.comment.deleted ? " (скрыт)" : ""}`;
  return "";
}
