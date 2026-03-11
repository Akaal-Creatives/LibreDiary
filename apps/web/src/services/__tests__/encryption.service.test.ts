import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { encryptionService } from '../encryption.service';

describe('Encryption Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // Setup
  // =============================================

  describe('setup', () => {
    it('should POST encryption setup data', async () => {
      const setupData = {
        publicKey: 'base64-pk',
        encryptedPrivateKey: 'base64-epk',
        keySalt: 'base64-salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryEncryptedMasterKey: { version: 1, iv: 'iv', ciphertext: 'ct' },
        recoverySalt: 'base64-rsalt',
        recoveryKeyHash: 'base64-hash',
      };
      mockApi.post.mockResolvedValue({ id: 'enc-123' });

      await encryptionService.setup(setupData);

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/setup', setupData);
    });
  });

  // =============================================
  // Status
  // =============================================

  describe('getStatus', () => {
    it('should GET encryption status', async () => {
      mockApi.get.mockResolvedValue({ isSetUp: true, publicKey: 'pk' });

      const result = await encryptionService.getStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/encryption/status');
      expect(result.isSetUp).toBe(true);
    });
  });

  // =============================================
  // Data
  // =============================================

  describe('getData', () => {
    it('should GET full encryption data', async () => {
      mockApi.get.mockResolvedValue({
        publicKey: 'pk',
        encryptedPrivateKey: 'epk',
        keySalt: 'salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
      });

      const result = await encryptionService.getData();

      expect(mockApi.get).toHaveBeenCalledWith('/encryption/data');
      expect(result.encryptedPrivateKey).toBe('epk');
    });
  });

  // =============================================
  // Recovery
  // =============================================

  describe('updateRecovery', () => {
    it('should POST updated recovery key data', async () => {
      const recoveryData = {
        recoveryEncryptedMasterKey: { version: 1, iv: 'iv', ciphertext: 'ct' },
        recoverySalt: 'salt',
        recoveryKeyHash: 'hash',
      };
      mockApi.post.mockResolvedValue({ success: true });

      await encryptionService.updateRecovery(recoveryData);

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/recovery', recoveryData);
    });
  });

  // =============================================
  // Workspace Encryption
  // =============================================

  describe('enableWorkspaceEncryption', () => {
    it('should POST to enable workspace encryption', async () => {
      const data = {
        encryptedKey: 'base64-key',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-pk',
      };
      mockApi.post.mockResolvedValue({ isEncrypted: true });

      await encryptionService.enableWorkspaceEncryption('org-123', data);

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/enable', data);
    });
  });

  describe('getWorkspaceKeyShare', () => {
    it('should GET workspace key share', async () => {
      mockApi.get.mockResolvedValue({
        encryptedKey: 'base64-key',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-pk',
      });

      const result = await encryptionService.getWorkspaceKeyShare('org-123');

      expect(mockApi.get).toHaveBeenCalledWith('/encryption/workspace/org-123/key-share');
      expect(result.encryptedKey).toBe('base64-key');
    });
  });

  describe('shareWorkspaceKey', () => {
    it('should POST workspace key share for collaborator', async () => {
      const data = {
        targetUserId: 'user-456',
        encryptedKey: 'base64-key',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-pk',
      };
      mockApi.post.mockResolvedValue({ id: 'share-123' });

      await encryptionService.shareWorkspaceKey('org-123', data);

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/key-shares', data);
    });
  });

  describe('listWorkspaceKeyShares', () => {
    it('should GET all workspace key shares', async () => {
      mockApi.get.mockResolvedValue([
        { id: 'share-1', userId: 'user-1' },
        { id: 'share-2', userId: 'user-2' },
      ]);

      const result = await encryptionService.listWorkspaceKeyShares('org-123');

      expect(mockApi.get).toHaveBeenCalledWith('/encryption/workspace/org-123/key-shares');
      expect(result).toHaveLength(2);
    });
  });

  // =============================================
  // Enable/Disable Encryption Flow
  // =============================================

  describe('requestEnableEncryption', () => {
    it('should POST request to enable encryption with workspace name', async () => {
      mockApi.post.mockResolvedValue({ requiresVerification: true });

      const result = await encryptionService.requestEnableEncryption('org-123', 'My Workspace');

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/request-enable', {
        workspaceName: 'My Workspace',
      });
      expect(result.requiresVerification).toBe(true);
    });
  });

  describe('verifyEnableEncryption', () => {
    it('should POST verification code for enable encryption', async () => {
      mockApi.post.mockResolvedValue({ success: true });

      await encryptionService.verifyEnableEncryption('org-123', '123456');

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/verify-enable', {
        code: '123456',
      });
    });
  });

  describe('requestDisableEncryption', () => {
    it('should POST request to disable encryption with workspace name', async () => {
      mockApi.post.mockResolvedValue({ requiresVerification: true });

      const result = await encryptionService.requestDisableEncryption('org-123', 'My Workspace');

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/request-disable', {
        workspaceName: 'My Workspace',
      });
      expect(result.requiresVerification).toBe(true);
    });
  });

  describe('verifyDisableEncryption', () => {
    it('should POST verification code for disable encryption', async () => {
      mockApi.post.mockResolvedValue({ success: true });

      await encryptionService.verifyDisableEncryption('org-123', '654321');

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/verify-disable', {
        code: '654321',
      });
    });
  });

  describe('disableWorkspaceEncryption', () => {
    it('should POST to disable workspace encryption', async () => {
      mockApi.post.mockResolvedValue({ success: true });

      await encryptionService.disableWorkspaceEncryption('org-123');

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/disable');
    });
  });

  describe('cancelDisableEncryption', () => {
    it('should POST to cancel disable and re-enable encryption', async () => {
      mockApi.post.mockResolvedValue({ success: true });

      await encryptionService.cancelDisableEncryption('org-123');

      expect(mockApi.post).toHaveBeenCalledWith('/encryption/workspace/org-123/cancel-disable');
    });
  });
});
