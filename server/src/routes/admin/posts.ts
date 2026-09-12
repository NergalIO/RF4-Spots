import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { zodError } from "../../lib/httpErrors.js";
import { softDeletePost } from "../../lib/softDelete.js";
import type { AuthedRequest } from "../../middleware/auth.js";

export const adminPostsRouter = Router();

const bulkBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["hide"]),
});

adminPostsRouter.post("/bulk", async (req: AuthedRequest, res) => {
  const parsed = bulkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  const ids = [...new Set(parsed.data.ids)];
  const live = await prisma.post.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true },
  });
  for (const row of live) {
    await softDeletePost(row.id, req.user!.id);
  }
  res.json({ ok: true, hidden: live.length });
});
