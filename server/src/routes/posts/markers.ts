import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { livePosts } from "../../lib/posts.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const markersRouter = Router();

markersRouter.get("/markers", requireAuth, async (req: AuthedRequest, res) => {
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
