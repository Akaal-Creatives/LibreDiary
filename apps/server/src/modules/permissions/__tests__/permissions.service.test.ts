import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const {
  mockPrisma,
  resetMocks,
  mockPage,
  _mockUser,
  mockPermission,
  _now,
  mockCreatePageSharedNotification,
} = vi.hoisted(() => {
  const mockPrismaPagePermission = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrismaPage = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };

  const mockPrismaOrgMember = {
    findUnique: vi.fn(),
  };

  const mockPrismaUser = {
    findUnique: vi.fn(),
  };

  const mockPrisma = {
    pagePermission: mockPrismaPagePermission,
    page: mockPrismaPage,
    organizationMember: mockPrismaOrgMember,
    user: mockPrismaUser,
  };

  const mockCreatePageSharedNotification = vi.fn().mockResolvedValue({});

  function resetMocks() {
    Object.values(mockPrismaPagePermission).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaOrgMember).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
    mockCreatePageSharedNotification.mockReset().mockResolvedValue({});
  }

  const now = new Date();

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
    isPublic: false,
    createdById: 'user-123',
    trashedAt: null,
  };

  const mockPermission = {
    id: 'perm-123',
    pageId: 'page-123',
    userId: 'user-456',
    level: 'EDIT',
    shareToken: null,
    expiresAt: null,
    grantedById: 'user-123',
    createdAt: now,
    updatedAt: now,
  };

  return {
    mockPrisma,
    resetMocks,
    mockPage,
    _mockUser: mockUser,
    mockPermission,
    _now: now,
    mockCreatePageSharedNotification,
  };
});

// Mock the prisma module BEFORE importing permissions.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock the notification service
vi.mock('../../notifications/notifications.service.js', () => ({
  createPageSharedNotification: mockCreatePageSharedNotification,
}));

// Import service AFTER mocking
import * as permissionsService from '../permissions.service.js';

describe('Permissions Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('checkPageAccess', () => {
    it('should return true for page creator', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);

      const result = await permissionsService.checkPageAccess('user-123', 'page-123', 'VIEW');

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('FULL_ACCESS');
    });

    it('should return true for org member with no explicit permission (inherits VIEW)', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({ ...mockPage, createdById: 'other-user' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'MEMBER',
      });
      mockPrisma.pagePermission.findFirst.mockResolvedValue(null);

      const result = await permissionsService.checkPageAccess('user-123', 'page-123', 'VIEW');

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('VIEW');
    });

    it('should return true for user with explicit EDIT permission', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({ ...mockPage, createdById: 'other-user' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'MEMBER',
      });
      mockPrisma.pagePermission.findFirst.mockResolvedValue({
        ...mockPermission,
        userId: 'user-123',
        level: 'EDIT',
      });

      const result = await permissionsService.checkPageAccess('user-123', 'page-123', 'EDIT');

      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe('EDIT');
    });

    it('should return false for user requesting higher permission than granted', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({ ...mockPage, createdById: 'other-user' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-123',
        role: 'MEMBER',
      });
      mockPrisma.pagePermission.findFirst.mockResolvedValue({
        ...mockPermission,
        userId: 'user-123',
        level: 'VIEW',
      });

      const result = await permissionsService.checkPageAccess('user-123', 'page-123', 'EDIT');

      expect(result.hasAccess).toBe(false);
    });

    it('should return false for non-org member', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({ ...mockPage, createdById: 'other-user' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      mockPrisma.pagePermission.findFirst.mockResolvedValue(null);

      const result = await permissionsService.checkPageAccess('user-123', 'page-123', 'VIEW');

      expect(result.hasAccess).toBe(false);
    });

    it('should throw for non-existent page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        permissionsService.checkPageAccess('user-123', 'nonexistent', 'VIEW')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });
  });

  describe('grantPermission', () => {
    it('should create a new permission', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.pagePermission.findFirst.mockResolvedValue(null);
      mockPrisma.pagePermission.create.mockResolvedValue({
        ...mockPermission,
        userId: 'user-456',
        level: 'EDIT',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Granting User' });

      const result = await permissionsService.grantPermission(
        'page-123',
        'user-456',
        'EDIT',
        'user-123'
      );

      expect(result.userId).toBe('user-456');
      expect(result.level).toBe('EDIT');
      expect(mockPrisma.pagePermission.create).toHaveBeenCalledWith({
        data: {
          pageId: 'page-123',
          userId: 'user-456',
          level: 'EDIT',
          grantedById: 'user-123',
        },
        include: { user: true },
      });
    });

    it('should send notification when granting permission to another user', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.pagePermission.findFirst.mockResolvedValue(null);
      mockPrisma.pagePermission.create.mockResolvedValue({
        ...mockPermission,
        userId: 'user-456',
        level: 'EDIT',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Granting User' });

      await permissionsService.grantPermission('page-123', 'user-456', 'EDIT', 'user-123');

      expect(mockCreatePageSharedNotification).toHaveBeenCalledWith({
        recipientId: 'user-456',
        actorId: 'user-123',
        actorName: 'Granting User',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        permissionLevel: 'EDIT',
      });
    });

    it('should not send notification when granting permission to self', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.pagePermission.findFirst.mockResolvedValue(null);
      mockPrisma.pagePermission.create.mockResolvedValue({
        ...mockPermission,
        userId: 'user-123',
        level: 'EDIT',
      });

      await permissionsService.grantPermission('page-123', 'user-123', 'EDIT', 'user-123');

      expect(mockCreatePageSharedNotification).not.toHaveBeenCalled();
    });

    it('should throw if permission already exists', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.pagePermission.findFirst.mockResolvedValue(mockPermission);

      await expect(
        permissionsService.grantPermission('page-123', 'user-456', 'EDIT', 'user-123')
      ).rejects.toThrow('PERMISSION_EXISTS');
    });

    it('should throw if page not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        permissionsService.grantPermission('nonexistent', 'user-456', 'EDIT', 'user-123')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });
  });

  describe('revokePermission', () => {
    it('should delete a permission', async () => {
      mockPrisma.pagePermission.findUnique.mockResolvedValue(mockPermission);
      mockPrisma.pagePermission.delete.mockResolvedValue(mockPermission);

      await permissionsService.revokePermission('perm-123');

      expect(mockPrisma.pagePermission.delete).toHaveBeenCalledWith({
        where: { id: 'perm-123' },
      });
    });

    it('should throw if permission not found', async () => {
      mockPrisma.pagePermission.findUnique.mockResolvedValue(null);

      await expect(permissionsService.revokePermission('nonexistent')).rejects.toThrow(
        'PERMISSION_NOT_FOUND'
      );
    });
  });

  describe('listPagePermissions', () => {
    it('should return all permissions for a page', async () => {
      const permissions = [
        { ...mockPermission, id: 'perm-1', userId: 'user-1' },
        { ...mockPermission, id: 'perm-2', userId: 'user-2' },
      ];
      mockPrisma.pagePermission.findMany.mockResolvedValue(permissions);

      const result = await permissionsService.listPagePermissions('page-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.pagePermission.findMany).toHaveBeenCalledWith({
        where: { pageId: 'page-123' },
        include: { user: true, grantedBy: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updatePermissionLevel', () => {
    it('should update permission level', async () => {
      mockPrisma.pagePermission.findUnique.mockResolvedValue(mockPermission);
      mockPrisma.pagePermission.update.mockResolvedValue({
        ...mockPermission,
        level: 'FULL_ACCESS',
      });

      const result = await permissionsService.updatePermissionLevel('perm-123', 'FULL_ACCESS');

      expect(result.level).toBe('FULL_ACCESS');
      expect(mockPrisma.pagePermission.update).toHaveBeenCalledWith({
        where: { id: 'perm-123' },
        data: { level: 'FULL_ACCESS' },
        include: { user: true },
      });
    });

    it('should throw if permission not found', async () => {
      mockPrisma.pagePermission.findUnique.mockResolvedValue(null);

      await expect(
        permissionsService.updatePermissionLevel('nonexistent', 'FULL_ACCESS')
      ).rejects.toThrow('PERMISSION_NOT_FOUND');
    });
  });

  describe('createShareLink', () => {
    it('should create a share link with token', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.pagePermission.create.mockResolvedValue({
        ...mockPermission,
        userId: null,
        shareToken: 'abc123token',
        level: 'VIEW',
      });

      const result = await permissionsService.createShareLink('page-123', 'VIEW', 'user-123');

      expect(result.shareToken).toBeTruthy();
      expect(result.userId).toBeNull();
      expect(mockPrisma.pagePermission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pageId: 'page-123',
          userId: null,
          level: 'VIEW',
          shareToken: expect.any(String),
          grantedById: 'user-123',
        }),
      });
    });

    it('should create a share link with expiration', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.pagePermission.create.mockResolvedValue({
        ...mockPermission,
        userId: null,
        shareToken: 'abc123token',
        expiresAt,
      });

      const result = await permissionsService.createShareLink(
        'page-123',
        'VIEW',
        'user-123',
        expiresAt
      );

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('validateShareToken', () => {
    it('should return permission for valid token', async () => {
      mockPrisma.pagePermission.findFirst.mockResolvedValue({
        ...mockPermission,
        shareToken: 'valid-token',
        expiresAt: new Date(Date.now() + 1000000),
      });

      const result = await permissionsService.validateShareToken('valid-token');

      expect(result).not.toBeNull();
      expect(result?.shareToken).toBe('valid-token');
    });

    it('should return null for expired token', async () => {
      mockPrisma.pagePermission.findFirst.mockResolvedValue({
        ...mockPermission,
        shareToken: 'expired-token',
        expiresAt: new Date(Date.now() - 1000000), // Past date
      });

      const result = await permissionsService.validateShareToken('expired-token');

      expect(result).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      mockPrisma.pagePermission.findFirst.mockResolvedValue(null);

      const result = await permissionsService.validateShareToken('nonexistent');

      expect(result).toBeNull();
    });
  });
});
