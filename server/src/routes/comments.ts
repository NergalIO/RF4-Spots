import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { uploadLimiter } from "../lib/rateLimit.js";
import {
  enforceUploadQuota,
  removeUploaded,
  unlinkFilenames,
  upload,
  uploadedFiles,
  validateUploads,
} from "../lib/upload.js";
import { paramId } from "../lib/params.js";
import { softDeleteComment } from "../lib/softDelete.js";

export const commentsRouter = Router();

const body = z.object({
  text: z.string().trim().min(1, "Напишите комментарий").max(4000),
});

const keepIds = z.array(z.string().min(1).max(64)).max(32);

function parseKeepScreenshots(raw: unknown): { ok: true; ids?: string[] } | { ok: false } {
  if (raw == null || raw === "") return { ok: true, ids: undefined };
  if (typeof raw !== "string") return { ok: false };
  try {
    const parsed = keepIds.safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false };
    return { ok: true, ids: parsed.data };
  } catch {
    return { ok: false };
  }
}

function shotUrl(filename: string) {
  return `/uploads/${filename}`;
}

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
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
      return;
    }
    const files = uploadedFiles(req);
    const keepParsed = parseKeepScreenshots(req.body.keepScreenshots);
    if (!keepParsed.ok) {
      removeUploaded(files);
      res.status(400).json({ error: "Некорректный список скриншотов" });
      return;
    }
    const keep = keepParsed.ids;
    const comment = await prisma.$transaction(async (tx) => {
      if (keep) {
        const removed = existing.screenshots.filter((s) => !keep.includes(s.id));
        await tx.screenshot.deleteMany({
          where: { commentId: existing.id, id: { notIn: keep } },
        });
        unlinkFilenames(removed.map((s) => s.filename));
      }
      const maxOrder = await tx.screenshot.aggregate({
        where: { commentId: existing.id },
        _max: { sortOrder: true },
      });
      const start = (maxOrder._max.sortOrder ?? -1) + 1;
      if (files.length) {
        await tx.screenshot.createMany({
          data: files.map((f, i) => ({
            commentId: existing.id,
            filename: f.filename,
            sortOrder: start + i,
          })),
        });
      }
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
        screenshots: comment.screenshots.map((s) => ({ id: s.id, url: shotUrl(s.filename) })),
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
