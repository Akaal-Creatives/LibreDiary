import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:fs';
import type { StorageProvider, StorageConnectionResult } from './storage-provider.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private basePath: string) {}

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, key);
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    return fs.existsSync(filePath);
  }

  async getUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }

  async testConnection(): Promise<StorageConnectionResult> {
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
      }
      fs.accessSync(this.basePath, constants.W_OK);
      return {
        success: true,
        message: 'Local storage is accessible and writable',
      };
    } catch (error) {
      return {
        success: false,
        message: `Local storage test failed: ${(error as Error).message}`,
      };
    }
  }
}
