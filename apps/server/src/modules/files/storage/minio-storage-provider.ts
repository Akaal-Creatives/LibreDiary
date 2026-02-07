import type { StorageProvider, StorageConnectionResult } from './storage-provider.js';

export class MinioStorageProvider implements StorageProvider {
  async upload(_key: string, _buffer: Buffer, _mimeType: string): Promise<string> {
    throw new Error('MinIO storage provider is not yet implemented');
  }

  async download(_key: string): Promise<Buffer> {
    throw new Error('MinIO storage provider is not yet implemented');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('MinIO storage provider is not yet implemented');
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error('MinIO storage provider is not yet implemented');
  }

  async getUrl(_key: string): Promise<string> {
    throw new Error('MinIO storage provider is not yet implemented');
  }

  async testConnection(): Promise<StorageConnectionResult> {
    return {
      success: false,
      message: 'MinIO storage provider is not yet implemented',
    };
  }
}
