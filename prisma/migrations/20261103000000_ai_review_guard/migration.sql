ALTER TABLE "Review" ADD COLUMN "aiRequestedAt" TIMESTAMP(3);
CREATE INDEX "Review_aiRequestedAt_idx" ON "Review"("aiRequestedAt");

CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
CREATE TABLE "GitHubWebhookDelivery" (
    "id" TEXT NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PROCESSING',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GitHubWebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GitHubWebhookDelivery_status_updatedAt_idx" ON "GitHubWebhookDelivery"("status", "updatedAt");
