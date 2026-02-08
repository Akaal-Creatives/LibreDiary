import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    apiToken: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  };

  function resetMocks() {
    for (const method of Object.values(mockPrisma.apiToken)) {
      (method as ReturnType<typeof vi.fn>).mockReset();
    }
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  createToken,
  listTokens,
  deleteToken,
  validateToken,
  deleteExpiredTokens,
} from '../api-token.service.js';

describe('API Token Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // CREATE TOKEN
  // ===========================================

  describe('createToken', () => {
    it('should create a token with hashed value and prefix', async () => {
      const mockApiToken = {
        id: 'token-1',
        userId: 'user-1',
        name: 'My API Key',
        tokenHash: 'hashed',
        tokenPrefix: 'ld_abcde',
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      };
      mockPrisma.apiToken.create.mockResolvedValue(mockApiToken);

      const result = await createToken('user-1', 'My API Key');

      expect(result.rawToken).toBeDefined();
      expect(result.rawToken).toMatch(/^ld_/);
      expect(result.apiToken).toEqual(mockApiToken);
      expect(mockPrisma.apiToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'My API Key',
          tokenHash: expect.any(String),
          tokenPrefix: expect.any(String),
          expiresAt: null,
        }),
      });
    });

    it('should set expiresAt when provided', async () => {
      const expiresAt = '2026-12-31T23:59:59Z';
      mockPrisma.apiToken.create.mockResolvedValue({
        id: 'token-1',
        expiresAt: new Date(expiresAt),
      });

      await createToken('user-1', 'Expiring Key', expiresAt);

      expect(mockPrisma.apiToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: new Date(expiresAt),
        }),
      });
    });

    it('should return a unique raw token each time', async () => {
      mockPrisma.apiToken.create.mockResolvedValue({ id: 'token-1' });

      const result1 = await createToken('user-1', 'Key 1');
      const result2 = await createToken('user-1', 'Key 2');

      expect(result1.rawToken).not.toBe(result2.rawToken);
    });
  });

  // ===========================================
  // LIST TOKENS
  // ===========================================

  describe('listTokens', () => {
    it('should return tokens for the user without tokenHash', async () => {
      const tokens = [
        { id: 'token-1', name: 'Key 1', tokenPrefix: 'ld_abc12' },
        { id: 'token-2', name: 'Key 2', tokenPrefix: 'ld_def34' },
      ];
      mockPrisma.apiToken.findMany.mockResolvedValue(tokens);

      const result = await listTokens('user-1');

      expect(result).toEqual(tokens);
      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          name: true,
          tokenPrefix: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      });
    });
  });

  // ===========================================
  // DELETE TOKEN
  // ===========================================

  describe('deleteToken', () => {
    it('should delete a token owned by the user', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
      });
      mockPrisma.apiToken.delete.mockResolvedValue({});

      await deleteToken('token-1', 'user-1');

      expect(mockPrisma.apiToken.findFirst).toHaveBeenCalledWith({
        where: { id: 'token-1', userId: 'user-1' },
      });
      expect(mockPrisma.apiToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should throw when token not found', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(null);

      await expect(deleteToken('token-999', 'user-1')).rejects.toThrow('Token not found');
    });

    it('should throw when token belongs to another user', async () => {
      mockPrisma.apiToken.findFirst.mockResolvedValue(null);

      await expect(deleteToken('token-1', 'other-user')).rejects.toThrow('Token not found');
    });
  });

  // ===========================================
  // VALIDATE TOKEN
  // ===========================================

  describe('validateToken', () => {
    it('should return user and apiTokenId for valid token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        deletedAt: null,
      };
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        id: 'token-1',
        user: mockUser,
        expiresAt: null,
      });
      mockPrisma.apiToken.update.mockResolvedValue({});

      const result = await validateToken('ld_somerawtoken');

      expect(result).toEqual({
        user: mockUser,
        apiTokenId: 'token-1',
      });
    });

    it('should return null for non-existent token', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue(null);

      const result = await validateToken('ld_nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const pastDate = new Date('2020-01-01');
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        id: 'token-1',
        user: { id: 'user-1', deletedAt: null },
        expiresAt: pastDate,
      });

      const result = await validateToken('ld_expiredtoken');

      expect(result).toBeNull();
    });

    it('should return null for soft-deleted user', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        id: 'token-1',
        user: { id: 'user-1', deletedAt: new Date() },
        expiresAt: null,
      });

      const result = await validateToken('ld_deleteduser');

      expect(result).toBeNull();
    });

    it('should return user for token with future expiry', async () => {
      const futureDate = new Date('2030-01-01');
      const mockUser = { id: 'user-1', deletedAt: null };
      mockPrisma.apiToken.findUnique.mockResolvedValue({
        id: 'token-1',
        user: mockUser,
        expiresAt: futureDate,
      });
      mockPrisma.apiToken.update.mockResolvedValue({});

      const result = await validateToken('ld_futuretoken');

      expect(result).toEqual({
        user: mockUser,
        apiTokenId: 'token-1',
      });
    });
  });

  // ===========================================
  // DELETE EXPIRED TOKENS
  // ===========================================

  describe('deleteExpiredTokens', () => {
    it('should delete expired tokens and return count', async () => {
      mockPrisma.apiToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await deleteExpiredTokens();

      expect(result).toBe(3);
      expect(mockPrisma.apiToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should return 0 when no expired tokens exist', async () => {
      mockPrisma.apiToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await deleteExpiredTokens();

      expect(result).toBe(0);
    });
  });
});
