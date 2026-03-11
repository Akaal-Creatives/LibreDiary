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

  const mockPage = {
    count: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockDatabase = {
    findMany: vi.fn(),
  };

  const mockDatabaseRow = {
    count: vi.fn(),
  };

  const mockEncryptionChangeRequest = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockPrisma = {
    userEncryption: mockUserEncryption,
    workspaceKeyShare: mockWorkspaceKeyShare,
    organization: mockOrganization,
    organizationMember: mockOrganizationMember,
    page: mockPage,
    database: mockDatabase,
    databaseRow: mockDatabaseRow,
    encryptionChangeRequest: mockEncryptionChangeRequest,
    $transaction: vi.fn((callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma)
    ),
  };

  function resetMocks() {
    Object.values(mockUserEncryption).forEach((mock) => mock.mockReset());
    Object.values(mockWorkspaceKeyShare).forEach((mock) => mock.mockReset());
    Object.values(mockOrganization).forEach((mock) => mock.mockReset());
    Object.values(mockOrganizationMember).forEach((mock) => mock.mockReset());
    Object.values(mockPage).forEach((mock) => mock.mockReset());
    Object.values(mockDatabase).forEach((mock) => mock.mockReset());
    Object.values(mockDatabaseRow).forEach((mock) => mock.mockReset());
    Object.values(mockEncryptionChangeRequest).forEach((mock) => mock.mockReset());
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

  // =============================================
  // hasWorkspaceData
  // =============================================
  describe('hasWorkspaceData', () => {
    it('should return true when pages with content exist', async () => {
      mockPrisma.page.count.mockResolvedValue(3);

      const result = await encryptionService.hasWorkspaceData('org-123');

      expect(result).toBe(true);
      expect(mockPrisma.page.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          OR: [{ htmlContent: { not: null } }, { yjsState: { not: null } }],
        },
      });
    });

    it('should return true when databases with rows exist', async () => {
      mockPrisma.page.count.mockResolvedValue(0);
      mockPrisma.database.findMany.mockResolvedValue([{ id: 'db-1' }]);
      mockPrisma.databaseRow.count.mockResolvedValue(5);

      const result = await encryptionService.hasWorkspaceData('org-123');

      expect(result).toBe(true);
    });

    it('should return false when no pages with content and no database rows', async () => {
      mockPrisma.page.count.mockResolvedValue(0);
      mockPrisma.database.findMany.mockResolvedValue([]);

      const result = await encryptionService.hasWorkspaceData('org-123');

      expect(result).toBe(false);
    });
  });

  // =============================================
  // createEncryptionChangeRequest
  // =============================================
  describe('createEncryptionChangeRequest', () => {
    it('should create a pending verification request and cancel existing ones', async () => {
      mockPrisma.encryptionChangeRequest.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.encryptionChangeRequest.create.mockResolvedValue({
        id: 'req-123',
        organizationId: 'org-123',
        requestedById: 'user-123',
        type: 'ENABLE',
        status: 'PENDING_VERIFICATION',
        verificationCodeHash: 'hashed-code',
        verificationExpiresAt: new Date('2026-03-11T10:10:00Z'),
      });

      const result = await encryptionService.createEncryptionChangeRequest({
        organizationId: 'org-123',
        requestedById: 'user-123',
        type: 'ENABLE',
        verificationCodeHash: 'hashed-code',
        verificationExpiresAt: new Date('2026-03-11T10:10:00Z'),
      });

      expect(result.id).toBe('req-123');
      expect(result.type).toBe('ENABLE');
      expect(result.status).toBe('PENDING_VERIFICATION');
      // Should cancel any existing pending requests for same org+type
      expect(mockPrisma.encryptionChangeRequest.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          type: 'ENABLE',
          status: { in: ['PENDING_VERIFICATION', 'VERIFIED'] },
        },
        data: { status: 'CANCELLED' },
      });
    });
  });

  // =============================================
  // verifyEncryptionChangeRequest
  // =============================================
  describe('verifyEncryptionChangeRequest', () => {
    it('should verify a pending request with valid code', async () => {
      const futureDate = new Date(Date.now() + 60_000);
      mockPrisma.encryptionChangeRequest.findFirst.mockResolvedValue({
        id: 'req-123',
        organizationId: 'org-123',
        type: 'ENABLE',
        status: 'PENDING_VERIFICATION',
        verificationCodeHash: 'expected-hash',
        verificationExpiresAt: futureDate,
      });
      mockPrisma.encryptionChangeRequest.update.mockResolvedValue({
        id: 'req-123',
        status: 'VERIFIED',
      });

      const result = await encryptionService.verifyEncryptionChangeRequest({
        organizationId: 'org-123',
        type: 'ENABLE',
        codeHash: 'expected-hash',
      });

      expect(result.status).toBe('VERIFIED');
      expect(mockPrisma.encryptionChangeRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: { status: 'VERIFIED' },
      });
    });

    it('should throw if no pending request found', async () => {
      mockPrisma.encryptionChangeRequest.findFirst.mockResolvedValue(null);

      await expect(
        encryptionService.verifyEncryptionChangeRequest({
          organizationId: 'org-123',
          type: 'ENABLE',
          codeHash: 'some-hash',
        })
      ).rejects.toThrow('No pending verification request found');
    });

    it('should throw if verification code is expired', async () => {
      const pastDate = new Date(Date.now() - 60_000);
      mockPrisma.encryptionChangeRequest.findFirst.mockResolvedValue({
        id: 'req-123',
        organizationId: 'org-123',
        type: 'ENABLE',
        status: 'PENDING_VERIFICATION',
        verificationCodeHash: 'expected-hash',
        verificationExpiresAt: pastDate,
      });

      await expect(
        encryptionService.verifyEncryptionChangeRequest({
          organizationId: 'org-123',
          type: 'ENABLE',
          codeHash: 'expected-hash',
        })
      ).rejects.toThrow('Verification code has expired');
    });

    it('should throw if verification code does not match', async () => {
      const futureDate = new Date(Date.now() + 60_000);
      mockPrisma.encryptionChangeRequest.findFirst.mockResolvedValue({
        id: 'req-123',
        organizationId: 'org-123',
        type: 'ENABLE',
        status: 'PENDING_VERIFICATION',
        verificationCodeHash: 'expected-hash',
        verificationExpiresAt: futureDate,
      });

      await expect(
        encryptionService.verifyEncryptionChangeRequest({
          organizationId: 'org-123',
          type: 'ENABLE',
          codeHash: 'wrong-hash',
        })
      ).rejects.toThrow('Invalid verification code');
    });
  });

  // =============================================
  // disableWorkspaceEncryption
  // =============================================
  describe('disableWorkspaceEncryption', () => {
    it('should disable encryption and set grace period', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });
      mockPrisma.encryptionChangeRequest.findFirst.mockResolvedValue({
        id: 'req-123',
        type: 'DISABLE',
        status: 'VERIFIED',
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
        encryptionDisabledAt: new Date(),
      });
      mockPrisma.encryptionChangeRequest.update.mockResolvedValue({
        id: 'req-123',
        status: 'COMPLETED',
      });

      const result = await encryptionService.disableWorkspaceEncryption({
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(result.isEncrypted).toBe(false);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-123' },
          data: expect.objectContaining({
            isEncrypted: false,
          }),
        })
      );
    });

    it('should throw if workspace is not encrypted', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });

      await expect(
        encryptionService.disableWorkspaceEncryption({
          organizationId: 'org-123',
          userId: 'user-123',
        })
      ).rejects.toThrow('Workspace is not encrypted');
    });

    it('should throw if user is not an owner or admin', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'MEMBER',
      });

      await expect(
        encryptionService.disableWorkspaceEncryption({
          organizationId: 'org-123',
          userId: 'user-123',
        })
      ).rejects.toThrow('Only owners and admins can disable encryption');
    });

    it('should throw if no verified disable request exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });
      mockPrisma.encryptionChangeRequest.findFirst.mockResolvedValue(null);

      await expect(
        encryptionService.disableWorkspaceEncryption({
          organizationId: 'org-123',
          userId: 'user-123',
        })
      ).rejects.toThrow('Verified disable request required');
    });
  });

  // =============================================
  // cancelDisableEncryption
  // =============================================
  describe('cancelDisableEncryption', () => {
    it('should re-enable encryption and clear grace period', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
        encryptionDisabledAt: new Date(),
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
        encryptionDisabledAt: null,
      });

      const result = await encryptionService.cancelDisableEncryption({
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(result.isEncrypted).toBe(true);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          isEncrypted: true,
          encryptionDisabledAt: null,
        },
      });
    });

    it('should throw if workspace is not in grace period', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
        encryptionDisabledAt: null,
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'OWNER',
      });

      await expect(
        encryptionService.cancelDisableEncryption({
          organizationId: 'org-123',
          userId: 'user-123',
        })
      ).rejects.toThrow('Workspace is not in encryption grace period');
    });
  });

  // =============================================
  // purgeEncryptedData
  // =============================================
  describe('purgeEncryptedData', () => {
    it('should delete key shares and null out encrypted page content', async () => {
      mockPrisma.workspaceKeyShare.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.page.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        encryptionDisabledAt: null,
      });

      await encryptionService.purgeEncryptedData('org-123');

      expect(mockPrisma.workspaceKeyShare.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
      });
      expect(mockPrisma.page.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        data: { htmlContent: null, plainContent: null, yjsState: null },
      });
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: { encryptionDisabledAt: null },
      });
    });
  });
});
