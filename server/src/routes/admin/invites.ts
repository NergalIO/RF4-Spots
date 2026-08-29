import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { publicUser } from "../../lib/auth.js";
import { generateInviteCode } from "../../lib/invite.js";
import { clearAdminStatsCache } from "../../lib/adminStats.js";
import { iso, isoOrNull } from "../../lib/serialize.js";
import { zodError } from "../../lib/httpErrors.js";
import type { AuthedRequest } from "../../middleware/auth.js";

export const invitesRouter = Router();

const inviteBody = z.object({
  expiresAt: z.string().datetime().optional().or(z.string().min(1).optional()),
});

invitesRouter.get("/", async (_req, res) => {
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
      createdAt: iso(i.createdAt),
      expiresAt: isoOrNull(i.expiresAt),
      usedAt: isoOrNull(i.usedAt),
      createdBy: publicUser(i.createdBy),
      usedBy: i.usedBy ? publicUser(i.usedBy) : null,
    })),
  });
});

invitesRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = inviteBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
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
  clearAdminStatsCache();
  res.status(201).json({
    invite: {
      id: invite.id,
      code: invite.code,
      createdAt: iso(invite.createdAt),
      expiresAt: isoOrNull(invite.expiresAt),
      usedAt: null,
      createdBy: publicUser(invite.createdBy),
      usedBy: null,
    },
  });
});
