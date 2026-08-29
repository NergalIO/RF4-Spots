import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { uploadLimiter } from "../lib/rateLimit.js";
import {
  enforceUploadQuota,
  removeUploaded,
  upload,
  uploadedFiles,
  validateUploads,
} from "../lib/upload.js";
import { paramId } from "../lib/params.js";
import { softDeleteComment } from "../lib/softDelete.js";
import { zodError } from "../lib/httpErrors.js";
import { parseKeepScreenshots, replaceScreenshots } from "../lib/screenshots.js";
import { screenshotUrl } from "../lib/serialize.js";

export const commentsRouter = Router();

const body = z.object({
  text: z.string().trim().min(1, "Напишите комментарий").max(4000),
});

commentsRouter.patch(
  "/comments/:id",
  requireAuth,
  uploadLimiter,
  upload.array("screenshots", 8),
  validateUploads,
  enforceUploadQuota,
  async (req: AuthedRequest, res) => {
    const existing = await prisma.comment.findUnique({
      where: { id: paramId(req.params.id) },
      include: { screenshots: true },
    });
    if (!existing || existing.deletedAt) {
      removeUploaded(uploadedFiles(req));
      res.status(404).json({ error: "Комментарий не найден" });
      return;
    }
    if (!canEditPost(req.user, existing.userId)) {
      removeUploaded(uploadedFiles(req));
      res.status(403).json({ error: "Можно менять только свои комментарии" });
      return;
    }
    const parsed = body.partial().safeParse(req.body);
    if (!parsed.success) {
      removeUploaded(uploadedFiles(req));
      res.status(400).json({ error: zodError(parsed.error) });
      return;
    }
    const files = uploadedFiles(req);
    const keepParsed = parseKeepScreenshots(req.body.keepScreenshots);
    if (!keepParsed.ok) {
      removeUploaded(files);
      res.status(400).json({ error: "Некорректный список скриншотов" });
      return;
    }
    const comment = await prisma.$transaction(async (tx) => {
      await replaceScreenshots(tx, {
        owner: { commentId: existing.id },
        existing: existing.screenshots,
        keep: keepParsed.ids,
        files,
      });
      return tx.comment.update({
        where: { id: existing.id },
        data: { text: parsed.data.text },
        include: {
          user: { select: { id: true, nickname: true } },
          screenshots: true,
        },
      });
    });
    res.json({
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: comment.user,
        screenshots: comment.screenshots.map((s) => ({ id: s.id, url: screenshotUrl(s.filename) })),
      },
    });
  },
);

commentsRouter.delete("/comments/:id", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await prisma.comment.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Комментарий не найден" });
    return;
  }
  if (!canEditPost(req.user, existing.userId)) {
    res.status(403).json({ error: "Можно удалять только свои комментарии" });
    return;
  }
  await softDeleteComment(existing.id, req.user!.id);
  res.json({ ok: true });
});
