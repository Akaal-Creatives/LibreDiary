import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
    },
  };

  function resetMocks() {
    for (const model of Object.values(mockPrisma)) {
      for (const method of Object.values(model)) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { logAudit, listAuditLogs, getDistinctActions, purgeAuditLogs } from '../audit.service.js';

describe('Audit Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // logAudit
  // ===========================================

  describe('logAudit', () => {
    it('should call prisma.auditLog.create with correct fields', () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      logAudit({
        action: 'AUTH_LOGIN',
        userId: 'user-1',
        organizationId: null,
        resourceType: null,
        resourceId: null,
        metadata: { email: 'test@example.com' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'AUTH_LOGIN',
          userId: 'user-1',
          organizationId: null,
          resourceType: null,
          resourceId: null,
          metadata: { email: 'test@example.com' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should not throw when Prisma fails (fire-and-forget)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB connection failed'));

      // Should not throw
      expect(() =>
        logAudit({
          action: 'AUTH_LOGIN',
          userId: 'user-1',
        })
      ).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should default optional fields to null', () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      logAudit({
        action: 'AUTH_REGISTER',
        userId: 'user-1',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'AUTH_REGISTER',
          userId: 'user-1',
          organizationId: null,
          resourceType: null,
          resourceId: null,
          metadata: null,
          ipAddress: null,
          userAgent: null,
        },
      });
    });
  });

  // ===========================================
  // listAuditLogs
  // ===========================================

  describe('listAuditLogs', () => {
    it('should return paginated results with defaults (page=1, limit=50)', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'AUTH_LOGIN',
          userId: 'user-1',
          organizationId: null,
          resourceType: null,
          resourceId: null,
          metadata: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      ]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      const result = await listAuditLogs({});

      expect(result.items).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.total).toBe(1);

      // Check skip/take defaults
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter by action', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await listAuditLogs({ action: 'AUTH_LOGIN' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'AUTH_LOGIN',
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await listAuditLogs({ userId: 'user-1' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        })
      );
    });

    it('should filter by organizationId', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await listAuditLogs({ organizationId: 'org-1' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      await listAuditLogs({ startDate, endDate });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        })
      );
    });

    it('should filter by resourceType', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await listAuditLogs({ resourceType: 'page' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resourceType: 'page',
          }),
        })
      );
    });

    it('should enrich results with user email/name and org name/slug', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'PAGE_CREATED',
          userId: 'user-1',
          organizationId: 'org-1',
          resourceType: 'page',
          resourceId: 'page-1',
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      ]);
      mockPrisma.organization.findMany.mockResolvedValue([
        { id: 'org-1', name: 'Test Org', slug: 'test-org' },
      ]);

      const result = await listAuditLogs({});

      expect(result.items[0].user).toEqual({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result.items[0].organization).toEqual({
        name: 'Test Org',
        slug: 'test-org',
      });
    });

    it('should handle deleted users/orgs gracefully', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'AUTH_LOGIN',
          userId: 'deleted-user',
          organizationId: 'deleted-org',
          resourceType: null,
          resourceId: null,
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([]); // User deleted
      mockPrisma.organization.findMany.mockResolvedValue([]); // Org deleted

      const result = await listAuditLogs({});

      expect(result.items[0].user).toBeNull();
      expect(result.items[0].organization).toBeNull();
    });
  });

  // ===========================================
  // getDistinctActions
  // ===========================================

  describe('getDistinctActions', () => {
    it('should return array of distinct actions', async () => {
      mockPrisma.auditLog.groupBy.mockResolvedValue([
        { action: 'AUTH_LOGIN' },
        { action: 'PAGE_CREATED' },
        { action: 'ORG_CREATED' },
      ]);

      const result = await getDistinctActions();

      expect(result).toEqual(['AUTH_LOGIN', 'PAGE_CREATED', 'ORG_CREATED']);
    });

    it('should return empty array when no logs', async () => {
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);

      const result = await getDistinctActions();

      expect(result).toEqual([]);
    });
  });

  // ===========================================
  // purgeAuditLogs
  // ===========================================

  describe('purgeAuditLogs', () => {
    it('should delete logs older than given date', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 42 });

      const olderThan = new Date('2024-01-01');
      const result = await purgeAuditLogs(olderThan);

      expect(result).toBe(42);
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: olderThan },
        },
      });
    });
  });
});
