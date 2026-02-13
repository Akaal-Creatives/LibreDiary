import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/index.js';
import { createStorageProvider } from './storage/index.js';
import type { StorageType } from '../../generated/prisma/client.js';

export interface MigrationProgress {
  current: number;
  total: number;
  fileId: string;
  status: 'migrated' | 'failed';
}

export interface MigrationError {
  fileId: string;
  fileName: string;
  error: string;
}

export interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: MigrationError[];
  dryRun?: boolean;
}

export interface MigrateStorageOptions {
  targetType: string;
  dryRun?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
}

export async function migrateStorage(options: MigrateStorageOptions): Promise<MigrationResult> {
  const { targetType, dryRun = false, onProgress } = options;
  const sourceType = env.STORAGE_TYPE;

  if (targetType === sourceType) {
    throw new Error('Cannot migrate to the same storage type');
  }

  // Create target provider and verify connectivity before proceeding
  const targetProvider = createStorageProvider(targetType);
  const connectionResult = await targetProvider.testConnection();
  if (!connectionResult.success) {
    throw new Error(`Target storage connection failed: ${connectionResult.message}`);
  }

  // Fetch all files stored with the current provider
  const files = await prisma.file.findMany({
    where: { storageType: sourceType as StorageType },
    orderBy: { createdAt: 'asc' },
  });

  const result: MigrationResult = {
    total: files.length,
    migrated: 0,
    failed: 0,
    errors: [],
  };

  if (dryRun) {
    result.dryRun = true;
    return result;
  }

  const sourceProvider = createStorageProvider(sourceType);

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;

    try {
      // Download from source
      const buffer = await sourceProvider.download(file.storagePath);

      // Upload to target
      const newStoragePath = await targetProvider.upload(file.storagePath, buffer, file.mimeType);
      const newUrl = await targetProvider.getUrl(newStoragePath);

      // Update database record
      await prisma.file.update({
        where: { id: file.id },
        data: {
          storageType: targetType as StorageType,
          storagePath: newStoragePath,
          url: newUrl,
        },
      });

      // Delete from source
      await sourceProvider.delete(file.storagePath);

      result.migrated++;
      onProgress?.({
        current: i + 1,
        total: files.length,
        fileId: file.id,
        status: 'migrated',
      });
    } catch (err) {
      result.failed++;
      result.errors.push({
        fileId: file.id,
        fileName: file.originalName,
        error: (err as Error).message,
      });
      onProgress?.({
        current: i + 1,
        total: files.length,
        fileId: file.id,
        status: 'failed',
      });
    }
  }

  return result;
}
