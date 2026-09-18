import type { CatchType, PostVoteValue } from "@prisma/client";
import { iso, screenshotUrl } from "../serialize.js";

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
  comment: string;
  tags?: string[];
  createdAt: Date;
  commentsCount: number;
  lastCommentAt: Date | null;
  likesCount: number;
  dislikesCount: number;
  user: { id: string; nickname: string };
  fish: { id: string; name: string };
  waterbody: { id: string; name: string };
  screenshots?: { id: string; filename: string; sortOrder: number }[];
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
  return mapBase(post, excerptComment(post.comment), unread);
}

export function mapDetailPost(post: MappedPostInput, unread: UnreadFlags = { unreadComments: 0, unseen: false }) {
  return {
    ...mapBase(post, stripImportedSource(post.comment), unread),
    screenshots: (post.screenshots ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ id: s.id, url: screenshotUrl(s.filename) })),
  };
}

export const mapPost = mapDetailPost;
