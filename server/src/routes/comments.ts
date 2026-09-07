import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { commentBody, commentText, mapComment } from "../lib/comments.js";
import { loadPost, type RequestWithPost } from "../lib/posts.js";
import { paramId } from "../lib/params.js";
import { softDeleteComment } from "../lib/softDelete.js";
import { zodError } from "../lib/httpErrors.js";
import { parseKeepScreenshots, replaceScreenshots } from "../lib/screenshots.js";
import { removeUploaded, uploadedFiles, uploadScreenshots } from "../lib/upload.js";

export const commentsRouter = Router();

commentsRouter.post(
  "/posts/:id/comments",
  requireAuth,
  ...uploadScreenshots,
  loadPost,
  async (req, res) => {
    const text = commentText.safeParse(req.body.text);
    if (!text.success) {
      removeUploaded(uploadedFiles(req));
      res.status(400).json({ error: zodError(text.error) });
      return;
    }
    const { livePost, user } = req as RequestWithPost;
    const files = uploadedFiles(req);
    const comment = await prisma.comment.create({
      data: {
        postId: livePost.id,
        userId: user!.id,
        text: text.data,
        screenshots: {
          create: files.map((f, i) => ({ filename: f.filename, sortOrder: i })),
        },
      },
      include: {
        user: { select: { id: true, nickname: true } },
        screenshots: true,
      },
    });
    res.status(201).json({ comment: mapComment(comment) });
  },
);

commentsRouter.patch("/comments/:id", requireAuth, ...uploadScreenshots, async (req: AuthedRequest, res) => {
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
  const parsed = commentBody.partial().safeParse(req.body);
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
  res.json({ comment: mapComment(comment) });
});

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
