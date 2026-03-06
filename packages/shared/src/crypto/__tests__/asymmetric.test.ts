import { describe, it, expect } from 'vitest';
import { generateKeyPair, encryptForRecipient, decryptFromSender } from '../asymmetric.js';
import { CRYPTO_CONSTANTS } from '../types.js';

describe('Asymmetric Key Exchange (X25519 + XSalsa20-Poly1305)', () => {
  describe('generateKeyPair', () => {
    it('should generate a valid key pair', async () => {
      const kp = await generateKeyPair();

      expect(kp.publicKey).toBeInstanceOf(Uint8Array);
      expect(kp.privateKey).toBeInstanceOf(Uint8Array);
      expect(kp.publicKey.length).toBe(32);
      expect(kp.privateKey.length).toBe(32);
    });

    it('should generate unique key pairs', async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();

      expect(kp1.publicKey).not.toEqual(kp2.publicKey);
      expect(kp1.privateKey).not.toEqual(kp2.privateKey);
    });
  });

  describe('encryptForRecipient / decryptFromSender', () => {
    it('should encrypt and decrypt a workspace key for a recipient', async () => {
      const sender = await generateKeyPair();
      const recipient = await generateKeyPair();
      const workspaceKey = new Uint8Array(CRYPTO_CONSTANTS.KEY_LENGTH);
      crypto.getRandomValues(workspaceKey);

      const encrypted = await encryptForRecipient(
        workspaceKey,
        sender.privateKey,
        recipient.publicKey
      );

      const decrypted = await decryptFromSender(encrypted, recipient.privateKey, sender.publicKey);

      expect(decrypted).toEqual(workspaceKey);
    });

    it('should produce a nonce with each encryption', async () => {
      const sender = await generateKeyPair();
      const recipient = await generateKeyPair();
      const data = new Uint8Array(32);
      crypto.getRandomValues(data);

      const enc1 = await encryptForRecipient(data, sender.privateKey, recipient.publicKey);
      const enc2 = await encryptForRecipient(data, sender.privateKey, recipient.publicKey);

      expect(enc1.nonce).not.toEqual(enc2.nonce);
    });

    it('should fail to decrypt with wrong recipient private key', async () => {
      const sender = await generateKeyPair();
      const recipient = await generateKeyPair();
      const wrongRecipient = await generateKeyPair();
      const data = new Uint8Array(32);
      crypto.getRandomValues(data);

      const encrypted = await encryptForRecipient(data, sender.privateKey, recipient.publicKey);

      expect(() =>
        decryptFromSender(encrypted, wrongRecipient.privateKey, sender.publicKey)
      ).toThrow();
    });

    it('should fail to decrypt with wrong sender public key', async () => {
      const sender = await generateKeyPair();
      const recipient = await generateKeyPair();
      const wrongSender = await generateKeyPair();
      const data = new Uint8Array(32);
      crypto.getRandomValues(data);

      const encrypted = await encryptForRecipient(data, sender.privateKey, recipient.publicKey);

      expect(() =>
        decryptFromSender(encrypted, recipient.privateKey, wrongSender.publicKey)
      ).toThrow();
    });

    it('should fail to decrypt tampered ciphertext', async () => {
      const sender = await generateKeyPair();
      const recipient = await generateKeyPair();
      const data = new Uint8Array(32);
      crypto.getRandomValues(data);

      const encrypted = await encryptForRecipient(data, sender.privateKey, recipient.publicKey);

      const tampered = {
        ...encrypted,
        encryptedKey: new Uint8Array(encrypted.encryptedKey),
      };
      tampered.encryptedKey[0] ^= 0xff;

      expect(() => decryptFromSender(tampered, recipient.privateKey, sender.publicKey)).toThrow();
    });
  });
});
