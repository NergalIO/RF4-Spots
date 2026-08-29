import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { unlinkFilenames } from "./upload.js";

const keepIds = z.array(z.string().min(1).max(64)).max(32);

export function parseKeepScreenshots(raw: unknown): { ok: true; ids?: string[] } | { ok: false } {
  if (raw == null || raw === "") return { ok: true, ids: undefined };
  if (typeof raw !== "string") return { ok: false };
  try {
    const parsed = keepIds.safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false };
    return { ok: true, ids: parsed.data };
  } catch {
    return { ok: false };
  }
}

export function nextSortOrder(max: number | null | undefined): number {
  return (max ?? -1) + 1;
}

type Owner = { postId: string } | { commentId: string };

export async function replaceScreenshots(
  tx: Prisma.TransactionClient,
  opts: {
    owner: Owner;
    existing: { id: string; filename: string }[];
    keep?: string[];
    files: { filename: string }[];
  },
) {
  const where = "postId" in opts.owner ? { postId: opts.owner.postId } : { commentId: opts.owner.commentId };
  if (opts.keep) {
    const removed = opts.existing.filter((s) => !opts.keep!.includes(s.id));
    await tx.screenshot.deleteMany({
      where: { ...where, id: { notIn: opts.keep } },
    });
    unlinkFilenames(removed.map((s) => s.filename));
  }
  const maxOrder = await tx.screenshot.aggregate({
    where,
    _max: { sortOrder: true },
  });
  const start = nextSortOrder(maxOrder._max.sortOrder);
  if (opts.files.length) {
    await tx.screenshot.createMany({
      data: opts.files.map((f, i) => ({
        ...where,
        filename: f.filename,
        sortOrder: start + i,
      })),
    });
  }
}
