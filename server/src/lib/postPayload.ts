import { excerptComment } from "./posts/serialize.js";
import { deleteObjects, putPostPayload, type PostPayload, type PostPayloadShot } from "./s3.js";

export function buildPostPayload(input: {
  id: string;
  comment: string;
  bait: string;
  weightKg: number | null;
  screenshots: { id: string; objectKey: string; sortOrder: number }[];
  updatedAt?: Date | string;
}): PostPayload {
  const shots: PostPayloadShot[] = input.screenshots
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({ id: s.id, key: s.objectKey, sortOrder: s.sortOrder }));
  return {
    v: 1,
    id: input.id,
    comment: input.comment,
    bait: input.bait,
    weightKg: input.weightKg,
    screenshots: shots,
    updatedAt:
      input.updatedAt instanceof Date
        ? input.updatedAt.toISOString()
        : (input.updatedAt ?? new Date().toISOString()),
  };
}

export async function syncPostPayload(input: Parameters<typeof buildPostPayload>[0]) {
  await putPostPayload(buildPostPayload(input));
}

export function toCommentExcerpt(comment: string) {
  return excerptComment(comment);
}

export async function removeShotKeys(keys: string[]) {
  await deleteObjects(keys);
}

export async function removePostStorage(postId: string, shotKeys: string[]) {
  await deleteObjects([...shotKeys, `posts/${postId}.json`]);
}
