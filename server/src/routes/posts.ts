import { Router } from "express";
import { z } from "zod";
import type { CatchType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { canEditPost, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { uploadLimiter } from "../lib/rateLimit.js";
import { enforceUploadQuota, upload, uploadedFiles, validateUploads } from "../lib/upload.js";
import { paramId } from "../lib/params.js";

export const postsRouter = Router();

const catchTypes = ["farm", "trophy", "farm_trophy"] as const;
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

const postBody = z.object({
  waterbodyId: z.string().min(1),
  fishId: z.string().min(1),
  coordX: z.coerce.number(),
  coordY: z.coerce.number(),
  catchType: z.enum(catchTypes),
  catchDate: z.string().min(1),
  comment: z.string().max(4000).optional().default(""),
});

function screenshotUrl(filename: string) {
  return `/uploads/${filename}`;
}

function mapPost(post: {
  id: string;
  coordX: number;
  coordY: number;
  catchType: CatchType;
  catchDate: Date;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; nickname: string };
  fish: { id: string; name: string };
  waterbody: { id: string; name: string };
  screenshots: { id: string; filename: string; sortOrder: number }[];
  comments?: { id: string; createdAt: Date; userId: string }[];
  _count?: { comments: number };
}) {
  const commentsMeta = (post.comments ?? []).map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    userId: c.userId,
  }));
  return {
    id: post.id,
    coordX: post.coordX,
    coordY: post.coordY,
    catchType: post.catchType,
    catchDate: post.catchDate.toISOString(),
    comment: post.comment,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: post.user,
    fish: post.fish,
    waterbody: post.waterbody,
    screenshots: post.screenshots
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ id: s.id, url: screenshotUrl(s.filename) })),
    commentsCount: post._count?.comments ?? post.comments?.length ?? 0,
    commentsMeta,
  };
}

const includeList = {
  user: { select: { id: true, nickname: true } },
  fish: { select: { id: true, name: true } },
  waterbody: { select: { id: true, name: true } },
  screenshots: true,
  comments: { select: { id: true, createdAt: true, userId: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

postsRouter.get("/", requireAuth, async (req, res) => {
  const q = req.query;
  const where: Prisma.PostWhereInput = {};
  if (typeof q.waterbodyId === "string" && q.waterbodyId) where.waterbodyId = q.waterbodyId;
  if (typeof q.fishId === "string" && q.fishId) where.fishId = q.fishId;
  if (typeof q.catchType === "string" && catchTypes.includes(q.catchType as CatchType)) {
    where.catchType = q.catchType as CatchType;
  }
  if (typeof q.catchFrom === "string" || typeof q.catchTo === "string") {
    where.catchDate = {};
    if (typeof q.catchFrom === "string" && q.catchFrom) where.catchDate.gte = new Date(q.catchFrom);
    if (typeof q.catchTo === "string" && q.catchTo) {
      const end = new Date(q.catchTo);
      end.setHours(23, 59, 59, 999);
      where.catchDate.lte = end;
    }
  }
  if (typeof q.uploadedFrom === "string" || typeof q.uploadedTo === "string") {
    where.createdAt = {};
    if (typeof q.uploadedFrom === "string" && q.uploadedFrom) where.createdAt.gte = new Date(q.uploadedFrom);
    if (typeof q.uploadedTo === "string" && q.uploadedTo) {
      const end = new Date(q.uploadedTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  const sort = q.sort === "catchDate" ? "catchDate" : "createdAt";
  const posts = await prisma.post.findMany({
    where,
    include: includeList,
    orderBy: { [sort]: "desc" },
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ posts: posts.map(mapPost) });
});

postsRouter.get("/:id", requireAuth, async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      ...includeList,
      comments: {
        include: {
          user: { select: { id: true, nickname: true } },
          screenshots: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!post) {
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
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const data = parsed.data;
  const [fish, waterbody] = await Promise.all([
    prisma.fishSpecies.findUnique({ where: { id: data.fishId } }),
    prisma.waterbody.findUnique({ where: { id: data.waterbodyId } }),
  ]);
  if (!fish || !waterbody) {
    res.status(400).json({ error: "Неизвестный вид или водоём" });
    return;
  }
  const files = uploadedFiles(req);
  const post = await prisma.post.create({
    data: {
      userId: req.user!.id,
      waterbodyId: data.waterbodyId,
      fishId: data.fishId,
      coordX: data.coordX,
      coordY: data.coordY,
      catchType: data.catchType,
      catchDate: new Date(data.catchDate),
      comment: data.comment ?? "",
      screenshots: {
        create: files.map((f, i) => ({ filename: f.filename, sortOrder: i })),
      },
    },
    include: includeList,
  });
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
  const existing = await prisma.post.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  if (!canEditPost(req.user, existing.userId)) {
    res.status(403).json({ error: "Можно менять только свои посты" });
    return;
  }
  const parsed = postBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const data = parsed.data;
  const files = uploadedFiles(req);
  const keepParsed = parseKeepScreenshots(req.body.keepScreenshots);
  if (!keepParsed.ok) {
    res.status(400).json({ error: "Некорректный список скриншотов" });
    return;
  }
  const keep = keepParsed.ids;

  const post = await prisma.$transaction(async (tx) => {
    if (keep) {
      await tx.screenshot.deleteMany({
        where: { postId: existing.id, id: { notIn: keep } },
      });
    }
    const maxOrder = await tx.screenshot.aggregate({
      where: { postId: existing.id },
      _max: { sortOrder: true },
    });
    const start = (maxOrder._max.sortOrder ?? -1) + 1;
    if (files.length) {
      await tx.screenshot.createMany({
        data: files.map((f, i) => ({
          postId: existing.id,
          filename: f.filename,
          sortOrder: start + i,
        })),
      });
    }
    return tx.post.update({
      where: { id: existing.id },
      data: {
        waterbodyId: data.waterbodyId,
        fishId: data.fishId,
        coordX: data.coordX,
        coordY: data.coordY,
        catchType: data.catchType,
        catchDate: data.catchDate ? new Date(data.catchDate) : undefined,
        comment: data.comment,
      },
      include: includeList,
    });
  });
  res.json({ post: mapPost(post) });
  },
);

postsRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await prisma.post.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  if (!canEditPost(req.user, existing.userId)) {
    res.status(403).json({ error: "Можно удалять только свои посты" });
    return;
  }
  await prisma.post.delete({ where: { id: existing.id } });
  res.json({ ok: true });
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
    res.status(400).json({ error: text.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const post = await prisma.post.findUnique({ where: { id: paramId(req.params.id) } });
  if (!post) {
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
