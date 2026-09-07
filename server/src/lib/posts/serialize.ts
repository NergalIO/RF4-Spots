import type { CatchType, PostVoteValue } from "@prisma/client";
import { iso, screenshotUrl } from "../serialize.js";
import { tallyVotes } from "../votes.js";

type MappedPostInput = {
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
  votes?: { userId: string; value: PostVoteValue }[];
};

export function mapPost(post: MappedPostInput, viewerId = "") {
  const commentsMeta = (post.comments ?? []).map((c) => ({
    id: c.id,
    createdAt: iso(c.createdAt),
    userId: c.userId,
  }));
  const { likesCount, dislikesCount, userReaction } = tallyVotes(post.votes ?? [], viewerId);
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
    likesCount,
    dislikesCount,
    userReaction,
  };
}
