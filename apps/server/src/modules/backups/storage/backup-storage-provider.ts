export interface BackupStorageConnectionResult {
  success: boolean;
  message: string;
}

export interface BackupStorageProvider {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getDownloadUrl(key: string): Promise<string>;
  testConnection(): Promise<BackupStorageConnectionResult>;
  listKeys(prefix?: string): Promise<string[]>;
}
