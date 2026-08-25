import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { fingerprint, newSalt } from "../lib/fingerprint.js";
import { signToken } from "../lib/auth.js";
import { loginLimiter, registerLimiter } from "../lib/rateLimit.js";
import { allowRegister } from "../lib/security.js";
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
});

authRouter.get("/config", (_req, res) => {
  res.json({ allowRegister: allowRegister() });
});

authRouter.post("/register", registerLimiter, async (req, res) => {
  if (!allowRegister()) {
    res.status(403).json({ error: "Регистрация закрыта. Аккаунт выдаёт администратор." });
    return;
  }
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const { nickname: name, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { nickname: name } });
  if (exists) {
    res.status(409).json({ error: "Такой ник уже занят" });
    return;
  }
  const salt = newSalt();
  const id = fingerprint(name, password, salt);
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { id, nickname: name, salt, passwordHash, role: "player" },
  });
  const token = signToken({ userId: user.id, nickname: user.nickname, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, nickname: user.nickname, role: user.role },
  });
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
  const token = signToken({ userId: user.id, nickname: user.nickname, role: user.role });
  res.json({
    token,
    user: { id: user.id, nickname: user.nickname, role: user.role },
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});
