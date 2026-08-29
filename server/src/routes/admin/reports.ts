import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { publicUser } from "../../lib/auth.js";
import { paramId } from "../../lib/params.js";
import { softDeleteComment, softDeletePost } from "../../lib/softDelete.js";
import { clearAdminStatsCache } from "../../lib/adminStats.js";
import { iso, isoOrNull } from "../../lib/serialize.js";
import { zodError } from "../../lib/httpErrors.js";
import type { AuthedRequest } from "../../middleware/auth.js";

export const reportsAdminRouter = Router();

const reportPatch = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
  hide: z.boolean().optional(),
});

reportsAdminRouter.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "open";
  const where = status === "all" ? {} : { status: status as "open" | "resolved" | "dismissed" };
  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      reporter: { select: { id: true, nickname: true, role: true } },
      resolvedBy: { select: { id: true, nickname: true, role: true } },
      post: { select: { id: true, comment: true, deletedAt: true, fish: { select: { name: true } } } },
      comment: { select: { id: true, text: true, deletedAt: true, postId: true } },
    },
  });
  res.json({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: iso(r.createdAt),
      resolvedAt: isoOrNull(r.resolvedAt),
      reporter: publicUser(r.reporter),
      resolvedBy: r.resolvedBy ? publicUser(r.resolvedBy) : null,
      post: r.post
        ? {
            id: r.post.id,
            excerpt: r.post.comment,
            fishName: r.post.fish.name,
            deleted: Boolean(r.post.deletedAt),
          }
        : null,
      comment: r.comment
        ? {
            id: r.comment.id,
            postId: r.comment.postId,
            excerpt: r.comment.text,
            deleted: Boolean(r.comment.deletedAt),
          }
        : null,
    })),
  });
});

reportsAdminRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = reportPatch.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  const existing = await prisma.report.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing) {
    res.status(404).json({ error: "Жалоба не найдена" });
    return;
  }
  if (parsed.data.hide) {
    if (existing.postId) await softDeletePost(existing.postId, req.user!.id);
    if (existing.commentId) await softDeleteComment(existing.commentId, req.user!.id);
  }
  const report = await prisma.report.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "open" ? null : new Date(),
      resolvedById: parsed.data.status === "open" ? null : req.user!.id,
    },
  });
  clearAdminStatsCache();
  res.json({
    report: {
      id: report.id,
      status: report.status,
      resolvedAt: isoOrNull(report.resolvedAt),
    },
  });
});
