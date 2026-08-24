import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { fingerprint, newSalt } from "../lib/fingerprint.js";
import { signToken } from "../lib/auth.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const creds = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "Ник слишком короткий")
    .max(24, "Ник слишком длинный")
    .regex(/^[\p{L}\p{N}_-]+$/u, "Только буквы, цифры, _ и -"),
  password: z.string().min(4, "Пароль от 4 символов").max(72),
});

authRouter.post("/register", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const { nickname, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { nickname } });
  if (exists) {
    res.status(409).json({ error: "Такой ник уже занят" });
    return;
  }
  const salt = newSalt();
  const id = fingerprint(nickname, password, salt);
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { id, nickname, salt, passwordHash, role: "player" },
  });
  const token = signToken({ userId: user.id, nickname: user.nickname, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, nickname: user.nickname, role: user.role },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Неверные данные" });
    return;
  }
  const { nickname, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { nickname } });
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
