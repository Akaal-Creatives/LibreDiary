import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:fs';
import type { StorageProvider, StorageConnectionResult } from './storage-provider.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly canonicalBase: string;

  constructor(
    private basePath: string,
    private baseUrl: string = ''
  ) {
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    this.canonicalBase = fs.realpathSync(basePath);
  }

  /**
   * Validate that a key contains no traversal sequences and return the
   * joined (but not yet canonicalised) path for further processing.
   */
  private preliminaryPath(key: string): string {
    if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(key) || path.isAbsolute(key)) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return path.join(this.canonicalBase, path.normalize(key));
  }

  /**
   * Assert that a canonical path resides within the canonical base directory.
   */
  private assertWithinBase(canonical: string): void {
    if (!canonical.startsWith(this.canonicalBase + path.sep) && canonical !== this.canonicalBase) {
      throw new Error('Invalid storage key: path traversal detected');
    }
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const target = this.preliminaryPath(key);
    const dir = path.dirname(target);

    fs.mkdirSync(dir, { recursive: true });

    // Canonicalise the now-existing directory via realpath, then re-derive
    // the full file path so the final write target is verified.
    const canonicalDir = fs.realpathSync(dir);
    this.assertWithinBase(canonicalDir);

    const safePath = path.join(canonicalDir, path.basename(target));
    this.assertWithinBase(safePath);

    fs.writeFileSync(safePath, buffer);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const target = this.preliminaryPath(key);
    const canonical = fs.realpathSync(target);
    this.assertWithinBase(canonical);
    return fs.readFileSync(canonical);
  }

  async delete(key: string): Promise<void> {
    const target = this.preliminaryPath(key);
    if (fs.existsSync(target)) {
      const canonical = fs.realpathSync(target);
      this.assertWithinBase(canonical);
      fs.unlinkSync(canonical);
    }
  }

  async exists(key: string): Promise<boolean> {
    const target = this.preliminaryPath(key);
    if (!fs.existsSync(target)) {
      return false;
    }
    const canonical = fs.realpathSync(target);
    this.assertWithinBase(canonical);
    return true;
  }

  async getUrl(key: string): Promise<string> {
    return `${this.baseUrl}/uploads/${key}`;
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
