-- Add RECURRENCE property type
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'RECURRENCE';

-- Create RecurrenceStatus enum
DO $$ BEGIN
  CREATE TYPE "RecurrenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add recurrence fields to DatabaseRow
ALTER TABLE "DatabaseRow"
  ADD COLUMN IF NOT EXISTS "recurrenceRule"     TEXT,
  ADD COLUMN IF NOT EXISTS "recurrenceStatus"   "RecurrenceStatus",
  ADD COLUMN IF NOT EXISTS "nextOccurrenceAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recurrenceParentId" TEXT;

-- Foreign key linking a row back to its origin
ALTER TABLE "DatabaseRow"
  ADD CONSTRAINT IF NOT EXISTS "DatabaseRow_recurrenceParentId_fkey"
  FOREIGN KEY ("recurrenceParentId") REFERENCES "DatabaseRow"("id") ON DELETE SET NULL;

-- Indexes for the scheduler query (find due rows) and chain traversal
CREATE INDEX IF NOT EXISTS "DatabaseRow_nextOccurrenceAt_idx"
  ON "DatabaseRow" ("nextOccurrenceAt");

CREATE INDEX IF NOT EXISTS "DatabaseRow_recurrenceStatus_nextOccurrenceAt_idx"
  ON "DatabaseRow" ("recurrenceStatus", "nextOccurrenceAt");

CREATE INDEX IF NOT EXISTS "DatabaseRow_recurrenceParentId_idx"
  ON "DatabaseRow" ("recurrenceParentId");

-- Add TASK_DUE notification type
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_DUE';

-- Add recurrence audit actions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATABASE_ROW_RECURRENCE_SET';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATABASE_ROW_RECURRENCE_TRIGGERED';
