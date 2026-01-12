-- AlterTable
ALTER TABLE "Project" ADD COLUMN "downloadVideoHdEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "downloadVideoRawEnabled" BOOLEAN NOT NULL DEFAULT false;
