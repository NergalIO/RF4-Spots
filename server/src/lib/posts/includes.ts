import type { Prisma } from "@prisma/client";

const includeList = {
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
    votes: { select: { userId: true, value: true } },
  }) satisfies Prisma.PostInclude;
