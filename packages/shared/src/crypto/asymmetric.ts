/**
 * Asymmetric Key Exchange — X25519 + XSalsa20-Poly1305
 *
 * Used to share workspace keys with collaborators. Each user has an X25519
 * key pair; the workspace key is encrypted with the recipient's public key.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import sodium from 'libsodium-wrappers-sumo';
import type { KeyPair, EncryptedKeyShare } from './types.js';

/** Ensure libsodium is initialised before use */
async function ensureSodium(): Promise<void> {
  await sodium.ready;
}

/**
 * Generate an X25519 key pair for asymmetric key exchange.
 *
 * @returns A public/private key pair (32 bytes each)
 */
export async function generateKeyPair(): Promise<KeyPair> {
  await ensureSodium();

  const kp = sodium.crypto_box_keypair();

  return {
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
  };
}

/**
 * Encrypt data for a specific recipient using authenticated encryption.
 * Uses crypto_box (X25519 + XSalsa20-Poly1305).
 *
 * @param data - The data to encrypt (e.g. a workspace key)
 * @param senderPrivateKey - Sender's X25519 private key
 * @param recipientPublicKey - Recipient's X25519 public key
 * @returns Encrypted key share with nonce
 */
export async function encryptForRecipient(
  data: Uint8Array,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: Uint8Array
): Promise<EncryptedKeyShare> {
  await ensureSodium();

  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const encryptedKey = sodium.crypto_box_easy(data, nonce, recipientPublicKey, senderPrivateKey);

  return { encryptedKey, nonce };
}

/**
 * Decrypt data from a specific sender using authenticated decryption.
 *
 * @param encrypted - The encrypted key share
 * @param recipientPrivateKey - Recipient's X25519 private key
 * @param senderPublicKey - Sender's X25519 public key
 * @returns The decrypted data
 * @throws If decryption fails (wrong keys, tampered data)
 */
export function decryptFromSender(
  encrypted: EncryptedKeyShare,
  recipientPrivateKey: Uint8Array,
  senderPublicKey: Uint8Array
): Uint8Array {
  // sodium.ready is already resolved if we got here via encryptForRecipient
  return sodium.crypto_box_open_easy(
    encrypted.encryptedKey,
    encrypted.nonce,
    senderPublicKey,
    recipientPrivateKey
  );
}
