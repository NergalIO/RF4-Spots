-- Prep for S3: searchable excerpt + object keys. Full comment/weightKg stay until storage:migrate.
ALTER TABLE "Post" ADD COLUMN "commentExcerpt" TEXT NOT NULL DEFAULT '';

UPDATE "Post" SET "commentExcerpt" = CASE
  WHEN char_length(BTRIM("comment")) <= 240 THEN BTRIM("comment")
  ELSE RTRIM(left(BTRIM("comment"), 240)) || '…'
END;

ALTER TABLE "Screenshot" RENAME COLUMN "filename" TO "objectKey";

UPDATE "Screenshot"
SET "objectKey" = 'shots/' || "objectKey"
WHERE "objectKey" NOT LIKE 'shots/%';

CREATE INDEX "Screenshot_objectKey_idx" ON "Screenshot"("objectKey");
