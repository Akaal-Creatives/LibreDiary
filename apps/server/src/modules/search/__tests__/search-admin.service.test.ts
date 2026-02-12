import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies using vi.hoisted
const {
  mockPrisma,
  mockBulkIndex,
  mockInitMeilisearch,
  mockIsMeilisearchAvailable,
  mockStopHealthCheck,
  mockHtmlToText,
  mockYjsStateToText,
} = vi.hoisted(() => {
  const mockPrisma = {
    page: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    mockPrisma,
    mockBulkIndex: vi.fn().mockResolvedValue(undefined),
    mockInitMeilisearch: vi.fn().mockResolvedValue(undefined),
    mockIsMeilisearchAvailable: vi.fn().mockReturnValue(true),
    mockStopHealthCheck: vi.fn(),
    mockHtmlToText: vi.fn().mockReturnValue('plain text from html'),
    mockYjsStateToText: vi.fn().mockReturnValue('plain text from yjs'),
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../meilisearch.service.js', () => ({
  bulkIndex: mockBulkIndex,
}));

vi.mock('../meilisearch.init.js', () => ({
  initMeilisearch: mockInitMeilisearch,
  isMeilisearchAvailable: mockIsMeilisearchAvailable,
  stopMeilisearchHealthCheck: mockStopHealthCheck,
}));

vi.mock('../../../utils/html-to-text.js', () => ({
  htmlToText: mockHtmlToText,
}));

vi.mock('../../../utils/yjs-to-text.js', () => ({
  yjsStateToText: mockYjsStateToText,
}));

// Import after mocks
import { triggerReindex, getReindexStatus } from '../search-admin.service.js';

describe('search-admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.page.count.mockReset().mockResolvedValue(0);
    mockPrisma.page.findMany.mockReset().mockResolvedValue([]);
    mockBulkIndex.mockReset().mockResolvedValue(undefined);
  });

  describe('getReindexStatus', () => {
    it('returns not running initially', () => {
      const status = getReindexStatus();
      expect(status.running).toBe(false);
      expect(status.progress).toBeNull();
    });
  });

  describe('triggerReindex', () => {
    it('throws when already running', async () => {
      // Start a long-running reindex
      mockPrisma.page.count.mockResolvedValue(1000);
      mockPrisma.page.findMany.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 1000);
          })
      );

      const first = triggerReindex();

      await expect(triggerReindex()).rejects.toThrow('REINDEX_IN_PROGRESS');

      // Clean up the first reindex
      await first;
    });

    it('processes all pages in batches', async () => {
      mockPrisma.page.count.mockResolvedValue(1200);

      const makePage = (id: string) => ({
        id,
        title: `Page ${id}`,
        plainContent: 'content',
        htmlContent: null,
        yjsState: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      // First batch: 500 pages
      const batch1 = Array.from({ length: 500 }, (_, i) => makePage(`p-${i}`));
      // Second batch: 500 pages
      const batch2 = Array.from({ length: 500 }, (_, i) => makePage(`p-${500 + i}`));
      // Third batch: 200 pages
      const batch3 = Array.from({ length: 200 }, (_, i) => makePage(`p-${1000 + i}`));

      mockPrisma.page.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3)
        .mockResolvedValueOnce([]); // Signal end

      await triggerReindex();

      expect(mockBulkIndex).toHaveBeenCalledTimes(3);
    });

    it('returns totalIndexed and durationMs', async () => {
      mockPrisma.page.count.mockResolvedValue(2);

      const pages = [
        {
          id: 'p-1',
          title: 'Page 1',
          plainContent: 'content 1',
          htmlContent: null,
          yjsState: null,
          organizationId: 'org-1',
          createdById: 'user-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'p-2',
          title: 'Page 2',
          plainContent: 'content 2',
          htmlContent: null,
          yjsState: null,
          organizationId: 'org-1',
          createdById: 'user-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValueOnce(pages).mockResolvedValueOnce([]);

      const result = await triggerReindex();

      expect(result).toHaveProperty('totalIndexed');
      expect(result).toHaveProperty('durationMs');
      expect(result.totalIndexed).toBe(2);
      expect(typeof result.durationMs).toBe('number');
    });

    it('resets running state on completion', async () => {
      mockPrisma.page.count.mockResolvedValue(0);
      mockPrisma.page.findMany.mockResolvedValueOnce([]);

      await triggerReindex();

      expect(getReindexStatus().running).toBe(false);
    });

    it('resets running state on error', async () => {
      mockPrisma.page.count.mockResolvedValue(1);
      mockPrisma.page.findMany.mockResolvedValueOnce([
        {
          id: 'p-1',
          title: 'Page 1',
          plainContent: 'content',
          htmlContent: null,
          yjsState: null,
          organizationId: 'org-1',
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockBulkIndex.mockRejectedValueOnce(new Error('bulk failed'));

      await expect(triggerReindex()).rejects.toThrow('bulk failed');

      expect(getReindexStatus().running).toBe(false);
    });

    it('builds MeiliPageDocument correctly', async () => {
      mockPrisma.page.count.mockResolvedValue(1);

      const page = {
        id: 'page-123',
        title: 'Test Title',
        plainContent: 'plain text content',
        htmlContent: null,
        yjsState: null,
        organizationId: 'org-456',
        createdById: 'user-789',
        createdAt: new Date('2024-06-15T10:30:00Z'),
        updatedAt: new Date('2024-06-16T12:00:00Z'),
      };

      mockPrisma.page.findMany.mockResolvedValueOnce([page]).mockResolvedValueOnce([]);

      await triggerReindex();

      expect(mockBulkIndex).toHaveBeenCalledWith([
        {
          id: 'page-123',
          title: 'Test Title',
          plainContent: 'plain text content',
          orgId: 'org-456',
          createdById: 'user-789',
          createdAt: Math.floor(new Date('2024-06-15T10:30:00Z').getTime() / 1000),
          updatedAt: Math.floor(new Date('2024-06-16T12:00:00Z').getTime() / 1000),
        },
      ]);
    });
  });
});
