CREATE TABLE "Thread" (
  "id" SERIAL NOT NULL,
  "subject" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bumpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Post" (
  "id" SERIAL NOT NULL,
  "threadId" INTEGER NOT NULL,
  "replyToId" INTEGER,
  "subject" VARCHAR(120),
  "content" TEXT NOT NULL,
  "isOp" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Thread_bumpedAt_idx" ON "Thread"("bumpedAt");
CREATE INDEX "Post_threadId_createdAt_idx" ON "Post"("threadId", "createdAt");
CREATE INDEX "Post_replyToId_idx" ON "Post"("replyToId");

ALTER TABLE "Post"
ADD CONSTRAINT "Post_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "Thread"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post"
ADD CONSTRAINT "Post_replyToId_fkey"
FOREIGN KEY ("replyToId") REFERENCES "Post"("id")
ON DELETE SET NULL ON UPDATE CASCADE;