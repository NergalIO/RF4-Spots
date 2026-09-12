import type { z } from "zod";
import { prisma } from "../prisma.js";
import { replaceScreenshots } from "../screenshots.js";
import { favoriteInclude } from "./includes.js";
import type { postBody } from "./schema.js";

export async function findLiveBySourceKey(sourceKey: string | undefined, userId: string) {
  if (!sourceKey) return null;
  const existing = await prisma.post.findUnique({
    where: { sourceKey },
    include: favoriteInclude(userId),
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
  return prisma.post.create({
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
      screenshots: {
        create: files.map((f, i) => ({ filename: f.filename, sortOrder: i })),
      },
    },
    include: favoriteInclude(userId),
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
      existing: existing.screenshots,
      keep,
      files,
    });
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
      },
      include: favoriteInclude(userId),
    });
  });
}
