import type { z } from "zod";
import { prisma } from "../prisma.js";
import { replaceScreenshots } from "../screenshots.js";
import { bumpRev } from "../syncRev.js";
import { detailInclude } from "./includes.js";
import type { postBody } from "./schema.js";

export async function findLiveBySourceKey(sourceKey: string | undefined, userId: string) {
  if (!sourceKey) return null;
  const existing = await prisma.post.findUnique({
    where: { sourceKey },
    include: detailInclude(userId),
  });
  if (!existing) return null;
  if (existing.deletedAt) {
    await prisma.post.update({ where: { id: existing.id }, data: { sourceKey: null } });
    return null;
  }
  return existing;
}

export async function createPostRecord(
  userId: string,
  data: z.infer<typeof postBody>,
  files: { filename: string }[],
) {
  return prisma.$transaction(async (tx) => {
    const rev = await bumpRev(tx);
    return tx.post.create({
      data: {
        userId,
        waterbodyId: data.waterbodyId,
        fishId: data.fishId,
        coordX: data.coordX,
        coordY: data.coordY,
        catchType: data.catchType,
        catchDate: new Date(data.catchDate),
        comment: data.comment ?? "",
        bait: data.bait ?? "",
        weightKg: data.weightKg ?? null,
        tags: data.tags ?? [],
        sourceKey: data.sourceKey ?? null,
        rev,
        screenshots: {
          create: files.map((f, i) => ({ filename: f.filename, sortOrder: i, ownerUserId: userId })),
        },
      },
      include: detailInclude(userId),
    });
  });
}

export async function updatePostRecord(
  existing: { id: string; screenshots: { id: string; filename: string }[] },
  userId: string,
  data: Partial<z.infer<typeof postBody>>,
  files: { filename: string }[],
  keep?: string[],
) {
  return prisma.$transaction(async (tx) => {
    await replaceScreenshots(tx, {
      owner: { postId: existing.id },
      ownerUserId: userId,
      existing: existing.screenshots,
      keep,
      files,
    });
    const rev = await bumpRev(tx);
    return tx.post.update({
      where: { id: existing.id },
      data: {
        waterbodyId: data.waterbodyId,
        fishId: data.fishId,
        coordX: data.coordX,
        coordY: data.coordY,
        catchType: data.catchType,
        catchDate: data.catchDate ? new Date(data.catchDate) : undefined,
        comment: data.comment,
        bait: data.bait,
        weightKg: data.weightKg === undefined ? undefined : data.weightKg,
        tags: data.tags,
        rev,
      },
      include: detailInclude(userId),
    });
  });
}
