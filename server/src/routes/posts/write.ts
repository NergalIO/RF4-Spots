import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { zodError } from "../../lib/httpErrors.js";
import { paramId } from "../../lib/params.js";
import { createPostRecord, loadPost, mapPost, postBody, updatePostRecord, type RequestWithPost } from "../../lib/posts.js";
import { parseKeepScreenshots } from "../../lib/screenshots.js";
import { softDeletePost } from "../../lib/softDelete.js";
import { removeUploaded, uploadedFiles, uploadScreenshots } from "../../lib/upload.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const writeRouter = Router();

writeRouter.post("/", requireAuth, ...uploadScreenshots, async (req: AuthedRequest, res) => {
  const parsed = postBody.safeParse(req.body);
  if (!parsed.success) {
    removeUploaded(uploadedFiles(req));
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  const data = parsed.data;
  const [fish, waterbody] = await Promise.all([
    prisma.fishSpecies.findUnique({ where: { id: data.fishId } }),
    prisma.waterbody.findUnique({ where: { id: data.waterbodyId } }),
  ]);
  if (!fish || !waterbody) {
    removeUploaded(uploadedFiles(req));
    res.status(400).json({ error: "Неизвестный вид или водоём" });
    return;
  }
  const post = await createPostRecord(req.user!.id, data, uploadedFiles(req));
  res.status(201).json({ post: mapPost(post, req.user!.id) });
});

writeRouter.patch("/:id", requireAuth, ...uploadScreenshots, async (req: AuthedRequest, res) => {
  const existing = await prisma.post.findUnique({
    where: { id: paramId(req.params.id) },
    include: { screenshots: true },
  });
  if (!existing || existing.deletedAt) {
    removeUploaded(uploadedFiles(req));
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  if (!canEditPost(req.user, existing.userId)) {
    removeUploaded(uploadedFiles(req));
    res.status(403).json({ error: "Можно менять только свои посты" });
    return;
  }
  const parsed = postBody.partial().safeParse(req.body);
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
  const post = await updatePostRecord(existing, req.user!.id, parsed.data, files, keepParsed.ids);
  res.json({ post: mapPost(post, req.user!.id) });
});

writeRouter.delete("/:id", requireAuth, loadPost, async (req, res) => {
  const { livePost, user } = req as RequestWithPost;
  if (!canEditPost(user, livePost.userId)) {
    res.status(403).json({ error: "Можно удалять только свои посты" });
    return;
  }
  await softDeletePost(livePost.id, user!.id);
  res.json({ ok: true });
});
