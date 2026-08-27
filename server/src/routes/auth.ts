import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { newSalt } from "../lib/fingerprint.js";
import { publicUser, signToken } from "../lib/auth.js";
import { loginLimiter, registerLimiter } from "../lib/rateLimit.js";
import { allowRegister } from "../lib/security.js";
import { inviteIsUsable, normalizeInviteCode } from "../lib/invite.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const nickname = z
  .string()
  .trim()
  .min(2, "Ник слишком короткий")
  .max(24, "Ник слишком длинный")
  .regex(/^[\p{L}\p{N}_-]+$/u, "Только буквы, цифры, _ и -");

const loginBody = z.object({
  nickname,
  password: z.string().min(1, "Введите пароль").max(72),
});

const registerBody = z.object({
  nickname,
  password: z.string().min(8, "Пароль от 8 символов").max(72),
  invite: z.string().trim().max(32).optional().default(""),
});

const passwordBody = z.object({
  current: z.string().min(1, "Введите текущий пароль").max(72),
  next: z.string().min(8, "Пароль от 8 символов").max(72),
});

function tokenFor(user: { id: string; nickname: string; role: "player" | "admin"; tokenVersion: number }) {
  return signToken({
    userId: user.id,
    nickname: user.nickname,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
}

authRouter.get("/config", (_req, res) => {
  const open = allowRegister();
  res.json({ allowRegister: open, invites: !open });
});

authRouter.post("/register", registerLimiter, async (req, res) => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const { nickname: name, password, invite: inviteRaw } = parsed.data;
  const open = allowRegister();
  const code = normalizeInviteCode(inviteRaw);

  if (!open && !code) {
    res.status(403).json({ error: "Нужен код приглашения" });
    return;
  }

  const exists = await prisma.user.findUnique({ where: { nickname: name } });
  if (exists) {
    res.status(409).json({ error: "Такой ник уже занят" });
    return;
  }

  let inviteId: string | null = null;
  if (!open) {
    const invite = await prisma.invite.findUnique({ where: { code } });
    if (!invite || !inviteIsUsable(invite)) {
      res.status(400).json({ error: "Приглашение недействительно" });
      return;
    }
    inviteId = invite.id;
  }

  const salt = newSalt();
  const passwordHash = await argon2.hash(password);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { nickname: name, salt, passwordHash, role: "player" },
      });
      if (inviteId) {
        const taken = await tx.invite.updateMany({
          where: { id: inviteId, usedAt: null },
          data: { usedAt: new Date(), usedById: created.id },
        });
        if (taken.count !== 1) {
          throw new Error("INVITE_TAKEN");
        }
      }
      return created;
    });
    const token = tokenFor(user);
    res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INVITE_TAKEN") {
      res.status(400).json({ error: "Приглашение уже использовано" });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const { nickname: name, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { nickname: name } });
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    res.status(401).json({ error: "Неверный ник или пароль" });
    return;
  }
  if (user.disabledAt) {
    res.status(401).json({ error: "Аккаунт отключён" });
    return;
  }
  const token = tokenFor(user);
  res.json({
    token,
    user: publicUser(user),
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

authRouter.patch("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = passwordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(401).json({ error: "Пользователь не найден" });
    return;
  }
  if (!(await argon2.verify(user.passwordHash, parsed.data.current))) {
    res.status(400).json({ error: "Неверный текущий пароль" });
    return;
  }
  const passwordHash = await argon2.hash(parsed.data.next);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  res.json({
    token: tokenFor(updated),
    user: publicUser(updated),
  });
});
