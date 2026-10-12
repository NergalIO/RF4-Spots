import { z } from "zod";
import { iso, mapShotUrls } from "./serialize.js";

export const commentText = z.string().trim().min(1, "Напишите комментарий").max(4000);
export const commentBody = z.object({ text: commentText });

type MappedComment = {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; nickname: string };
  screenshots: { id: string; objectKey: string; sortOrder?: number }[];
};

export async function mapComment(comment: MappedComment) {
  return {
    id: comment.id,
    text: comment.text,
    createdAt: iso(comment.createdAt),
    updatedAt: iso(comment.updatedAt),
    author: comment.user,
    screenshots: await mapShotUrls(comment.screenshots),
  };
}
