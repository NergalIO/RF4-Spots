import type { Prisma } from "@prisma/client";

const postMeta = {
  user: { select: { id: true, nickname: true } },
  fish: { select: { id: true, name: true } },
  waterbody: { select: { id: true, name: true } },
} satisfies Prisma.PostInclude;

export function livePosts(): Prisma.PostWhereInput {
  return { deletedAt: null };
}

export const listInclude = (userId: string) =>
  ({
    ...postMeta,
    favorites: { where: { userId }, select: { userId: true }, take: 1 },
    votes: { where: { userId }, select: { value: true }, take: 1 },
  }) satisfies Prisma.PostInclude;

export const detailInclude = (userId: string) =>
  ({
    ...listInclude(userId),
    screenshots: true,
  }) satisfies Prisma.PostInclude;
