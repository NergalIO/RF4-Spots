import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export type TokenPayload = {
  userId: string;
  nickname: string;
  role: Role;
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
  return jwt.sign(payload, jwtSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, jwtSecret()) as TokenPayload;
}
