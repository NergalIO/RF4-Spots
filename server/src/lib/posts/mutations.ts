import type { z } from "zod";
import { syncPostPayload, toCommentExcerpt } from "../postPayload.js";
import { prisma } from "../prisma.js";
import { deleteRemovedShotKeys, replaceScreenshots } from "../screenshots.js";
import { bumpRev } from "../syncRev.js";
import { detailInclude } from "./includes.js";
import type { postBody } from "./schema.js";
import { extractImportedSourceUrl } from "./serialize.js";

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
  files: { objectKey: string }[],
) {
  const comment = data.comment ?? "";
  const bait = data.bait ?? "";
  const weightKg = data.weightKg ?? null;
  const sourceUrl = data.sourceUrl ?? extractImportedSourceUrl(comment);
  const post = await prisma.$transaction(async (tx) => {
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
        commentExcerpt: toCommentExcerpt(comment),
        bait,
        tags: data.tags ?? [],
        sourceKey: data.sourceKey ?? null,
        sourceUrl,
        rev,
        screenshots: {
          create: files.map((f, i) => ({ objectKey: f.objectKey, sortOrder: i, ownerUserId: userId })),
        },
      },
      include: detailInclude(userId),
    });
  });
  await syncPostPayload({
    id: post.id,
    comment,
    bait,
    weightKg,
    screenshots: post.screenshots,
    updatedAt: post.updatedAt,
  });
  return { post, comment, weightKg };
}

export async function updatePostRecord(
  existing: { id: string; screenshots: { id: string; objectKey: string }[]; bait: string },
  userId: string,
  data: Partial<z.infer<typeof postBody>>,
  files: { objectKey: string }[],
  keep?: string[],
  prevPayload?: { comment: string; weightKg: number | null },
) {
  const removedKeys = await prisma.$transaction(async (tx) => {
    const keys = await replaceScreenshots(tx, {
      owner: { postId: existing.id },
      ownerUserId: userId,
      existing: existing.screenshots,
      keep,
      files,
    });
    const rev = await bumpRev(tx);
    const excerpt =
      data.comment !== undefined ? toCommentExcerpt(data.comment) : undefined;
    const nextComment = data.comment ?? prevPayload?.comment;
    const sourceUrl =
      data.sourceUrl !== undefined
        ? data.sourceUrl
        : nextComment != null
          ? (extractImportedSourceUrl(nextComment) ?? undefined)
          : undefined;
    await tx.post.update({
      where: { id: existing.id },
      data: {
        waterbodyId: data.waterbodyId,
        fishId: data.fishId,
        coordX: data.coordX,
        coordY: data.coordY,
        catchType: data.catchType,
        catchDate: data.catchDate ? new Date(data.catchDate) : undefined,
        commentExcerpt: excerpt,
        bait: data.bait,
        tags: data.tags,
        ...(sourceUrl !== undefined ? { sourceUrl } : {}),
        rev,
      },
    });
    return keys;
  });
  await deleteRemovedShotKeys(removedKeys);

  const post = await prisma.post.findUniqueOrThrow({
    where: { id: existing.id },
    include: detailInclude(userId),
  });
  const comment = data.comment ?? prevPayload?.comment ?? "";
  const bait = data.bait ?? existing.bait;
  const weightKg =
    data.weightKg !== undefined ? (data.weightKg ?? null) : (prevPayload?.weightKg ?? null);
  await syncPostPayload({
    id: post.id,
    comment,
    bait,
    weightKg,
    screenshots: post.screenshots,
    updatedAt: post.updatedAt,
  });
  return { post, comment, weightKg };
}
