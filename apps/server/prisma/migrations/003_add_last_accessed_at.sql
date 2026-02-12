-- Add lastAccessedAt column to PagePermission for tracking guest share link usage
ALTER TABLE "PagePermission" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);
