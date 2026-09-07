import type { CatchType, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { CATCH_TYPES } from "../catchTypes.js";
import { livePosts } from "./includes.js";

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
