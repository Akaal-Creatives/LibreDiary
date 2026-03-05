/**
 * Run custom SQL migrations that extend beyond Prisma's schema capabilities.
 * Uses the pg driver directly since multi-statement SQL is not supported by
 * Prisma's $queryRawUnsafe with the PG adapter.
 *
 * Each migration is run independently — failures are logged but do not
 * prevent subsequent migrations from running (objects may already exist
 * after prisma db push).
 *
 * Usage: npx tsx prisma/migrations/run-migrations.ts
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const sqlFiles = readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let failed = 0;

  for (const file of sqlFiles) {
    try {
      const sqlPath = join(__dirname, file);
      const sql = readFileSync(sqlPath, 'utf-8');

      console.log(`Running migration: ${file}...`);
      await client.query(sql);
      console.log(`Migration ${file} completed.`);
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`Migration ${file} skipped (already applied or error: ${msg})`);
    }
  }

  await client.end();

  if (failed > 0) {
    console.log(
      `${sqlFiles.length - failed}/${sqlFiles.length} migrations applied (${failed} skipped).`
    );
  } else {
    console.log('All custom SQL migrations completed successfully.');
  }
}

main();
