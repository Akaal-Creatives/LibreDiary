import { describe, it, expect } from 'vitest';
import { encryptBuffer, decryptBuffer } from '../encrypt.js';

describe('Encryption Utilities', () => {
  describe('encryptBuffer + decryptBuffer round-trip', () => {
    it('should encrypt and decrypt data correctly', () => {
      const data = Buffer.from('Secret backup data');
      const password = 'my-secure-password-123';

      const encrypted = encryptBuffer(data, password);
      const decrypted = decryptBuffer(encrypted, password);

      expect(decrypted).toEqual(data);
    });

    it('should produce different ciphertext each time (random salt/IV)', () => {
      const data = Buffer.from('Same data');
      const password = 'same-password';

      const encrypted1 = encryptBuffer(data, password);
      const encrypted2 = encryptBuffer(data, password);

      // The encrypted outputs should differ due to random salt and IV
      expect(encrypted1.equals(encrypted2)).toBe(false);

      // But both should decrypt to the same plaintext
      expect(decryptBuffer(encrypted1, password)).toEqual(data);
      expect(decryptBuffer(encrypted2, password)).toEqual(data);
    });

    it('should handle binary data', () => {
      const data = Buffer.alloc(2048);
      for (let i = 0; i < 2048; i++) {
        data[i] = i % 256;
      }
      const password = 'binary-password';

      const encrypted = encryptBuffer(data, password);
      const decrypted = decryptBuffer(encrypted, password);

      expect(decrypted).toEqual(data);
    });

    it('should handle empty data', () => {
      const data = Buffer.alloc(0);
      const password = 'empty-data-password';

      const encrypted = encryptBuffer(data, password);
      const decrypted = decryptBuffer(encrypted, password);

      expect(decrypted).toEqual(data);
    });
  });

  describe('decryptBuffer error handling', () => {
    it('should throw with wrong password', () => {
      const data = Buffer.from('Secret data');
      const encrypted = encryptBuffer(data, 'correct-password');

      expect(() => decryptBuffer(encrypted, 'wrong-password')).toThrow(
        'Decryption failed: wrong password or corrupted data'
      );
    });

    it('should throw with invalid header', () => {
      const badData = Buffer.from('not-a-valid-encrypted-file');

      expect(() => decryptBuffer(badData, 'any-password')).toThrow(
        'Invalid backup file: missing encryption header'
      );
    });
  });

  describe('header format', () => {
    it('should start with LDBE magic bytes', () => {
      const data = Buffer.from('test');
      const encrypted = encryptBuffer(data, 'password');

      expect(encrypted.subarray(0, 4).toString()).toBe('LDBE');
    });

    it('should have version 1 after magic bytes', () => {
      const data = Buffer.from('test');
      const encrypted = encryptBuffer(data, 'password');

      expect(encrypted.readUInt8(4)).toBe(1);
    });

    it('should have correct total overhead size', () => {
      const data = Buffer.from('test');
      const encrypted = encryptBuffer(data, 'password');

      // Header: 4 (magic) + 1 (version) + 32 (salt) + 12 (IV) + 16 (auth tag) = 65 bytes overhead
      const overhead = 4 + 1 + 32 + 12 + 16;
      expect(encrypted.length).toBe(data.length + overhead);
    });
  });
});
