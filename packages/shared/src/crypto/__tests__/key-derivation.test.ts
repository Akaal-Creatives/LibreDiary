import { describe, it, expect } from 'vitest';
import { deriveKeyFromPassphrase, deriveKeyFromPassphraseWithSalt } from '../key-derivation.js';
import { CRYPTO_CONSTANTS } from '../types.js';

describe('Key Derivation (Argon2id)', () => {
  // Argon2id requires libsodium init which can be slow on first run
  const passphrase = 'correct-horse-battery-staple';

  describe('deriveKeyFromPassphrase', () => {
    it('should derive a 256-bit key and return a salt', async () => {
      const result = await deriveKeyFromPassphrase(passphrase);

      expect(result.key).toBeInstanceOf(Uint8Array);
      expect(result.key.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
      expect(result.salt).toBeInstanceOf(Uint8Array);
      expect(result.salt.length).toBe(CRYPTO_CONSTANTS.SALT_LENGTH);
    });

    it('should generate a different salt on each call', async () => {
      const result1 = await deriveKeyFromPassphrase(passphrase);
      const result2 = await deriveKeyFromPassphrase(passphrase);

      expect(result1.salt).not.toEqual(result2.salt);
    });

    it('should derive different keys with different salts', async () => {
      const result1 = await deriveKeyFromPassphrase(passphrase);
      const result2 = await deriveKeyFromPassphrase(passphrase);

      expect(result1.key).not.toEqual(result2.key);
    });

    it('should derive different keys for different passphrases', async () => {
      const result1 = await deriveKeyFromPassphrase('passphrase-one');
      const result2 = await deriveKeyFromPassphrase('passphrase-two');

      expect(result1.key).not.toEqual(result2.key);
    });
  });

  describe('deriveKeyFromPassphraseWithSalt', () => {
    it('should produce the same key given the same passphrase and salt', async () => {
      const { salt } = await deriveKeyFromPassphrase(passphrase);

      const key1 = await deriveKeyFromPassphraseWithSalt(passphrase, salt);
      const key2 = await deriveKeyFromPassphraseWithSalt(passphrase, salt);

      expect(key1).toEqual(key2);
    });

    it('should produce a different key for a different passphrase with the same salt', async () => {
      const { salt } = await deriveKeyFromPassphrase(passphrase);

      const key1 = await deriveKeyFromPassphraseWithSalt('passphrase-a', salt);
      const key2 = await deriveKeyFromPassphraseWithSalt('passphrase-b', salt);

      expect(key1).not.toEqual(key2);
    });

    it('should produce the correct key length', async () => {
      const { salt } = await deriveKeyFromPassphrase(passphrase);
      const key = await deriveKeyFromPassphraseWithSalt(passphrase, salt);

      expect(key.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
    });

    it('should reject an invalid salt length', async () => {
      const badSalt = new Uint8Array(8); // should be 16

      await expect(deriveKeyFromPassphraseWithSalt(passphrase, badSalt)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty passphrase', async () => {
      const result = await deriveKeyFromPassphrase('');

      expect(result.key).toBeInstanceOf(Uint8Array);
      expect(result.key.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
    });

    it('should handle unicode passphrase', async () => {
      const result = await deriveKeyFromPassphrase('p@$$w0rd-ਪਾਸਵਰਡ-密码');

      expect(result.key).toBeInstanceOf(Uint8Array);
      expect(result.key.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
    });

    it('should handle very long passphrase', async () => {
      const longPass = 'a'.repeat(10000);
      const result = await deriveKeyFromPassphrase(longPass);

      expect(result.key).toBeInstanceOf(Uint8Array);
      expect(result.key.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
    });
  });
});
