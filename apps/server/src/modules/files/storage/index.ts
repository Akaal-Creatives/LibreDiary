import { env } from '../../../config/index.js';
import type { StorageProvider } from './storage-provider.js';
import { LocalStorageProvider } from './local-storage-provider.js';
import { MinioStorageProvider } from './minio-storage-provider.js';
import { S3StorageProvider } from './s3-storage-provider.js';

export type { StorageProvider, StorageConnectionResult } from './storage-provider.js';
export { LocalStorageProvider } from './local-storage-provider.js';
export { MinioStorageProvider } from './minio-storage-provider.js';
export { S3StorageProvider } from './s3-storage-provider.js';

let storageProvider: StorageProvider | null = null;

export function createStorageProvider(type?: string): StorageProvider {
  const storageType = type ?? env.STORAGE_TYPE;

  switch (storageType) {
    case 'MINIO':
      return new MinioStorageProvider();
    case 'S3':
      return new S3StorageProvider();
    case 'LOCAL':
    default:
      return new LocalStorageProvider(env.STORAGE_LOCAL_PATH);
  }
}

export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    storageProvider = createStorageProvider();
  }
  return storageProvider;
}
