-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "headerTitle" TEXT,
ADD COLUMN     "headerFontFamily" TEXT NOT NULL DEFAULT 'Inter',
ADD COLUMN     "headerColor" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN     "headerBackground" TEXT NOT NULL DEFAULT 'dark',
ADD COLUMN     "videoFolderId" TEXT,
ADD COLUMN     "enableVideoTab" BOOLEAN NOT NULL DEFAULT false;
