import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateKey, serialise, deserialise } from '../symmetric.js';
import { CRYPTO_CONSTANTS, ENCRYPTION_VERSION } from '../types.js';

describe('Symmetric Encryption (AES-256-GCM)', () => {
  const plaintext = new TextEncoder().encode('Hello, LibreDiary!');

  describe('generateKey', () => {
    it('should generate a 256-bit key', async () => {
      const key = await generateKey();

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
    });

    it('should generate unique keys', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();

      expect(key1).not.toEqual(key2);
    });
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a message round-trip', async () => {
      const key = await generateKey();
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('should include the correct version byte', async () => {
      const key = await generateKey();
      const encrypted = await encrypt(plaintext, key);

      expect(encrypted.version).toBe(ENCRYPTION_VERSION);
    });

    it('should produce a unique IV per encryption', async () => {
      const key = await generateKey();
      const encrypted1 = await encrypt(plaintext, key);
      const encrypted2 = await encrypt(plaintext, key);

      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
    });

    it('should produce different ciphertext for the same plaintext', async () => {
      const key = await generateKey();
      const encrypted1 = await encrypt(plaintext, key);
      const encrypted2 = await encrypt(plaintext, key);

      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    });

    it('should fail to decrypt with a different key', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();
      const encrypted = await encrypt(plaintext, key1);

      await expect(decrypt(encrypted, key2)).rejects.toThrow();
    });

    it('should fail to decrypt tampered ciphertext', async () => {
      const key = await generateKey();
      const encrypted = await encrypt(plaintext, key);

      // Flip a byte in the ciphertext
      const tampered = { ...encrypted, ciphertext: new Uint8Array(encrypted.ciphertext) };
      tampered.ciphertext[0] ^= 0xff;

      await expect(decrypt(tampered, key)).rejects.toThrow();
    });

    it('should handle empty plaintext', async () => {
      const key = await generateKey();
      const empty = new Uint8Array(0);
      const encrypted = await encrypt(empty, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(empty);
    });

    it('should handle large plaintext', async () => {
      const key = await generateKey();
      const large = new Uint8Array(1024 * 1024); // 1 MiB
      // Fill in 64 KiB chunks (getRandomValues limit)
      for (let i = 0; i < large.length; i += 65536) {
        crypto.getRandomValues(large.subarray(i, Math.min(i + 65536, large.length)));
      }

      const encrypted = await encrypt(large, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(large);
    });
  });

  describe('serialise / deserialise', () => {
    it('should round-trip serialise and deserialise', async () => {
      const key = await generateKey();
      const encrypted = await encrypt(plaintext, key);

      const buffer = serialise(encrypted);
      const restored = deserialise(buffer);

      expect(restored.version).toBe(encrypted.version);
      expect(restored.iv).toEqual(encrypted.iv);
      expect(restored.ciphertext).toEqual(encrypted.ciphertext);
    });

    it('should produce a buffer of the correct length', async () => {
      const key = await generateKey();
      const encrypted = await encrypt(plaintext, key);
      const buffer = serialise(encrypted);

      const expectedLength =
        CRYPTO_CONSTANTS.VERSION_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH + encrypted.ciphertext.length;

      expect(buffer.length).toBe(expectedLength);
    });

    it('should decrypt after serialise/deserialise round-trip', async () => {
      const key = await generateKey();
      const encrypted = await encrypt(plaintext, key);

      const buffer = serialise(encrypted);
      const restored = deserialise(buffer);
      const decrypted = await decrypt(restored, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('should reject a buffer that is too short', () => {
      const tooShort = new Uint8Array(5);

      expect(() => deserialise(tooShort)).toThrow();
    });
  });
});
