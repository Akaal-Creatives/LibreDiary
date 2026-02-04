import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockPrisma, mockPrismaSession, resetPrismaMocks } from '../../tests/mocks/prisma.js';

// Mock the prisma module
vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  createSession,
  getSessionByToken,
  touchSession,
  deleteSession,
  deleteSessionByToken,
  getUserSessions,
  deleteAllUserSessions,
  deleteOtherUserSessions,
  cleanupExpiredSessions,
} from './session.service.js';

describe('Session Service', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('should create a session with required fields', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-456',
        token: expect.any(String),
        userAgent: null,
        ipAddress: null,
        lastActiveAt: new Date(),
        expiresAt: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrismaSession.create.mockResolvedValue(mockSession);

      const session = await createSession({ userId: 'user-456' });

      expect(mockPrismaSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          token: expect.any(String),
          userAgent: null,
          ipAddress: null,
          expiresAt: expect.any(Date),
        },
      });
      expect(session).toEqual(mockSession);
    });

    it('should include userAgent and ipAddress when provided', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-456',
        token: 'token-abc',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaSession.create.mockResolvedValue(mockSession);

      await createSession({
        userId: 'user-456',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        }),
      });
    });

    it('should set expiration to 7 days from now', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      vi.setSystemTime(now);

      mockPrismaSession.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-456',
        token: 'token',
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      });

      await createSession({ userId: 'user-456' });

      const createCall = mockPrismaSession.create.mock.calls[0][0];
      const expectedExpiry = new Date('2024-01-22T12:00:00.000Z');
      expect(createCall.data.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('getSessionByToken', () => {
    it('should return session with user when found and not expired', async () => {
      const futureDate = new Date('2024-01-22T12:00:00.000Z');
      const mockSessionWithUser = {
        id: 'session-123',
        userId: 'user-456',
        token: 'valid-token',
        expiresAt: futureDate,
        user: {
          id: 'user-456',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockPrismaSession.findUnique.mockResolvedValue(mockSessionWithUser);

      const result = await getSessionByToken('valid-token');

      expect(mockPrismaSession.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        include: { user: true },
      });
      expect(result).toEqual(mockSessionWithUser);
    });

    it('should return null when session not found', async () => {
      mockPrismaSession.findUnique.mockResolvedValue(null);

      const result = await getSessionByToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should delete and return null when session is expired', async () => {
      const pastDate = new Date('2024-01-01T12:00:00.000Z');
      const mockExpiredSession = {
        id: 'session-123',
        userId: 'user-456',
        token: 'expired-token',
        expiresAt: pastDate,
        user: { id: 'user-456' },
      };

      mockPrismaSession.findUnique.mockResolvedValue(mockExpiredSession);
      mockPrismaSession.delete.mockResolvedValue(mockExpiredSession);

      const result = await getSessionByToken('expired-token');

      expect(mockPrismaSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
      expect(result).toBeNull();
    });
  });

  describe('touchSession', () => {
    it('should update lastActiveAt to current time', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      vi.setSystemTime(now);

      mockPrismaSession.update.mockResolvedValue({});

      await touchSession('session-123');

      expect(mockPrismaSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { lastActiveAt: now },
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete session by id', async () => {
      mockPrismaSession.delete.mockResolvedValue({});

      await deleteSession('session-123');

      expect(mockPrismaSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    it('should not throw when session already deleted', async () => {
      mockPrismaSession.delete.mockRejectedValue(new Error('Not found'));

      await expect(deleteSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('deleteSessionByToken', () => {
    it('should delete session by token', async () => {
      mockPrismaSession.delete.mockResolvedValue({});

      await deleteSessionByToken('token-abc');

      expect(mockPrismaSession.delete).toHaveBeenCalledWith({
        where: { token: 'token-abc' },
      });
    });

    it('should not throw when session already deleted', async () => {
      mockPrismaSession.delete.mockRejectedValue(new Error('Not found'));

      await expect(deleteSessionByToken('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getUserSessions', () => {
    it('should return non-expired sessions for user sorted by lastActiveAt', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      vi.setSystemTime(now);

      const mockSessions = [
        { id: 'session-1', userId: 'user-456', lastActiveAt: new Date('2024-01-15T11:00:00Z') },
        { id: 'session-2', userId: 'user-456', lastActiveAt: new Date('2024-01-15T10:00:00Z') },
      ];

      mockPrismaSession.findMany.mockResolvedValue(mockSessions);

      const result = await getUserSessions('user-456');

      expect(mockPrismaSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-456',
          expiresAt: { gt: now },
        },
        orderBy: { lastActiveAt: 'desc' },
      });
      expect(result).toEqual(mockSessions);
    });
  });

  describe('deleteAllUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      mockPrismaSession.deleteMany.mockResolvedValue({ count: 3 });

      await deleteAllUserSessions('user-456');

      expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
      });
    });
  });

  describe('deleteOtherUserSessions', () => {
    it('should delete all sessions except the current one', async () => {
      mockPrismaSession.deleteMany.mockResolvedValue({ count: 2 });

      await deleteOtherUserSessions('user-456', 'current-session-id');

      expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-456',
          id: { not: 'current-session-id' },
        },
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete all expired sessions and return count', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      vi.setSystemTime(now);

      mockPrismaSession.deleteMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredSessions();

      expect(mockPrismaSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: now },
        },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no expired sessions', async () => {
      mockPrismaSession.deleteMany.mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredSessions();

      expect(result).toBe(0);
    });
  });
});
