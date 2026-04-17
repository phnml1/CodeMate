CREATE TABLE "UserRepository" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserRepository_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UserRepository" ("id", "userId", "repositoryId", "createdAt", "updatedAt")
SELECT
  CONCAT('ur_', "id"),
  "userId",
  "id",
  "createdAt",
  "updatedAt"
FROM "Repository";

CREATE UNIQUE INDEX "UserRepository_userId_repositoryId_key"
  ON "UserRepository"("userId", "repositoryId");

CREATE INDEX "UserRepository_userId_idx"
  ON "UserRepository"("userId");

CREATE INDEX "UserRepository_repositoryId_idx"
  ON "UserRepository"("repositoryId");

ALTER TABLE "UserRepository"
  ADD CONSTRAINT "UserRepository_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRepository"
  ADD CONSTRAINT "UserRepository_repositoryId_fkey"
  FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Repository_userId_idx";

ALTER TABLE "Repository"
  DROP CONSTRAINT IF EXISTS "Repository_userId_fkey";

ALTER TABLE "Repository"
  DROP COLUMN "userId";
