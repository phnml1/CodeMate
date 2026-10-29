CREATE TYPE "GitHubReviewStatus" AS ENUM ('NOT_REQUESTED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

ALTER TABLE "Comment"
  ADD COLUMN "githubStatus" "GitHubReviewStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "githubReviewId" TEXT,
  ADD COLUMN "githubReviewCommentId" TEXT,
  ADD COLUMN "githubReviewUrl" TEXT,
  ADD COLUMN "githubError" TEXT;
