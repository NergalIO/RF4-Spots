import { z } from "zod";
import type { CatchType, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { CATCH_TYPES } from "./catchTypes.js";
import { iso, screenshotUrl } from "./serialize.js";
import { replaceScreenshots } from "./screenshots.js";

export const postBody = z.object({
  waterbodyId: z.string().min(1),
  fishId: z.string().min(1),
  coordX: z.coerce.number(),
  coordY: z.coerce.number(),
  catchType: z.enum(CATCH_TYPES),
  catchDate: z.string().min(1),
  comment: z.string().max(4000).optional().default(""),
  bait: z.string().max(120).optional().default(""),
  weightKg: z.preprocess((v) => {
    if (v == null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }, z.number().positive().max(500).optional()),
});

export type MappedPostInput = {
  id: string;
  coordX: number;
  coordY: number;
  catchType: CatchType;
  catchDate: Date;
  comment: string;
  weightKg: number | null;
  bait: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; nickname: string };
  fish: { id: string; name: string };
  waterbody: { id: string; name: string };
  screenshots: { id: string; filename: string; sortOrder: number }[];
  comments?: { id: string; createdAt: Date; userId: string }[];
  _count?: { comments: number; favorites?: number };
  favorites?: { userId: string }[];
};

export function mapPost(post: MappedPostInput) {
  const commentsMeta = (post.comments ?? []).map((c) => ({
    id: c.id,
    createdAt: iso(c.createdAt),
    userId: c.userId,
  }));
  return {
    id: post.id,
    coordX: post.coordX,
    coordY: post.coordY,
    catchType: post.catchType,
    catchDate: iso(post.catchDate),
    comment: post.comment,
    weightKg: post.weightKg,
    bait: post.bait,
    createdAt: iso(post.createdAt),
    updatedAt: iso(post.updatedAt),
    author: post.user,
    fish: post.fish,
    waterbody: post.waterbody,
    screenshots: post.screenshots
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ id: s.id, url: screenshotUrl(s.filename) })),
    commentsCount: post._count?.comments ?? post.comments?.length ?? 0,
    commentsMeta,
    favorited: Boolean(post.favorites?.length),
  };
}

export const includeList = {
  user: { select: { id: true, nickname: true } },
  fish: { select: { id: true, name: true } },
  waterbody: { select: { id: true, name: true } },
  screenshots: true,
  comments: { where: { deletedAt: null }, select: { id: true, createdAt: true, userId: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} satisfies Prisma.PostInclude;

export function livePosts(): Prisma.PostWhereInput {
  return { deletedAt: null };
}

export const favoriteInclude = (userId: string) =>
  ({
    ...includeList,
    favorites: { where: { userId }, select: { userId: true }, take: 1 },
  }) satisfies Prisma.PostInclude;

type QueryBag = Record<string, unknown>;

function qStr(q: QueryBag, key: string): string | undefined {
  const v = q[key];
  return typeof v === "string" ? v : undefined;
}

function qFlag(q: QueryBag, key: string): boolean {
  const v = q[key];
  return v === "1" || v === "true";
}

function dayEnd(isoDate: string): Date {
  const end = new Date(isoDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function postsListWhere(q: QueryBag, userId: string): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = { ...livePosts() };
  const waterbodyId = qStr(q, "waterbodyId");
  if (waterbodyId) where.waterbodyId = waterbodyId;
  const fishId = qStr(q, "fishId");
  if (fishId) where.fishId = fishId;
  const catchType = qStr(q, "catchType");
  if (catchType && (CATCH_TYPES as readonly string[]).includes(catchType)) {
    where.catchType = catchType as CatchType;
  }
  if (qFlag(q, "mine")) where.userId = userId;
  else {
    const authorId = qStr(q, "authorId");
    if (authorId) where.userId = authorId;
  }
  if (qFlag(q, "favorite")) {
    where.favorites = { some: { userId } };
  }
  const catchFrom = qStr(q, "catchFrom");
  const catchTo = qStr(q, "catchTo");
  if (catchFrom || catchTo) {
    where.catchDate = {};
    if (catchFrom) where.catchDate.gte = new Date(catchFrom);
    if (catchTo) where.catchDate.lte = dayEnd(catchTo);
  }
  const uploadedFrom = qStr(q, "uploadedFrom");
  const uploadedTo = qStr(q, "uploadedTo");
  if (uploadedFrom || uploadedTo) {
    where.createdAt = {};
    if (uploadedFrom) where.createdAt.gte = new Date(uploadedFrom);
    if (uploadedTo) where.createdAt.lte = dayEnd(uploadedTo);
  }
  const search = qStr(q, "q")?.trim() ?? "";
  if (search) {
    where.OR = [
      { comment: { contains: search, mode: "insensitive" } },
      { comments: { some: { deletedAt: null, text: { contains: search, mode: "insensitive" } } } },
      { fish: { name: { contains: search, mode: "insensitive" } } },
      { bait: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function applyListCursor(
  where: Prisma.PostWhereInput,
  q: QueryBag,
): Promise<{ where: Prisma.PostWhereInput; sort: "catchDate" | "createdAt"; take: number }> {
  const sort = qStr(q, "sort") === "catchDate" ? "catchDate" : "createdAt";
  const take = Math.min(Math.max(Number(q.take) || 50, 1), 100);
  const cursorId = qStr(q, "cursor") ?? "";
  if (!cursorId) return { where, sort, take };
  const cursorPost = await prisma.post.findUnique({
    where: { id: cursorId },
    select: { id: true, createdAt: true, catchDate: true },
  });
  if (!cursorPost) return { where, sort, take };
  const field = sort === "catchDate" ? cursorPost.catchDate : cursorPost.createdAt;
  const extra: Prisma.PostWhereInput = {
    OR: [{ [sort]: { lt: field } }, { AND: [{ [sort]: field }, { id: { lt: cursorPost.id } }] }],
  };
  return { where: { ...where, AND: [extra] }, sort, take };
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
      },
      include: favoriteInclude(userId),
    });
  });
}
