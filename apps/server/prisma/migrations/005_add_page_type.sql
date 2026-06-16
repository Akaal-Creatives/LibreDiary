-- Add type column to Page table for distinguishing document vs canvas pages
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'document';
