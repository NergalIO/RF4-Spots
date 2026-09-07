import type { Response } from "express";
import argon2 from "argon2";
import { prisma } from "../prisma.js";
import { publicUser, tokenFor } from "../auth.js";
import { zodError } from "../httpErrors.js";
import { inviteIsUsable, normalizeInviteCode } from "../invite.js";
import { allowRegister } from "../security.js";
import { registerBody } from "./schemas.js";

export async function registerUser(body: unknown, res: Response) {
  const parsed = registerBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  const { nickname: name, password, invite: inviteRaw } = parsed.data;
  const open = allowRegister();
  const code = normalizeInviteCode(inviteRaw);

  if (!open && !code) {
    res.status(403).json({ error: "Нужен код приглашения" });
    return;
  }

  const exists = await prisma.user.findUnique({ where: { nickname: name } });
  if (exists) {
    res.status(409).json({ error: "Такой ник уже занят" });
    return;
  }

  let inviteId: string | null = null;
  if (!open) {
    const invite = await prisma.invite.findUnique({ where: { code } });
    if (!invite || !inviteIsUsable(invite)) {
      res.status(400).json({ error: "Приглашение недействительно" });
      return;
    }
    inviteId = invite.id;
  }

  const passwordHash = await argon2.hash(password);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { nickname: name, passwordHash, role: "player" },
      });
      if (inviteId) {
        const taken = await tx.invite.updateMany({
          where: { id: inviteId, usedAt: null },
          data: { usedAt: new Date(), usedById: created.id },
        });
        if (taken.count !== 1) {
          throw new Error("INVITE_TAKEN");
        }
      }
      return created;
    });
    res.status(201).json({
      token: tokenFor(user),
      user: publicUser(user),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INVITE_TAKEN") {
      res.status(400).json({ error: "Приглашение уже использовано" });
      return;
    }
    throw err;
  }
}
