import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/index.js';
import { getBackupStorageProvider } from './storage/index.js';
import { encryptBuffer } from './utils/encrypt.js';

const execFileAsync = promisify(execFile);

export interface CreateSystemBackupOptions {
  encrypt?: boolean;
  password?: string;
}

/**
 * Checks whether pg_dump binary is available on the host.
 */
export async function checkPgDumpAvailable(): Promise<boolean> {
  try {
    await execFileAsync('pg_dump', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a PENDING system backup record.
 */
export async function createSystemBackup(
  triggeredById?: string,
  options?: CreateSystemBackupOptions
) {
  const backup = await prisma.backup.create({
    data: {
      type: 'SYSTEM',
      status: 'PENDING',
      triggeredById: triggeredById ?? null,
      isEncrypted: options?.encrypt ?? false,
    },
  });

  // Execute asynchronously
  executeSystemBackup(backup.id, options?.password).catch((error) => {
    console.error(`System backup ${backup.id} failed:`, error);
  });

  return backup;
}

/**
 * Executes a system backup using pg_dump.
 */
export async function executeSystemBackup(backupId: string, password?: string): Promise<void> {
  const backup = await prisma.backup.update({
    where: { id: backupId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  try {
    // Parse DATABASE_URL for pg_dump arguments
    const dbUrl = new URL(env.DATABASE_URL);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1); // Remove leading /
    const username = dbUrl.username;

    // Build pg_dump arguments — uses execFile (not exec) to avoid shell injection
    const args = [
      '-h',
      host,
      '-p',
      port,
      '-U',
      username,
      '-d',
      database,
      '--format=custom',
      '--no-owner',
      '--no-privileges',
    ];

    // Set PGPASSWORD via environment
    const pgEnv = {
      ...process.env,
      PGPASSWORD: decodeURIComponent(dbUrl.password),
    };

    const { stdout } = await execFileAsync('pg_dump', args, {
      encoding: 'buffer',
      maxBuffer: env.BACKUP_MAX_SIZE_MB * 1024 * 1024,
      env: pgEnv,
    });

    // Compress the dump
    let archiveData: Buffer = gzipSync(stdout);

    // Encrypt if requested
    if (backup.isEncrypted && password) {
      archiveData = encryptBuffer(archiveData, password);
    }

    // Check size limit
    const maxSizeBytes = env.BACKUP_MAX_SIZE_MB * 1024 * 1024;
    if (archiveData.length > maxSizeBytes) {
      throw new Error(`System backup exceeds maximum size of ${env.BACKUP_MAX_SIZE_MB}MB`);
    }

    // Upload to backup storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = backup.isEncrypted ? '.dump.gz.enc' : '.dump.gz';
    const fileName = `system-${timestamp}${ext}`;
    const storagePath = `system/${fileName}`;

    const storage = getBackupStorageProvider();
    await storage.upload(storagePath, archiveData);

    // Update record
    await prisma.backup.update({
      where: { id: backupId },
      data: {
        status: 'COMPLETED',
        fileName,
        fileSize: archiveData.length,
        storagePath,
        storageType: env.BACKUP_STORAGE_TYPE,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.backup.update({
      where: { id: backupId },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

/**
 * Lists all system backups.
 */
export async function listSystemBackups() {
  return prisma.backup.findMany({
    where: { type: 'SYSTEM' },
    orderBy: { createdAt: 'desc' },
  });
}
