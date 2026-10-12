import type { CatchType, PostVoteValue } from "@prisma/client";
import { iso, mapShotUrls } from "../serialize.js";

const VK_SOURCE_TAIL = /(?:\r?\n)+Источник:\s*https?:\/\/\S+\s*$/;
export const LIST_COMMENT_EXCERPT = 240;

export function stripImportedSource(comment: string) {
  return comment.replace(VK_SOURCE_TAIL, "").replace(/[ \t]+$/g, "").replace(/\n+$/, "");
}

export function excerptComment(comment: string) {
  const text = stripImportedSource(comment);
  if (text.length <= LIST_COMMENT_EXCERPT) return text;
  return `${text.slice(0, LIST_COMMENT_EXCERPT).trimEnd()}…`;
}

type MappedPostInput = {
  id: string;
  userId: string;
  coordX: number;
  coordY: number;
  catchType: CatchType;
  catchDate: Date;
  commentExcerpt: string;
  tags?: string[];
  createdAt: Date;
  commentsCount: number;
  lastCommentAt: Date | null;
  likesCount: number;
  dislikesCount: number;
  user: { id: string; nickname: string };
  fish: { id: string; name: string };
  waterbody: { id: string; name: string };
  screenshots?: { id: string; objectKey: string; sortOrder: number }[];
  favorites?: { userId: string }[];
  votes?: { value: PostVoteValue }[];
};

export type UnreadFlags = {
  unreadComments: number;
  unseen: boolean;
};

function mapBase(post: MappedPostInput, comment: string, unread: UnreadFlags) {
  return {
    id: post.id,
    coordX: post.coordX,
    coordY: post.coordY,
    catchType: post.catchType,
    catchDate: iso(post.catchDate),
    createdAt: iso(post.createdAt),
    comment,
    tags: post.tags ?? [],
    author: post.user,
    fish: post.fish,
    waterbody: post.waterbody,
    commentsCount: post.commentsCount,
    lastCommentAt: iso(post.lastCommentAt),
    unreadComments: unread.unreadComments,
    unseen: unread.unseen,
    favorited: Boolean(post.favorites?.length),
    likesCount: post.likesCount,
    dislikesCount: post.dislikesCount,
    userReaction: post.votes?.[0]?.value ?? null,
  };
}

export function mapListPost(post: MappedPostInput, unread: UnreadFlags) {
  return mapBase(post, post.commentExcerpt, unread);
}

export async function mapDetailPost(
  post: MappedPostInput,
  fullComment: string,
  unread: UnreadFlags = { unreadComments: 0, unseen: false },
) {
  return {
    ...mapBase(post, stripImportedSource(fullComment), unread),
    screenshots: await mapShotUrls(post.screenshots ?? []),
  };
}

/** Sync helper when payload already loaded and shots already signed */
export function mapDetailPostSync(
  post: MappedPostInput,
  fullComment: string,
  screenshots: { id: string; url: string }[],
  unread: UnreadFlags = { unreadComments: 0, unseen: false },
) {
  return {
    ...mapBase(post, stripImportedSource(fullComment), unread),
    screenshots,
  };
}
