import { createGunzip } from 'node:zlib';
import { Readable, pipeline as pipelineCb } from 'node:stream';
import { promisify } from 'node:util';
import * as tar from 'tar';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const pipeline = promisify(pipelineCb);

export interface TarEntry {
  name: string;
  data: Buffer;
}

/**
 * Creates a tar.gz archive from the provided entries.
 * Each entry has a name (file path in archive) and data (Buffer content).
 */
export async function createTarGz(entries: TarEntry[]): Promise<Buffer> {
  if (entries.length === 0) {
    // Return a minimal valid gzip stream for empty archives
    const { gzipSync } = await import('node:zlib');
    return gzipSync(Buffer.alloc(0));
  }

  // Create a temporary directory to stage files
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'librediary-backup-'));

  try {
    // Write all entries to temporary files
    for (const entry of entries) {
      const filePath = path.join(tmpDir, entry.name);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, entry.data);
    }

    // Create tar.gz
    const chunks: Buffer[] = [];

    const tarStream = tar.create(
      {
        gzip: true,
        cwd: tmpDir,
      },
      entries.map((e) => e.name)
    );

    for await (const chunk of tarStream) {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }

    return Buffer.concat(chunks);
  } finally {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Extracts a tar.gz archive to the specified output directory.
 */
export async function extractTarGz(data: Buffer, outputDir: string): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });

  const readable = Readable.from(data);
  const gunzip = createGunzip();
  const extract = tar.extract({ cwd: outputDir });

  await pipeline(readable, gunzip, extract);
}
