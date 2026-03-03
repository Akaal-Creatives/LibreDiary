#!/bin/sh
# ===========================================
# LibreDiary Server - Docker Entrypoint
# Runs migrations and seed before starting the server
#
# Developed by Akaal Creatives
# https://www.akaalcreatives.com
# ===========================================

set -e

echo "=== LibreDiary Server Entrypoint ==="

# ------------------------------------------
# 1. Run Prisma migrations
# ------------------------------------------
echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma
echo "Prisma migrations complete."

# ------------------------------------------
# 2. Run custom SQL migrations (search vectors, etc.)
# ------------------------------------------
echo "Running custom SQL migrations..."
npx tsx apps/server/prisma/migrations/run-migrations.ts || {
  echo "Warning: custom SQL migrations failed (may already be applied)."
}

# ------------------------------------------
# 3. Seed database (idempotent — skips if super admin exists)
# ------------------------------------------
echo "Running database seed..."
npx tsx apps/server/prisma/seed.ts || {
  echo "Warning: database seed failed."
}

echo "=== Entrypoint complete, starting server ==="

# Hand off to the main process (CMD)
exec "$@"
