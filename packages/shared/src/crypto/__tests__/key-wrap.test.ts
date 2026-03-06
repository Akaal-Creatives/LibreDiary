import { describe, it, expect } from 'vitest';
import { wrapKey, unwrapKey } from '../key-wrap.js';
import { generateKey } from '../symmetric.js';
import { CRYPTO_CONSTANTS } from '../types.js';

describe('Key Wrapping (AES-256-KW)', () => {
  describe('wrapKey / unwrapKey', () => {
    it('should wrap and unwrap a key round-trip', async () => {
      const masterKey = await generateKey();
      const workspaceKey = await generateKey();

      const wrapped = await wrapKey(workspaceKey, masterKey);
      const unwrapped = await unwrapKey(wrapped, masterKey);

      expect(unwrapped).toEqual(workspaceKey);
    });

    it('should produce a wrapped key different from the original', async () => {
      const masterKey = await generateKey();
      const workspaceKey = await generateKey();

      const wrapped = await wrapKey(workspaceKey, masterKey);

      expect(wrapped).not.toEqual(workspaceKey);
    });

    it('should produce consistent wrapping with the same keys', async () => {
      const masterKey = await generateKey();
      const workspaceKey = await generateKey();

      const wrapped1 = await wrapKey(workspaceKey, masterKey);
      const wrapped2 = await wrapKey(workspaceKey, masterKey);

      // AES-KW is deterministic (no IV), so same input = same output
      expect(wrapped1).toEqual(wrapped2);
    });

    it('should fail to unwrap with a different master key', async () => {
      const masterKey1 = await generateKey();
      const masterKey2 = await generateKey();
      const workspaceKey = await generateKey();

      const wrapped = await wrapKey(workspaceKey, masterKey1);

      await expect(unwrapKey(wrapped, masterKey2)).rejects.toThrow();
    });

    it('should fail to unwrap tampered wrapped key', async () => {
      const masterKey = await generateKey();
      const workspaceKey = await generateKey();

      const wrapped = await wrapKey(workspaceKey, masterKey);
      const tampered = new Uint8Array(wrapped);
      tampered[0] ^= 0xff;

      await expect(unwrapKey(tampered, masterKey)).rejects.toThrow();
    });

    it('should produce a wrapped key of the expected length', async () => {
      const masterKey = await generateKey();
      const workspaceKey = await generateKey();

      const wrapped = await wrapKey(workspaceKey, masterKey);

      // AES-KW adds 8 bytes of integrity check
      expect(wrapped.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH + 8);
    });
  });
});
