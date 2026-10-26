-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_creatorProfileId_status_idx" ON "Application"("creatorProfileId", "status");

-- CreateIndex
CREATE INDEX "Application_campaignId_status_idx" ON "Application"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_campaignId_creatorProfileId_key" ON "Application"("campaignId", "creatorProfileId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
