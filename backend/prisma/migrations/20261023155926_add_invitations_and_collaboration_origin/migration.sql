/*
  Warnings:

  - A unique constraint covering the columns `[invitationId]` on the table `Collaboration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_WITHDRAWN';

-- AlterTable
ALTER TABLE "Collaboration" ADD COLUMN     "agreedAmount" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "invitationId" TEXT,
ALTER COLUMN "applicationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "invitationId" TEXT;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "message" TEXT,
    "proposedAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invitation_campaignId_status_idx" ON "Invitation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Invitation_creatorProfileId_status_idx" ON "Invitation"("creatorProfileId", "status");

-- CreateIndex
CREATE INDEX "Invitation_campaignId_creatorProfileId_status_idx" ON "Invitation"("campaignId", "creatorProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Collaboration_invitationId_key" ON "Collaboration"("invitationId");

-- CreateIndex
CREATE INDEX "Notification_invitationId_idx" ON "Notification"("invitationId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantir qu'une collaboration provient d'une seule origine.
ALTER TABLE "Collaboration"
ADD CONSTRAINT "Collaboration_exactly_one_origin_check"
CHECK (
  (
    "applicationId" IS NOT NULL
    AND "invitationId" IS NULL
  )
  OR
  (
    "applicationId" IS NULL
    AND "invitationId" IS NOT NULL
  )
);

-- Empêcher les invitations en attente ou déjà acceptées en double.
CREATE UNIQUE INDEX "Invitation_one_active_per_campaign_creator_key"
ON "Invitation" ("campaignId", "creatorProfileId")
WHERE "status" IN ('PENDING', 'ACCEPTED');
