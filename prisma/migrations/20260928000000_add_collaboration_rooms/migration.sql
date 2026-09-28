CREATE TYPE "CollaborationRoomStatus" AS ENUM ('ACTIVE', 'ENDED');

CREATE TYPE "CollaborationRoomMemberRole" AS ENUM ('OWNER', 'MEMBER');

CREATE TYPE "CollaborationCodeSide" AS ENUM ('LEFT', 'RIGHT');

CREATE TABLE "CollaborationRoom" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CollaborationRoomStatus" NOT NULL DEFAULT 'ACTIVE',
  "capacity" INTEGER NOT NULL DEFAULT 8,
  "pullRequestId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaborationRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationRoomMember" (
  "id" TEXT NOT NULL,
  "role" "CollaborationRoomMemberRole" NOT NULL DEFAULT 'MEMBER',
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaborationRoomMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationMessage" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "clientMessageId" TEXT,
  "roomId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaborationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborationCodeReference" (
  "id" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "side" "CollaborationCodeSide" NOT NULL DEFAULT 'RIGHT',
  "startLine" INTEGER NOT NULL,
  "endLine" INTEGER NOT NULL,
  "startColumn" INTEGER,
  "endColumn" INTEGER,
  "baseSha" TEXT,
  "headSha" TEXT,
  "selectedText" TEXT,
  "messageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaborationCodeReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaborationRoom_pullRequestId_status_idx"
  ON "CollaborationRoom"("pullRequestId", "status");

CREATE INDEX "CollaborationRoom_ownerId_idx"
  ON "CollaborationRoom"("ownerId");

CREATE UNIQUE INDEX "CollaborationRoomMember_roomId_userId_key"
  ON "CollaborationRoomMember"("roomId", "userId");

CREATE INDEX "CollaborationRoomMember_userId_idx"
  ON "CollaborationRoomMember"("userId");

CREATE INDEX "CollaborationRoomMember_roomId_leftAt_idx"
  ON "CollaborationRoomMember"("roomId", "leftAt");

CREATE UNIQUE INDEX "CollaborationMessage_roomId_authorId_clientMessageId_key"
  ON "CollaborationMessage"("roomId", "authorId", "clientMessageId");

CREATE INDEX "CollaborationMessage_roomId_createdAt_idx"
  ON "CollaborationMessage"("roomId", "createdAt");

CREATE INDEX "CollaborationMessage_authorId_idx"
  ON "CollaborationMessage"("authorId");

CREATE UNIQUE INDEX "CollaborationCodeReference_messageId_key"
  ON "CollaborationCodeReference"("messageId");

CREATE INDEX "CollaborationCodeReference_filePath_idx"
  ON "CollaborationCodeReference"("filePath");

ALTER TABLE "CollaborationRoom"
  ADD CONSTRAINT "CollaborationRoom_pullRequestId_fkey"
  FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationRoom"
  ADD CONSTRAINT "CollaborationRoom_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationRoomMember"
  ADD CONSTRAINT "CollaborationRoomMember_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "CollaborationRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationRoomMember"
  ADD CONSTRAINT "CollaborationRoomMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationMessage"
  ADD CONSTRAINT "CollaborationMessage_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "CollaborationRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationMessage"
  ADD CONSTRAINT "CollaborationMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationCodeReference"
  ADD CONSTRAINT "CollaborationCodeReference_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "CollaborationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
