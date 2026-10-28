CREATE TABLE "CollaborationReviewReference" (
  "id" TEXT NOT NULL,
  "issueIndex" INTEGER,
  "messageId" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaborationReviewReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaborationReviewReference_messageId_key"
  ON "CollaborationReviewReference"("messageId");

CREATE INDEX "CollaborationReviewReference_reviewId_issueIndex_idx"
  ON "CollaborationReviewReference"("reviewId", "issueIndex");

ALTER TABLE "CollaborationReviewReference"
  ADD CONSTRAINT "CollaborationReviewReference_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "CollaborationMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationReviewReference"
  ADD CONSTRAINT "CollaborationReviewReference_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "Review"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
