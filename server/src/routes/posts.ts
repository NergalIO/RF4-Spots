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
import { softDeletePost } from "../lib/softDelete.js";
import { zodError } from "../lib/httpErrors.js";
import { parseKeepScreenshots } from "../lib/screenshots.js";
import { screenshotUrl } from "../lib/serialize.js";
import {
  applyListCursor,
  createPostRecord,
  favoriteInclude,
  includeList,
  livePosts,
  mapPost,
  postBody,
  postsListWhere,
  updatePostRecord,
} from "../lib/posts.js";

export const postsRouter = Router();

postsRouter.get("/markers", requireAuth, async (req: AuthedRequest, res) => {
  const q = req.query;
  const where = { ...livePosts() } as ReturnType<typeof livePosts> & { waterbodyId?: string };
  if (typeof q.waterbodyId === "string" && q.waterbodyId) where.waterbodyId = q.waterbodyId;
  const markers = await prisma.post.findMany({
    where,
    select: {
      id: true,
      coordX: true,
      coordY: true,
      catchType: true,
      fish: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({
    markers: markers.map((m) => ({
      id: m.id,
      coordX: m.coordX,
      coordY: m.coordY,
      catchType: m.catchType,
      fishName: m.fish.name,
    })),
  });
});

postsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const listed = await applyListCursor(postsListWhere(req.query as Record<string, unknown>, req.user!.id), req.query as Record<string, unknown>);
  const rows = await prisma.post.findMany({
    where: listed.where,
    include: favoriteInclude(req.user!.id),
    orderBy: [{ [listed.sort]: "desc" }, { id: "desc" }],
    take: listed.take + 1,
  });
  const nextCursor = rows.length > listed.take ? rows[listed.take - 1]?.id ?? null : null;
  const page = rows.slice(0, listed.take);
  res.setHeader("Cache-Control", "no-store");
  res.json({ posts: page.map(mapPost), nextCursor });
});

postsRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const post = await prisma.post.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      ...includeList,
      favorites: { where: { userId: req.user!.id }, select: { userId: true }, take: 1 },
      comments: {
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, nickname: true } },
          screenshots: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!post || post.deletedAt) {
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  res.json({
    post: {
      ...mapPost(post),
      comments: post.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        author: c.user,
        screenshots: c.screenshots
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({ id: s.id, url: screenshotUrl(s.filename) })),
      })),
    },
  });
});

postsRouter.post(
  "/",
  requireAuth,
  uploadLimiter,
  upload.array("screenshots", 8),
  validateUploads,
  enforceUploadQuota,
  async (req: AuthedRequest, res) => {
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
    res.status(201).json({ post: mapPost(post) });
  },
);

postsRouter.patch(
  "/:id",
  requireAuth,
  uploadLimiter,
  upload.array("screenshots", 8),
  validateUploads,
  enforceUploadQuota,
  async (req: AuthedRequest, res) => {
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
    res.json({ post: mapPost(post) });
  },
);

postsRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await prisma.post.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  if (!canEditPost(req.user, existing.userId)) {
    res.status(403).json({ error: "Можно удалять только свои посты" });
    return;
  }
  await softDeletePost(existing.id, req.user!.id);
  res.json({ ok: true });
});

postsRouter.post("/:id/favorite", requireAuth, async (req: AuthedRequest, res) => {
  const postId = paramId(req.params.id);
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) {
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  await prisma.favorite.upsert({
    where: { userId_postId: { userId: req.user!.id, postId } },
    create: { userId: req.user!.id, postId },
    update: {},
  });
  res.json({ ok: true, favorited: true });
});

postsRouter.delete("/:id/favorite", requireAuth, async (req: AuthedRequest, res) => {
  const postId = paramId(req.params.id);
  await prisma.favorite.deleteMany({ where: { userId: req.user!.id, postId } });
  res.json({ ok: true, favorited: false });
});

postsRouter.post(
  "/:id/comments",
  requireAuth,
  uploadLimiter,
  upload.array("screenshots", 8),
  validateUploads,
  enforceUploadQuota,
  async (req: AuthedRequest, res) => {
    const text = z.string().trim().min(1, "Напишите комментарий").max(4000).safeParse(req.body.text);
    if (!text.success) {
      removeUploaded(uploadedFiles(req));
      res.status(400).json({ error: zodError(text.error) });
      return;
    }
    const post = await prisma.post.findUnique({ where: { id: paramId(req.params.id) } });
    if (!post || post.deletedAt) {
      removeUploaded(uploadedFiles(req));
      res.status(404).json({ error: "Пост не найден" });
      return;
    }
    const files = uploadedFiles(req);
    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        userId: req.user!.id,
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
    res.status(201).json({
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: comment.user,
        screenshots: comment.screenshots.map((s) => ({
          id: s.id,
          url: screenshotUrl(s.filename),
        })),
      },
    });
  },
);
