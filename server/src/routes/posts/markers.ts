import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { livePosts, postsListWhere } from "../../lib/posts.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const markersRouter = Router();

markersRouter.get("/markers", requireAuth, async (req: AuthedRequest, res) => {
  const where = postsListWhere(req.query as Record<string, unknown>, req.user!.id);
  const markers = await prisma.post.findMany({
    where: { ...livePosts(), ...where },
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
