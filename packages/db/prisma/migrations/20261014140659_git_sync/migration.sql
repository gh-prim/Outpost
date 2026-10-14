-- CreateTable
CREATE TABLE "gitSync" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "directory" TEXT NOT NULL DEFAULT 'outpost',
    "token" TEXT,
    "lastCommit" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gitSync_workspaceId_key" ON "gitSync"("workspaceId");

-- AddForeignKey
ALTER TABLE "gitSync" ADD CONSTRAINT "gitSync_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
