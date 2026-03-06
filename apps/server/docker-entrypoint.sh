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
# 0. Build DATABASE_URL from POSTGRES_* variables if not set
# ------------------------------------------
if [ -z "$DATABASE_URL" ]; then
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_DB" ]; then
    DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
    export DATABASE_URL
    echo "DATABASE_URL constructed from POSTGRES_* variables."
  else
    echo "Error: DATABASE_URL is not set and POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB are required to construct it."
    exit 1
  fi
fi

# Prisma commands must run from apps/server where prisma.config.ts lives
cd /app/apps/server

# ------------------------------------------
# 1. Push database schema
# ------------------------------------------
echo "Pushing database schema..."
npx prisma db push --accept-data-loss
echo "Database schema up to date."

# ------------------------------------------
# 2. Run custom SQL migrations (search vectors, etc.)
# ------------------------------------------
echo "Running custom SQL migrations..."
npx tsx prisma/migrations/run-migrations.ts || {
  echo "Warning: custom SQL migrations failed (may already be applied)."
}

# ------------------------------------------
# 3. Seed database (idempotent — skips if super admin exists)
# ------------------------------------------
echo "Running database seed..."
npx tsx prisma/seed.ts || {
  echo "Warning: database seed failed."
}

# ------------------------------------------
# 4. Seed demo data when DEMO_MODE is enabled
# ------------------------------------------
if [ "$DEMO_MODE" = "true" ]; then
  echo "DEMO_MODE enabled — running demo reseed..."
  npx tsx prisma/seed-dev.ts || {
    echo "Warning: demo seed failed."
  }
fi

echo "=== Entrypoint complete, starting server ==="

# Return to app root for the server process
cd /app

# Hand off to the main process (CMD)
exec "$@"
