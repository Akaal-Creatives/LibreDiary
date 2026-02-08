import { env } from '../../../config/index.js';
import type { BackupStorageProvider } from './backup-storage-provider.js';
import { LocalBackupStorage } from './local-backup-storage.js';
import { S3BackupStorage } from './s3-backup-storage.js';

export type {
  BackupStorageProvider,
  BackupStorageConnectionResult,
} from './backup-storage-provider.js';
export { LocalBackupStorage } from './local-backup-storage.js';
export { S3BackupStorage } from './s3-backup-storage.js';

let backupStorageProvider: BackupStorageProvider | null = null;

export function createBackupStorageProvider(type?: string): BackupStorageProvider {
  const storageType = type ?? env.BACKUP_STORAGE_TYPE;

  switch (storageType) {
    case 'S3':
      return new S3BackupStorage({
        endpoint: env.BACKUP_S3_ENDPOINT,
        region: env.BACKUP_S3_REGION,
        bucket: env.BACKUP_S3_BUCKET!,
        accessKeyId: env.BACKUP_S3_ACCESS_KEY!,
        secretAccessKey: env.BACKUP_S3_SECRET_KEY!,
      });
    case 'LOCAL':
    default:
      return new LocalBackupStorage(env.BACKUP_LOCAL_PATH);
  }
}

export function getBackupStorageProvider(): BackupStorageProvider {
  if (!backupStorageProvider) {
    backupStorageProvider = createBackupStorageProvider();
  }
  return backupStorageProvider;
}
