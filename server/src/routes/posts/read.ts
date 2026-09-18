import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { mapComment } from "../../lib/comments.js";
import { paramId } from "../../lib/params.js";
import { applyListCursor, favoriteInclude, listInclude, mapPost, postsListWhere } from "../../lib/posts.js";
import { collectVoteCounts } from "../../lib/votes.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const readRouter = Router();

readRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const listed = await applyListCursor(postsListWhere(req.query as Record<string, unknown>, userId), req.query as Record<string, unknown>);
  const rows = await prisma.post.findMany({
    where: listed.where,
    include: listInclude(userId),
    orderBy: [{ [listed.sort]: listed.dir }, { id: listed.dir }],
    take: listed.take + 1,
  });
  const nextCursor = rows.length > listed.take ? rows[listed.take - 1]?.id ?? null : null;
  const page = rows.slice(0, listed.take);
  const ids = page.map((p) => p.id);
  const groups = ids.length
    ? await prisma.postVote.groupBy({
        by: ["postId", "value"],
        where: { postId: { in: ids } },
        _count: { _all: true },
      })
    : [];
  const counts = collectVoteCounts(groups);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    posts: page.map((p) =>
      mapPost(p, userId, {
        likesCount: counts.get(p.id)?.likesCount ?? 0,
        dislikesCount: counts.get(p.id)?.dislikesCount ?? 0,
        userReaction: p.votes[0]?.value ?? null,
      }),
    ),
    nextCursor,
  });
});

readRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const post = await prisma.post.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      ...favoriteInclude(req.user!.id),
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
  res.json({
    post: {
      ...mapPost(post, req.user!.id),
      comments: post.comments.map((c) => mapComment(c)),
    },
  });
});
