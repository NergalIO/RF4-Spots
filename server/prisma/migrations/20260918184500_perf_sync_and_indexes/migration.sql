-- AlterTable
ALTER TABLE "User" ADD COLUMN "feedSeededAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "rev" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "dislikesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "commentsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "lastCommentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Screenshot" ADD COLUMN "ownerUserId" TEXT;

UPDATE "Screenshot" AS s
SET "ownerUserId" = p."userId"
FROM "Post" AS p
WHERE s."postId" = p."id" AND s."ownerUserId" IS NULL;

UPDATE "Screenshot" AS s
SET "ownerUserId" = c."userId"
FROM "Comment" AS c
WHERE s."commentId" = c."id" AND s."ownerUserId" IS NULL;

DELETE FROM "Screenshot" WHERE "ownerUserId" IS NULL;

ALTER TABLE "Screenshot" ALTER COLUMN "ownerUserId" SET NOT NULL;

UPDATE "Post" AS p
SET
  "likesCount" = COALESCE((
    SELECT COUNT(*)::int FROM "PostVote" AS v WHERE v."postId" = p."id" AND v."value" = 'like'
  ), 0),
  "dislikesCount" = COALESCE((
    SELECT COUNT(*)::int FROM "PostVote" AS v WHERE v."postId" = p."id" AND v."value" = 'dislike'
  ), 0),
  "commentsCount" = COALESCE((
    SELECT COUNT(*)::int FROM "Comment" AS c WHERE c."postId" = p."id" AND c."deletedAt" IS NULL
  ), 0),
  "lastCommentAt" = (
    SELECT MAX(c."createdAt") FROM "Comment" AS c WHERE c."postId" = p."id" AND c."deletedAt" IS NULL
  );

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL,
    "rev" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SyncState" ("id", "rev") VALUES (1, 0);

-- CreateTable
CREATE TABLE "PostTombstone" (
    "postId" TEXT NOT NULL,
    "rev" INTEGER NOT NULL,

    CONSTRAINT "PostTombstone_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "UserPostSeen" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPostSeen_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Post_rev_idx" ON "Post"("rev");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Screenshot_ownerUserId_idx" ON "Screenshot"("ownerUserId");

-- CreateIndex
CREATE INDEX "PostTombstone_rev_idx" ON "PostTombstone"("rev");

-- CreateIndex
CREATE INDEX "UserPostSeen_postId_idx" ON "UserPostSeen"("postId");

-- CreateIndex
CREATE INDEX "Post_live_createdAt_idx" ON "Post" ("createdAt" DESC) WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Post_live_catchDate_idx" ON "Post" ("catchDate" DESC) WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Post_live_waterbody_createdAt_idx" ON "Post" ("waterbodyId", "createdAt" DESC) WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Comment_live_createdAt_idx" ON "Comment" ("createdAt" DESC) WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "UserPostSeen" ADD CONSTRAINT "UserPostSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostSeen" ADD CONSTRAINT "UserPostSeen_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
