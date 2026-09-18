import { Prisma } from "@prisma/client";
import { patchCachedUser } from "./authCache.js";
import { prisma } from "./prisma.js";

export async function ensureFeedSeeded(userId: string, current: Date | null | undefined) {
  if (current) return current;
  const now = new Date();
  await prisma.user.update({ where: { id: userId }, data: { feedSeededAt: now } });
  patchCachedUser(userId, { feedSeededAt: now });
  return now;
}

export async function markPostSeen(userId: string, postId: string) {
  const now = new Date();
  await prisma.userPostSeen.upsert({
    where: { userId_postId: { userId, postId } },
    create: { userId, postId, seenAt: now },
    update: { seenAt: now },
  });
}

export async function unreadCounts(userId: string, postIds: string[], feedSeededAt: Date) {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  if (!postIds.length) return { counts, seen };
  const seenRows = await prisma.userPostSeen.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  for (const row of seenRows) seen.add(row.postId);
  const rows = await prisma.$queryRaw<{ postId: string; n: bigint }[]>`
    SELECT c."postId", COUNT(*)::bigint AS n
    FROM "Comment" c
    LEFT JOIN "UserPostSeen" s ON s."postId" = c."postId" AND s."userId" = ${userId}
    WHERE c."postId" IN (${Prisma.join(postIds)})
      AND c."deletedAt" IS NULL
      AND c."userId" <> ${userId}
      AND c."createdAt" > COALESCE(s."seenAt", ${feedSeededAt})
    GROUP BY c."postId"
  `;
  for (const row of rows) counts.set(row.postId, Number(row.n));
  return { counts, seen };
}

export function isUnseenPost(
  post: { id: string; userId: string; createdAt: Date },
  viewerId: string,
  seen: Set<string>,
  feedSeededAt: Date,
) {
  if (seen.has(post.id) || post.userId === viewerId) return false;
  return post.createdAt > feedSeededAt;
}
