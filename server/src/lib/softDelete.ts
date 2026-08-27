import { prisma } from "./prisma.js";
import { unlinkFilenames } from "./upload.js";

export async function softDeletePost(postId: string, deletedById: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      screenshots: { select: { filename: true } },
      comments: { include: { screenshots: { select: { filename: true } } } },
    },
  });
  if (!post || post.deletedAt) return post;
  const files = [
    ...post.screenshots.map((s) => s.filename),
    ...post.comments.flatMap((c) => c.screenshots.map((s) => s.filename)),
  ];
  await prisma.$transaction(async (tx) => {
    await tx.screenshot.deleteMany({
      where: { OR: [{ postId }, { comment: { postId } }] },
    });
    await tx.comment.updateMany({
      where: { postId, deletedAt: null },
      data: { deletedAt: new Date(), deletedById },
    });
    await tx.post.update({
      where: { id: postId },
      data: { deletedAt: new Date(), deletedById },
    });
  });
  unlinkFilenames(files);
  return post;
}

export async function softDeleteComment(commentId: string, deletedById: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { screenshots: { select: { filename: true } } },
  });
  if (!comment || comment.deletedAt) return comment;
  const files = comment.screenshots.map((s) => s.filename);
  await prisma.$transaction(async (tx) => {
    await tx.screenshot.deleteMany({ where: { commentId } });
    await tx.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), deletedById },
    });
  });
  unlinkFilenames(files);
  return comment;
}
