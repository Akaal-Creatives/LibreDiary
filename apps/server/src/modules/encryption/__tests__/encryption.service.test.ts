import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockUserEncryption = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockWorkspaceKeyShare = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockOrganization = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  const mockOrganizationMember = {
    findUnique: vi.fn(),
  };

  const mockPrisma = {
    userEncryption: mockUserEncryption,
    workspaceKeyShare: mockWorkspaceKeyShare,
    organization: mockOrganization,
    organizationMember: mockOrganizationMember,
    $transaction: vi.fn((callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma)
    ),
  };

  function resetMocks() {
    Object.values(mockUserEncryption).forEach((mock) => mock.mockReset());
    Object.values(mockWorkspaceKeyShare).forEach((mock) => mock.mockReset());
    Object.values(mockOrganization).forEach((mock) => mock.mockReset());
    Object.values(mockOrganizationMember).forEach((mock) => mock.mockReset());
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma)
    );
  }

  return { mockPrisma, resetMocks };
});

// Mock prisma module BEFORE importing service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service AFTER mocking
import * as encryptionService from '../encryption.service.js';

describe('Encryption Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // =============================================
  // setupEncryption
  // =============================================
  describe('setupEncryption', () => {
    const validSetupData = {
      userId: 'user-123',
      publicKey: 'base64-public-key',
      encryptedPrivateKey: 'base64-encrypted-private-key',
      keySalt: 'base64-salt',
      keyParams: { memoryLimit: 65536, opsLimit: 3 },
      recoveryEncryptedMasterKey: { version: 1, iv: 'abc', ciphertext: 'def' },
      recoverySalt: 'base64-recovery-salt',
      recoveryKeyHash: 'base64-hash',
    };

    it('should create encryption record for a user', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue(null);
      mockPrisma.userEncryption.create.mockResolvedValue({
        id: 'enc-123',
        ...validSetupData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await encryptionService.setupEncryption(validSetupData);

      expect(mockPrisma.userEncryption.create).toHaveBeenCalledWith({
        data: {
          userId: validSetupData.userId,
          publicKey: validSetupData.publicKey,
          encryptedPrivateKey: validSetupData.encryptedPrivateKey,
          keySalt: validSetupData.keySalt,
          keyParams: validSetupData.keyParams,
          recoveryEncryptedMasterKey: validSetupData.recoveryEncryptedMasterKey,
          recoverySalt: validSetupData.recoverySalt,
          recoveryKeyHash: validSetupData.recoveryKeyHash,
        },
      });
      expect(result.id).toBe('enc-123');
    });

    it('should throw if encryption is already set up', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue({
        id: 'enc-existing',
        userId: 'user-123',
      });

      await expect(encryptionService.setupEncryption(validSetupData)).rejects.toThrow(
        'Encryption is already set up for this user'
      );
    });
  });

  // =============================================
  // getEncryptionStatus
  // =============================================
  describe('getEncryptionStatus', () => {
    it('should return not set up when no record exists', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue(null);

      const result = await encryptionService.getEncryptionStatus('user-123');

      expect(result).toEqual({
        isSetUp: false,
      });
    });

    it('should return set up with public key when record exists', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue({
        id: 'enc-123',
        userId: 'user-123',
        publicKey: 'base64-public-key',
        keySalt: 'base64-salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryKeyHash: 'base64-hash',
        createdAt: new Date('2024-01-01'),
      });

      const result = await encryptionService.getEncryptionStatus('user-123');

      expect(result).toEqual({
        isSetUp: true,
        publicKey: 'base64-public-key',
        keySalt: 'base64-salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        hasRecoveryKey: true,
        createdAt: new Date('2024-01-01'),
      });
    });

    it('should indicate no recovery key when recoveryKeyHash is null', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue({
        id: 'enc-123',
        userId: 'user-123',
        publicKey: 'base64-public-key',
        keySalt: 'base64-salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryKeyHash: null,
        createdAt: new Date('2024-01-01'),
      });

      const result = await encryptionService.getEncryptionStatus('user-123');

      expect(result.hasRecoveryKey).toBe(false);
    });
  });

  // =============================================
  // getEncryptionData
  // =============================================
  describe('getEncryptionData', () => {
    it('should return full encryption data for key derivation', async () => {
      const mockData = {
        id: 'enc-123',
        userId: 'user-123',
        publicKey: 'base64-public-key',
        encryptedPrivateKey: 'base64-encrypted-private-key',
        keySalt: 'base64-salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryEncryptedMasterKey: { version: 1, iv: 'abc', ciphertext: 'def' },
        recoverySalt: 'base64-recovery-salt',
        recoveryKeyHash: 'base64-hash',
      };
      mockPrisma.userEncryption.findUnique.mockResolvedValue(mockData);

      const result = await encryptionService.getEncryptionData('user-123');

      expect(result).toEqual(mockData);
    });

    it('should return null when no encryption record exists', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue(null);

      const result = await encryptionService.getEncryptionData('user-123');

      expect(result).toBeNull();
    });
  });

  // =============================================
  // updateRecoveryKey
  // =============================================
  describe('updateRecoveryKey', () => {
    it('should update recovery key data', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue({
        id: 'enc-123',
        userId: 'user-123',
      });
      mockPrisma.userEncryption.update.mockResolvedValue({
        id: 'enc-123',
        recoveryEncryptedMasterKey: { version: 1, iv: 'new-iv', ciphertext: 'new-ct' },
        recoverySalt: 'new-salt',
        recoveryKeyHash: 'new-hash',
      });

      const result = await encryptionService.updateRecoveryKey('user-123', {
        recoveryEncryptedMasterKey: { version: 1, iv: 'new-iv', ciphertext: 'new-ct' },
        recoverySalt: 'new-salt',
        recoveryKeyHash: 'new-hash',
      });

      expect(mockPrisma.userEncryption.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          recoveryEncryptedMasterKey: { version: 1, iv: 'new-iv', ciphertext: 'new-ct' },
          recoverySalt: 'new-salt',
          recoveryKeyHash: 'new-hash',
        },
      });
      expect(result.recoveryKeyHash).toBe('new-hash');
    });

    it('should throw if encryption is not set up', async () => {
      mockPrisma.userEncryption.findUnique.mockResolvedValue(null);

      await expect(
        encryptionService.updateRecoveryKey('user-123', {
          recoveryEncryptedMasterKey: {},
          recoverySalt: 'salt',
          recoveryKeyHash: 'hash',
        })
      ).rejects.toThrow('Encryption is not set up for this user');
    });
  });

  // =============================================
  // enableWorkspaceEncryption
  // =============================================
  describe('enableWorkspaceEncryption', () => {
    it('should enable encryption on an organisation and store key share', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.workspaceKeyShare.upsert.mockResolvedValue({
        id: 'share-123',
        organizationId: 'org-123',
        userId: 'user-123',
      });

      const result = await encryptionService.enableWorkspaceEncryption({
        organizationId: 'org-123',
        userId: 'user-123',
        encryptedKey: 'base64-encrypted-workspace-key',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-public-key',
      });

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: { isEncrypted: true },
      });
      expect(mockPrisma.workspaceKeyShare.upsert).toHaveBeenCalled();
      expect(result.isEncrypted).toBe(true);
    });

    it('should throw if organisation not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        encryptionService.enableWorkspaceEncryption({
          organizationId: 'org-missing',
          userId: 'user-123',
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        })
      ).rejects.toThrow('Organisation not found');
    });

    it('should throw if user is not an owner or admin', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'MEMBER',
      });

      await expect(
        encryptionService.enableWorkspaceEncryption({
          organizationId: 'org-123',
          userId: 'user-123',
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        })
      ).rejects.toThrow('Only owners and admins can enable encryption');
    });

    it('should throw if workspace is already encrypted', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });

      await expect(
        encryptionService.enableWorkspaceEncryption({
          organizationId: 'org-123',
          userId: 'user-123',
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        })
      ).rejects.toThrow('Workspace is already encrypted');
    });
  });

  // =============================================
  // shareWorkspaceKey
  // =============================================
  describe('shareWorkspaceKey', () => {
    it('should create a key share for a collaborator', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'MEMBER',
      });
      mockPrisma.workspaceKeyShare.upsert.mockResolvedValue({
        id: 'share-456',
        organizationId: 'org-123',
        userId: 'collab-456',
        encryptedKey: 'base64-key-for-collab',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-sharer-pk',
      });

      const result = await encryptionService.shareWorkspaceKey({
        organizationId: 'org-123',
        targetUserId: 'collab-456',
        encryptedKey: 'base64-key-for-collab',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-sharer-pk',
      });

      expect(mockPrisma.workspaceKeyShare.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: 'org-123',
            userId: 'collab-456',
          },
        },
        create: {
          organizationId: 'org-123',
          userId: 'collab-456',
          encryptedKey: 'base64-key-for-collab',
          nonce: 'base64-nonce',
          sharedByPublicKey: 'base64-sharer-pk',
        },
        update: {
          encryptedKey: 'base64-key-for-collab',
          nonce: 'base64-nonce',
          sharedByPublicKey: 'base64-sharer-pk',
        },
      });
      expect(result.id).toBe('share-456');
    });

    it('should throw if workspace is not encrypted', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
      });

      await expect(
        encryptionService.shareWorkspaceKey({
          organizationId: 'org-123',
          targetUserId: 'collab-456',
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        })
      ).rejects.toThrow('Workspace is not encrypted');
    });

    it('should throw if target user is not a member', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        encryptionService.shareWorkspaceKey({
          organizationId: 'org-123',
          targetUserId: 'non-member',
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        })
      ).rejects.toThrow('Target user is not a member of this organisation');
    });
  });

  // =============================================
  // getWorkspaceKeyShare
  // =============================================
  describe('getWorkspaceKeyShare', () => {
    it('should return key share for a user', async () => {
      const mockShare = {
        id: 'share-123',
        organizationId: 'org-123',
        userId: 'user-123',
        encryptedKey: 'base64-key',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-pk',
      };
      mockPrisma.workspaceKeyShare.findUnique.mockResolvedValue(mockShare);

      const result = await encryptionService.getWorkspaceKeyShare('org-123', 'user-123');

      expect(result).toEqual(mockShare);
      expect(mockPrisma.workspaceKeyShare.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: 'org-123',
            userId: 'user-123',
          },
        },
      });
    });

    it('should return null when no key share exists', async () => {
      mockPrisma.workspaceKeyShare.findUnique.mockResolvedValue(null);

      const result = await encryptionService.getWorkspaceKeyShare('org-123', 'user-123');

      expect(result).toBeNull();
    });
  });

  // =============================================
  // listWorkspaceKeyShares
  // =============================================
  describe('listWorkspaceKeyShares', () => {
    it('should return all key shares for a workspace', async () => {
      const mockShares = [
        { id: 'share-1', userId: 'user-1', encryptedKey: 'key1' },
        { id: 'share-2', userId: 'user-2', encryptedKey: 'key2' },
      ];
      mockPrisma.workspaceKeyShare.findMany.mockResolvedValue(mockShares);

      const result = await encryptionService.listWorkspaceKeyShares('org-123');

      expect(result).toEqual(mockShares);
      expect(mockPrisma.workspaceKeyShare.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
      });
    });
  });
});
