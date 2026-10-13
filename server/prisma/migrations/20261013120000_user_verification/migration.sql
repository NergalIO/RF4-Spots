-- CreateEnum
CREATE TYPE "VerificationRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable User: verifiedAt (backfill existing as verified)
ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP(3);
UPDATE "User" SET "verifiedAt" = "createdAt" WHERE "verifiedAt" IS NULL;

-- AlterTable Invite: multi-use codes
ALTER TABLE "Invite" ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Invite" ADD COLUMN "usesCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Invite" SET "usesCount" = 1 WHERE "usedAt" IS NOT NULL;
UPDATE "Invite" SET "usesCount" = 0 WHERE "usedAt" IS NULL;

-- CreateTable InviteRedemption
CREATE TABLE "InviteRedemption" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteRedemption_pkey" PRIMARY KEY ("id")
);

INSERT INTO "InviteRedemption" ("id", "inviteId", "userId", "createdAt")
SELECT 'mig_' || "id", "id", "usedById", COALESCE("usedAt", "createdAt")
FROM "Invite"
WHERE "usedById" IS NOT NULL;

-- Drop old single-use FK/unique on Invite.usedById
ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_usedById_fkey";
DROP INDEX IF EXISTS "Invite_usedById_key";
ALTER TABLE "Invite" DROP COLUMN IF EXISTS "usedById";

CREATE UNIQUE INDEX "InviteRedemption_inviteId_userId_key" ON "InviteRedemption"("inviteId", "userId");
CREATE INDEX "InviteRedemption_userId_idx" ON "InviteRedemption"("userId");

ALTER TABLE "InviteRedemption" ADD CONSTRAINT "InviteRedemption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteRedemption" ADD CONSTRAINT "InviteRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable VerificationRequest
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationRequest_userId_status_idx" ON "VerificationRequest"("userId", "status");
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");

ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
