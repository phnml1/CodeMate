CREATE TYPE "ReviewStage" AS ENUM (
  'QUEUED',
  'FETCHING_FILES',
  'ANALYZING',
  'FINALIZING',
  'COMPLETED',
  'FAILED'
);

ALTER TABLE "Review"
ADD COLUMN "stage" "ReviewStage" NOT NULL DEFAULT 'QUEUED';

UPDATE "Review"
SET "stage" = CASE
  WHEN "status" = 'COMPLETED' THEN 'COMPLETED'::"ReviewStage"
  WHEN "status" = 'FAILED' THEN 'FAILED'::"ReviewStage"
  ELSE 'QUEUED'::"ReviewStage"
END;
