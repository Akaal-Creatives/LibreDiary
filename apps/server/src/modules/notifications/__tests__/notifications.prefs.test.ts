import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, resetMocks, mockUser } = vi.hoisted(() => {
  const mockPrismaUser = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  const mockPrisma = {
    user: mockPrismaUser,
  };

  function resetMocks() {
    Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  }

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    notificationPrefs: {},
  };

  return { mockPrisma, resetMocks, mockUser };
});

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service AFTER mocking
import * as notificationPrefsService from '../notifications.prefs.service.js';

describe('Notification Preferences Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getNotificationPreferences', () => {
    it('should return default preferences when user has no preferences set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: {},
      });

      const result = await notificationPrefsService.getNotificationPreferences('user-123');

      expect(result).toEqual({
        emailMention: true,
        emailCommentReply: true,
        emailPageShared: true,
        emailCommentResolved: true,
        emailInvitation: true,
      });
    });

    it('should return stored preferences when set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: {
          emailMention: false,
          emailCommentReply: true,
          emailPageShared: false,
        },
      });

      const result = await notificationPrefsService.getNotificationPreferences('user-123');

      expect(result.emailMention).toBe(false);
      expect(result.emailCommentReply).toBe(true);
      expect(result.emailPageShared).toBe(false);
      // Defaults for unset preferences
      expect(result.emailCommentResolved).toBe(true);
      expect(result.emailInvitation).toBe(true);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationPrefsService.getNotificationPreferences('nonexistent')
      ).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: {},
      });
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        notificationPrefs: { emailMention: false },
      });

      const result = await notificationPrefsService.updateNotificationPreferences('user-123', {
        emailMention: false,
      });

      expect(result.emailMention).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          notificationPrefs: { emailMention: false },
        },
        select: { notificationPrefs: true },
      });
    });

    it('should merge with existing preferences', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: { emailMention: false },
      });
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        notificationPrefs: { emailMention: false, emailCommentReply: false },
      });

      await notificationPrefsService.updateNotificationPreferences('user-123', {
        emailCommentReply: false,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          notificationPrefs: { emailMention: false, emailCommentReply: false },
        },
        select: { notificationPrefs: true },
      });
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationPrefsService.updateNotificationPreferences('nonexistent', {
          emailMention: false,
        })
      ).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('shouldSendEmail', () => {
    it('should return true when preference is enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: { emailMention: true },
      });

      const result = await notificationPrefsService.shouldSendEmail('user-123', 'MENTION');

      expect(result).toBe(true);
    });

    it('should return true when preference is not set (default enabled)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: {},
      });

      const result = await notificationPrefsService.shouldSendEmail('user-123', 'MENTION');

      expect(result).toBe(true);
    });

    it('should return false when preference is disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPrefs: { emailMention: false },
      });

      const result = await notificationPrefsService.shouldSendEmail('user-123', 'MENTION');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await notificationPrefsService.shouldSendEmail('nonexistent', 'MENTION');

      expect(result).toBe(false);
    });

    it('should check correct preference key for each notification type', async () => {
      // Test all notification types map to correct preference keys
      const testCases = [
        { type: 'MENTION', prefKey: 'emailMention' },
        { type: 'COMMENT_REPLY', prefKey: 'emailCommentReply' },
        { type: 'PAGE_SHARED', prefKey: 'emailPageShared' },
        { type: 'COMMENT_RESOLVED', prefKey: 'emailCommentResolved' },
        { type: 'INVITATION', prefKey: 'emailInvitation' },
      ];

      for (const { type, prefKey } of testCases) {
        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockUser,
          notificationPrefs: { [prefKey]: false },
        });

        const result = await notificationPrefsService.shouldSendEmail(
          'user-123',
          type as 'MENTION' | 'COMMENT_REPLY' | 'PAGE_SHARED' | 'COMMENT_RESOLVED' | 'INVITATION'
        );

        expect(result).toBe(false);
      }
    });
  });
});
