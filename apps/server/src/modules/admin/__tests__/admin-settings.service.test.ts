import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrismaSystemSettings = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  return {
    mockPrisma: {
      systemSettings: mockPrismaSystemSettings,
    },
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { getSettings, updateSettings } from '../admin.service.js';

const sampleSettings = {
  id: 'system',
  setupCompleted: true,
  setupCompletedAt: new Date('2025-01-01'),
  setupCompletedBy: 'admin-1',
  siteName: 'LibreDiary',
  allowSignups: false,
  requireEmailVerification: true,
  sessionMaxAge: 604800000,
  maxOrganisationsPerUser: 0,
  defaultUserLocale: 'en',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
};

describe('Admin Settings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // getSettings
  // ===========================================

  describe('getSettings', () => {
    it('should return curated settings (excludes setup fields) when they exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(sampleSettings);

      const result = await getSettings();

      expect(result).not.toBeNull();
      expect(result).toEqual({
        siteName: 'LibreDiary',
        allowSignups: false,
        requireEmailVerification: true,
        sessionMaxAge: 604800000,
        maxOrganisationsPerUser: 0,
        defaultUserLocale: 'en',
        updatedAt: sampleSettings.updatedAt,
      });
    });

    it('should not include setup fields in the response', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(sampleSettings);

      const result = await getSettings();

      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('setupCompleted');
      expect(result).not.toHaveProperty('setupCompletedAt');
      expect(result).not.toHaveProperty('setupCompletedBy');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should return null when no settings exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const result = await getSettings();

      expect(result).toBeNull();
    });

    it('should call prisma.systemSettings.findUnique with correct where clause', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(sampleSettings);

      await getSettings();

      expect(mockPrisma.systemSettings.findUnique).toHaveBeenCalledWith({
        where: { id: 'system' },
      });
    });
  });

  // ===========================================
  // updateSettings
  // ===========================================

  describe('updateSettings', () => {
    it('should call prisma.systemSettings.upsert with correct data', async () => {
      const updateData = { siteName: 'My Diary', allowSignups: true };
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        ...sampleSettings,
        ...updateData,
      });

      await updateSettings(updateData);

      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'system' },
        update: updateData,
        create: { id: 'system', ...updateData },
      });
    });

    it('should work with partial fields (only siteName)', async () => {
      const updateData = { siteName: 'New Name' };
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        ...sampleSettings,
        siteName: 'New Name',
      });

      const result = await updateSettings(updateData);

      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'system' },
        update: updateData,
        create: { id: 'system', ...updateData },
      });
      expect(result!.siteName).toBe('New Name');
    });

    it('should return curated response (excludes setup fields)', async () => {
      mockPrisma.systemSettings.upsert.mockResolvedValue(sampleSettings);

      const result = await updateSettings({ siteName: 'LibreDiary' });

      expect(result).toEqual({
        siteName: 'LibreDiary',
        allowSignups: false,
        requireEmailVerification: true,
        sessionMaxAge: 604800000,
        maxOrganisationsPerUser: 0,
        defaultUserLocale: 'en',
        updatedAt: sampleSettings.updatedAt,
      });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('setupCompleted');
    });
  });
});
