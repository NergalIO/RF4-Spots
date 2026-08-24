import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export type TokenPayload = {
  userId: string;
  nickname: string;
  role: Role;
};

export function jwtSecret(): string {
  return process.env.JWT_SECRET || "dev-rf4-spots-change-me";
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, jwtSecret()) as TokenPayload;
}
