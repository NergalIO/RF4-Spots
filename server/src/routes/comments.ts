import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { upload } from "../lib/upload.js";
import { paramId } from "../lib/params.js";

export const commentsRouter = Router();

const body = z.object({
  text: z.string().trim().min(1, "Напишите комментарий").max(4000),
});

function shotUrl(filename: string) {
  return `/uploads/${filename}`;
}

commentsRouter.patch(
  "/comments/:id",
  requireAuth,
  upload.array("screenshots", 8),
  async (req: AuthedRequest, res) => {
    const existing = await prisma.comment.findUnique({ where: { id: paramId(req.params.id) } });
    if (!existing) {
      res.status(404).json({ error: "Комментарий не найден" });
      return;
    }
    if (!canEditPost(req.user, existing.userId)) {
      res.status(403).json({ error: "Можно менять только свои комментарии" });
      return;
    }
    const parsed = body.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
      return;
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const comment = await prisma.comment.update({
      where: { id: existing.id },
      data: {
        text: parsed.data.text,
        screenshots: files.length
          ? { create: files.map((f, i) => ({ filename: f.filename, sortOrder: i })) }
          : undefined,
      },
      include: {
        user: { select: { id: true, nickname: true } },
        screenshots: true,
      },
    });
    res.json({
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: comment.user,
        screenshots: comment.screenshots.map((s) => ({ id: s.id, url: shotUrl(s.filename) })),
      },
    });
  },
);

commentsRouter.delete("/comments/:id", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await prisma.comment.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "Комментарий не найден" });
    return;
  }
  if (!canEditPost(req.user, existing.userId)) {
    res.status(403).json({ error: "Можно удалять только свои комментарии" });
    return;
  }
  await prisma.comment.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
