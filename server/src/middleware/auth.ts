import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/auth.js";

export type AuthedRequest = Request & {
  user?: {
    id: string;
    nickname: string;
    role: "player" | "admin";
  };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Нужна авторизация" });
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "Пользователь не найден" });
      return;
    }
    req.user = { id: user.id, nickname: user.nickname, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Сессия истекла, войдите снова" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Только для администратора" });
    return;
  }
  next();
}

export function canEditPost(user: AuthedRequest["user"], ownerId: string): boolean {
  if (!user) return false;
  return user.role === "admin" || user.id === ownerId;
}
