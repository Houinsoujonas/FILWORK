-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DELIVERABLE_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'DELIVERABLE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'DELIVERABLE_REVISION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_STATUS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'COLLABORATION_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'COLLABORATION_CANCELLED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "collaborationId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_collaborationId_idx" ON "Notification"("collaborationId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
