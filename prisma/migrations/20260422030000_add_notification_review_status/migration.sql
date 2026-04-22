CREATE TYPE "NotificationReviewStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

ALTER TABLE "Notification"
ADD COLUMN "reviewStatus" "NotificationReviewStatus";

UPDATE "Notification"
SET "reviewStatus" = CASE
  WHEN "type" = 'NEW_REVIEW' THEN 'COMPLETED'::"NotificationReviewStatus"
  WHEN "type" = 'REVIEW_FAILED' THEN 'FAILED'::"NotificationReviewStatus"
  ELSE NULL
END;
