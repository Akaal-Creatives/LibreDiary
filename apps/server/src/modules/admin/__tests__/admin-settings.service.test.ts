import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockMaskApiKey } = vi.hoisted(() => {
  const mockPrismaSystemSettings = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  return {
    mockPrisma: {
      systemSettings: mockPrismaSystemSettings,
    },
    mockMaskApiKey: vi.fn((key: string) => {
      if (key.length <= 4) return '****';
      return `****${key.substring(key.length - 4)}`;
    }),
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../ai/ai.service.js', () => ({
  maskApiKey: mockMaskApiKey,
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
  aiEnabled: false,
  openrouterApiKey: 'sk-or-v1-abcdefg12345',
  openrouterModel: 'openai/gpt-4o-mini',
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
        aiEnabled: false,
        openrouterApiKey: '****2345',
        openrouterModel: 'openai/gpt-4o-mini',
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
        aiEnabled: false,
        openrouterApiKey: '****2345',
        openrouterModel: 'openai/gpt-4o-mini',
        updatedAt: sampleSettings.updatedAt,
      });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('setupCompleted');
    });

    it('should strip masked API key from update data', async () => {
      mockPrisma.systemSettings.upsert.mockResolvedValue(sampleSettings);

      await updateSettings({ openrouterApiKey: '****2345' });

      const upsertCall = mockPrisma.systemSettings.upsert.mock.calls[0]![0];
      expect(upsertCall.update).not.toHaveProperty('openrouterApiKey');
    });

    it('should pass through a new API key in update data', async () => {
      mockPrisma.systemSettings.upsert.mockResolvedValue(sampleSettings);

      await updateSettings({ openrouterApiKey: 'sk-or-v1-newkey12345' });

      const upsertCall = mockPrisma.systemSettings.upsert.mock.calls[0]![0];
      expect(upsertCall.update.openrouterApiKey).toBe('sk-or-v1-newkey12345');
    });

    it('should accept null to clear the API key', async () => {
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        ...sampleSettings,
        openrouterApiKey: null,
      });

      await updateSettings({ openrouterApiKey: null });

      const upsertCall = mockPrisma.systemSettings.upsert.mock.calls[0]![0];
      expect(upsertCall.update.openrouterApiKey).toBeNull();
    });
  });

  // ===========================================
  // AI fields in getSettings
  // ===========================================

  describe('AI fields', () => {
    it('should return AI fields with masked key', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(sampleSettings);

      const result = await getSettings();

      expect(result!.aiEnabled).toBe(false);
      expect(result!.openrouterApiKey).toBe('****2345');
      expect(result!.openrouterModel).toBe('openai/gpt-4o-mini');
    });

    it('should return null key when unset', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        ...sampleSettings,
        openrouterApiKey: null,
      });

      const result = await getSettings();

      expect(result!.openrouterApiKey).toBeNull();
    });
  });
});
