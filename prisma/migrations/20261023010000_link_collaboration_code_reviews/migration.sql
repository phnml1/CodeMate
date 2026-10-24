ALTER TABLE "Comment" ADD COLUMN "collaborationMessageId" TEXT;

CREATE UNIQUE INDEX "Comment_collaborationMessageId_key" ON "Comment"("collaborationMessageId");

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_collaborationMessageId_fkey"
  FOREIGN KEY ("collaborationMessageId") REFERENCES "CollaborationMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Comment" (
  "id", "content", "isResolved", "pullRequestId", "authorId",
  "mentions", "reactions", "createdAt", "updatedAt", "collaborationMessageId"
)
SELECT
  'collaboration-review-' || message."id", message."content", false,
  room."pullRequestId", message."authorId", ARRAY[]::TEXT[], '{}'::jsonb,
  message."createdAt", message."updatedAt", message."id"
FROM "CollaborationMessage" AS message
JOIN "CollaborationRoom" AS room ON room."id" = message."roomId"
JOIN "CollaborationCodeReference" AS reference ON reference."messageId" = message."id"
ON CONFLICT ("collaborationMessageId") DO NOTHING;
