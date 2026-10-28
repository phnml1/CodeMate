ALTER TABLE "Notification"
ADD COLUMN "readAt" TIMESTAMP(3);

-- The original read time is unknown for existing rows, so retain them for
-- seven days from this migration instead of deleting them immediately.
UPDATE "Notification"
SET "readAt" = NOW()
WHERE "isRead" = true;

CREATE INDEX "Notification_isRead_readAt_idx"
ON "Notification"("isRead", "readAt");
