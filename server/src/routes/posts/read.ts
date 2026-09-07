import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { mapComment } from "../../lib/comments.js";
import { paramId } from "../../lib/params.js";
import { applyListCursor, favoriteInclude, mapPost, postsListWhere } from "../../lib/posts.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const readRouter = Router();

readRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const listed = await applyListCursor(postsListWhere(req.query as Record<string, unknown>, req.user!.id), req.query as Record<string, unknown>);
  const rows = await prisma.post.findMany({
    where: listed.where,
    include: favoriteInclude(req.user!.id),
    orderBy: [{ [listed.sort]: "desc" }, { id: "desc" }],
    take: listed.take + 1,
  });
  const nextCursor = rows.length > listed.take ? rows[listed.take - 1]?.id ?? null : null;
  const page = rows.slice(0, listed.take);
  res.setHeader("Cache-Control", "no-store");
  res.json({ posts: page.map((p) => mapPost(p, req.user!.id)), nextCursor });
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
