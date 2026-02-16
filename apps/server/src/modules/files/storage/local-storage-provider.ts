import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:fs';
import type { StorageProvider, StorageConnectionResult } from './storage-provider.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private basePath: string) {}

  /**
   * Resolve a key to a safe file path, preventing directory traversal.
   */
  private safePath(key: string): string {
    // Reject keys containing path traversal sequences before resolution
    if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(key) || path.isAbsolute(key)) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // Normalise and resolve against the base path
    const normalised = path.normalize(key);
    const resolvedBase = path.resolve(this.basePath);
    const resolved = path.join(resolvedBase, normalised);

    // Ensure the resolved path is within the base directory
    if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return resolved;
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const filePath = this.safePath(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
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
