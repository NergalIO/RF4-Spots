import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publicUser } from "../lib/auth.js";
import { generateInviteCode } from "../lib/invite.js";
import { paramId } from "../lib/params.js";
import { softDeleteComment, softDeletePost } from "../lib/softDelete.js";
import { requireAdmin, requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const userPatch = z.object({
  role: z.enum(["player", "admin"]).optional(),
  disabled: z.boolean().optional(),
});

const inviteBody = z.object({
  expiresAt: z.string().datetime().optional().or(z.string().min(1).optional()),
});

const reportPatch = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
  hide: z.boolean().optional(),
});

async function enabledAdminCount(exceptId?: string) {
  return prisma.user.count({
    where: {
      role: "admin",
      disabledAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
}

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nickname: true,
      role: true,
      createdAt: true,
      disabledAt: true,
    },
  });
  res.json({
    users: users.map((u) => ({
      ...publicUser(u),
      createdAt: u.createdAt.toISOString(),
      disabledAt: u.disabledAt?.toISOString() ?? null,
    })),
  });
});

adminRouter.patch("/users/:id", async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id);
  const parsed = userPatch.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  if (target.id === req.user!.id && parsed.data.disabled === true) {
    res.status(400).json({ error: "Нельзя отключить свой аккаунт" });
    return;
  }
  const nextRole = parsed.data.role ?? target.role;
  const leavingAdmin = target.role === "admin" && (nextRole !== "admin" || parsed.data.disabled === true);
  if (leavingAdmin) {
    const others = await enabledAdminCount(target.id);
    if (others < 1) {
      res.status(400).json({ error: "Нельзя снять последнего администратора" });
      return;
    }
  }
  const data: {
    role?: "player" | "admin";
    disabledAt?: Date | null;
    tokenVersion?: { increment: number };
  } = {};
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.disabled === true) {
    data.disabledAt = new Date();
    data.tokenVersion = { increment: 1 };
  }
  if (parsed.data.disabled === false) data.disabledAt = null;
  const updated = await prisma.user.update({ where: { id }, data });
  res.json({
    user: {
      ...publicUser(updated),
      createdAt: updated.createdAt.toISOString(),
      disabledAt: updated.disabledAt?.toISOString() ?? null,
    },
  });
});

adminRouter.get("/invites", async (_req, res) => {
  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, nickname: true, role: true } },
      usedBy: { select: { id: true, nickname: true, role: true } },
    },
    take: 200,
  });
  res.json({
    invites: invites.map((i) => ({
      id: i.id,
      code: i.code,
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt?.toISOString() ?? null,
      usedAt: i.usedAt?.toISOString() ?? null,
      createdBy: publicUser(i.createdBy),
      usedBy: i.usedBy ? publicUser(i.usedBy) : null,
    })),
  });
});

adminRouter.post("/invites", async (req: AuthedRequest, res) => {
  const parsed = inviteBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    const d = new Date(parsed.data.expiresAt);
    if (Number.isNaN(d.getTime())) {
      res.status(400).json({ error: "Некорректный срок приглашения" });
      return;
    }
    expiresAt = d;
  }
  let code = generateInviteCode();
  for (let i = 0; i < 8; i++) {
    const clash = await prisma.invite.findUnique({ where: { code } });
    if (!clash) break;
    code = generateInviteCode();
  }
  const invite = await prisma.invite.create({
    data: {
      code,
      createdById: req.user!.id,
      expiresAt,
    },
    include: {
      createdBy: { select: { id: true, nickname: true, role: true } },
    },
  });
  res.status(201).json({
    invite: {
      id: invite.id,
      code: invite.code,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      usedAt: null,
      createdBy: publicUser(invite.createdBy),
      usedBy: null,
    },
  });
});

adminRouter.get("/reports", async (req, res) => {
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
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
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

adminRouter.patch("/reports/:id", async (req: AuthedRequest, res) => {
  const parsed = reportPatch.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
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
  res.json({
    report: {
      id: report.id,
      status: report.status,
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    },
  });
});
