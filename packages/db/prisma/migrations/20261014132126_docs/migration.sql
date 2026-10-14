-- CreateTable
CREATE TABLE "docsPublication" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "environmentId" TEXT,
    "title" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docsPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "docsPublication_collectionId_key" ON "docsPublication"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "docsPublication_slug_key" ON "docsPublication"("slug");

-- AddForeignKey
ALTER TABLE "docsPublication" ADD CONSTRAINT "docsPublication_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
