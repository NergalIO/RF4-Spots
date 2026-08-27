import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const reportsRouter = Router();

const body = z.object({
  postId: z.string().min(1).optional(),
  commentId: z.string().min(1).optional(),
  reason: z.string().trim().min(3, "Опишите причину").max(1000),
});

reportsRouter.post("/reports", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const { postId, commentId, reason } = parsed.data;
  if (Boolean(postId) === Boolean(commentId)) {
    res.status(400).json({ error: "Укажите пост или комментарий" });
    return;
  }
  if (postId) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) {
      res.status(404).json({ error: "Пост не найден" });
      return;
    }
    if (post.userId === req.user!.id) {
      res.status(400).json({ error: "Нельзя пожаловаться на свой пост" });
      return;
    }
    const dup = await prisma.report.findFirst({
      where: { reporterId: req.user!.id, postId, status: "open" },
    });
    if (dup) {
      res.status(409).json({ error: "Жалоба уже отправлена" });
      return;
    }
  }
  if (commentId) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) {
      res.status(404).json({ error: "Комментарий не найден" });
      return;
    }
    if (comment.userId === req.user!.id) {
      res.status(400).json({ error: "Нельзя пожаловаться на свой комментарий" });
      return;
    }
    const dup = await prisma.report.findFirst({
      where: { reporterId: req.user!.id, commentId, status: "open" },
    });
    if (dup) {
      res.status(409).json({ error: "Жалоба уже отправлена" });
      return;
    }
  }
  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      postId: postId ?? null,
      commentId: commentId ?? null,
      reason,
    },
  });
  res.status(201).json({ report: { id: report.id, status: report.status } });
});
