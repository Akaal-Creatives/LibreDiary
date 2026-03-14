/**
 * yjsState encryption at rest — unit tests
 *
 * Verifies that yjsState binary blobs are encrypted before database storage
 * and decrypted on load. Uses AES-256-GCM with a key derived from
 * APP_SECRET + orgId (encryption at rest, not E2EE).
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { describe, it, expect } from 'vitest';
import { encryptYjsState, decryptYjsState, isEncryptedYjsState } from '../yjs-encrypt.js';

describe('yjs-encrypt', () => {
  const orgId = 'org-test-123';
  const sampleYjsState = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  describe('encryptYjsState', () => {
    it('should encrypt a yjsState buffer', () => {
      const encrypted = encryptYjsState(sampleYjsState, orgId);

      expect(encrypted).toBeInstanceOf(Buffer);
      // Encrypted output should be larger (header + IV + auth tag + ciphertext)
      expect(encrypted.length).toBeGreaterThan(sampleYjsState.length);
      // Should not contain the original data
      expect(encrypted.includes(sampleYjsState)).toBe(false);
    });

    it('should produce different ciphertexts for the same input (random IV)', () => {
      const encrypted1 = encryptYjsState(sampleYjsState, orgId);
      const encrypted2 = encryptYjsState(sampleYjsState, orgId);

      expect(encrypted1.equals(encrypted2)).toBe(false);
    });

    it('should produce different ciphertexts for different orgIds', () => {
      const encrypted1 = encryptYjsState(sampleYjsState, 'org-1');
      const encrypted2 = encryptYjsState(sampleYjsState, 'org-2');

      expect(encrypted1.equals(encrypted2)).toBe(false);
    });
  });

  describe('decryptYjsState', () => {
    it('should decrypt back to original data', () => {
      const encrypted = encryptYjsState(sampleYjsState, orgId);
      const decrypted = decryptYjsState(encrypted, orgId);

      expect(decrypted.equals(sampleYjsState)).toBe(true);
    });

    it('should fail with wrong orgId', () => {
      const encrypted = encryptYjsState(sampleYjsState, orgId);

      expect(() => decryptYjsState(encrypted, 'wrong-org')).toThrow();
    });

    it('should fail with tampered data', () => {
      const encrypted = encryptYjsState(sampleYjsState, orgId);
      // Tamper with the last byte (ciphertext region)
      encrypted[encrypted.length - 1] ^= 0xff;

      expect(() => decryptYjsState(encrypted, orgId)).toThrow();
    });

    it('should handle large buffers', () => {
      const largeBuffer = Buffer.alloc(1024 * 100, 0xab); // 100 KB
      const encrypted = encryptYjsState(largeBuffer, orgId);
      const decrypted = decryptYjsState(encrypted, orgId);

      expect(decrypted.equals(largeBuffer)).toBe(true);
    });

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const encrypted = encryptYjsState(emptyBuffer, orgId);
      const decrypted = decryptYjsState(encrypted, orgId);

      expect(decrypted.length).toBe(0);
    });
  });

  describe('isEncryptedYjsState', () => {
    it('should return true for encrypted yjsState', () => {
      const encrypted = encryptYjsState(sampleYjsState, orgId);

      expect(isEncryptedYjsState(encrypted)).toBe(true);
    });

    it('should return false for unencrypted yjsState', () => {
      expect(isEncryptedYjsState(sampleYjsState)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEncryptedYjsState(null)).toBe(false);
    });

    it('should return false for buffer too short to be encrypted', () => {
      const shortBuffer = Buffer.from([1, 2, 3]);
      expect(isEncryptedYjsState(shortBuffer)).toBe(false);
    });
  });
});
