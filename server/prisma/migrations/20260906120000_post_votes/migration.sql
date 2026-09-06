-- CreateEnum
CREATE TYPE "PostVoteValue" AS ENUM ('like', 'dislike');

-- CreateTable
CREATE TABLE "PostVote" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "value" "PostVoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostVote_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateIndex
CREATE INDEX "PostVote_postId_value_idx" ON "PostVote"("postId", "value");

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
