import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'node:crypto';

// Header: 'LDBE' (LibreDiary Backup Encrypted) + version byte
const HEADER_MAGIC = Buffer.from('LDBE');
const HEADER_VERSION = 1;
const SALT_LENGTH = 32;
const IV_LENGTH = 12; // AES-256-GCM standard IV length
const TAG_LENGTH = 16; // AES-256-GCM auth tag length
const KEY_LENGTH = 32; // AES-256
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives an AES-256 key from a password using PBKDF2.
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts data using AES-256-GCM with a password-derived key.
 *
 * Format: [HEADER_MAGIC (4)] [VERSION (1)] [SALT (32)] [IV (12)] [AUTH_TAG (16)] [CIPHERTEXT (...)]
 */
export function encryptBuffer(data: Buffer, password: string): Buffer {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Build output: header + salt + iv + authTag + ciphertext
  const versionBuf = Buffer.alloc(1);
  versionBuf.writeUInt8(HEADER_VERSION, 0);

  return Buffer.concat([HEADER_MAGIC, versionBuf, salt, iv, authTag, encrypted]);
}

/**
 * Decrypts data that was encrypted with encryptBuffer.
 * Throws if the password is wrong or data is corrupted.
 */
export function decryptBuffer(encrypted: Buffer, password: string): Buffer {
  // Validate header
  const magic = encrypted.subarray(0, 4);
  if (!magic.equals(HEADER_MAGIC)) {
    throw new Error('Invalid backup file: missing encryption header');
  }

  const version = encrypted.readUInt8(4);
  if (version !== HEADER_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  let offset = 5;
  const salt = encrypted.subarray(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;

  const iv = encrypted.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;

  const authTag = encrypted.subarray(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;

  const ciphertext = encrypted.subarray(offset);

  const key = deriveKey(password, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Decryption failed: wrong password or corrupted data');
  }
}
