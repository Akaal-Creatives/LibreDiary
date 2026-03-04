import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/index.js';
import { getBackupStorageProvider } from './storage/index.js';
import { createTarGz } from './utils/compress.js';
import { encryptBuffer } from './utils/encrypt.js';
import { triggerWebhooks } from '../webhooks/webhook-delivery.service.js';
import { logAudit } from '../audit/audit.service.js';
import type { TarEntry } from './utils/compress.js';
import { logger } from '../../lib/logger.js';

export interface CreateBackupOptions {
  encrypt?: boolean;
  password?: string;
}

/**
 * Creates a PENDING backup record for an organisation.
 */
export async function createOrgBackup(
  orgId: string,
  triggeredById: string,
  options?: CreateBackupOptions
) {
  const backup = await prisma.backup.create({
    data: {
      type: 'ORGANISATION',
      status: 'PENDING',
      organizationId: orgId,
      triggeredById,
      isEncrypted: options?.encrypt ?? false,
    },
  });

  // Execute asynchronously — don't await
  executeOrgBackup(backup.id, options?.password).catch((error) => {
    logger.error(error, '[backups] backup %s failed', backup.id);
  });

  logAudit({
    action: 'BACKUP_CREATED',
    userId: triggeredById,
    organizationId: orgId,
    resourceType: 'backup',
    resourceId: backup.id,
  });

  return backup;
}

/**
 * Executes the organisation backup: exports data, compresses, optionally encrypts, uploads.
 */
export async function executeOrgBackup(backupId: string, password?: string): Promise<void> {
  const backup = await prisma.backup.update({
    where: { id: backupId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  try {
    const orgId = backup.organizationId!;

    // Fetch organisation data
    const [org, pages, databases, files] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.page.findMany({
        where: { organizationId: orgId, trashedAt: null },
        select: {
          id: true,
          title: true,
          icon: true,
          parentId: true,
          position: true,
          htmlContent: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.database.findMany({
        where: { organizationId: orgId },
        include: {
          properties: true,
          views: true,
          rows: true,
        },
      }),
      prisma.file.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          originalName: true,
          mimeType: true,
          size: true,
          storagePath: true,
          pageId: true,
          createdAt: true,
        },
      }),
    ]);

    // Build manifest
    const manifest = {
      version: 1,
      type: 'organisation',
      exportedAt: new Date().toISOString(),
      organisation: {
        id: org!.id,
        name: org!.name,
        slug: org!.slug,
      },
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        parentId: p.parentId,
        position: p.position,
        htmlContent: p.htmlContent,
        isPublic: p.isPublic,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      databases: databases.map((db) => ({
        id: db.id,
        name: db.name,
        pageId: db.pageId,
        properties: db.properties.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          position: p.position,
          config: p.config,
        })),
        views: db.views.map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type,
          position: v.position,
          config: v.config,
        })),
        rows: db.rows.map((r) => ({
          id: r.id,
          position: r.position,
          cells: r.cells,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        pageId: f.pageId,
        archivePath: `files/${f.name}`,
        createdAt: f.createdAt.toISOString(),
      })),
    };

    // Build tar entries
    const entries: TarEntry[] = [
      {
        name: 'manifest.json',
        data: Buffer.from(JSON.stringify(manifest, null, 2)),
      },
    ];

    // Include file data from storage (best-effort)
    const storageProvider = await import('../files/storage/index.js').then((m) =>
      m.getStorageProvider()
    );
    for (const file of files) {
      try {
        const fileData = await storageProvider.download(file.storagePath);
        entries.push({
          name: `files/${file.name}`,
          data: fileData,
        });
      } catch {
        // Skip files that can't be downloaded
      }
    }

    // Check size limit
    const totalSize = entries.reduce((sum, e) => sum + e.data.length, 0);
    const maxSizeBytes = env.BACKUP_MAX_SIZE_MB * 1024 * 1024;
    if (totalSize > maxSizeBytes) {
      throw new Error(`Backup exceeds maximum size of ${env.BACKUP_MAX_SIZE_MB}MB`);
    }

    // Compress
    let archiveData = await createTarGz(entries);

    // Encrypt if requested
    if (backup.isEncrypted && password) {
      archiveData = encryptBuffer(archiveData, password);
    }

    // Upload to backup storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = backup.isEncrypted ? '.tar.gz.enc' : '.tar.gz';
    const fileName = `org-${org!.slug}-${timestamp}${ext}`;
    const storagePath = `organisations/${orgId}/${fileName}`;

    const backupStorage = getBackupStorageProvider();
    await backupStorage.upload(storagePath, archiveData);

    // Update backup record
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

    if (orgId) {
      triggerWebhooks(orgId, 'backup.completed', { backupId, fileName }).catch((err) =>
        logger.error(err, 'webhook delivery failed')
      );
    }
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
 * Gets a single backup by ID, optionally scoped to an organisation.
 */
export async function getBackup(backupId: string, orgId?: string) {
  const where: { id: string; organizationId?: string } = { id: backupId };
  if (orgId) {
    where.organizationId = orgId;
  }

  const backup = await prisma.backup.findFirst({ where });
  if (!backup) {
    const error = new Error('BACKUP_NOT_FOUND');
    error.name = 'BACKUP_NOT_FOUND';
    throw error;
  }

  return backup;
}

/**
 * Lists backups for an organisation.
 */
export async function listOrgBackups(orgId: string) {
  return prisma.backup.findMany({
    where: { organizationId: orgId, type: 'ORGANISATION' },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Downloads a backup file from storage.
 */
export async function downloadBackup(backupId: string, orgId?: string) {
  const backup = await getBackup(backupId, orgId);

  if (!backup.storagePath || backup.status !== 'COMPLETED') {
    const error = new Error('BACKUP_NOT_AVAILABLE');
    error.name = 'BACKUP_NOT_AVAILABLE';
    throw error;
  }

  const storage = getBackupStorageProvider();
  const buffer = await storage.download(backup.storagePath);

  return {
    buffer,
    fileName: backup.fileName!,
  };
}

/**
 * Deletes a backup record and its file from storage.
 */
export async function deleteBackup(backupId: string, orgId?: string) {
  const backup = await getBackup(backupId, orgId);

  if (backup.storagePath) {
    const storage = getBackupStorageProvider();
    try {
      await storage.delete(backup.storagePath);
    } catch {
      // Continue even if storage deletion fails
    }
  }

  await prisma.backup.delete({ where: { id: backupId } });
}

/**
 * Cleans up old backups beyond the retention period.
 * Returns the number of deleted backups.
 */
export async function cleanupOldBackups(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - env.BACKUP_RETENTION_DAYS);

  const oldBackups = await prisma.backup.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: 'COMPLETED',
    },
  });

  const storage = getBackupStorageProvider();
  for (const backup of oldBackups) {
    if (backup.storagePath) {
      try {
        await storage.delete(backup.storagePath);
      } catch {
        // Continue even if storage deletion fails
      }
    }
  }

  await prisma.backup.deleteMany({
    where: {
      id: { in: oldBackups.map((b) => b.id) },
    },
  });

  return oldBackups.length;
}
