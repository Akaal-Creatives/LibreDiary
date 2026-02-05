import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockSystemSettings = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };

  const mockUser = {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  };

  const mockOrganization = {
    create: vi.fn(),
  };

  const mockOrganizationMember = {
    create: vi.fn(),
  };

  const mockPrisma = {
    systemSettings: mockSystemSettings,
    user: mockUser,
    organization: mockOrganization,
    organizationMember: mockOrganizationMember,
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  function resetMocks() {
    Object.values(mockSystemSettings).forEach((mock) => mock.mockReset());
    Object.values(mockUser).forEach((mock) => mock.mockReset());
    Object.values(mockOrganization).forEach((mock) => mock.mockReset());
    Object.values(mockOrganizationMember).forEach((mock) => mock.mockReset());
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  }

  return { mockPrisma, resetMocks };
});

// Mock prisma module BEFORE importing service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock argon2 for password hashing
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password_123'),
}));

// Import service AFTER mocking
import * as setupService from '../setup.service.js';

describe('Setup Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('checkSetupRequired', () => {
    it('should return true when no system settings exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const result = await setupService.checkSetupRequired();

      expect(result).toEqual({
        required: true,
        reason: 'NO_SETTINGS',
      });
    });

    it('should return true when setup not completed', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        setupCompleted: false,
      });

      const result = await setupService.checkSetupRequired();

      expect(result).toEqual({
        required: true,
        reason: 'SETUP_INCOMPLETE',
      });
    });

    it('should return false when setup is completed', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        setupCompleted: true,
        setupCompletedAt: new Date(),
      });

      const result = await setupService.checkSetupRequired();

      expect(result).toEqual({
        required: false,
      });
    });
  });

  describe('completeSetup', () => {
    const validInput = {
      admin: {
        email: 'admin@example.com',
        password: 'SecurePass123!',
        name: 'Admin User',
      },
      organization: {
        name: 'My Company',
        slug: 'my-company',
      },
      siteName: 'My LibreDiary',
    };

    it('should throw if setup is already completed', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        setupCompleted: true,
      });

      await expect(setupService.completeSetup(validInput)).rejects.toThrow(
        'Setup has already been completed'
      );
    });

    it('should throw if user with email already exists', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(setupService.completeSetup(validInput)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should create super admin, organization, and complete setup', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        isSuperAdmin: true,
      };

      const mockOrg = {
        id: 'org-123',
        name: 'My Company',
        slug: 'my-company',
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.organization.create.mockResolvedValue(mockOrg);
      mockPrisma.organizationMember.create.mockResolvedValue({});
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 'system',
        setupCompleted: true,
      });

      const result = await setupService.completeSetup(validInput);

      // Verify user created with super admin flag
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'admin@example.com',
          name: 'Admin User',
          isSuperAdmin: true,
          emailVerified: true,
        }),
      });

      // Verify organization created
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Company',
          slug: 'my-company',
        }),
      });

      // Verify membership created with OWNER role
      expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'OWNER',
        }),
      });

      // Verify settings updated
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'system' },
        create: expect.objectContaining({
          setupCompleted: true,
          siteName: 'My LibreDiary',
        }),
        update: expect.objectContaining({
          setupCompleted: true,
          siteName: 'My LibreDiary',
        }),
      });

      expect(result).toEqual({
        user: mockUser,
        organization: mockOrg,
      });
    });

    it('should use default site name if not provided', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-123' });
      mockPrisma.organization.create.mockResolvedValue({ id: 'org-123' });
      mockPrisma.organizationMember.create.mockResolvedValue({});
      mockPrisma.systemSettings.upsert.mockResolvedValue({});

      const inputWithoutSiteName = {
        admin: validInput.admin,
        organization: validInput.organization,
      };

      await setupService.completeSetup(inputWithoutSiteName);

      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'system' },
        create: expect.objectContaining({
          siteName: 'LibreDiary',
        }),
        update: expect.objectContaining({
          siteName: 'LibreDiary',
        }),
      });
    });
  });

  describe('getSystemSettings', () => {
    it('should return null if no settings exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const result = await setupService.getSystemSettings();

      expect(result).toBeNull();
    });

    it('should return settings if they exist', async () => {
      const settings = {
        id: 'system',
        siteName: 'My Site',
        setupCompleted: true,
      };
      mockPrisma.systemSettings.findUnique.mockResolvedValue(settings);

      const result = await setupService.getSystemSettings();

      expect(result).toEqual(settings);
    });
  });
});
