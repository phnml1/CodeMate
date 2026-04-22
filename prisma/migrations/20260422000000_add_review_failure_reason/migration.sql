DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_FAILED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Review"
ADD COLUMN "failureReason" TEXT;
