-- CreateTable
CREATE TABLE "GuideDataset" (
    "key" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rows" JSONB NOT NULL,

    CONSTRAINT "GuideDataset_pkey" PRIMARY KEY ("key")
);
