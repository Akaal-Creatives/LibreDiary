import { describe, it, expect } from 'vitest';
import { generateRecoveryKey, recoverMasterKey } from '../recovery.js';
import { generateKey } from '../symmetric.js';

describe('Recovery Key', () => {
  describe('generateRecoveryKey', () => {
    it('should generate a recovery key and encrypted master key', async () => {
      const masterKey = await generateKey();
      const recovery = await generateRecoveryKey(masterKey);

      expect(recovery.recoveryKey).toBeDefined();
      expect(typeof recovery.recoveryKey).toBe('string');
      expect(recovery.encryptedMasterKey).toBeDefined();
      expect(recovery.salt).toBeInstanceOf(Uint8Array);
    });

    it('should generate a recovery key of sufficient length', async () => {
      const masterKey = await generateKey();
      const recovery = await generateRecoveryKey(masterKey);

      // Base64 of 32 bytes = 44 chars, formatted with dashes
      expect(recovery.recoveryKey.length).toBeGreaterThan(40);
    });

    it('should generate different recovery keys each time', async () => {
      const masterKey = await generateKey();
      const recovery1 = await generateRecoveryKey(masterKey);
      const recovery2 = await generateRecoveryKey(masterKey);

      expect(recovery1.recoveryKey).not.toBe(recovery2.recoveryKey);
    });
  });

  describe('recoverMasterKey', () => {
    it('should recover the original master key', async () => {
      const masterKey = await generateKey();
      const recovery = await generateRecoveryKey(masterKey);

      const recovered = await recoverMasterKey(
        recovery.recoveryKey,
        recovery.encryptedMasterKey,
        recovery.salt
      );

      expect(recovered).toEqual(masterKey);
    });

    it('should fail with a wrong recovery key', async () => {
      const masterKey = await generateKey();
      const recovery = await generateRecoveryKey(masterKey);

      // Generate a different recovery key
      const otherRecovery = await generateRecoveryKey(await generateKey());

      await expect(
        recoverMasterKey(otherRecovery.recoveryKey, recovery.encryptedMasterKey, recovery.salt)
      ).rejects.toThrow();
    });

    it('should fail with tampered encrypted master key', async () => {
      const masterKey = await generateKey();
      const recovery = await generateRecoveryKey(masterKey);

      const tampered = {
        ...recovery.encryptedMasterKey,
        ciphertext: new Uint8Array(recovery.encryptedMasterKey.ciphertext),
      };
      tampered.ciphertext[0] ^= 0xff;

      await expect(
        recoverMasterKey(recovery.recoveryKey, tampered, recovery.salt)
      ).rejects.toThrow();
    });

    it('should recover a key that can be used for decryption', async () => {
      const { encrypt, decrypt } = await import('../symmetric.js');

      const masterKey = await generateKey();
      const recovery = await generateRecoveryKey(masterKey);

      const plaintext = new TextEncoder().encode('secret data');
      const encrypted = await encrypt(plaintext, masterKey);

      const recovered = await recoverMasterKey(
        recovery.recoveryKey,
        recovery.encryptedMasterKey,
        recovery.salt
      );

      const decrypted = await decrypt(encrypted, recovered);
      expect(decrypted).toEqual(plaintext);
    });
  });
});
