import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { zodError } from "../../lib/httpErrors.js";
import { paramId } from "../../lib/params.js";
import {
  createPostRecord,
  findLiveBySourceKey,
  loadPost,
  mapDetailPost,
  postBody,
  updatePostRecord,
  type RequestWithPost,
} from "../../lib/posts.js";
import { getPostPayload } from "../../lib/s3.js";
import { parseKeepScreenshots } from "../../lib/screenshots.js";
import { softDeletePost } from "../../lib/softDelete.js";
import {
  discardUploadedShots,
  persistUploadedShots,
  removeUploaded,
  uploadedFiles,
  uploadScreenshots,
} from "../../lib/upload.js";
import { canEditPost, requireAuth, requireVerified, type AuthedRequest } from "../../middleware/auth.js";

export const writeRouter = Router();

writeRouter.post("/", requireAuth, requireVerified, ...uploadScreenshots, async (req: AuthedRequest, res) => {
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
  const duplicate = await findLiveBySourceKey(data.sourceKey, req.user!.id);
  if (duplicate) {
    removeUploaded(uploadedFiles(req));
    try {
      const payload = await getPostPayload(duplicate.id);
      res.json({
        post: await mapDetailPost(duplicate, payload.comment),
        duplicate: true,
      });
    } catch {
      res.status(503).json({ error: "Хранилище недоступно" });
    }
    return;
  }
  let shots: Awaited<ReturnType<typeof persistUploadedShots>> = [];
  try {
    shots = await persistUploadedShots(uploadedFiles(req));
    const { post, comment } = await createPostRecord(req.user!.id, data, shots);
    res.status(201).json({ post: await mapDetailPost(post, comment) });
  } catch (err) {
    await discardUploadedShots(shots);
    throw err;
  }
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
  let prevPayload: { comment: string; weightKg: number | null } | undefined;
  try {
    const p = await getPostPayload(existing.id);
    prevPayload = { comment: p.comment, weightKg: p.weightKg };
  } catch {
    prevPayload = { comment: existing.commentExcerpt, weightKg: null };
  }
  let shots: Awaited<ReturnType<typeof persistUploadedShots>> = [];
  try {
    shots = await persistUploadedShots(files);
    const { post, comment } = await updatePostRecord(
      existing,
      req.user!.id,
      parsed.data,
      shots,
      keepParsed.ids,
      prevPayload,
    );
    res.json({ post: await mapDetailPost(post, comment) });
  } catch (err) {
    await discardUploadedShots(shots);
    throw err;
  }
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
