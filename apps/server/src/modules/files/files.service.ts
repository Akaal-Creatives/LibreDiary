import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/index.js';
import { getStorageProvider } from './storage/index.js';
import type { StorageType } from '../../generated/prisma/client.js';

export interface FileUploadData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface FileUploadOptions {
  pageId?: string;
}

export interface FileDownloadResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface FileListOptions {
  pageId?: string;
}

export interface StorageInfo {
  type: string;
  totalFiles: number;
  totalSize: number;
}

export interface StorageConnectionResult {
  success: boolean;
  message: string;
}

/**
 * MIME types that are blocked because they can execute scripts when served
 * inline (XSS risk) or are dangerous executables.
 */
const BLOCKED_MIME_TYPES = new Set([
  // Script-capable types
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'application/xml',
  'text/xml',
  // Executables
  'application/x-msdownload',
  'application/x-executable',
  'application/x-elf',
  'application/x-mach-binary',
  'application/x-dosexec',
  'application/vnd.microsoft.portable-executable',
  // Script files
  'application/javascript',
  'text/javascript',
  'application/x-httpd-php',
  'application/x-sh',
  'application/x-csh',
]);

/**
 * File extensions that are always blocked regardless of detected MIME type.
 */
const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.pif',
  '.sh',
  '.bash',
  '.csh',
  '.ksh',
  '.php',
  '.jsp',
  '.asp',
  '.aspx',
  '.htm',
  '.html',
  '.xhtml',
  '.svg',
  '.js',
  '.mjs',
  '.cjs',
  '.vbs',
  '.wsf',
  '.ps1',
]);

function generateStorageKey(orgId: string, originalName: string): string {
  const ext = path.extname(originalName);
  const uuid = randomUUID();
  return `${orgId}/${uuid}${ext}`;
}

export async function uploadFile(
  orgId: string,
  userId: string,
  data: FileUploadData,
  options?: FileUploadOptions
) {
  if (data.size > env.STORAGE_MAX_FILE_SIZE) {
    const error = new Error('FILE_TOO_LARGE');
    error.name = 'FILE_TOO_LARGE';
    throw error;
  }

  // Detect actual MIME type from file magic bytes.
  // For text-based files (e.g. .css, .json, .csv) file-type returns undefined,
  // so we fall back to the client-provided MIME type.
  const detected = await fileTypeFromBuffer(data.buffer);
  const mimeType = detected?.mime ?? data.mimeType;

  // Block dangerous file types that could enable XSS or code execution
  const ext = path.extname(data.originalName).toLowerCase();
  if (BLOCKED_MIME_TYPES.has(mimeType) || BLOCKED_EXTENSIONS.has(ext)) {
    const error = new Error('FILE_TYPE_NOT_ALLOWED');
    error.name = 'FILE_TYPE_NOT_ALLOWED';
    throw error;
  }

  const provider = getStorageProvider();
  const key = generateStorageKey(orgId, data.originalName);
  const storagePath = await provider.upload(key, data.buffer, mimeType);
  const url = await provider.getUrl(storagePath);

  const file = await prisma.file.create({
    data: {
      organizationId: orgId,
      pageId: options?.pageId ?? null,
      name: path.basename(key),
      originalName: data.originalName,
      mimeType,
      size: data.size,
      storageType: env.STORAGE_TYPE as StorageType,
      storagePath,
      url,
      uploadedById: userId,
    },
  });

  return file;
}

export async function getFile(orgId: string, fileId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, organizationId: orgId },
  });

  if (!file) {
    const error = new Error('FILE_NOT_FOUND');
    error.name = 'FILE_NOT_FOUND';
    throw error;
  }

  return file;
}

export async function downloadFile(orgId: string, fileId: string): Promise<FileDownloadResult> {
  const file = await getFile(orgId, fileId);
  const provider = getStorageProvider();
  const buffer = await provider.download(file.storagePath);

  return {
    buffer,
    mimeType: file.mimeType,
    filename: file.originalName,
  };
}

export async function listFiles(orgId: string, options?: FileListOptions) {
  const where: { organizationId: string; pageId?: string } = { organizationId: orgId };
  if (options?.pageId) {
    where.pageId = options.pageId;
  }

  return prisma.file.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteFile(orgId: string, fileId: string): Promise<void> {
  const file = await prisma.file.findFirst({
    where: { id: fileId, organizationId: orgId },
  });

  if (!file) {
    const error = new Error('FILE_NOT_FOUND');
    error.name = 'FILE_NOT_FOUND';
    throw error;
  }

  const provider = getStorageProvider();
  await provider.delete(file.storagePath);
  await prisma.file.delete({ where: { id: fileId } });
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const [totalFiles, aggregation] = await Promise.all([
    prisma.file.count(),
    prisma.file.aggregate({ _sum: { size: true } }),
  ]);

  return {
    type: env.STORAGE_TYPE,
    totalFiles,
    totalSize: aggregation._sum.size ?? 0,
  };
}

export async function testStorageConnection(): Promise<StorageConnectionResult> {
  const provider = getStorageProvider();
  return provider.testConnection();
}
