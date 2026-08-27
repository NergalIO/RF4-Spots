import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export type TokenPayload = {
  userId: string;
  nickname: string;
  role: Role;
  tokenVersion: number;
};

const WEAK_SECRETS = new Set([
  "",
  "dev-rf4-spots-change-me",
  "change-me-in-production",
  "change-me",
  "secret",
  "jwt-secret",
  "jwt_secret",
]);

export function jwtSecret(): string {
  const secret = (process.env.JWT_SECRET ?? "").trim();
  if (secret.length < 32 || WEAK_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      "Задайте JWT_SECRET: случайная строка не короче 32 символов (не дефолт из примера).",
    );
  }
  return secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtSecret()) as TokenPayload & { tokenVersion?: number };
  return {
    userId: decoded.userId,
    nickname: decoded.nickname,
    role: decoded.role,
    tokenVersion: decoded.tokenVersion ?? 0,
  };
}

export function publicUser(user: { id: string; nickname: string; role: Role }) {
  return { id: user.id, nickname: user.nickname, role: user.role };
}
