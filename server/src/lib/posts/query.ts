import type { CatchType, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { CATCH_TYPES } from "../catchTypes.js";
import { livePosts } from "./includes.js";

type QueryBag = Record<string, unknown>;
type CmpOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between" | "contains" | "notContains";

const OPS = new Set<CmpOp>(["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "notContains"]);

function qStr(q: QueryBag, key: string): string | undefined {
  const v = q[key];
  return typeof v === "string" ? v : undefined;
}

function qOp(q: QueryBag, key: string, fallback: CmpOp): CmpOp {
  const v = qStr(q, key);
  return v && OPS.has(v as CmpOp) ? (v as CmpOp) : fallback;
}

function qTri(q: QueryBag, key: string): boolean | undefined {
  const v = q[key];
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return undefined;
}

function dayEnd(isoDate: string): Date {
  const end = new Date(isoDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

function and(where: Prisma.PostWhereInput, clause: Prisma.PostWhereInput) {
  const prev = where.AND;
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  where.AND = [...list, clause];
}

function applyId(where: Prisma.PostWhereInput, field: "fishId" | "catchType", value: string, op: CmpOp) {
  if (op === "neq") where[field] = { not: value };
  else where[field] = value;
}

function applyDate(where: Prisma.PostWhereInput, field: "catchDate" | "createdAt", from: string | undefined, to: string | undefined, op: CmpOp) {
  if (op === "between" || (!op && (from || to))) {
    if (!from && !to) return;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = dayEnd(to);
    else if (from && op === "between") range.gte = new Date(from);
    where[field] = range;
    return;
  }
  if (!from) return;
  const start = new Date(from);
  const end = dayEnd(from);
  if (op === "eq") {
    where[field] = { gte: start, lte: end };
    return;
  }
  if (op === "neq") {
    and(where, { OR: [{ [field]: { lt: start } }, { [field]: { gt: end } }] });
    return;
  }
  if (op === "gt") where[field] = { gt: end };
  else if (op === "gte") where[field] = { gte: start };
  else if (op === "lt") where[field] = { lt: start };
  else if (op === "lte") where[field] = { lte: end };
}

function searchClause(search: string, op: CmpOp): Prisma.PostWhereInput {
  const contains = [
    { comment: { contains: search, mode: "insensitive" as const } },
    { comments: { some: { deletedAt: null, text: { contains: search, mode: "insensitive" as const } } } },
    { fish: { name: { contains: search, mode: "insensitive" as const } } },
    { bait: { contains: search, mode: "insensitive" as const } },
  ];
  const equals = [
    { comment: { equals: search, mode: "insensitive" as const } },
    { fish: { name: { equals: search, mode: "insensitive" as const } } },
    { bait: { equals: search, mode: "insensitive" as const } },
  ];
  if (op === "notContains") return { NOT: { OR: contains } };
  if (op === "eq") return { OR: equals };
  if (op === "neq") return { NOT: { OR: equals } };
  return { OR: contains };
}

export function postsListWhere(q: QueryBag, userId: string): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = { ...livePosts() };
  const waterbodyId = qStr(q, "waterbodyId");
  if (waterbodyId) where.waterbodyId = waterbodyId;
  const fishId = qStr(q, "fishId");
  if (fishId) applyId(where, "fishId", fishId, qOp(q, "fishOp", "eq"));
  const catchType = qStr(q, "catchType");
  if (catchType && (CATCH_TYPES as readonly string[]).includes(catchType)) {
    applyId(where, "catchType", catchType as CatchType, qOp(q, "catchTypeOp", "eq"));
  }
  const mine = qTri(q, "mine");
  if (mine != null) {
    const wantMine = qOp(q, "mineOp", "eq") === "neq" ? !mine : mine;
    where.userId = wantMine ? userId : { not: userId };
  } else {
    const authorId = qStr(q, "authorId");
    if (authorId) where.userId = authorId;
  }
  const favorite = qTri(q, "favorite");
  if (favorite != null) {
    const wantFav = qOp(q, "favoriteOp", "eq") === "neq" ? !favorite : favorite;
    where.favorites = wantFav ? { some: { userId } } : { none: { userId } };
  }
  applyDate(where, "catchDate", qStr(q, "catchFrom"), qStr(q, "catchTo"), qOp(q, "catchDateOp", "between"));
  applyDate(where, "createdAt", qStr(q, "uploadedFrom"), qStr(q, "uploadedTo"), qOp(q, "uploadedDateOp", "between"));
  const search = qStr(q, "q")?.trim() ?? "";
  if (search) and(where, searchClause(search, qOp(q, "qOp", "contains")));
  return where;
}

export function listOrder(q: QueryBag): { sort: "catchDate" | "createdAt"; dir: "asc" | "desc" } {
  return {
    sort: qStr(q, "sort") === "catchDate" ? "catchDate" : "createdAt",
    dir: qStr(q, "sortDir") === "asc" ? "asc" : "desc",
  };
}

export async function applyListCursor(
  where: Prisma.PostWhereInput,
  q: QueryBag,
): Promise<{ where: Prisma.PostWhereInput; sort: "catchDate" | "createdAt"; dir: "asc" | "desc"; take: number }> {
  const { sort, dir } = listOrder(q);
  const take = Math.min(Math.max(Number(q.take) || 50, 1), 100);
  const cursorId = qStr(q, "cursor") ?? "";
  if (!cursorId) return { where, sort, dir, take };
  const cursorPost = await prisma.post.findUnique({
    where: { id: cursorId },
    select: { id: true, createdAt: true, catchDate: true },
  });
  if (!cursorPost) return { where, sort, dir, take };
  const field = sort === "catchDate" ? cursorPost.catchDate : cursorPost.createdAt;
  const cmp = dir === "asc" ? "gt" : "lt";
  const extra: Prisma.PostWhereInput = {
    OR: [{ [sort]: { [cmp]: field } }, { AND: [{ [sort]: field }, { id: { [cmp]: cursorPost.id } }] }],
  };
  const prev = where.AND;
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  return { where: { ...where, AND: [...list, extra] }, sort, dir, take };
}
