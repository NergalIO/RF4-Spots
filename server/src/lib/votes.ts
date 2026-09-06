import type { PostVoteValue } from "@prisma/client";
import { prisma } from "./prisma.js";

export const VOTE_VALUES = ["like", "dislike"] as const;
export type VoteValue = (typeof VOTE_VALUES)[number];

export function tallyVotes(
  votes: { userId: string; value: PostVoteValue | VoteValue }[],
  viewerId: string,
) {
  let likesCount = 0;
  let dislikesCount = 0;
  let userReaction: VoteValue | null = null;
  for (const vote of votes) {
    if (vote.value === "like") likesCount += 1;
    else dislikesCount += 1;
    if (vote.userId === viewerId) userReaction = vote.value;
  }
  return { likesCount, dislikesCount, userReaction };
}

export async function setPostVote(userId: string, postId: string, value: VoteValue | null) {
  if (value == null) {
    await prisma.postVote.deleteMany({ where: { userId, postId } });
  } else {
    await prisma.postVote.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId, value },
      update: { value },
    });
  }
  const groups = await prisma.postVote.groupBy({
    by: ["value"],
    where: { postId },
    _count: { _all: true },
  });
  return {
    userReaction: value,
    likesCount: groups.find((g) => g.value === "like")?._count._all ?? 0,
    dislikesCount: groups.find((g) => g.value === "dislike")?._count._all ?? 0,
  };
}
