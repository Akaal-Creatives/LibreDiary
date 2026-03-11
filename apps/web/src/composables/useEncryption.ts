/**
 * useEncryption — E2EE key lifecycle management composable
 *
 * Manages the client-side encryption key hierarchy:
 * - Passphrase → Master Key (Argon2id)
 * - Master Key wraps X25519 private key and workspace keys
 * - Content encryption/decryption with workspace keys
 *
 * Keys are held in memory only — never persisted to disk.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { ref } from 'vue';
import {
  deriveKeyFromPassphrase,
  deriveKeyFromPassphraseWithSalt,
  encrypt,
  decrypt,
  generateKeyPair,
  wrapKey,
  unwrapKey,
  generateRecoveryKey,
  recoverMasterKey,
  serialise,
  deserialise,
} from '@librediary/shared/crypto';
import { encryptionService } from '../services/encryption.service';

// =============================================
// Helpers
// =============================================

function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// =============================================
// State (module-level singleton)
// =============================================

const masterKey = ref<Uint8Array | null>(null);
const privateKey = ref<Uint8Array | null>(null);
const isUnlocked = ref(false);
const isSetUp = ref(false);

// Cache for decrypted workspace keys: orgId → key
const workspaceKeys = new Map<string, Uint8Array>();

// =============================================
// Composable
// =============================================

export function useEncryption() {
  /**
   * Check E2EE setup status from server.
   */
  async function checkStatus(): Promise<void> {
    const status = await encryptionService.getStatus();
    isSetUp.value = status.isSetUp;
  }

  /**
   * Initial E2EE setup: derive master key, generate keypair, create recovery key.
   * Returns the recovery key string for the user to save.
   */
  async function setupEncryption(passphrase: string) {
    // 1. Derive master key from passphrase
    const { key: mk, salt } = await deriveKeyFromPassphrase(passphrase);

    // 2. Generate X25519 keypair for key sharing
    const keyPair = await generateKeyPair();

    // 3. Wrap private key with master key for server storage
    const wrappedPrivateKey = await wrapKey(keyPair.privateKey, mk);

    // 4. Generate recovery key
    const recovery = await generateRecoveryKey(mk);

    // 5. Send to server
    await encryptionService.setup({
      publicKey: toBase64(keyPair.publicKey),
      encryptedPrivateKey: toBase64(wrappedPrivateKey),
      keySalt: toBase64(salt),
      keyParams: { memoryLimit: 65536, opsLimit: 3 },
      recoveryEncryptedMasterKey: {
        version: recovery.encryptedMasterKey.version,
        iv: toBase64(recovery.encryptedMasterKey.iv),
        ciphertext: toBase64(recovery.encryptedMasterKey.ciphertext),
      },
      recoverySalt: toBase64(recovery.salt),
      recoveryKeyHash: toBase64(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(recovery.recoveryKey))
        )
      ),
    });

    // 6. Store keys in memory
    masterKey.value = mk;
    privateKey.value = keyPair.privateKey;
    isUnlocked.value = true;
    isSetUp.value = true;

    return { recoveryKey: recovery.recoveryKey };
  }

  /**
   * Unlock E2EE by deriving master key from passphrase.
   */
  async function unlock(passphrase: string): Promise<void> {
    // 1. Get encryption data from server (salt, encrypted private key, etc.)
    const data = await encryptionService.getData();

    // 2. Re-derive master key
    const salt = fromBase64(data.keySalt);
    const mk = await deriveKeyFromPassphraseWithSalt(passphrase, salt);

    // 3. Unwrap private key
    const encryptedPk = fromBase64(data.encryptedPrivateKey);
    const pk = await unwrapKey(encryptedPk, mk);

    // 4. Store in memory
    masterKey.value = mk;
    privateKey.value = pk;
    isUnlocked.value = true;
    isSetUp.value = true;
  }

  /**
   * Lock E2EE — clear all keys from memory.
   */
  function lock(): void {
    // Zero out key data before releasing
    if (masterKey.value) masterKey.value.fill(0);
    if (privateKey.value) privateKey.value.fill(0);
    workspaceKeys.forEach((key) => key.fill(0));

    masterKey.value = null;
    privateKey.value = null;
    isUnlocked.value = false;
    workspaceKeys.clear();
  }

  /**
   * Encrypt string content with a workspace key.
   * Returns base64-encoded encrypted buffer.
   */
  async function encryptContent(content: string, key: Uint8Array): Promise<string> {
    const plaintext = new TextEncoder().encode(content);
    const encrypted = await encrypt(plaintext, key);
    const buffer = serialise(encrypted);
    return toBase64(buffer);
  }

  /**
   * Decrypt base64-encoded content with a workspace key.
   * Returns the original string.
   */
  async function decryptContent(encryptedBase64: string, key: Uint8Array): Promise<string> {
    const buffer = fromBase64(encryptedBase64);
    const envelope = deserialise(buffer);
    const plaintext = await decrypt(envelope, key);
    return new TextDecoder().decode(plaintext);
  }

  /**
   * Get or fetch a decrypted workspace key for an organisation.
   */
  async function getWorkspaceKey(orgId: string): Promise<Uint8Array | null> {
    // Return cached key if available
    if (workspaceKeys.has(orgId)) {
      return workspaceKeys.get(orgId)!;
    }

    if (!privateKey.value) return null;

    try {
      const keyShare = await encryptionService.getWorkspaceKeyShare(orgId);
      const senderPublicKey = fromBase64(keyShare.sharedByPublicKey);
      const nonce = fromBase64(keyShare.nonce);
      const encryptedKey = fromBase64(keyShare.encryptedKey);

      // Reconstruct the EncryptedKeyShare format
      const { decryptFromSender } = await import('@librediary/shared/crypto');
      const workspaceKey = decryptFromSender(
        { nonce, encryptedKey },
        privateKey.value,
        senderPublicKey
      );

      workspaceKeys.set(orgId, workspaceKey);
      return workspaceKey;
    } catch {
      return null;
    }
  }

  /**
   * Recover access using a recovery key and set a new passphrase.
   * Returns the new recovery key for the user to save.
   */
  async function recoverWithRecoveryKey(
    recoveryKey: string,
    newPassphrase: string
  ): Promise<{ recoveryKey: string }> {
    // 1. Get existing encryption data (includes recovery-encrypted master key)
    const data = await encryptionService.getData();

    // 2. Reconstruct encrypted master key from server data
    const recoveryEncMk = data.recoveryEncryptedMasterKey!;
    const encryptedMasterKey = {
      version: recoveryEncMk.version as number,
      iv: fromBase64(recoveryEncMk.iv as string),
      ciphertext: fromBase64(recoveryEncMk.ciphertext as string),
    };
    const recoverySalt = fromBase64(data.recoverySalt as string);

    // 3. Recover master key using recovery key (validates the key; throws if wrong)
    const recoveredMk = await recoverMasterKey(recoveryKey, encryptedMasterKey, recoverySalt);
    recoveredMk.fill(0); // Clear recovered key — we derive a fresh one from the new passphrase

    // 4. Derive new key from new passphrase
    const { key: newKey, salt: newSalt } = await deriveKeyFromPassphrase(newPassphrase);

    // 5. Generate new keypair
    const keyPair = await generateKeyPair();

    // 6. Wrap private key with new master key
    const wrappedPrivateKey = await wrapKey(keyPair.privateKey, newKey);

    // 7. Generate new recovery key
    const recovery = await generateRecoveryKey(newKey);

    // 8. Update server with new key material
    await encryptionService.setup({
      publicKey: toBase64(keyPair.publicKey),
      encryptedPrivateKey: toBase64(wrappedPrivateKey),
      keySalt: toBase64(newSalt),
      keyParams: { memoryLimit: 65536, opsLimit: 3 },
      recoveryEncryptedMasterKey: {
        version: recovery.encryptedMasterKey.version,
        iv: toBase64(recovery.encryptedMasterKey.iv),
        ciphertext: toBase64(recovery.encryptedMasterKey.ciphertext),
      },
      recoverySalt: toBase64(recovery.salt),
      recoveryKeyHash: toBase64(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(recovery.recoveryKey))
        )
      ),
    });

    // 9. Store new keys in memory
    masterKey.value = newKey;
    privateKey.value = keyPair.privateKey;
    isUnlocked.value = true;
    isSetUp.value = true;

    return { recoveryKey: recovery.recoveryKey };
  }

  return {
    // State
    masterKey,
    privateKey,
    isUnlocked,
    isSetUp,

    // Actions
    checkStatus,
    setupEncryption,
    unlock,
    lock,
    encryptContent,
    decryptContent,
    getWorkspaceKey,
    recoverWithRecoveryKey,
  };
}
