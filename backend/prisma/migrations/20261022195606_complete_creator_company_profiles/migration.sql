-- CreateEnum
CREATE TYPE "CreatorAvailability" AS ENUM ('AVAILABLE', 'LIMITED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'FACEBOOK', 'TWITCH');

-- CreateEnum
CREATE TYPE "PortfolioItemType" AS ENUM ('IMAGE', 'VIDEO', 'LINK');

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "availabilityStatus" "CreatorAvailability" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "rateCurrency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "startingRate" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "CreatorSocial" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "followerCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PortfolioItemType" NOT NULL,
    "url" TEXT NOT NULL,
    "campaignName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorSocial_platform_idx" ON "CreatorSocial"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSocial_creatorProfileId_platform_key" ON "CreatorSocial"("creatorProfileId", "platform");

-- CreateIndex
CREATE INDEX "PortfolioItem_creatorProfileId_createdAt_idx" ON "PortfolioItem"("creatorProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreatorSocial" ADD CONSTRAINT "CreatorSocial_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
