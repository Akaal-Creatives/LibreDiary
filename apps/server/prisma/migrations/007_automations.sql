-- 007_automations.sql
-- Add Automation and AutomationLog tables with supporting enums and audit actions

-- Enums
DO $$ BEGIN
  CREATE TYPE "AutomationTriggerType" AS ENUM ('ROW_CREATED', 'PROPERTY_UPDATED', 'DATE_REACHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AutomationActionType" AS ENUM ('UPDATE_PROPERTY', 'SEND_NOTIFICATION', 'CREATE_PAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AutomationLogStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Automation table
CREATE TABLE IF NOT EXISTS "Automation" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "databaseId"     TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "isEnabled"      BOOLEAN NOT NULL DEFAULT true,
  "triggerType"    "AutomationTriggerType" NOT NULL,
  "triggerConfig"  JSONB,
  "actionType"     "AutomationActionType" NOT NULL,
  "actionConfig"   JSONB,
  "createdById"    TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Automation_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "Automation_databaseId_fkey" FOREIGN KEY ("databaseId")
    REFERENCES "Database"("id") ON DELETE CASCADE,
  CONSTRAINT "Automation_createdById_fkey" FOREIGN KEY ("createdById")
    REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "Automation_organizationId_idx"
  ON "Automation" ("organizationId");
CREATE INDEX IF NOT EXISTS "Automation_databaseId_idx"
  ON "Automation" ("databaseId");
CREATE INDEX IF NOT EXISTS "Automation_databaseId_isEnabled_triggerType_idx"
  ON "Automation" ("databaseId", "isEnabled", "triggerType");

-- AutomationLog table
CREATE TABLE IF NOT EXISTS "AutomationLog" (
  "id"           TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "triggerRowId" TEXT,
  "status"       "AutomationLogStatus" NOT NULL,
  "errorMessage" TEXT,
  "durationMs"   INTEGER,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationLog_automationId_fkey" FOREIGN KEY ("automationId")
    REFERENCES "Automation"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AutomationLog_automationId_idx"
  ON "AutomationLog" ("automationId");
CREATE INDEX IF NOT EXISTS "AutomationLog_automationId_createdAt_idx"
  ON "AutomationLog" ("automationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AutomationLog_createdAt_idx"
  ON "AutomationLog" ("createdAt");

-- New NotificationType value
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTOMATION';

-- New AuditAction values
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AUTOMATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AUTOMATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AUTOMATION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AUTOMATION_TRIGGERED';
