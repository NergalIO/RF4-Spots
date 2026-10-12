import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { commentBody, commentText, mapComment } from "../lib/comments.js";
import { loadPost, type RequestWithPost } from "../lib/posts.js";
import { paramId } from "../lib/params.js";
import { softDeleteComment } from "../lib/softDelete.js";
import { zodError } from "../lib/httpErrors.js";
import { deleteRemovedShotKeys, parseKeepScreenshots, replaceScreenshots } from "../lib/screenshots.js";
import {
  discardUploadedShots,
  persistUploadedShots,
  removeUploaded,
  uploadedFiles,
  uploadScreenshots,
} from "../lib/upload.js";
import { touchLivePost } from "../lib/syncRev.js";

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
    let shots: Awaited<ReturnType<typeof persistUploadedShots>> = [];
    try {
      shots = await persistUploadedShots(uploadedFiles(req));
      const comment = await prisma.$transaction(async (tx) => {
        const created = await tx.comment.create({
          data: {
            postId: livePost.id,
            userId: user!.id,
            text: text.data,
            screenshots: {
              create: shots.map((f, i) => ({
                objectKey: f.objectKey,
                sortOrder: i,
                ownerUserId: user!.id,
              })),
            },
          },
          include: {
            user: { select: { id: true, nickname: true } },
            screenshots: true,
          },
        });
        await touchLivePost(
          livePost.id,
          { commentsCount: { increment: 1 }, lastCommentAt: created.createdAt },
          tx,
        );
        return created;
      });
      res.status(201).json({ comment: await mapComment(comment) });
    } catch (err) {
      await discardUploadedShots(shots);
      throw err;
    }
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
  let shots: Awaited<ReturnType<typeof persistUploadedShots>> = [];
  try {
    shots = await persistUploadedShots(files);
    const { comment, removedKeys } = await prisma.$transaction(async (tx) => {
      const removed = await replaceScreenshots(tx, {
        owner: { commentId: existing.id },
        ownerUserId: existing.userId,
        existing: existing.screenshots,
        keep: keepParsed.ids,
        files: shots,
      });
      const updated = await tx.comment.update({
        where: { id: existing.id },
        data: { text: parsed.data.text },
        include: {
          user: { select: { id: true, nickname: true } },
          screenshots: true,
        },
      });
      await touchLivePost(existing.postId, {}, tx);
      return { comment: updated, removedKeys: removed };
    });
    await deleteRemovedShotKeys(removedKeys);
    res.json({ comment: await mapComment(comment) });
  } catch (err) {
    await discardUploadedShots(shots);
    throw err;
  }
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
