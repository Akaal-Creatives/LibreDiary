export interface StorageConnectionResult {
  success: boolean;
  message: string;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): Promise<string>;
  testConnection(): Promise<StorageConnectionResult>;
}
