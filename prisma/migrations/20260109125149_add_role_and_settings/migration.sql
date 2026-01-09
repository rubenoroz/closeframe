-- AlterTable
ALTER TABLE "CloudAccount" ADD COLUMN "name" TEXT;

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "cloudAccountId" TEXT NOT NULL,
    "rootFolderId" TEXT NOT NULL,
    "passwordProtected" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "downloadEnabled" BOOLEAN NOT NULL DEFAULT true,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "layoutType" TEXT NOT NULL DEFAULT 'grid',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("cloudAccountId", "coverImage", "createdAt", "description", "downloadEnabled", "id", "layoutType", "name", "passwordHash", "passwordProtected", "rootFolderId", "slug", "updatedAt", "userId") SELECT "cloudAccountId", "coverImage", "createdAt", "description", "downloadEnabled", "id", "layoutType", "name", "passwordHash", "passwordProtected", "rootFolderId", "slug", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "businessName" TEXT,
    "businessLogo" TEXT,
    "businessWebsite" TEXT,
    "businessInstagram" TEXT,
    "businessPhone" TEXT,
    "bio" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "businessLogoScale" INTEGER NOT NULL DEFAULT 100,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bio", "businessInstagram", "businessLogo", "businessLogoScale", "businessName", "businessPhone", "businessWebsite", "createdAt", "email", "emailVerified", "id", "image", "name", "theme", "updatedAt") SELECT "bio", "businessInstagram", "businessLogo", "businessLogoScale", "businessName", "businessPhone", "businessWebsite", "createdAt", "email", "emailVerified", "id", "image", "name", "theme", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");
