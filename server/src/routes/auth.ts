import { Router } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { publicUser, tokenFor } from "../lib/auth.js";
import { registerUser } from "../lib/auth/register.js";
import { loginBody, passwordBody } from "../lib/auth/schemas.js";
import { loginLimiter, registerLimiter } from "../lib/rateLimit.js";
import { allowRegister } from "../lib/security.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { zodError } from "../lib/httpErrors.js";

export const authRouter = Router();

authRouter.get("/config", (_req, res) => {
  const open = allowRegister();
  res.json({ allowRegister: open, invites: !open });
});

authRouter.post("/register", registerLimiter, async (req, res) => {
  await registerUser(req.body, res);
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
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
  res.json({
    token: tokenFor(user),
    user: publicUser(user),
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

authRouter.patch("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = passwordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
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
