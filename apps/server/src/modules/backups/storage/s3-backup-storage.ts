import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import type {
  BackupStorageProvider,
  BackupStorageConnectionResult,
} from './backup-storage-provider.js';

interface S3BackupStorageConfig {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3BackupStorage implements BackupStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3BackupStorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region ?? 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, data: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: 'application/octet-stream',
      })
    );
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    const body = response.Body;
    if (!body) {
      throw new Error('Empty response body from S3');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getDownloadUrl(key: string): Promise<string> {
    return `s3://${this.bucket}/${key}`;
  }

  async testConnection(): Promise<BackupStorageConnectionResult> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        })
      );
      return {
        success: true,
        message: 'S3 backup storage connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `S3 backup storage test failed: ${(error as Error).message}`,
      };
    }
  }

  async listKeys(prefix?: string): Promise<string[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    );

    return (response.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
  }
}
