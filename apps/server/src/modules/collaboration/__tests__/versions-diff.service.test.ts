import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted
const { mockPrisma, mockPrismaPageVersion, mockPrismaPage, mockYjsStateToText } = vi.hoisted(() => {
  const mockPrismaPageVersion = {
    findFirst: vi.fn(),
  };

  const mockPrismaPage = {
    findFirst: vi.fn(),
  };

  const mockPrisma = {
    pageVersion: mockPrismaPageVersion,
    page: mockPrismaPage,
  };

  return {
    mockPrisma,
    mockPrismaPageVersion,
    mockPrismaPage,
    mockYjsStateToText: vi.fn(),
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../utils/yjs-to-text.js', () => ({
  yjsStateToText: mockYjsStateToText,
}));

import { diffVersions } from '../versions.service.js';

describe('Version Diff Service', () => {
  const now = new Date();
  const yjsStateA = Buffer.from([1, 2, 3]);
  const yjsStateB = Buffer.from([4, 5, 6]);

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Current Title',
    yjsState: Buffer.from([7, 8, 9]),
    trashedAt: null,
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
  };

  const mockVersionA = {
    id: 'version-1',
    pageId: 'page-123',
    version: 1,
    title: 'First Version',
    yjsState: yjsStateA,
    createdById: 'user-123',
    createdAt: new Date('2024-01-01'),
  };

  const mockVersionB = {
    id: 'version-2',
    pageId: 'page-123',
    version: 2,
    title: 'Second Version',
    yjsState: yjsStateB,
    createdById: 'user-123',
    createdAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaPageVersion.findFirst.mockReset();
    mockPrismaPage.findFirst.mockReset();
    mockYjsStateToText.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // DIFF BETWEEN TWO VERSIONS
  // ===========================================

  describe('diffVersions', () => {
    it('should return diff between two versions', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(mockVersionB);
      mockYjsStateToText
        .mockReturnValueOnce('Line one\nLine two')
        .mockReturnValueOnce('Line one\nLine three');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      expect(result).toBeDefined();
      expect(result.from.versionId).toBe('version-1');
      expect(result.from.version).toBe(1);
      expect(result.to.versionId).toBe('version-2');
      expect(result.to.version).toBe(2);
    });

    it('should detect title changes', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(mockVersionB);
      mockYjsStateToText.mockReturnValue('same content');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      expect(result.titleChanged).toBe(true);
      expect(result.from.title).toBe('First Version');
      expect(result.to.title).toBe('Second Version');
    });

    it('should detect no title change', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      const sameTitle = { ...mockVersionB, title: 'First Version' };
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(sameTitle);
      mockYjsStateToText.mockReturnValue('content');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      expect(result.titleChanged).toBe(false);
    });

    it('should return changes array with added/removed/equal parts', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(mockVersionB);
      mockYjsStateToText
        .mockReturnValueOnce('Hello world\nKeep this line')
        .mockReturnValueOnce('Hello world\nNew line here');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      // Should have at least one change
      expect(result.changes.length).toBeGreaterThan(0);
      // Each change should have type and value
      for (const change of result.changes) {
        expect(['added', 'removed', 'equal']).toContain(change.type);
        expect(typeof change.value).toBe('string');
      }
    });

    it('should return stats with additions and deletions counts', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(mockVersionB);
      mockYjsStateToText
        .mockReturnValueOnce('Line one\nLine two\nLine three')
        .mockReturnValueOnce('Line one\nLine changed\nLine three\nLine four');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      expect(result.stats).toBeDefined();
      expect(typeof result.stats.additions).toBe('number');
      expect(typeof result.stats.deletions).toBe('number');
      expect(result.stats.additions).toBeGreaterThan(0);
      expect(result.stats.deletions).toBeGreaterThan(0);
    });

    it('should return empty changes when content is identical', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      const versionBSameTitle = { ...mockVersionB, title: 'First Version' };
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(versionBSameTitle);
      mockYjsStateToText.mockReturnValue('identical content');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      expect(result.stats.additions).toBe(0);
      expect(result.stats.deletions).toBe(0);
      // All changes should be 'equal' type
      for (const change of result.changes) {
        expect(change.type).toBe('equal');
      }
    });

    it('should compare version against current page state when compareWith is "current"', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValueOnce(mockVersionA);
      mockYjsStateToText.mockReturnValueOnce('old content').mockReturnValueOnce('current content');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'current');

      expect(result.to.versionId).toBe('current');
      expect(result.to.title).toBe('Current Title');
      expect(mockYjsStateToText).toHaveBeenCalledTimes(2);
    });

    it('should handle null yjsState gracefully', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      const versionNoYjs = { ...mockVersionA, yjsState: null };
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(versionNoYjs)
        .mockResolvedValueOnce(mockVersionB);
      mockYjsStateToText.mockReturnValueOnce('some content');

      const result = await diffVersions('org-123', 'page-123', 'version-1', 'version-2');

      // Should not throw, and yjsStateToText should only be called for the non-null version
      expect(result).toBeDefined();
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        diffVersions('org-123', 'nonexistent', 'version-1', 'version-2')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw VERSION_NOT_FOUND if from version does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValueOnce(null);

      await expect(diffVersions('org-123', 'page-123', 'nonexistent', 'version-2')).rejects.toThrow(
        'VERSION_NOT_FOUND'
      );
    });

    it('should throw VERSION_NOT_FOUND if to version does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(null);

      await expect(diffVersions('org-123', 'page-123', 'version-1', 'nonexistent')).rejects.toThrow(
        'VERSION_NOT_FOUND'
      );
    });
  });
});
