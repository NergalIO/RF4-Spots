import { Router } from "express";
import { z } from "zod";
import type { CatchType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { paramId } from "../lib/params.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

const catchTypes = ["farm", "trophy", "farm_trophy"] as const;

function mapSession(session: {
  id: string;
  waterbodyId: string;
  startedAt: Date;
  endedAt: Date | null;
  openingCash: string;
  waterbody: { id: string; name: string };
  catches: {
    id: string;
    fishId: string | null;
    fishNameRaw: string;
    weightKg: number | null;
    catchType: CatchType | null;
    ocrText: string;
    createdAt: Date;
    fish: { id: string; name: string } | null;
  }[];
  earnings: { id: string; kind: "in" | "out"; amount: string; createdAt: Date }[];
}) {
  return {
    id: session.id,
    waterbodyId: session.waterbodyId,
    waterbody: session.waterbody,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    openingCash: session.openingCash,
    catches: session.catches.map((c) => ({
      id: c.id,
      fishId: c.fishId,
      fishName: c.fish?.name ?? c.fishNameRaw,
      fishNameRaw: c.fishNameRaw,
      weightKg: c.weightKg,
      catchType: c.catchType,
      ocrText: c.ocrText,
      createdAt: c.createdAt.toISOString(),
    })),
    earnings: session.earnings.map((e) => ({
      id: e.id,
      kind: e.kind,
      amount: e.amount,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

const includeSession = {
  waterbody: { select: { id: true, name: true } },
  catches: { include: { fish: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" as const } },
  earnings: { orderBy: { createdAt: "asc" as const } },
};

async function ownSession(id: string, userId: string) {
  return prisma.fishingSession.findFirst({
    where: { id, userId },
    include: includeSession,
  });
}

sessionsRouter.get("/", async (req: AuthedRequest, res) => {
  const waterbodyId = typeof req.query.waterbodyId === "string" ? req.query.waterbodyId : "";
  const active = req.query.active === "1" || req.query.active === "true";
  const where = {
    userId: req.user!.id,
    ...(waterbodyId ? { waterbodyId } : {}),
    ...(active ? { endedAt: null } : {}),
  };
  const sessions = await prisma.fishingSession.findMany({
    where,
    include: includeSession,
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json({ sessions: sessions.map(mapSession) });
});

sessionsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = z.object({ waterbodyId: z.string().min(1), openingCash: z.string().max(32).optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const wb = await prisma.waterbody.findUnique({ where: { id: parsed.data.waterbodyId } });
  if (!wb) {
    res.status(400).json({ error: "Неизвестный водоём" });
    return;
  }
  const existing = await prisma.fishingSession.findFirst({
    where: { userId: req.user!.id, waterbodyId: wb.id, endedAt: null },
    include: includeSession,
  });
  if (existing) {
    res.json({ session: mapSession(existing) });
    return;
  }
  const session = await prisma.fishingSession.create({
    data: {
      userId: req.user!.id,
      waterbodyId: wb.id,
      openingCash: parsed.data.openingCash ?? "",
    },
    include: includeSession,
  });
  res.status(201).json({ session: mapSession(session) });
});

sessionsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const session = await ownSession(paramId(req.params.id), req.user!.id);
  if (!session) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  res.json({ session: mapSession(session) });
});

sessionsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = z.object({ openingCash: z.string().max(32).optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  const session = await prisma.fishingSession.update({
    where: { id: existing.id },
    data: { openingCash: parsed.data.openingCash },
    include: includeSession,
  });
  res.json({ session: mapSession(session) });
});

sessionsRouter.post("/:id/end", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  const session = await prisma.fishingSession.update({
    where: { id: existing.id },
    data: { endedAt: existing.endedAt ?? new Date() },
    include: includeSession,
  });
  res.json({ session: mapSession(session) });
});

const catchBody = z.object({
  fishId: z.string().min(1).optional().nullable(),
  fishNameRaw: z.string().trim().min(1).max(120),
  weightKg: z.number().positive().max(500).optional().nullable(),
  catchType: z.enum(catchTypes).optional().nullable(),
  ocrText: z.string().max(4000).optional().default(""),
});

sessionsRouter.post("/:id/catches", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing || existing.endedAt) {
    res.status(existing ? 400 : 404).json({ error: existing ? "Сессия уже закрыта" : "Сессия не найдена" });
    return;
  }
  const parsed = catchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  if (parsed.data.fishId) {
    const fish = await prisma.fishSpecies.findUnique({ where: { id: parsed.data.fishId } });
    if (!fish) {
      res.status(400).json({ error: "Неизвестный вид" });
      return;
    }
  }
  await prisma.sessionCatch.create({
    data: {
      sessionId: existing.id,
      fishId: parsed.data.fishId || null,
      fishNameRaw: parsed.data.fishNameRaw,
      weightKg: parsed.data.weightKg ?? null,
      catchType: parsed.data.catchType ?? null,
      ocrText: parsed.data.ocrText ?? "",
    },
  });
  const session = await ownSession(existing.id, req.user!.id);
  res.status(201).json({ session: mapSession(session!) });
});

sessionsRouter.patch("/:id/catches/:catchId", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  const parsed = catchBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const catchId = paramId(req.params.catchId);
  const row = existing.catches.find((c) => c.id === catchId);
  if (!row) {
    res.status(404).json({ error: "Запись улова не найдена" });
    return;
  }
  await prisma.sessionCatch.update({
    where: { id: catchId },
    data: {
      fishId: parsed.data.fishId === undefined ? undefined : parsed.data.fishId || null,
      fishNameRaw: parsed.data.fishNameRaw,
      weightKg: parsed.data.weightKg === undefined ? undefined : parsed.data.weightKg,
      catchType: parsed.data.catchType === undefined ? undefined : parsed.data.catchType,
      ocrText: parsed.data.ocrText,
    },
  });
  const session = await ownSession(existing.id, req.user!.id);
  res.json({ session: mapSession(session!) });
});

sessionsRouter.delete("/:id/catches/:catchId", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  const catchId = paramId(req.params.catchId);
  await prisma.sessionCatch.deleteMany({ where: { id: catchId, sessionId: existing.id } });
  const session = await ownSession(existing.id, req.user!.id);
  res.json({ session: mapSession(session!) });
});

const earnBody = z.object({
  kind: z.enum(["in", "out"]),
  amount: z.string().max(32),
});

sessionsRouter.post("/:id/earnings", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  const parsed = earnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  await prisma.earningsOp.create({
    data: { sessionId: existing.id, kind: parsed.data.kind, amount: parsed.data.amount },
  });
  const session = await ownSession(existing.id, req.user!.id);
  res.status(201).json({ session: mapSession(session!) });
});

sessionsRouter.patch("/:id/earnings/:opId", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  const parsed = earnBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const opId = paramId(req.params.opId);
  const row = existing.earnings.find((e) => e.id === opId);
  if (!row) {
    res.status(404).json({ error: "Операция не найдена" });
    return;
  }
  await prisma.earningsOp.update({
    where: { id: opId },
    data: {
      kind: parsed.data.kind,
      amount: parsed.data.amount,
    },
  });
  const session = await ownSession(existing.id, req.user!.id);
  res.json({ session: mapSession(session!) });
});

sessionsRouter.delete("/:id/earnings/:opId", async (req: AuthedRequest, res) => {
  const existing = await ownSession(paramId(req.params.id), req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  await prisma.earningsOp.deleteMany({
    where: { id: paramId(req.params.opId), sessionId: existing.id },
  });
  const session = await ownSession(existing.id, req.user!.id);
  res.json({ session: mapSession(session!) });
});
