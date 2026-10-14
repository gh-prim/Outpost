-- CreateEnum
CREATE TYPE "WorkspaceVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'EDITOR', 'RUNNER', 'VIEWER');

-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "WorkspaceVisibility" NOT NULL DEFAULT 'ORGANIZATION',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectionVersion" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collectionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_organizationId_slug_key" ON "workspace"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "workspaceMember_userId_idx" ON "workspaceMember"("userId");

-- CreateIndex
CREATE INDEX "workspaceMember_teamId_idx" ON "workspaceMember"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaceMember_workspaceId_userId_key" ON "workspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaceMember_workspaceId_teamId_key" ON "workspaceMember"("workspaceId", "teamId");

-- CreateIndex
CREATE INDEX "collection_workspaceId_idx" ON "collection"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "collectionVersion_collectionId_version_key" ON "collectionVersion"("collectionId", "version");

-- CreateIndex
CREATE INDEX "environment_workspaceId_idx" ON "environment"("workspaceId");

-- CreateIndex
CREATE INDEX "auditLog_organizationId_createdAt_idx" ON "auditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "auditLog_actorId_createdAt_idx" ON "auditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceMember" ADD CONSTRAINT "workspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceMember" ADD CONSTRAINT "workspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceMember" ADD CONSTRAINT "workspaceMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectionVersion" ADD CONSTRAINT "collectionVersion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectionVersion" ADD CONSTRAINT "collectionVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment" ADD CONSTRAINT "environment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditLog" ADD CONSTRAINT "auditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditLog" ADD CONSTRAINT "auditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
