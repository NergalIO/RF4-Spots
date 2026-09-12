-- AlterTable
ALTER TABLE "Post" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Post" ADD COLUMN "sourceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_sourceKey_key" ON "Post"("sourceKey");
CREATE INDEX "Post_tags_idx" ON "Post" USING GIN ("tags");
