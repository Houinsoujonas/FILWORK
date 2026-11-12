-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CAMPAIGN_PUBLISHED';
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "campaignId" TEXT;
-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "campaignEmails" BOOLEAN NOT NULL DEFAULT true;
-- CreateIndex
CREATE INDEX "Notification_campaignId_idx" ON "Notification"("campaignId");
-- CreateIndex
CREATE UNIQUE INDEX "Notification_campaign_published_unique" ON "Notification"("userId", "type", "campaignId") WHERE ("campaignId" IS NOT NULL AND "type" = 'CAMPAIGN_PUBLISHED');
-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
