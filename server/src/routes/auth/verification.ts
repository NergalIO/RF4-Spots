import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { publicUser, tokenFor } from "../../lib/auth.js";
import { inviteIsUsable, normalizeInviteCode } from "../../lib/invite.js";
import { invalidateUser, rememberUser, patchCachedUser } from "../../lib/authCache.js";
import { verificationRequestBody, verificationReviewBody, verifyCodeBody } from "../../lib/auth/schemas.js";
import { zodError } from "../../lib/httpErrors.js";
import { iso, isoOrNull } from "../../lib/serialize.js";
import { paramId } from "../../lib/params.js";
import { requireAuth, userIsVerified, type AuthedRequest } from "../../middleware/auth.js";

export const verificationRouter = Router();

function mapRequest(r: {
  id: string;
  status: string;
  message: string;
  adminNote: string;
  createdAt: Date;
  resolvedAt: Date | null;
  user?: { id: string; nickname: string; role: "player" | "admin"; verifiedAt: Date | null };
}) {
  return {
    id: r.id,
    status: r.status,
    message: r.message,
    adminNote: r.adminNote,
    createdAt: iso(r.createdAt),
    resolvedAt: isoOrNull(r.resolvedAt),
    user: r.user ? publicUser(r.user) : undefined,
  };
}

verificationRouter.post("/verify-code", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = verifyCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  if (userIsVerified(req.user)) {
    res.status(400).json({ error: "Профиль уже подтверждён" });
    return;
  }
  const code = normalizeInviteCode(parsed.data.code);
  if (!code) {
    res.status(400).json({ error: "Введите код" });
    return;
  }
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite || !inviteIsUsable(invite)) {
    res.status(400).json({ error: "Код недействителен или исчерпан" });
    return;
  }
  try {
    const user = await prisma.$transaction(async (tx) => {
      const already = await tx.inviteRedemption.findUnique({
        where: { inviteId_userId: { inviteId: invite.id, userId: req.user!.id } },
      });
      if (already) throw new Error("ALREADY");
      const locked = await tx.invite.findUnique({ where: { id: invite.id } });
      if (!locked || !inviteIsUsable(locked)) throw new Error("UNUSABLE");
      await tx.inviteRedemption.create({
        data: { inviteId: invite.id, userId: req.user!.id },
      });
      const nextUses = locked.usesCount + 1;
      await tx.invite.update({
        where: { id: invite.id },
        data: {
          usesCount: nextUses,
          usedAt: nextUses >= locked.maxUses ? new Date() : locked.usedAt,
        },
      });
      return tx.user.update({
        where: { id: req.user!.id },
        data: { verifiedAt: new Date() },
      });
    });
    invalidateUser(user.id);
    rememberUser(user);
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY") {
      res.status(400).json({ error: "Вы уже использовали этот код" });
      return;
    }
    if (err instanceof Error && err.message === "UNUSABLE") {
      res.status(400).json({ error: "Код недействителен или исчерпан" });
      return;
    }
    throw err;
  }
});

verificationRouter.get("/verification-requests", requireAuth, async (req: AuthedRequest, res) => {
  const sinceRaw = typeof req.query.since === "string" ? req.query.since : "";
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const where = {
    userId: req.user!.id,
    ...(since && !Number.isNaN(since.getTime())
      ? { OR: [{ createdAt: { gt: since } }, { resolvedAt: { gt: since } }] }
      : {}),
  };
  const rows = await prisma.verificationRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ requests: rows.map((r) => mapRequest(r)) });
});

verificationRouter.post("/verification-requests", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = verificationRequestBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  if (userIsVerified(req.user)) {
    res.status(400).json({ error: "Профиль уже подтверждён" });
    return;
  }
  const pending = await prisma.verificationRequest.findFirst({
    where: { userId: req.user!.id, status: "pending" },
  });
  if (pending) {
    res.status(400).json({ error: "Запрос уже отправлен и ожидает решения" });
    return;
  }
  const created = await prisma.verificationRequest.create({
    data: {
      userId: req.user!.id,
      message: parsed.data.message ?? "",
    },
  });
  res.status(201).json({ request: mapRequest(created) });
});

export const adminVerificationRouter = Router();

adminVerificationRouter.get("/", async (req, res) => {
  const raw = typeof req.query.status === "string" ? req.query.status : "pending";
  const status =
    raw === "all" || raw === "pending" || raw === "approved" || raw === "rejected" ? raw : "pending";
  const rows = await prisma.verificationRequest.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, nickname: true, role: true, verifiedAt: true } },
    },
  });
  res.json({ requests: rows.map((r) => mapRequest(r)) });
});

adminVerificationRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = verificationReviewBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  const id = paramId(req.params.id);
  const existing = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Запрос не найден" });
    return;
  }
  if (existing.status !== "pending") {
    res.status(400).json({ error: "Запрос уже рассмотрен" });
    return;
  }
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.status === "approved") {
      await tx.user.update({
        where: { id: existing.userId },
        data: { verifiedAt: now },
      });
    }
    return tx.verificationRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote ?? "",
        reviewedById: req.user!.id,
        resolvedAt: now,
      },
      include: {
        user: { select: { id: true, nickname: true, role: true, verifiedAt: true } },
      },
    });
  });
  if (parsed.data.status === "approved") {
    patchCachedUser(existing.userId, { verifiedAt: now });
    invalidateUser(existing.userId);
  }
  res.json({ request: mapRequest(updated) });
});
