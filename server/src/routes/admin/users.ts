import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { publicUser } from "../../lib/auth.js";
import { paramId } from "../../lib/params.js";
import { ONLINE_WINDOW_MS, clearAdminStatsCache } from "../../lib/adminStats.js";
import { unlinkFilenames } from "../../lib/upload.js";
import { iso, isoOrNull } from "../../lib/serialize.js";
import { zodError } from "../../lib/httpErrors.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { enabledAdminCount, latest } from "./helpers.js";

export const usersRouter = Router();

const userPatch = z.object({
  role: z.enum(["player", "admin"]).optional(),
  disabled: z.boolean().optional(),
});

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nickname: true,
      role: true,
      createdAt: true,
      disabledAt: true,
      lastSeenAt: true,
    },
  });
  const [postMax, commentMax] = await Promise.all([
    prisma.post.groupBy({ by: ["userId"], _max: { createdAt: true, updatedAt: true } }),
    prisma.comment.groupBy({ by: ["userId"], _max: { createdAt: true, updatedAt: true } }),
  ]);
  const lastPost = new Map(postMax.map((r) => [r.userId, latest(r._max.createdAt, r._max.updatedAt)]));
  const lastComment = new Map(commentMax.map((r) => [r.userId, latest(r._max.createdAt, r._max.updatedAt)]));
  const now = Date.now();
  res.json({
    users: users.map((u) => {
      const lastActiveAt = latest(u.lastSeenAt, lastPost.get(u.id), lastComment.get(u.id), u.createdAt);
      const online = Boolean(u.lastSeenAt && now - u.lastSeenAt.getTime() <= ONLINE_WINDOW_MS && !u.disabledAt);
      return {
        ...publicUser(u),
        createdAt: iso(u.createdAt),
        disabledAt: isoOrNull(u.disabledAt),
        lastSeenAt: isoOrNull(u.lastSeenAt),
        lastActiveAt: iso(lastActiveAt ?? u.createdAt),
        online,
      };
    }),
  });
});

usersRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id);
  const parsed = userPatch.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
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
  clearAdminStatsCache();
  res.json({
    user: {
      ...publicUser(updated),
      createdAt: iso(updated.createdAt),
      disabledAt: isoOrNull(updated.disabledAt),
    },
  });
});

usersRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id);
  if (id === req.user!.id) {
    res.status(400).json({ error: "Нельзя удалить свой аккаунт" });
    return;
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  if (target.role === "admin") {
    const others = await enabledAdminCount(target.id);
    if (others < 1) {
      res.status(400).json({ error: "Нельзя удалить последнего администратора" });
      return;
    }
  }
  const posts = await prisma.post.findMany({
    where: { userId: id },
    include: {
      screenshots: { select: { filename: true } },
      comments: { include: { screenshots: { select: { filename: true } } } },
    },
  });
  const comments = await prisma.comment.findMany({
    where: { userId: id },
    include: { screenshots: { select: { filename: true } } },
  });
  const files = [
    ...posts.flatMap((p) => [
      ...p.screenshots.map((s) => s.filename),
      ...p.comments.flatMap((c) => c.screenshots.map((s) => s.filename)),
    ]),
    ...comments.flatMap((c) => c.screenshots.map((s) => s.filename)),
  ];
  await prisma.user.delete({ where: { id } });
  clearAdminStatsCache();
  unlinkFilenames(files);
  res.json({ ok: true });
});
