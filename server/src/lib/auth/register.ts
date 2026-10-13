import type { Response } from "express";
import argon2 from "argon2";
import { prisma } from "../prisma.js";
import { publicUser, tokenFor } from "../auth.js";
import { zodError } from "../httpErrors.js";
import { allowRegister } from "../security.js";
import { rememberUser } from "../authCache.js";
import { registerBody } from "./schemas.js";

export async function registerUser(body: unknown, res: Response) {
  const parsed = registerBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  if (!allowRegister()) {
    res.status(403).json({ error: "Регистрация закрыта" });
    return;
  }
  const { nickname: name, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { nickname: name } });
  if (exists) {
    res.status(409).json({ error: "Такой ник уже занят" });
    return;
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { nickname: name, passwordHash, role: "player", verifiedAt: null },
  });
  rememberUser(user);
  res.status(201).json({
    token: tokenFor(user),
    user: publicUser(user),
  });
}
