-- Add full-text search support to Page table
-- Uses PostgreSQL tsvector with weighted title (A) and content (B)

-- Step 1: Add a plain-text content column derived from htmlContent for FTS
-- (tsvector GENERATED columns cannot reference other generated columns,
--  so we strip HTML in the application layer and store it here)
ALTER TABLE "Page"
  ADD COLUMN IF NOT EXISTS "plainContent" TEXT;

-- Step 2: Add tsvector search column
-- We use a regular column + trigger approach since GENERATED ALWAYS AS
-- cannot call to_tsvector (it requires an immutable expression)
ALTER TABLE "Page"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Step 3: Create function to update search_vector
CREATE OR REPLACE FUNCTION page_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('english', COALESCE(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."plainContent", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS page_search_vector_trigger ON "Page";
CREATE TRIGGER page_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "plainContent"
  ON "Page"
  FOR EACH ROW
  EXECUTE FUNCTION page_search_vector_update();

-- Step 5: Create GIN index on search_vector for fast lookups
CREATE INDEX IF NOT EXISTS "Page_search_vector_idx"
  ON "Page" USING GIN ("search_vector");

-- Step 6: Create composite partial index for org-scoped non-trashed searches
CREATE INDEX IF NOT EXISTS "Page_org_not_trashed_idx"
  ON "Page" ("organizationId")
  WHERE "trashedAt" IS NULL;

-- Step 7: Backfill existing pages - strip HTML tags from htmlContent
UPDATE "Page"
SET "plainContent" = regexp_replace(
  regexp_replace("htmlContent", '<[^>]*>', ' ', 'g'),
  '\s+', ' ', 'g'
)
WHERE "htmlContent" IS NOT NULL AND "plainContent" IS NULL;

-- Step 8: Trigger search_vector update for existing rows
UPDATE "Page"
SET "title" = "title"
WHERE "search_vector" IS NULL;
