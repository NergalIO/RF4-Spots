import { z } from "zod";
import { iso, screenshotUrl } from "./serialize.js";

export const commentText = z.string().trim().min(1, "Напишите комментарий").max(4000);
export const commentBody = z.object({ text: commentText });

type MappedComment = {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; nickname: string };
  screenshots: { id: string; filename: string; sortOrder?: number }[];
};

export function mapComment(comment: MappedComment) {
  return {
    id: comment.id,
    text: comment.text,
    createdAt: iso(comment.createdAt),
    updatedAt: iso(comment.updatedAt),
    author: comment.user,
    screenshots: comment.screenshots
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => ({ id: s.id, url: screenshotUrl(s.filename) })),
  };
}
