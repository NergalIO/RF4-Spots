import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function inviteIsUsable(
  invite: {
    usesCount: number;
    maxUses: number;
    expiresAt: Date | null;
  },
  now = new Date(),
): boolean {
  if (invite.usesCount >= invite.maxUses) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function inviteStatus(
  invite: {
    usesCount: number;
    maxUses: number;
    expiresAt: Date | null;
  },
  now = new Date(),
): "active" | "expired" | "exhausted" {
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return "expired";
  if (invite.usesCount >= invite.maxUses) return "exhausted";
  return "active";
}
