ALTER TABLE "CollaborationRoom" ALTER COLUMN "capacity" SET DEFAULT 4;

UPDATE "CollaborationRoom" SET "capacity" = 4 WHERE "capacity" > 4;
