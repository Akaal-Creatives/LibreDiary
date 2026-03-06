/**
 * Symmetric Encryption — AES-256-GCM
 *
 * Uses the Web Crypto API for hardware-accelerated encryption.
 * All page content is encrypted with workspace keys using this module.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { CRYPTO_CONSTANTS, ENCRYPTION_VERSION } from './types.js';
import type { EncryptedData, EncryptedBuffer } from './types.js';

/** Convert Uint8Array to ArrayBuffer for Web Crypto API compatibility */
function toBuffer(data: Uint8Array): ArrayBuffer {
  return new Uint8Array(data).buffer as ArrayBuffer;
}

/**
 * Generate a random 256-bit AES key.
 */
export async function generateKey(): Promise<Uint8Array> {
  const key = new Uint8Array(CRYPTO_CONSTANTS.KEY_LENGTH);
  crypto.getRandomValues(key);
  return key;
}

/**
 * Import a raw key into a CryptoKey for use with Web Crypto API.
 */
async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBuffer(rawKey), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * @param plaintext - Data to encrypt
 * @param rawKey - 256-bit key
 * @returns Encrypted data envelope with version, IV, and ciphertext (includes auth tag)
 */
export async function encrypt(plaintext: Uint8Array, rawKey: Uint8Array): Promise<EncryptedData> {
  const iv = new Uint8Array(CRYPTO_CONSTANTS.IV_LENGTH);
  crypto.getRandomValues(iv);

  const key = await importKey(rawKey);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    toBuffer(plaintext)
  );

  return {
    version: ENCRYPTION_VERSION,
    iv,
    ciphertext: new Uint8Array(ciphertextBuffer),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 *
 * @param encrypted - Encrypted data envelope
 * @param rawKey - 256-bit key
 * @returns Decrypted plaintext
 * @throws If decryption fails (wrong key, tampered data, etc.)
 */
export async function decrypt(encrypted: EncryptedData, rawKey: Uint8Array): Promise<Uint8Array> {
  const key = await importKey(rawKey);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBuffer(encrypted.iv) },
    key,
    toBuffer(encrypted.ciphertext)
  );

  return new Uint8Array(plaintextBuffer);
}

/**
 * Serialise an EncryptedData envelope into a single contiguous buffer.
 *
 * Format: [version: 1 byte] [iv: 12 bytes] [ciphertext: variable]
 */
export function serialise(encrypted: EncryptedData): EncryptedBuffer {
  const buffer = new Uint8Array(
    CRYPTO_CONSTANTS.VERSION_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH + encrypted.ciphertext.length
  );

  let offset = 0;

  buffer[offset] = encrypted.version;
  offset += CRYPTO_CONSTANTS.VERSION_LENGTH;

  buffer.set(encrypted.iv, offset);
  offset += CRYPTO_CONSTANTS.IV_LENGTH;

  buffer.set(encrypted.ciphertext, offset);

  return buffer;
}

/**
 * Deserialise a buffer back into an EncryptedData envelope.
 *
 * @throws If the buffer is too short to contain valid encrypted data
 */
export function deserialise(buffer: EncryptedBuffer): EncryptedData {
  const minLength = CRYPTO_CONSTANTS.VERSION_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH + 1;
  if (buffer.length < minLength) {
    throw new Error(
      `Invalid encrypted buffer: expected at least ${minLength} bytes, got ${buffer.length}`
    );
  }

  let offset = 0;

  const version = buffer[offset]!;
  offset += CRYPTO_CONSTANTS.VERSION_LENGTH;

  const iv = buffer.slice(offset, offset + CRYPTO_CONSTANTS.IV_LENGTH);
  offset += CRYPTO_CONSTANTS.IV_LENGTH;

  const ciphertext = buffer.slice(offset);

  return { version, iv, ciphertext };
}
