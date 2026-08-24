import { createHash, randomBytes } from "node:crypto";

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function fingerprint(nickname: string, password: string, salt: string): string {
  return createHash("sha256").update(`${nickname}${password}${salt}`).digest("hex");
}
