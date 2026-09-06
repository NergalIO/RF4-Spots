import { Router } from "express";
import { commentExcerpt, parseActivitySince } from "../lib/activity.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { iso } from "../lib/serialize.js";

export const catalogRouter = Router();

const ACTIVITY_TAKE = 20;

catalogRouter.get("/sync", requireAuth, async (_req, res) => {
  const [posts, comments, votes] = await Promise.all([
    prisma.post.aggregate({ _count: { _all: true }, _max: { createdAt: true, updatedAt: true } }),
    prisma.comment.aggregate({ _count: { _all: true }, _max: { createdAt: true, updatedAt: true } }),
    prisma.postVote.aggregate({ _count: { _all: true }, _max: { updatedAt: true } }),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    stamp: [
      posts._count._all,
      comments._count._all,
      votes._count._all,
      iso(posts._max.createdAt),
      iso(posts._max.updatedAt),
      iso(comments._max.createdAt),
      iso(comments._max.updatedAt),
      iso(votes._max.updatedAt),
    ].join("|"),
  });
});

catalogRouter.get("/activity", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const since = parseActivitySince(req.query.since);
  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gt: since }, userId: { not: userId } },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_TAKE,
      select: {
        id: true,
        createdAt: true,
        user: { select: { nickname: true } },
        fish: { select: { name: true } },
        waterbody: { select: { name: true } },
      },
    }),
    prisma.comment.findMany({
      where: {
        deletedAt: null,
        createdAt: { gt: since },
        userId: { not: userId },
        post: { deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_TAKE,
      select: {
        id: true,
        postId: true,
        createdAt: true,
        text: true,
        user: { select: { nickname: true } },
        post: {
          select: {
            userId: true,
            fish: { select: { name: true } },
            waterbody: { select: { name: true } },
            favorites: { where: { userId }, select: { userId: true }, take: 1 },
          },
        },
      },
    }),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    posts: posts.reverse().map((p) => ({
      id: p.id,
      createdAt: iso(p.createdAt),
      authorNickname: p.user.nickname,
      fishName: p.fish.name,
      waterbodyName: p.waterbody.name,
    })),
    comments: comments.reverse().map((c) => ({
      id: c.id,
      postId: c.postId,
      createdAt: iso(c.createdAt),
      authorNickname: c.user.nickname,
      excerpt: commentExcerpt(c.text),
      ownPost: c.post.userId === userId,
      favorited: Boolean(c.post.favorites.length),
      fishName: c.post.fish.name,
      waterbodyName: c.post.waterbody.name,
    })),
  });
});

catalogRouter.get("/fish", requireAuth, async (_req, res) => {
  const fish = await prisma.fishSpecies.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, waterbodies: true },
  });
  res.json({ fish });
});

catalogRouter.get("/waterbodies", requireAuth, async (_req, res) => {
  const waterbodies = await prisma.waterbody.findMany({
    orderBy: { sortOrder: "asc" },
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({
    waterbodies: waterbodies.map((w) => ({
      ...w,
      mapUrl: `/maps/${w.imageFile}?v=${w.imageWidth}x${w.imageHeight}`,
    })),
  });
});
