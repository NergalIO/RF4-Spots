import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { mapComment } from "../../lib/comments.js";
import { paramId } from "../../lib/params.js";
import {
  applyListCursor,
  DELTA_LIMIT,
  detailInclude,
  listInclude,
  mapDetailPost,
  mapListPost,
  parseSinceRev,
  postsListWhere,
} from "../../lib/posts.js";
import { currentRev } from "../../lib/syncRev.js";
import { ensureFeedSeeded, isUnseenPost, markPostSeen, unreadCounts } from "../../lib/unread.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const readRouter = Router();

async function mapListed(
  userId: string,
  feedSeededAt: Date,
  rows: Parameters<typeof mapListPost>[0][],
) {
  const unread = await unreadCounts(
    userId,
    rows.map((p) => p.id),
    feedSeededAt,
  );
  return rows.map((p) =>
    mapListPost(p, {
      unreadComments: unread.counts.get(p.id) ?? 0,
      unseen: isUnseenPost(p, userId, unread.seen, feedSeededAt),
    }),
  );
}

readRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const feedSeededAt = await ensureFeedSeeded(userId, req.user!.feedSeededAt);
  const q = req.query as Record<string, unknown>;
  const where = postsListWhere(q, userId);
  const sinceRev = parseSinceRev(q);
  const rev = currentRev();
  res.setHeader("Cache-Control", "no-store");

  if (sinceRev != null) {
    const [tombstones, changed, rows] = await Promise.all([
      prisma.postTombstone.findMany({
        where: { rev: { gt: sinceRev } },
        select: { postId: true },
        take: DELTA_LIMIT + 1,
      }),
      prisma.post.findMany({
        where: { rev: { gt: sinceRev }, deletedAt: null },
        select: { id: true },
        take: DELTA_LIMIT + 1,
      }),
      prisma.post.findMany({
        where: { ...where, rev: { gt: sinceRev } },
        include: listInclude(userId),
        take: DELTA_LIMIT + 1,
      }),
    ]);
    if (tombstones.length > DELTA_LIMIT || changed.length > DELTA_LIMIT || rows.length > DELTA_LIMIT) {
      res.json({ rev, reload: true, posts: [], deletedIds: [], droppedIds: [], nextCursor: null });
      return;
    }
    const matching = new Set(rows.map((p) => p.id));
    res.json({
      rev,
      reload: false,
      posts: await mapListed(userId, feedSeededAt, rows),
      deletedIds: tombstones.map((t) => t.postId),
      droppedIds: changed.map((p) => p.id).filter((id) => !matching.has(id)),
      nextCursor: null,
    });
    return;
  }

  const listed = await applyListCursor(where, q);
  const rows = await prisma.post.findMany({
    where: listed.where,
    include: listInclude(userId),
    orderBy: [{ [listed.sort]: listed.dir }, { id: listed.dir }],
    take: listed.take + 1,
  });
  const nextCursor = rows.length > listed.take ? rows[listed.take - 1]?.id ?? null : null;
  const page = rows.slice(0, listed.take);
  res.json({
    rev,
    reload: false,
    posts: await mapListed(userId, feedSeededAt, page),
    deletedIds: [],
    droppedIds: [],
    nextCursor,
  });
});

readRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const post = await prisma.post.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      ...detailInclude(userId),
      comments: {
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, nickname: true } },
          screenshots: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!post || post.deletedAt) {
    res.status(404).json({ error: "Пост не найден" });
    return;
  }
  await markPostSeen(userId, post.id);
  res.json({
    post: {
      ...mapDetailPost(post),
      comments: post.comments.map((c) => mapComment(c)),
    },
  });
});
