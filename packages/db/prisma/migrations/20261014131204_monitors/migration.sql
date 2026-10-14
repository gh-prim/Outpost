-- CreateTable
CREATE TABLE "monitor" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "environmentId" TEXT,
    "name" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitorRun" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requests" INTEGER NOT NULL,
    "failedTests" INTEGER NOT NULL,
    "totalTests" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitorRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitor_enabled_nextRunAt_idx" ON "monitor"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "monitor_workspaceId_idx" ON "monitor"("workspaceId");

-- CreateIndex
CREATE INDEX "monitorRun_monitorId_startedAt_idx" ON "monitorRun"("monitorId", "startedAt");

-- AddForeignKey
ALTER TABLE "monitor" ADD CONSTRAINT "monitor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor" ADD CONSTRAINT "monitor_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitorRun" ADD CONSTRAINT "monitorRun_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
