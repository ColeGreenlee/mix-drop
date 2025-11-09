-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mix" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "coverArtKey" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "uploaderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mix_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Mix" ("artist", "coverArtKey", "createdAt", "description", "duration", "fileSize", "id", "storageKey", "title", "updatedAt", "uploaderId") SELECT "artist", "coverArtKey", "createdAt", "description", "duration", "fileSize", "id", "storageKey", "title", "updatedAt", "uploaderId" FROM "Mix";
DROP TABLE "Mix";
ALTER TABLE "new_Mix" RENAME TO "Mix";
CREATE INDEX "Mix_createdAt_idx" ON "Mix"("createdAt" DESC);
CREATE INDEX "Mix_uploaderId_idx" ON "Mix"("uploaderId");
CREATE INDEX "Mix_isPublic_idx" ON "Mix"("isPublic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
