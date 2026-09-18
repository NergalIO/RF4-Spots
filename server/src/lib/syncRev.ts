import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

const STATE_ID = 1;

type Db = Prisma.TransactionClient | typeof prisma;

let cachedRev = 0;

export function currentRev() {
  return cachedRev;
}

export async function initSyncRev() {
  const row = await prisma.syncState.upsert({
    where: { id: STATE_ID },
    create: { id: STATE_ID, rev: 0 },
    update: {},
  });
  cachedRev = row.rev;
}

export async function bumpRev(tx: Db = prisma) {
  const row = await tx.syncState.update({
    where: { id: STATE_ID },
    data: { rev: { increment: 1 } },
  });
  cachedRev = row.rev;
  return row.rev;
}

export async function touchLivePost(postId: string, extra: Prisma.PostUncheckedUpdateInput = {}, tx: Db = prisma) {
  const rev = await bumpRev(tx);
  await tx.post.update({
    where: { id: postId },
    data: { ...extra, rev },
  });
  return rev;
}

export async function tombstonePost(postId: string, extra: Prisma.PostUncheckedUpdateInput = {}, tx: Db = prisma) {
  const rev = await bumpRev(tx);
  await tx.post.update({
    where: { id: postId },
    data: { ...extra, rev },
  });
  await tx.postTombstone.upsert({
    where: { postId },
    create: { postId, rev },
    update: { rev },
  });
  return rev;
}
