import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { zodError } from "../../lib/httpErrors.js";
import { paramId } from "../../lib/params.js";
import { loadPost, type RequestWithPost } from "../../lib/posts.js";
import { setPostVote, VOTE_VALUES } from "../../lib/votes.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const interactionsRouter = Router();

interactionsRouter.post("/:id/favorite", requireAuth, loadPost, async (req, res) => {
  const { livePost, user } = req as RequestWithPost;
  await prisma.favorite.upsert({
    where: { userId_postId: { userId: user!.id, postId: livePost.id } },
    create: { userId: user!.id, postId: livePost.id },
    update: {},
  });
  res.json({ ok: true, favorited: true });
});

interactionsRouter.delete("/:id/favorite", requireAuth, async (req: AuthedRequest, res) => {
  const postId = paramId(req.params.id);
  await prisma.favorite.deleteMany({ where: { userId: req.user!.id, postId } });
  res.json({ ok: true, favorited: false });
});

interactionsRouter.put("/:id/vote", requireAuth, loadPost, async (req, res) => {
  const parsed = z.object({ value: z.enum(VOTE_VALUES).nullable() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodError(parsed.error) });
    return;
  }
  const { livePost, user } = req as RequestWithPost;
  const result = await setPostVote(user!.id, livePost.id, parsed.data.value);
  res.json({ ok: true, ...result });
});
