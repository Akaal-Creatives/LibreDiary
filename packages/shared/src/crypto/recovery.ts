/**
 * Recovery Key — backup mechanism for lost passphrases
 *
 * Generates a random 256-bit recovery key, formatted as base64 with dashes
 * for readability. The master key is encrypted with a key derived from the
 * recovery key, allowing account recovery.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { CRYPTO_CONSTANTS } from './types.js';
import type { EncryptedData, RecoveryKeyData } from './types.js';
import { encrypt, decrypt } from './symmetric.js';

/**
 * Format raw bytes as a dash-separated base64 string for readability.
 * e.g. "ABCD-EFGH-IJKL-MNOP-..."
 */
function formatRecoveryKey(raw: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...raw));
  // Split into groups of 4 characters separated by dashes
  return b64.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

/**
 * Parse a formatted recovery key back to raw bytes.
 */
function parseRecoveryKey(formatted: string): Uint8Array {
  const b64 = formatted.replace(/-/g, '');
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Derive an encryption key from the recovery key bytes using HKDF.
 */
async function deriveKeyFromRecovery(
  recoveryBytes: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(recoveryBytes).buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(salt).buffer as ArrayBuffer,
      info: new TextEncoder().encode('librediary-recovery-v1'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const raw = await crypto.subtle.exportKey('raw', derivedKey);
  return new Uint8Array(raw);
}

/**
 * Generate a recovery key and encrypt the master key with it.
 *
 * The recovery key is displayed to the user once and must be saved.
 * It can later be used to recover the master key if the passphrase is lost.
 *
 * @param masterKey - The user's master key to protect
 * @returns Recovery key data (display recoveryKey to user, store the rest)
 */
export async function generateRecoveryKey(masterKey: Uint8Array): Promise<RecoveryKeyData> {
  const recoveryBytes = new Uint8Array(CRYPTO_CONSTANTS.RECOVERY_KEY_LENGTH);
  crypto.getRandomValues(recoveryBytes);

  const salt = new Uint8Array(CRYPTO_CONSTANTS.SALT_LENGTH);
  crypto.getRandomValues(salt);

  const wrappingKey = await deriveKeyFromRecovery(recoveryBytes, salt);
  const encryptedMasterKey = await encrypt(masterKey, wrappingKey);

  return {
    recoveryKey: formatRecoveryKey(recoveryBytes),
    encryptedMasterKey,
    salt,
  };
}

/**
 * Recover a master key using a recovery key.
 *
 * @param recoveryKey - The formatted recovery key string
 * @param encryptedMasterKey - The encrypted master key
 * @param salt - The salt used during recovery key generation
 * @returns The recovered master key
 * @throws If the recovery key is wrong or data is tampered
 */
export async function recoverMasterKey(
  recoveryKey: string,
  encryptedMasterKey: EncryptedData,
  salt: Uint8Array
): Promise<Uint8Array> {
  const recoveryBytes = parseRecoveryKey(recoveryKey);
  const wrappingKey = await deriveKeyFromRecovery(recoveryBytes, salt);
  return decrypt(encryptedMasterKey, wrappingKey);
}
