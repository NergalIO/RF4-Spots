import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const catalogRouter = Router();

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
