-- CreateTable
CREATE TABLE "mockServer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "environmentId" TEXT,
    "name" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "delayMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mockServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mockServer_workspaceId_idx" ON "mockServer"("workspaceId");

-- AddForeignKey
ALTER TABLE "mockServer" ADD CONSTRAINT "mockServer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockServer" ADD CONSTRAINT "mockServer_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
