import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
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

  const provider = getStorageProvider();
  const key = generateStorageKey(orgId, data.originalName);
  const storagePath = await provider.upload(key, data.buffer, data.mimeType);
  const url = await provider.getUrl(storagePath);

  const file = await prisma.file.create({
    data: {
      organizationId: orgId,
      pageId: options?.pageId ?? null,
      name: path.basename(key),
      originalName: data.originalName,
      mimeType: data.mimeType,
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
