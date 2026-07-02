import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createRequire } from 'node:module';
import type archiverModule from 'archiver';
const archiver = createRequire(import.meta.url)('archiver') as typeof archiverModule;
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/index.js';
import type { DataExportStatus } from '../../generated/prisma/client.js';
import { logger } from '../../lib/logger.js';

/** How long an export download link remains valid (48 hours) */
const EXPORT_EXPIRY_HOURS = 48;

/** Maximum exports per user (prevents abuse) */
const MAX_PENDING_EXPORTS = 3;

/**
 * Request a new data export for the authenticated user.
 * Creates a PENDING record and kicks off the async export.
 */
export async function requestDataExport(userId: string) {
  // Guard: limit concurrent pending/processing exports
  const pendingCount = await prisma.dataExport.count({
    where: {
      userId,
      status: { in: ['PENDING', 'PROCESSING'] as DataExportStatus[] },
    },
  });

  if (pendingCount >= MAX_PENDING_EXPORTS) {
    throw new Error('EXPORT_LIMIT_REACHED');
  }

  const dataExport = await prisma.dataExport.create({
    data: {
      userId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  // Fire-and-forget — errors are captured in the record
  executeDataExport(dataExport.id).catch((err) => {
    logger.error(err, '[gdpr] data export %s failed', dataExport.id);
  });

  return dataExport;
}

/**
 * List all data exports for a user.
 */
export async function listDataExports(userId: string) {
  return prisma.dataExport.findMany({
    where: { userId },
    orderBy: { requestedAt: 'desc' },
    take: 20,
  });
}

/**
 * Get a single data export by ID, scoped to the user.
 */
export async function getDataExport(exportId: string, userId: string) {
  return prisma.dataExport.findFirst({
    where: { id: exportId, userId },
  });
}

/**
 * Build the export archive (ZIP) containing all user data as JSON + uploaded files.
 */
export async function executeDataExport(exportId: string): Promise<void> {
  const dataExport = await prisma.dataExport.update({
    where: { id: exportId },
    data: { status: 'PROCESSING', startedAt: new Date() },
    include: { user: true },
  });

  const userId = dataExport.userId;

  try {
    // 1. Gather all user data
    const [
      user,
      memberships,
      pages,
      comments,
      databases,
      databaseRows,
      files,
      favourites,
      notifications,
      sessions,
      apiTokens,
      templates,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.organizationMember.findMany({
        where: { userId },
        include: { organization: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.page.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          title: true,
          icon: true,
          htmlContent: true,
          isPublic: true,
          publicSlug: true,
          parentId: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          trashedAt: true,
        },
      }),
      prisma.comment.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          pageId: true,
          parentId: true,
          blockId: true,
          content: true,
          isResolved: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.database.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          name: true,
          organizationId: true,
          pageId: true,
          createdAt: true,
        },
      }),
      prisma.databaseRow.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          databaseId: true,
          cells: true,
          createdAt: true,
        },
      }),
      prisma.file.findMany({
        where: { uploadedById: userId },
        select: {
          id: true,
          name: true,
          originalName: true,
          mimeType: true,
          size: true,
          storagePath: true,
          storageType: true,
          organizationId: true,
          pageId: true,
          createdAt: true,
        },
      }),
      prisma.favorite.findMany({
        where: { userId },
        select: { id: true, pageId: true, position: true, createdAt: true },
      }),
      prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          lastActiveAt: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      prisma.apiToken.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.template.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          category: true,
          organizationId: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // 2. Build the export manifest
    const manifest = {
      version: 1,
      format: 'librediary-user-export',
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
      counts: {
        memberships: memberships.length,
        pages: pages.length,
        comments: comments.length,
        databases: databases.length,
        databaseRows: databaseRows.length,
        files: files.length,
        favourites: favourites.length,
        notifications: notifications.length,
        templates: templates.length,
      },
    };

    // 3. Create ZIP archive
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'librediary-export-'));
    const zipPath = path.join(tmpDir, `export-${userId}.zip`);

    try {
      await createZipArchive(zipPath, {
        manifest,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          locale: user.locale,
          emailVerified: user.emailVerified,
          notificationPrefs: user.notificationPrefs,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        memberships,
        pages,
        comments,
        databases,
        databaseRows,
        favourites,
        notifications,
        sessions,
        apiTokens,
        templates,
        files,
      });

      // 4. Copy the archive to final storage (avoids loading entire ZIP into memory)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `librediary-export-${timestamp}.zip`;
      const storagePath = path.join(env.BACKUP_LOCAL_PATH, 'exports', userId, fileName);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(storagePath), { recursive: true });
      fs.copyFileSync(zipPath, storagePath);
      const fileSize = fs.statSync(storagePath).size;

      // 5. Update record as completed
      await prisma.dataExport.update({
        where: { id: exportId },
        data: {
          status: 'COMPLETED',
          fileName,
          fileSize,
          storagePath,
          completedAt: new Date(),
        },
      });
    } finally {
      // Clean up tmp directory
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    await prisma.dataExport.update({
      where: { id: exportId },
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
 * Read the export archive from disk for download.
 * Returns a readable stream to avoid loading the entire archive into memory.
 */
export async function getExportArchive(
  exportId: string,
  userId: string
): Promise<{ stream: fs.ReadStream; fileName: string; fileSize: number } | null> {
  const dataExport = await prisma.dataExport.findFirst({
    where: { id: exportId, userId, status: 'COMPLETED' },
  });

  if (!dataExport?.storagePath || !dataExport.fileName) return null;

  // Check expiry
  if (dataExport.expiresAt && dataExport.expiresAt < new Date()) {
    await prisma.dataExport.update({
      where: { id: exportId },
      data: { status: 'EXPIRED' },
    });
    return null;
  }

  if (!fs.existsSync(dataExport.storagePath)) return null;

  const stat = fs.statSync(dataExport.storagePath);
  const stream = fs.createReadStream(dataExport.storagePath);

  // Mark as downloaded
  await prisma.dataExport.update({
    where: { id: exportId },
    data: { downloadedAt: new Date() },
  });

  return { stream, fileName: dataExport.fileName, fileSize: stat.size };
}

/**
 * Clean up expired exports (called by scheduler).
 */
export async function cleanupExpiredExports(): Promise<number> {
  const expired = await prisma.dataExport.findMany({
    where: {
      status: 'COMPLETED',
      expiresAt: { lt: new Date() },
    },
  });

  for (const exp of expired) {
    // Delete file from disk
    if (exp.storagePath && fs.existsSync(exp.storagePath)) {
      fs.unlinkSync(exp.storagePath);
    }

    await prisma.dataExport.update({
      where: { id: exp.id },
      data: { status: 'EXPIRED' },
    });
  }

  return expired.length;
}

// ---- Internal helpers ----

interface ExportData {
  manifest: Record<string, unknown>;
  user: Record<string, unknown>;
  memberships: unknown[];
  pages: unknown[];
  comments: unknown[];
  databases: unknown[];
  databaseRows: unknown[];
  favourites: unknown[];
  notifications: unknown[];
  sessions: unknown[];
  apiTokens: unknown[];
  templates: unknown[];
  files: Array<{ storagePath: string; storageType: string; originalName: string }>;
}

function createZipArchive(outputPath: string, data: ExportData): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Add JSON data files
    archive.append(JSON.stringify(data.manifest, null, 2), { name: 'manifest.json' });
    archive.append(JSON.stringify(data.user, null, 2), { name: 'data/profile.json' });
    archive.append(JSON.stringify(data.memberships, null, 2), { name: 'data/memberships.json' });
    archive.append(JSON.stringify(data.pages, null, 2), { name: 'data/pages.json' });
    archive.append(JSON.stringify(data.comments, null, 2), { name: 'data/comments.json' });
    archive.append(JSON.stringify(data.databases, null, 2), { name: 'data/databases.json' });
    archive.append(JSON.stringify(data.databaseRows, null, 2), {
      name: 'data/database-rows.json',
    });
    archive.append(JSON.stringify(data.favourites, null, 2), { name: 'data/favourites.json' });
    archive.append(JSON.stringify(data.notifications, null, 2), {
      name: 'data/notifications.json',
    });
    archive.append(JSON.stringify(data.sessions, null, 2), { name: 'data/sessions.json' });
    archive.append(JSON.stringify(data.apiTokens, null, 2), { name: 'data/api-tokens.json' });
    archive.append(JSON.stringify(data.templates, null, 2), { name: 'data/templates.json' });

    // Add uploaded files (local storage only)
    for (const file of data.files) {
      if (file.storageType === 'LOCAL') {
        const filePath = path.resolve(env.STORAGE_LOCAL_PATH, file.storagePath);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `files/${file.originalName}` });
        }
      }
    }

    archive.finalize();
  });
}
