/**
 * Key Derivation — Argon2id from user passphrase
 *
 * Uses libsodium's Argon2id implementation for memory-hard key derivation.
 * This is the foundation of the E2EE key hierarchy: passphrase -> master key.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import sodium from 'libsodium-wrappers-sumo';
import { ARGON2_PARAMS, CRYPTO_CONSTANTS } from './types.js';
import type { DerivedKey } from './types.js';

/** Ensure libsodium is initialised before use */
async function ensureSodium(): Promise<void> {
  await sodium.ready;
}

/**
 * Derive a 256-bit key from a passphrase using Argon2id.
 * Generates a random salt automatically.
 *
 * @param passphrase - The user's passphrase
 * @returns The derived key and salt (salt must be stored for re-derivation)
 */
export async function deriveKeyFromPassphrase(passphrase: string): Promise<DerivedKey> {
  await ensureSodium();

  const salt = sodium.randombytes_buf(CRYPTO_CONSTANTS.SALT_LENGTH);
  const key = await deriveKeyFromPassphraseWithSalt(passphrase, salt);

  return { key, salt };
}

/**
 * Derive a 256-bit key from a passphrase and a known salt.
 * Used when the salt is already stored (e.g. re-entering passphrase).
 *
 * @param passphrase - The user's passphrase
 * @param salt - The salt used during initial derivation
 * @returns The derived 256-bit key
 * @throws If the salt length is invalid
 */
export async function deriveKeyFromPassphraseWithSalt(
  passphrase: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  await ensureSodium();

  if (salt.length !== CRYPTO_CONSTANTS.SALT_LENGTH) {
    throw new Error(
      `Invalid salt length: expected ${CRYPTO_CONSTANTS.SALT_LENGTH} bytes, got ${salt.length}`
    );
  }

  const key = sodium.crypto_pwhash(
    ARGON2_PARAMS.keyLength,
    passphrase,
    salt,
    ARGON2_PARAMS.opsLimit,
    ARGON2_PARAMS.memoryLimit * 1024, // libsodium expects bytes, not KiB
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  return key;
}
