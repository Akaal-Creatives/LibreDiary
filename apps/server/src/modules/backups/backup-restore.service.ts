import { readFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { prisma } from '../../lib/prisma.js';
import type { PropertyType, ViewType, Prisma } from '../../generated/prisma/client.js';
import { getBackupStorageProvider } from './storage/index.js';
import { getStorageProvider } from '../files/storage/index.js';
import { extractTarGz } from './utils/compress.js';
import { decryptBuffer } from './utils/encrypt.js';

export interface RestoreOptions {
  password?: string;
}

export interface RestoreResult {
  success: boolean;
  pagesRestored: number;
  databasesRestored: number;
  filesRestored: number;
}

interface ManifestPage {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  position: number;
  htmlContent: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ManifestDatabaseProperty {
  id: string;
  name: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
}

interface ManifestDatabaseView {
  id: string;
  name: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
}

interface ManifestDatabaseRow {
  id: string;
  position: number;
  cells: Record<string, unknown>;
  createdAt: string;
}

interface ManifestDatabase {
  id: string;
  name: string;
  pageId: string | null;
  properties: ManifestDatabaseProperty[];
  views: ManifestDatabaseView[];
  rows: ManifestDatabaseRow[];
}

interface ManifestFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  pageId: string | null;
  archivePath: string;
  createdAt: string;
}

interface Manifest {
  version: number;
  type: string;
  exportedAt: string;
  organisation: { id: string; name: string; slug: string };
  pages: ManifestPage[];
  databases: ManifestDatabase[];
  files: ManifestFile[];
}

const SUPPORTED_MANIFEST_VERSION = 1;

/**
 * Restores an organisation backup from a previously created backup archive.
 * Downloads, optionally decrypts, extracts, and restores pages, databases, and files.
 */
export async function restoreOrgBackup(
  backupId: string,
  orgId: string,
  options?: RestoreOptions,
  userId?: string
): Promise<RestoreResult> {
  // Find the backup record
  const backup = await prisma.backup.findFirst({
    where: { id: backupId },
  });

  if (!backup) {
    throw new Error('BACKUP_NOT_FOUND');
  }

  if (backup.status !== 'COMPLETED') {
    throw new Error('BACKUP_NOT_AVAILABLE');
  }

  // Encrypted backups require a password
  if (backup.isEncrypted && !options?.password) {
    throw new Error('Password required for encrypted backup');
  }

  // Download backup archive from storage
  const backupStorage = getBackupStorageProvider();
  let archiveData = await backupStorage.download(backup.storagePath!);

  // Decrypt if needed
  if (backup.isEncrypted && options?.password) {
    archiveData = decryptBuffer(archiveData, options.password);
  }

  // Extract to temp directory
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'librediary-restore-'));

  try {
    await extractTarGz(archiveData, tmpDir);

    // Read and parse manifest
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const manifestData = readFileSync(manifestPath);
    const manifest: Manifest = JSON.parse(manifestData.toString());

    // Validate manifest version
    if (manifest.version !== SUPPORTED_MANIFEST_VERSION) {
      throw new Error(`Unsupported backup manifest version: ${manifest.version}`);
    }

    // Use provided userId or fall back to the organisation ID as a placeholder
    const restoreUserId = userId ?? orgId;

    // Restore pages
    const pagesRestored = await restorePages(manifest.pages, orgId, restoreUserId);

    // Restore databases
    const databasesRestored = await restoreDatabases(manifest.databases, orgId, restoreUserId);

    // Restore files
    const filesRestored = await restoreFiles(manifest.files, orgId, tmpDir, restoreUserId);

    return {
      success: true,
      pagesRestored,
      databasesRestored,
      filesRestored,
    };
  } finally {
    // Clean up temp directory
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Restores pages, preserving parent-child hierarchy via ID mapping.
 */
async function restorePages(pages: ManifestPage[], orgId: string, userId: string): Promise<number> {
  const idMap = new Map<string, string>();
  let restored = 0;

  for (const page of pages) {
    const parentId = page.parentId ? (idMap.get(page.parentId) ?? null) : null;

    const created = await prisma.page.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        title: page.title,
        icon: page.icon,
        parentId,
        position: page.position,
        htmlContent: page.htmlContent,
        isPublic: page.isPublic,
      },
    });

    idMap.set(page.id, created.id);
    restored++;
  }

  return restored;
}

/**
 * Restores databases with their properties, views, and rows.
 */
async function restoreDatabases(
  databases: ManifestDatabase[],
  orgId: string,
  userId: string
): Promise<number> {
  let restored = 0;

  for (const db of databases) {
    const created = await prisma.database.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: db.name,
      },
    });

    // Restore properties
    for (const prop of db.properties) {
      await prisma.databaseProperty.create({
        data: {
          databaseId: created.id,
          name: prop.name,
          type: prop.type as PropertyType,
          position: prop.position,
          config: (prop.config as Prisma.InputJsonValue) ?? undefined,
        },
      });
    }

    // Restore views
    for (const view of db.views) {
      await prisma.databaseView.create({
        data: {
          databaseId: created.id,
          name: view.name,
          type: view.type as ViewType,
          position: view.position,
          config: (view.config as Prisma.InputJsonValue) ?? undefined,
        },
      });
    }

    // Restore rows
    for (const row of db.rows) {
      await prisma.databaseRow.create({
        data: {
          databaseId: created.id,
          createdById: userId,
          position: row.position,
          cells: (row.cells as Prisma.InputJsonValue) ?? undefined,
        },
      });
    }

    restored++;
  }

  return restored;
}

/**
 * Restores files by uploading them to the current storage provider.
 * Skips files that are missing from the archive.
 */
async function restoreFiles(
  files: ManifestFile[],
  orgId: string,
  tmpDir: string,
  userId: string
): Promise<number> {
  const storageProvider = getStorageProvider();
  let restored = 0;

  for (const file of files) {
    const filePath = path.join(tmpDir, file.archivePath);

    if (!existsSync(filePath)) {
      // Skip files missing from the archive
      continue;
    }

    const fileData = readFileSync(filePath);
    const storagePath = await storageProvider.upload(
      `${orgId}/${file.name}`,
      fileData,
      file.mimeType
    );
    const url = await storageProvider.getUrl(storagePath);

    await prisma.file.create({
      data: {
        organizationId: orgId,
        uploadedById: userId,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        storagePath,
        storageType: 'LOCAL',
        url,
      },
    });

    restored++;
  }

  return restored;
}
