-- Phase 10: Database (Tables) - Structured data tables with typed columns
-- Creates Database, DatabaseProperty, DatabaseView, DatabaseRow tables and enums

-- Create enums
CREATE TYPE "PropertyType" AS ENUM (
  'TEXT', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'DATE', 'CHECKBOX',
  'URL', 'EMAIL', 'PHONE', 'PERSON', 'FILES', 'RELATION',
  'ROLLUP', 'FORMULA', 'CREATED_TIME', 'CREATED_BY', 'UPDATED_TIME', 'UPDATED_BY'
);

CREATE TYPE "ViewType" AS ENUM ('TABLE', 'KANBAN', 'CALENDAR', 'GALLERY');

-- Database table
CREATE TABLE "Database" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pageId" TEXT,
  "name" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

-- DatabaseProperty table
CREATE TABLE "DatabaseProperty" (
  "id" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PropertyType" NOT NULL DEFAULT 'TEXT',
  "position" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB,

  CONSTRAINT "DatabaseProperty_pkey" PRIMARY KEY ("id")
);

-- DatabaseView table
CREATE TABLE "DatabaseView" (
  "id" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ViewType" NOT NULL DEFAULT 'TABLE',
  "position" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB,

  CONSTRAINT "DatabaseView_pkey" PRIMARY KEY ("id")
);

-- DatabaseRow table
CREATE TABLE "DatabaseRow" (
  "id" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "cells" JSONB NOT NULL DEFAULT '{}',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DatabaseRow_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Database" ADD CONSTRAINT "Database_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Database" ADD CONSTRAINT "Database_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Database" ADD CONSTRAINT "Database_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DatabaseProperty" ADD CONSTRAINT "DatabaseProperty_databaseId_fkey"
  FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DatabaseView" ADD CONSTRAINT "DatabaseView_databaseId_fkey"
  FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DatabaseRow" ADD CONSTRAINT "DatabaseRow_databaseId_fkey"
  FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DatabaseRow" ADD CONSTRAINT "DatabaseRow_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Database_organizationId_idx" ON "Database"("organizationId");
CREATE INDEX "Database_pageId_idx" ON "Database"("pageId");
CREATE INDEX "Database_createdById_idx" ON "Database"("createdById");

CREATE INDEX "DatabaseProperty_databaseId_idx" ON "DatabaseProperty"("databaseId");
CREATE INDEX "DatabaseProperty_databaseId_position_idx" ON "DatabaseProperty"("databaseId", "position");

CREATE INDEX "DatabaseView_databaseId_idx" ON "DatabaseView"("databaseId");
CREATE INDEX "DatabaseView_databaseId_position_idx" ON "DatabaseView"("databaseId", "position");

CREATE INDEX "DatabaseRow_databaseId_idx" ON "DatabaseRow"("databaseId");
CREATE INDEX "DatabaseRow_databaseId_position_idx" ON "DatabaseRow"("databaseId", "position");
CREATE INDEX "DatabaseRow_createdById_idx" ON "DatabaseRow"("createdById");
