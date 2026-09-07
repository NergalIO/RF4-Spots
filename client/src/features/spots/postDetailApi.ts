import type { Api } from "@/api";
import { fmtCoord } from "@/shared/format";
import type { Post } from "@/types";

export async function copyCoords(x: number, y: number) {
  try {
    await navigator.clipboard.writeText(fmtCoord(x, y));
  } catch {
    /* ignore */
  }
}

export async function removePost(api: Api, post: Post, after: () => Promise<void>) {
  if (!confirm("Скрыть этот пост?")) return;
  await api.posts.remove(post.id);
  await after();
}

export async function sendComment(api: Api, postId: string, text: string, files: File[]) {
  const fd = new FormData();
  fd.set("text", text.trim());
  for (const f of files) fd.append("screenshots", f);
  await api.comments.add(postId, fd);
}

export async function sendReport(
  api: Api,
  target: { postId?: string; commentId?: string },
  reason: string,
) {
  await api.reports.create({ ...target, reason: reason.trim() });
}
