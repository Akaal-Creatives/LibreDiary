/**
 * Run custom SQL migrations that extend beyond Prisma's schema capabilities.
 * Usage: npx tsx prisma/migrations/run-migrations.ts
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const sqlPath = join(__dirname, 'migrations', '001_search_vector.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('Running search vector migration...');
    await prisma.$queryRawUnsafe(sql);
    console.log('Search vector migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
