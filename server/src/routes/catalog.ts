import { Router } from "express";
import { commentExcerpt, parseActivitySince } from "../lib/activity.js";
import { sendJsonWithEtag } from "../lib/etag.js";
import { prisma } from "../lib/prisma.js";
import { currentRev } from "../lib/syncRev.js";
import { notePresence } from "../lib/authCache.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { iso } from "../lib/serialize.js";

export const catalogRouter = Router();

const ACTIVITY_TAKE = 20;

catalogRouter.get("/sync", requireAuth, async (req: AuthedRequest, res) => {
  notePresence(req.user!.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ rev: currentRev() });
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

catalogRouter.get("/fish", async (req, res) => {
  const fish = await prisma.fishSpecies.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, waterbodies: true },
  });
  sendJsonWithEtag(req, res, { fish });
});

catalogRouter.get("/waterbodies", async (req, res) => {
  const waterbodies = await prisma.waterbody.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      metersPerCell: true,
      xMin: true,
      xMax: true,
      yMin: true,
      yMax: true,
      yFlipped: true,
      imageFile: true,
      imageWidth: true,
      imageHeight: true,
      padLeft: true,
      padTop: true,
      padRight: true,
      padBottom: true,
    },
  });
  sendJsonWithEtag(req, res, {
    waterbodies: waterbodies.map((w) => ({
      id: w.id,
      name: w.name,
      metersPerCell: w.metersPerCell,
      xMin: w.xMin,
      xMax: w.xMax,
      yMin: w.yMin,
      yMax: w.yMax,
      yFlipped: w.yFlipped,
      imageWidth: w.imageWidth,
      imageHeight: w.imageHeight,
      padLeft: w.padLeft,
      padTop: w.padTop,
      padRight: w.padRight,
      padBottom: w.padBottom,
      mapUrl: `/maps/${w.imageFile}?v=${w.imageWidth}x${w.imageHeight}`,
    })),
  });
});
