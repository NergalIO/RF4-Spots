-- DropTable
DROP TABLE IF EXISTS "EarningsOp";
DROP TABLE IF EXISTS "SessionCatch";
DROP TABLE IF EXISTS "FishingSession";

-- DropEnum
DROP TYPE IF EXISTS "OpKind";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "salt";
