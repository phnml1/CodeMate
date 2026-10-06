ALTER TABLE "CollaborationRoom"
ADD COLUMN "presenceScope" TEXT NOT NULL DEFAULT 'production';

CREATE INDEX "CollaborationRoom_presenceScope_status_idx"
ON "CollaborationRoom"("presenceScope", "status");
