import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:fs';
import type {
  BackupStorageProvider,
  BackupStorageConnectionResult,
} from './backup-storage-provider.js';

export class LocalBackupStorage implements BackupStorageProvider {
  constructor(private basePath: string) {}

  /**
   * Resolve a key to a safe file path, preventing directory traversal.
   */
  private safePath(key: string): string {
    const resolved = path.resolve(this.basePath, key);
    if (
      !resolved.startsWith(path.resolve(this.basePath) + path.sep) &&
      resolved !== path.resolve(this.basePath)
    ) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return resolved;
  }

  async upload(key: string, data: Buffer): Promise<string> {
    const filePath = this.safePath(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.safePath(key);
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.safePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.safePath(key);
    return fs.existsSync(filePath);
  }

  async getDownloadUrl(key: string): Promise<string> {
    return `/backups/${key}`;
  }

  async testConnection(): Promise<BackupStorageConnectionResult> {
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
      }
      fs.accessSync(this.basePath, constants.W_OK);
      return {
        success: true,
        message: 'Local backup storage is accessible and writable',
      };
    } catch (error) {
      return {
        success: false,
        message: `Local backup storage test failed: ${(error as Error).message}`,
      };
    }
  }

  async listKeys(prefix?: string): Promise<string[]> {
    const searchDir = prefix ? this.safePath(prefix) : this.basePath;
    if (!fs.existsSync(searchDir)) {
      return [];
    }

    const keys: string[] = [];
    const entries = fs.readdirSync(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const key = prefix ? `${prefix}/${entry.name}` : entry.name;
        keys.push(key);
      }
    }
    return keys;
  }
}
