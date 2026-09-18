import type { Prisma } from "@prisma/client";

const postMeta = {
  user: { select: { id: true, nickname: true } },
  fish: { select: { id: true, name: true } },
  waterbody: { select: { id: true, name: true } },
  comments: { where: { deletedAt: null }, select: { id: true, createdAt: true, userId: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} satisfies Prisma.PostInclude;

export function livePosts(): Prisma.PostWhereInput {
  return { deletedAt: null };
}

export const listInclude = (userId: string) =>
  ({
    ...postMeta,
    favorites: { where: { userId }, select: { userId: true }, take: 1 },
    votes: { where: { userId }, select: { userId: true, value: true }, take: 1 },
  }) satisfies Prisma.PostInclude;

export const favoriteInclude = (userId: string) =>
  ({
    ...postMeta,
    screenshots: true,
    favorites: { where: { userId }, select: { userId: true }, take: 1 },
    votes: { select: { userId: true, value: true } },
  }) satisfies Prisma.PostInclude;
