import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { publicUser } from "../../lib/auth.js";
import { generateInviteCode, inviteStatus } from "../../lib/invite.js";
import { clearAdminStatsCache } from "../../lib/adminStats.js";
import { iso, isoOrNull } from "../../lib/serialize.js";
import { zodError } from "../../lib/httpErrors.js";
import { paramId } from "../../lib/params.js";
import type { AuthedRequest } from "../../middleware/auth.js";

export const invitesRouter = Router();

const inviteBody = z.object({
  expiresAt: z.string().datetime().optional().or(z.string().min(1).optional()).or(z.literal("")),
  maxUses: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

function mapInvite(i: {
  id: string;
  code: string;
  createdAt: Date;
  expiresAt: Date | null;
  usedAt: Date | null;
  maxUses: number;
  usesCount: number;
  createdBy: { id: string; nickname: string; role: "player" | "admin"; verifiedAt?: Date | null };
}) {
  return {
    id: i.id,
    code: i.code,
    createdAt: iso(i.createdAt),
    expiresAt: isoOrNull(i.expiresAt),
    usedAt: isoOrNull(i.usedAt),
    maxUses: i.maxUses,
    usesCount: i.usesCount,
    status: inviteStatus(i),
    createdBy: publicUser(i.createdBy),
  };
}

invitesRouter.get("/", async (_req, res) => {
  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, nickname: true, role: true, verifiedAt: true } },
    },
    take: 200,
  });
  res.json({ invites: invites.map(mapInvite) });
});

invitesRouter.get("/:id", async (req, res) => {
  const id = paramId(req.params.id);
  const invite = await prisma.invite.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, nickname: true, role: true, verifiedAt: true } },
      redemptions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { nickname: true } } },
      },
    },
  });
  if (!invite) {
    res.status(404).json({ error: "Код не найден" });
    return;
  }
  res.json({
    invite: {
      ...mapInvite(invite),
      redemptions: invite.redemptions.map((r) => ({
        nickname: r.user.nickname,
        createdAt: iso(r.createdAt),
      })),
    },
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
      res.status(400).json({ error: "Некорректный срок кода" });
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
      maxUses: parsed.data.maxUses,
    },
    include: {
      createdBy: { select: { id: true, nickname: true, role: true, verifiedAt: true } },
    },
  });
  clearAdminStatsCache();
  res.status(201).json({ invite: mapInvite(invite) });
});
