/**
 * yjsState encryption at rest
 *
 * Encrypts/decrypts yjsState binary blobs using AES-256-GCM with a key
 * derived from APP_SECRET + orgId. This provides encryption at rest to
 * protect against database breaches.
 *
 * Note: This is NOT end-to-end encryption. During active collaboration
 * sessions, the server processes Yjs binary state (which is non-human-
 * readable CRDT data). True E2EE for real-time collaboration would
 * require a relay-only server architecture.
 *
 * Format: [MAGIC (4)] [VERSION (1)] [IV (12)] [AUTH_TAG (16)] [CIPHERTEXT (...)]
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { randomBytes, createCipheriv, createDecipheriv, createHmac } from 'node:crypto';
import { env } from '../../config/index.js';

// Header: 'LDYE' (LibreDiary Yjs Encrypted)
const HEADER_MAGIC = Buffer.from('LDYE');
const HEADER_VERSION = 1;
const IV_LENGTH = 12; // AES-256-GCM standard IV length
const TAG_LENGTH = 16; // AES-256-GCM auth tag length
const KEY_LENGTH = 32; // AES-256
const HEADER_LENGTH = HEADER_MAGIC.length + 1 + IV_LENGTH + TAG_LENGTH; // 33 bytes

/**
 * Derive an AES-256 key from APP_SECRET and the organisation ID.
 * Uses HMAC-SHA256 as a simple KDF (no need for PBKDF2 since APP_SECRET
 * is already a high-entropy secret).
 */
function deriveKey(orgId: string): Buffer {
  const secret = env.APP_SECRET;
  const hmac = createHmac('sha256', secret);
  hmac.update(`librediary:yjs:${orgId}`);
  return hmac.digest().subarray(0, KEY_LENGTH);
}

/**
 * Encrypt a yjsState buffer for storage.
 * Returns a buffer prefixed with the LDYE header.
 */
export function encryptYjsState(yjsState: Buffer, orgId: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(orgId);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(yjsState), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const versionBuf = Buffer.alloc(1);
  versionBuf.writeUInt8(HEADER_VERSION, 0);

  return Buffer.concat([HEADER_MAGIC, versionBuf, iv, authTag, encrypted]);
}

/**
 * Decrypt a yjsState buffer that was encrypted with encryptYjsState.
 * Throws if the orgId is wrong or data is corrupted.
 * Accepts Uint8Array because @prisma/adapter-pg returns Uint8Array for Bytes columns.
 */
export function decryptYjsState(encrypted: Buffer | Uint8Array, orgId: string): Buffer {
  const buf = Buffer.isBuffer(encrypted) ? encrypted : Buffer.from(encrypted);
  const magic = buf.subarray(0, 4);
  if (!magic.equals(HEADER_MAGIC)) {
    throw new Error('Invalid encrypted yjsState: missing LDYE header');
  }

  const version = buf.readUInt8(4);
  if (version !== HEADER_VERSION) {
    throw new Error(`Unsupported yjsState encryption version: ${version}`);
  }

  let offset = 5;
  const iv = buf.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;

  const authTag = buf.subarray(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;

  const ciphertext = buf.subarray(offset);

  const key = deriveKey(orgId);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('yjsState decryption failed: wrong key or corrupted data');
  }
}

/**
 * Check if a buffer is an encrypted yjsState (has LDYE header).
 * Used to handle migration — existing unencrypted states are loaded as-is.
 * Accepts Uint8Array because @prisma/adapter-pg returns Uint8Array for Bytes columns.
 */
export function isEncryptedYjsState(buffer: Buffer | Uint8Array | null | undefined): boolean {
  if (!buffer || buffer.length < HEADER_LENGTH) return false;
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return buf.subarray(0, 4).equals(HEADER_MAGIC);
}
