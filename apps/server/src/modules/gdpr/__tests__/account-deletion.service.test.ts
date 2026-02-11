import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockFs, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    dataExport: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    account: {
      deleteMany: vi.fn(),
    },
    favorite: {
      deleteMany: vi.fn(),
    },
    mention: {
      deleteMany: vi.fn(),
    },
    notification: {
      deleteMany: vi.fn(),
    },
    apiToken: {
      deleteMany: vi.fn(),
    },
    pagePermission: {
      deleteMany: vi.fn(),
    },
    page: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockFs = {
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
  };

  function resetMocks() {
    for (const model of Object.values(mockPrisma)) {
      if (typeof model === 'function') {
        (model as ReturnType<typeof vi.fn>).mockReset();
      } else {
        for (const method of Object.values(model)) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
    for (const method of Object.values(mockFs)) {
      (method as ReturnType<typeof vi.fn>).mockReset();
    }
  }

  return { mockPrisma, mockFs, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('node:fs', () => ({
  ...mockFs,
  default: mockFs,
}));

import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  processScheduledDeletions,
  permanentlyDeleteUser,
} from '../account-deletion.service.js';

describe('Account Deletion Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // requestAccountDeletion
  // ===========================================

  describe('requestAccountDeletion', () => {
    it('should set deletedAt and deletionRequestedAt on the user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        deletedAt: null,
      });
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await requestAccountDeletion('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          deletedAt: expect.any(Date),
          deletionRequestedAt: expect.any(Date),
        },
      });
      expect(result.deletionDate).toBeInstanceOf(Date);
    });

    it('should return a deletionDate 30 days in the future', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
      });
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await requestAccountDeletion('user-1');

      const expectedDate = new Date(now + 30 * 24 * 60 * 60 * 1000);
      expect(result.deletionDate.getTime()).toBe(expectedDate.getTime());

      vi.restoreAllMocks();
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(requestAccountDeletion('nonexistent')).rejects.toThrow('USER_NOT_FOUND');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw ACCOUNT_ALREADY_DELETED when user has deletedAt set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: new Date('2025-01-01'),
      });

      await expect(requestAccountDeletion('user-1')).rejects.toThrow('ACCOUNT_ALREADY_DELETED');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw SOLE_OWNER with org names when user is sole owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
      });
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          role: 'OWNER',
          organization: {
            name: 'Org Alpha',
            members: [{ userId: 'user-1', role: 'OWNER' }],
          },
        },
      ]);

      await expect(requestAccountDeletion('user-1')).rejects.toThrow('SOLE_OWNER:Org Alpha');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw SOLE_OWNER with multiple org names comma-separated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
      });
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          role: 'OWNER',
          organization: {
            name: 'Org Alpha',
            members: [{ userId: 'user-1', role: 'OWNER' }],
          },
        },
        {
          userId: 'user-1',
          role: 'OWNER',
          organization: {
            name: 'Org Beta',
            members: [{ userId: 'user-1', role: 'OWNER' }],
          },
        },
      ]);

      await expect(requestAccountDeletion('user-1')).rejects.toThrow(
        'SOLE_OWNER:Org Alpha,Org Beta'
      );
    });

    it('should allow deletion when user is owner but not the sole owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
      });
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          role: 'OWNER',
          organization: {
            name: 'Org Alpha',
            members: [
              { userId: 'user-1', role: 'OWNER' },
              { userId: 'user-2', role: 'OWNER' },
            ],
          },
        },
      ]);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await requestAccountDeletion('user-1');

      expect(result.deletionDate).toBeInstanceOf(Date);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should allow deletion when user is a member but not an owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
      });
      // findMany with role: 'OWNER' returns empty because user is not an owner
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await requestAccountDeletion('user-1');

      expect(result.deletionDate).toBeInstanceOf(Date);
    });
  });

  // ===========================================
  // cancelAccountDeletion
  // ===========================================

  describe('cancelAccountDeletion', () => {
    it('should clear deletedAt and deletionRequestedAt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: new Date('2025-01-01'),
        deletionRequestedAt: new Date('2025-01-01'),
      });
      mockPrisma.user.update.mockResolvedValue({});

      await cancelAccountDeletion('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          deletedAt: null,
          deletionRequestedAt: null,
        },
      });
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(cancelAccountDeletion('nonexistent')).rejects.toThrow('USER_NOT_FOUND');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NO_PENDING_DELETION when deletedAt is null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        deletionRequestedAt: null,
      });

      await expect(cancelAccountDeletion('user-1')).rejects.toThrow('NO_PENDING_DELETION');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NO_PENDING_DELETION when deletionRequestedAt is null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: new Date('2025-01-01'),
        deletionRequestedAt: null,
      });

      await expect(cancelAccountDeletion('user-1')).rejects.toThrow('NO_PENDING_DELETION');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // getDeletionStatus
  // ===========================================

  describe('getDeletionStatus', () => {
    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getDeletionStatus('nonexistent');

      expect(result).toBeNull();
    });

    it('should return pending: false when no deletion is requested', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        deletedAt: null,
        deletionRequestedAt: null,
      });

      const result = await getDeletionStatus('user-1');

      expect(result).toEqual({ pending: false });
    });

    it('should return pending: true with dates and daysRemaining', async () => {
      const requestedAt = new Date('2025-01-01');
      mockPrisma.user.findUnique.mockResolvedValue({
        deletedAt: requestedAt,
        deletionRequestedAt: requestedAt,
      });

      const result = await getDeletionStatus('user-1');

      expect(result!.pending).toBe(true);
      expect(result!.requestedAt).toEqual(requestedAt);
      expect(result!.scheduledDeletionDate).toBeInstanceOf(Date);
      expect(typeof result!.daysRemaining).toBe('number');
    });

    it('should calculate scheduledDeletionDate as 30 days after requestedAt', async () => {
      const requestedAt = new Date('2025-06-01T00:00:00.000Z');
      mockPrisma.user.findUnique.mockResolvedValue({
        deletedAt: requestedAt,
        deletionRequestedAt: requestedAt,
      });

      const result = await getDeletionStatus('user-1');

      const expectedDate = new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(result!.scheduledDeletionDate).toEqual(expectedDate);
    });

    it('should return daysRemaining as 0 when past the deletion date', async () => {
      // Set requested date far in the past (more than 30 days ago)
      const requestedAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      mockPrisma.user.findUnique.mockResolvedValue({
        deletedAt: requestedAt,
        deletionRequestedAt: requestedAt,
      });

      const result = await getDeletionStatus('user-1');

      expect(result!.pending).toBe(true);
      expect(result!.daysRemaining).toBe(0);
    });

    it('should select only deletedAt and deletionRequestedAt fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        deletedAt: null,
        deletionRequestedAt: null,
      });

      await getDeletionStatus('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { deletedAt: true, deletionRequestedAt: true },
      });
    });
  });

  // ===========================================
  // processScheduledDeletions
  // ===========================================

  describe('processScheduledDeletions', () => {
    it('should find users whose grace period has expired', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await processScheduledDeletions();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          deletionRequestedAt: { lte: expect.any(Date) },
          deletedAt: { not: null },
        },
      });
    });

    it('should use a 30-day cutoff from now', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      mockPrisma.user.findMany.mockResolvedValue([]);

      await processScheduledDeletions();

      const expectedCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          deletionRequestedAt: { lte: expectedCutoff },
          deletedAt: { not: null },
        },
      });

      vi.restoreAllMocks();
    });

    it('should call permanentlyDeleteUser for each eligible user', async () => {
      const users = [
        { id: 'user-1', deletedAt: new Date(), deletionRequestedAt: new Date() },
        { id: 'user-2', deletedAt: new Date(), deletionRequestedAt: new Date() },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);

      // Mock for permanentlyDeleteUser (findUnique called for each user)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          deletedAt: new Date(),
          deletionRequestedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          deletedAt: new Date(),
          deletionRequestedAt: new Date(),
        });

      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.page.updateMany.mockResolvedValue({});
      mockPrisma.organizationMember.deleteMany.mockResolvedValue({});
      mockPrisma.session.deleteMany.mockResolvedValue({});
      mockPrisma.account.deleteMany.mockResolvedValue({});
      mockPrisma.favorite.deleteMany.mockResolvedValue({});
      mockPrisma.mention.deleteMany.mockResolvedValue({});
      mockPrisma.notification.deleteMany.mockResolvedValue({});
      mockPrisma.apiToken.deleteMany.mockResolvedValue({});
      mockPrisma.pagePermission.deleteMany.mockResolvedValue({});
      mockPrisma.dataExport.deleteMany.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const count = await processScheduledDeletions();

      expect(count).toBe(2);
    });

    it('should return 0 when no users are eligible', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const count = await processScheduledDeletions();

      expect(count).toBe(0);
    });

    it('should continue processing remaining users when one fails', async () => {
      const users = [
        { id: 'user-1', deletedAt: new Date(), deletionRequestedAt: new Date() },
        { id: 'user-2', deletedAt: new Date(), deletionRequestedAt: new Date() },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);

      // First user fails (permanentlyDeleteUser calls findUnique first)
      mockPrisma.user.findUnique
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({
          id: 'user-2',
          deletedAt: new Date(),
          deletionRequestedAt: new Date(),
        });

      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.page.updateMany.mockResolvedValue({});
      mockPrisma.organizationMember.deleteMany.mockResolvedValue({});
      mockPrisma.session.deleteMany.mockResolvedValue({});
      mockPrisma.account.deleteMany.mockResolvedValue({});
      mockPrisma.favorite.deleteMany.mockResolvedValue({});
      mockPrisma.mention.deleteMany.mockResolvedValue({});
      mockPrisma.notification.deleteMany.mockResolvedValue({});
      mockPrisma.apiToken.deleteMany.mockResolvedValue({});
      mockPrisma.pagePermission.deleteMany.mockResolvedValue({});
      mockPrisma.dataExport.deleteMany.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const count = await processScheduledDeletions();

      // Only user-2 was successfully deleted
      expect(count).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[gdpr] Failed to permanently delete user user-1'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  // ===========================================
  // permanentlyDeleteUser
  // ===========================================

  describe('permanentlyDeleteUser', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      deletedAt: new Date('2025-01-01'),
      deletionRequestedAt: new Date('2025-01-01'),
    };

    function setupTransactionMocks() {
      const txMock = {
        page: { updateMany: vi.fn().mockResolvedValue({}) },
        organizationMember: { deleteMany: vi.fn().mockResolvedValue({}) },
        session: { deleteMany: vi.fn().mockResolvedValue({}) },
        account: { deleteMany: vi.fn().mockResolvedValue({}) },
        favorite: { deleteMany: vi.fn().mockResolvedValue({}) },
        mention: { deleteMany: vi.fn().mockResolvedValue({}) },
        notification: { deleteMany: vi.fn().mockResolvedValue({}) },
        apiToken: { deleteMany: vi.fn().mockResolvedValue({}) },
        pagePermission: { deleteMany: vi.fn().mockResolvedValue({}) },
        dataExport: { deleteMany: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
      };
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(txMock));
      return txMock;
    }

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(permanentlyDeleteUser('nonexistent')).rejects.toThrow('USER_NOT_FOUND');
    });

    it('should delete data export files from disk', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([
        { id: 'exp-1', storagePath: '/tmp/exports/file1.zip' },
        { id: 'exp-2', storagePath: '/tmp/exports/file2.zip' },
      ]);
      mockFs.existsSync.mockReturnValue(true);
      setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/exports/file1.zip');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/exports/file2.zip');
    });

    it('should skip file deletion when storagePath is null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([{ id: 'exp-1', storagePath: null }]);
      setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should skip file deletion when file does not exist on disk', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([
        { id: 'exp-1', storagePath: '/tmp/missing.zip' },
      ]);
      mockFs.existsSync.mockReturnValue(false);
      setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should execute all deletions within a transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      const txMock = setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.page.updateMany).toHaveBeenCalledWith({
        where: { createdById: 'user-1' },
        data: { createdById: 'user-1' },
      });
      expect(txMock.organizationMember.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.account.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.mention.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.apiToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.pagePermission.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(txMock.dataExport.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should anonymise the user record with correct sentinel values', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      const txMock = setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          email: 'deleted-user-1@deleted.librediary.local',
          name: 'Deleted User',
          passwordHash: null,
          avatarUrl: null,
          emailVerified: false,
          emailVerifiedAt: null,
          notificationPrefs: '{}',
          isSuperAdmin: false,
          deletedAt: mockUser.deletedAt,
          deletionRequestedAt: mockUser.deletionRequestedAt,
        },
      });
    });

    it('should use current date for deletedAt when user.deletedAt is null', async () => {
      const userWithoutDeletedAt = { ...mockUser, deletedAt: null, deletionRequestedAt: null };
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutDeletedAt);
      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      const txMock = setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      const updateCall = txMock.user.update.mock.calls[0][0];
      expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
      expect(updateCall.data.deletionRequestedAt).toBeInstanceOf(Date);
    });

    it('should generate email using userId as sentinel', async () => {
      const user = { ...mockUser, id: 'abc-def-123' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      const txMock = setupTransactionMocks();

      await permanentlyDeleteUser('abc-def-123');

      const updateCall = txMock.user.update.mock.calls[0][0];
      expect(updateCall.data.email).toBe('deleted-abc-def-123@deleted.librediary.local');
    });

    it('should handle user with no data exports gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      setupTransactionMocks();

      await expect(permanentlyDeleteUser('user-1')).resolves.toBeUndefined();
    });

    it('should set isSuperAdmin to false during anonymisation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.dataExport.findMany.mockResolvedValue([]);
      const txMock = setupTransactionMocks();

      await permanentlyDeleteUser('user-1');

      const updateCall = txMock.user.update.mock.calls[0][0];
      expect(updateCall.data.isSuperAdmin).toBe(false);
    });
  });
});
