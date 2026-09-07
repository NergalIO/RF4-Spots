import type { Post } from "@prisma/client";
import type { NextFunction, Response } from "express";
import { prisma } from "../prisma.js";
import { paramId } from "../params.js";
import { removeUploaded, uploadedFiles } from "../upload.js";
import type { AuthedRequest } from "../../middleware/auth.js";

export type RequestWithPost = AuthedRequest & { livePost: Post };

export async function loadPost(req: AuthedRequest, res: Response, next: NextFunction) {
  const post = await prisma.post.findUnique({ where: { id: paramId(req.params.id) } });
  if (!post || post.deletedAt) {
    removeUploaded(uploadedFiles(req));
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  (req as RequestWithPost).livePost = post;
  next();
}
