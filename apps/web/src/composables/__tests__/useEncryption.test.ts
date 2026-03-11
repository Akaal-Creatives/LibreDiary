import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto functions from shared package
const mockCrypto = vi.hoisted(() => ({
  deriveKeyFromPassphrase: vi.fn(),
  deriveKeyFromPassphraseWithSalt: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  generateKey: vi.fn(),
  wrapKey: vi.fn(),
  unwrapKey: vi.fn(),
  generateKeyPair: vi.fn(),
  encryptForRecipient: vi.fn(),
  decryptFromSender: vi.fn(),
  generateRecoveryKey: vi.fn(),
  recoverMasterKey: vi.fn(),
  serialise: vi.fn(),
  deserialise: vi.fn(),
}));

const mockEncryptionService = vi.hoisted(() => ({
  encryptionService: {
    setup: vi.fn(),
    getStatus: vi.fn(),
    getData: vi.fn(),
    updateRecovery: vi.fn(),
    enableWorkspaceEncryption: vi.fn(),
    getWorkspaceKeyShare: vi.fn(),
    shareWorkspaceKey: vi.fn(),
    listWorkspaceKeyShares: vi.fn(),
  },
}));

vi.mock('@librediary/shared/crypto', () => mockCrypto);
vi.mock('../../services/encryption.service', () => mockEncryptionService);

import { useEncryption } from '../useEncryption';

// Helper to encode/decode base64
function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

describe('useEncryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('state', () => {
    it('should start with unlocked=false and no keys', () => {
      const { isUnlocked, isSetUp, masterKey } = useEncryption();

      expect(isUnlocked.value).toBe(false);
      expect(isSetUp.value).toBe(false);
      expect(masterKey.value).toBeNull();
    });
  });

  describe('checkStatus', () => {
    it('should update isSetUp based on server response', async () => {
      mockEncryptionService.encryptionService.getStatus.mockResolvedValue({
        isSetUp: true,
        publicKey: 'pk',
        keySalt: 'salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        hasRecoveryKey: true,
      });

      const { checkStatus, isSetUp } = useEncryption();
      await checkStatus();

      expect(isSetUp.value).toBe(true);
    });

    it('should report not set up when server says so', async () => {
      mockEncryptionService.encryptionService.getStatus.mockResolvedValue({
        isSetUp: false,
      });

      const { checkStatus, isSetUp } = useEncryption();
      await checkStatus();

      expect(isSetUp.value).toBe(false);
    });
  });

  describe('setupEncryption', () => {
    it('should derive keys, generate recovery, and call setup API', async () => {
      const mockMasterKey = new Uint8Array(32).fill(1);
      const mockSalt = new Uint8Array(16).fill(2);
      const mockKeyPair = {
        publicKey: new Uint8Array(32).fill(3),
        privateKey: new Uint8Array(32).fill(4),
      };
      const mockWrappedPrivateKey = new Uint8Array(40).fill(5);
      const mockRecovery = {
        recoveryKey: 'ABCD-EFGH-IJKL',
        encryptedMasterKey: { version: 1, iv: new Uint8Array(12), ciphertext: new Uint8Array(48) },
        salt: new Uint8Array(16).fill(6),
      };

      mockCrypto.deriveKeyFromPassphrase.mockResolvedValue({
        key: mockMasterKey,
        salt: mockSalt,
      });
      mockCrypto.generateKeyPair.mockResolvedValue(mockKeyPair);
      mockCrypto.wrapKey.mockResolvedValue(mockWrappedPrivateKey);
      mockCrypto.generateRecoveryKey.mockResolvedValue(mockRecovery);
      mockEncryptionService.encryptionService.setup.mockResolvedValue({ id: 'enc-123' });

      const { setupEncryption, isUnlocked, isSetUp } = useEncryption();
      const result = await setupEncryption('my-passphrase');

      expect(mockCrypto.deriveKeyFromPassphrase).toHaveBeenCalledWith('my-passphrase');
      expect(mockCrypto.generateKeyPair).toHaveBeenCalled();
      expect(mockCrypto.wrapKey).toHaveBeenCalledWith(mockKeyPair.privateKey, mockMasterKey);
      expect(mockCrypto.generateRecoveryKey).toHaveBeenCalledWith(mockMasterKey);
      expect(mockEncryptionService.encryptionService.setup).toHaveBeenCalled();
      expect(result.recoveryKey).toBe('ABCD-EFGH-IJKL');
      expect(isUnlocked.value).toBe(true);
      expect(isSetUp.value).toBe(true);
    });
  });

  describe('unlock', () => {
    it('should derive master key from passphrase and salt', async () => {
      const mockMasterKey = new Uint8Array(32).fill(1);
      const mockSalt = new Uint8Array(16).fill(2);

      mockEncryptionService.encryptionService.getData.mockResolvedValue({
        publicKey: toBase64(new Uint8Array(32).fill(3)),
        encryptedPrivateKey: toBase64(new Uint8Array(40).fill(5)),
        keySalt: toBase64(mockSalt),
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
      });
      mockCrypto.deriveKeyFromPassphraseWithSalt.mockResolvedValue(mockMasterKey);
      mockCrypto.unwrapKey.mockResolvedValue(new Uint8Array(32).fill(4));

      const { unlock, isUnlocked } = useEncryption();
      await unlock('my-passphrase');

      expect(mockCrypto.deriveKeyFromPassphraseWithSalt).toHaveBeenCalled();
      expect(mockCrypto.unwrapKey).toHaveBeenCalled();
      expect(isUnlocked.value).toBe(true);
    });
  });

  describe('lock', () => {
    it('should clear keys from memory', async () => {
      const mockMasterKey = new Uint8Array(32).fill(1);

      mockEncryptionService.encryptionService.getData.mockResolvedValue({
        publicKey: toBase64(new Uint8Array(32).fill(3)),
        encryptedPrivateKey: toBase64(new Uint8Array(40).fill(5)),
        keySalt: toBase64(new Uint8Array(16).fill(2)),
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
      });
      mockCrypto.deriveKeyFromPassphraseWithSalt.mockResolvedValue(mockMasterKey);
      mockCrypto.unwrapKey.mockResolvedValue(new Uint8Array(32).fill(4));

      const { unlock, lock, isUnlocked, masterKey } = useEncryption();

      await unlock('my-passphrase');
      expect(isUnlocked.value).toBe(true);

      lock();
      expect(isUnlocked.value).toBe(false);
      expect(masterKey.value).toBeNull();
    });
  });

  describe('encryptContent', () => {
    it('should encrypt string content and return base64', async () => {
      const mockKey = new Uint8Array(32).fill(1);
      const mockEncrypted = {
        version: 1,
        iv: new Uint8Array(12).fill(9),
        ciphertext: new Uint8Array(32).fill(10),
      };
      const mockSerialisedBuffer = new Uint8Array(45).fill(11);

      mockCrypto.encrypt.mockResolvedValue(mockEncrypted);
      mockCrypto.serialise.mockReturnValue(mockSerialisedBuffer);

      const { encryptContent } = useEncryption();
      const result = await encryptContent('Hello World', mockKey);

      expect(mockCrypto.encrypt).toHaveBeenCalled();
      expect(mockCrypto.serialise).toHaveBeenCalledWith(mockEncrypted);
      expect(typeof result).toBe('string'); // Base64 string
    });
  });

  describe('decryptContent', () => {
    it('should decrypt base64 content and return string', async () => {
      const mockKey = new Uint8Array(32).fill(1);
      const mockDeserialisedEnvelope = {
        version: 1,
        iv: new Uint8Array(12).fill(9),
        ciphertext: new Uint8Array(32).fill(10),
      };
      const mockPlaintext = new TextEncoder().encode('Hello World');

      // Use valid base64 input
      const validBase64 = toBase64(new Uint8Array(45).fill(11));

      mockCrypto.deserialise.mockReturnValue(mockDeserialisedEnvelope);
      mockCrypto.decrypt.mockResolvedValue(mockPlaintext);

      const { decryptContent } = useEncryption();
      const result = await decryptContent(validBase64, mockKey);

      expect(mockCrypto.deserialise).toHaveBeenCalled();
      expect(mockCrypto.decrypt).toHaveBeenCalledWith(mockDeserialisedEnvelope, mockKey);
      expect(result).toBe('Hello World');
    });
  });

  describe('recoverWithRecoveryKey', () => {
    it('should recover master key and re-wrap with new passphrase', async () => {
      const mockMasterKey = new Uint8Array(32).fill(5);
      const mockNewSalt = new Uint8Array(16).fill(6);
      const mockNewKey = new Uint8Array(32).fill(7);
      const mockKeyPair = {
        publicKey: new Uint8Array(32).fill(8),
        privateKey: new Uint8Array(32).fill(9),
      };
      const mockWrappedPk = new Uint8Array(48).fill(10);
      const mockRecovery = {
        recoveryKey: 'NEW-RECO-VERY-KEY1',
        encryptedMasterKey: { version: 1, iv: new Uint8Array(12), ciphertext: new Uint8Array(32) },
        salt: new Uint8Array(16).fill(11),
      };

      // Server returns existing encryption data
      mockEncryptionService.encryptionService.getData.mockResolvedValue({
        publicKey: toBase64(mockKeyPair.publicKey),
        encryptedPrivateKey: toBase64(mockWrappedPk),
        keySalt: toBase64(mockNewSalt),
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryEncryptedMasterKey: { version: 1, iv: 'aWl2', ciphertext: 'Y3Q=' },
        recoverySalt: toBase64(new Uint8Array(16).fill(12)),
        recoveryKeyHash: toBase64(new Uint8Array(32).fill(13)),
      });

      // Recover master key from recovery key
      mockCrypto.recoverMasterKey.mockResolvedValue(mockMasterKey);

      // Derive new key from new passphrase
      mockCrypto.deriveKeyFromPassphrase.mockResolvedValue({
        key: mockNewKey,
        salt: mockNewSalt,
      });

      // Generate new keypair
      mockCrypto.generateKeyPair.mockResolvedValue(mockKeyPair);

      // Wrap private key with new master key
      mockCrypto.wrapKey.mockResolvedValue(mockWrappedPk);

      // Generate new recovery key
      mockCrypto.generateRecoveryKey.mockResolvedValue(mockRecovery);

      // Setup call succeeds
      mockEncryptionService.encryptionService.setup.mockResolvedValue({});

      const { recoverWithRecoveryKey } = useEncryption();
      const result = await recoverWithRecoveryKey('OLD-RECO-VERY-KEY1', 'newPassphrase123');

      expect(mockEncryptionService.encryptionService.getData).toHaveBeenCalled();
      expect(mockCrypto.recoverMasterKey).toHaveBeenCalled();
      expect(mockCrypto.deriveKeyFromPassphrase).toHaveBeenCalledWith('newPassphrase123');
      expect(mockCrypto.generateKeyPair).toHaveBeenCalled();
      expect(mockCrypto.wrapKey).toHaveBeenCalledWith(mockKeyPair.privateKey, mockNewKey);
      expect(mockCrypto.generateRecoveryKey).toHaveBeenCalledWith(mockNewKey);
      expect(mockEncryptionService.encryptionService.setup).toHaveBeenCalled();
      expect(result.recoveryKey).toBe('NEW-RECO-VERY-KEY1');
    });

    it('should throw if recovery key is invalid', async () => {
      mockEncryptionService.encryptionService.getData.mockResolvedValue({
        publicKey: toBase64(new Uint8Array(32)),
        encryptedPrivateKey: toBase64(new Uint8Array(48)),
        keySalt: toBase64(new Uint8Array(16)),
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryEncryptedMasterKey: { version: 1, iv: 'aWl2', ciphertext: 'Y3Q=' },
        recoverySalt: toBase64(new Uint8Array(16)),
        recoveryKeyHash: toBase64(new Uint8Array(32)),
      });

      mockCrypto.recoverMasterKey.mockRejectedValue(new Error('Decryption failed'));

      const { recoverWithRecoveryKey } = useEncryption();
      await expect(recoverWithRecoveryKey('WRONG-KEY', 'newPass')).rejects.toThrow();
    });
  });
});
