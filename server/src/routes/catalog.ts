import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { iso } from "../lib/serialize.js";

export const catalogRouter = Router();

catalogRouter.get("/sync", requireAuth, async (_req, res) => {
  const [posts, comments] = await Promise.all([
    prisma.post.aggregate({ _count: { _all: true }, _max: { createdAt: true, updatedAt: true } }),
    prisma.comment.aggregate({ _count: { _all: true }, _max: { createdAt: true, updatedAt: true } }),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    stamp: [
      posts._count._all,
      comments._count._all,
      iso(posts._max.createdAt),
      iso(posts._max.updatedAt),
      iso(comments._max.createdAt),
      iso(comments._max.updatedAt),
    ].join("|"),
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
