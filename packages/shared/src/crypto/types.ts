/**
 * E2EE Crypto Types
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

/** Current encryption format version */
export const ENCRYPTION_VERSION = 1;

/** Byte lengths for crypto operations */
export const CRYPTO_CONSTANTS = {
  /** AES-256-GCM initialisation vector length */
  IV_LENGTH: 12,
  /** AES-256 key length in bytes */
  KEY_LENGTH: 32,
  /** GCM authentication tag length */
  AUTH_TAG_LENGTH: 16,
  /** Argon2id salt length (crypto_pwhash_SALTBYTES) */
  SALT_LENGTH: 16,
  /** Version byte prefix */
  VERSION_LENGTH: 1,
  /** Recovery key entropy in bytes (256-bit) */
  RECOVERY_KEY_LENGTH: 32,
} as const;

/** Argon2id parameters — OWASP recommended minimum */
export const ARGON2_PARAMS = {
  /** Memory cost in KiB (64 MiB) */
  memoryLimit: 65536,
  /** Number of iterations */
  opsLimit: 3,
  /** Output key length */
  keyLength: CRYPTO_CONSTANTS.KEY_LENGTH,
} as const;

/** Result of key derivation from a passphrase */
export interface DerivedKey {
  /** The derived 256-bit key */
  key: Uint8Array;
  /** The salt used for derivation (store this) */
  salt: Uint8Array;
}

/** Encrypted data envelope */
export interface EncryptedData {
  /** Format version for future algorithm changes */
  version: number;
  /** Initialisation vector (unique per encryption) */
  iv: Uint8Array;
  /** The encrypted payload including GCM auth tag */
  ciphertext: Uint8Array;
}

/** Serialised encrypted data as a single buffer */
export type EncryptedBuffer = Uint8Array;

/** X25519 key pair for asymmetric key exchange */
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/** A workspace key encrypted for a specific user */
export interface EncryptedKeyShare {
  /** The workspace key encrypted with the recipient's public key */
  encryptedKey: Uint8Array;
  /** Nonce used for the encryption */
  nonce: Uint8Array;
}

/** Recovery key data */
export interface RecoveryKeyData {
  /** Human-readable recovery key (base64 encoded) */
  recoveryKey: string;
  /** The master key encrypted with the recovery key */
  encryptedMasterKey: EncryptedData;
  /** Salt used to derive the wrapping key from the recovery key */
  salt: Uint8Array;
}
