import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrismaUser = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaOrganization = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  return {
    mockPrisma: {
      user: mockPrismaUser,
      organization: mockPrismaOrganization,
    },
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  listUsers,
  getUserById,
  updateUser,
  softDeleteUser,
  restoreUser,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  softDeleteOrganization,
  restoreOrganization,
  getStats,
} from '../admin.service.js';

describe('Admin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  describe('listUsers', () => {
    it('should return paginated users with defaults', async () => {
      const mockUsers = [
        {
          id: 'u1',
          email: 'a@test.com',
          name: 'User A',
          avatarUrl: null,
          isSuperAdmin: false,
          emailVerified: true,
          createdAt: new Date('2025-01-01'),
          deletedAt: null,
          _count: { memberships: 2 },
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await listUsers({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.organizationCount).toBe(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      );
    });

    it('should apply pagination parameters', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(50);

      const result = await listUsers({ page: 3, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });

    it('should apply search filter to email and name', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await listUsers({ search: 'test' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'test', mode: 'insensitive' } },
              { name: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(21);

      const result = await listUsers({ limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getUserById', () => {
    it('should return user with memberships', async () => {
      const mockUser = {
        id: 'u1',
        email: 'a@test.com',
        name: 'User A',
        avatarUrl: null,
        locale: 'en',
        isSuperAdmin: false,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        memberships: [
          {
            id: 'm1',
            role: 'OWNER',
            createdAt: new Date(),
            organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await getUserById('u1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('u1');
      expect(result!.memberships).toHaveLength(1);
      expect(result!.memberships[0]!.organization.slug).toBe('org-1');
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update and return user', async () => {
      const existingUser = { id: 'u1', name: 'Old', isSuperAdmin: false };
      const updatedUser = { id: 'u1', name: 'New', isSuperAdmin: true };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await updateUser('u1', { name: 'New', isSuperAdmin: true });

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'New', isSuperAdmin: true },
      });
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await updateUser('non-existent', { name: 'New' });

      expect(result).toBeNull();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteUser', () => {
    it('should set deletedAt timestamp', async () => {
      const existingUser = { id: 'u1', deletedAt: null };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, deletedAt: new Date() });

      const result = await softDeleteUser('u1');

      expect(result!.deletedAt).not.toBeNull();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await softDeleteUser('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('restoreUser', () => {
    it('should set deletedAt to null', async () => {
      const deletedUser = { id: 'u1', deletedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(deletedUser);
      mockPrisma.user.update.mockResolvedValue({ ...deletedUser, deletedAt: null });

      const result = await restoreUser('u1');

      expect(result!.deletedAt).toBeNull();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { deletedAt: null },
      });
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await restoreUser('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================
  // ORGANIZATION MANAGEMENT
  // ==========================================

  describe('listOrganizations', () => {
    it('should return paginated organisations with defaults', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          logoUrl: null,
          accentColor: '#000',
          createdAt: new Date(),
          deletedAt: null,
          _count: { members: 5 },
        },
      ];

      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);
      mockPrisma.organization.count.mockResolvedValue(1);

      const result = await listOrganizations({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.memberCount).toBe(5);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply search filter to name and slug', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);
      mockPrisma.organization.count.mockResolvedValue(0);

      await listOrganizations({ search: 'acme' });

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'acme', mode: 'insensitive' } },
              { slug: { contains: 'acme', mode: 'insensitive' } },
            ],
          },
        })
      );
    });
  });

  describe('getOrganizationById', () => {
    it('should return organisation with members', async () => {
      const mockOrg = {
        id: 'org-1',
        name: 'Org 1',
        slug: 'org-1',
        logoUrl: null,
        accentColor: null,
        allowedDomains: ['example.com'],
        aiEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        members: [
          {
            id: 'm1',
            role: 'OWNER',
            user: { id: 'u1', email: 'owner@test.com', name: 'Owner' },
          },
        ],
      };

      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await getOrganizationById('org-1');

      expect(result).not.toBeNull();
      expect(result!.members).toHaveLength(1);
      expect(result!.allowedDomains).toEqual(['example.com']);
    });

    it('should return null for non-existent organisation', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await getOrganizationById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    it('should update and return organisation', async () => {
      const existingOrg = { id: 'org-1', name: 'Old', slug: 'old' };
      const updatedOrg = { id: 'org-1', name: 'New', slug: 'new' };

      mockPrisma.organization.findUnique.mockResolvedValue(existingOrg);
      mockPrisma.organization.update.mockResolvedValue(updatedOrg);

      const result = await updateOrganization('org-1', { name: 'New', slug: 'new' });

      expect(result).toEqual(updatedOrg);
    });

    it('should return null if organisation not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await updateOrganization('non-existent', { name: 'New' });

      expect(result).toBeNull();
    });
  });

  describe('softDeleteOrganization', () => {
    it('should set deletedAt timestamp', async () => {
      const existingOrg = { id: 'org-1', deletedAt: null };
      mockPrisma.organization.findUnique.mockResolvedValue(existingOrg);
      mockPrisma.organization.update.mockResolvedValue({ ...existingOrg, deletedAt: new Date() });

      const result = await softDeleteOrganization('org-1');

      expect(result!.deletedAt).not.toBeNull();
    });

    it('should return null if organisation not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await softDeleteOrganization('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('restoreOrganization', () => {
    it('should set deletedAt to null', async () => {
      const deletedOrg = { id: 'org-1', deletedAt: new Date() };
      mockPrisma.organization.findUnique.mockResolvedValue(deletedOrg);
      mockPrisma.organization.update.mockResolvedValue({ ...deletedOrg, deletedAt: null });

      const result = await restoreOrganization('org-1');

      expect(result!.deletedAt).toBeNull();
    });

    it('should return null if organisation not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await restoreOrganization('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================
  // STATISTICS
  // ==========================================

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(85) // verified users
        .mockResolvedValueOnce(3); // super admins
      mockPrisma.organization.count
        .mockResolvedValueOnce(20) // total orgs
        .mockResolvedValueOnce(18); // active orgs

      const result = await getStats();

      expect(result).toEqual({
        users: { total: 100, verified: 85, superAdmins: 3 },
        organizations: { total: 20, active: 18 },
      });
    });
  });
});
