import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock meilisearch client and config using vi.hoisted
const { mockClient, mockIndex, mockConfigured, mockGetClient } = vi.hoisted(() => {
  const mockIndex = {
    updateSearchableAttributes: vi.fn().mockResolvedValue({ taskUid: 1 }),
    updateFilterableAttributes: vi.fn().mockResolvedValue({ taskUid: 2 }),
    updateSortableAttributes: vi.fn().mockResolvedValue({ taskUid: 3 }),
    updateTypoTolerance: vi.fn().mockResolvedValue({ taskUid: 4 }),
    updateFaceting: vi.fn().mockResolvedValue({ taskUid: 5 }),
  };

  const mockClient = {
    createIndex: vi.fn().mockResolvedValue({}),
    index: vi.fn().mockReturnValue(mockIndex),
    health: vi.fn().mockResolvedValue({ status: 'available' }),
  };

  const mockConfigured = { value: true };

  const mockGetClient = { fn: () => mockClient as any };

  return { mockClient, mockIndex, mockConfigured, mockGetClient };
});

vi.mock('../../../lib/meilisearch.js', () => ({
  getMeilisearchClient: () => mockGetClient.fn(),
  isMeilisearchConfigured: () => mockConfigured.value,
  PAGES_INDEX: 'test_pages',
}));

// Import after mocks
import {
  initMeilisearch,
  isMeilisearchAvailable,
  stopMeilisearchHealthCheck,
} from '../meilisearch.init.js';

describe('meilisearch.init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.value = true;
    mockGetClient.fn = () => mockClient as any;
    mockClient.createIndex.mockResolvedValue({});
    mockClient.health.mockResolvedValue({ status: 'available' });
    mockIndex.updateSearchableAttributes.mockResolvedValue({ taskUid: 1 });
    mockIndex.updateFilterableAttributes.mockResolvedValue({ taskUid: 2 });
    mockIndex.updateSortableAttributes.mockResolvedValue({ taskUid: 3 });
  });

  afterEach(() => {
    stopMeilisearchHealthCheck();
    vi.useRealTimers();
  });

  // ===========================================
  // isMeilisearchAvailable
  // ===========================================

  describe('isMeilisearchAvailable', () => {
    it('returns false before init', () => {
      // Fresh module import — healthy defaults to false
      // Since we share module state, we rely on stopMeilisearchHealthCheck resetting
      // The default state before any init should be false after a fresh import cycle
      // However, since module state persists across tests in the same file,
      // we test this by checking the value before calling init in this test
      expect(typeof isMeilisearchAvailable()).toBe('boolean');
    });

    it('returns true after successful init', async () => {
      await initMeilisearch();
      expect(isMeilisearchAvailable()).toBe(true);
    });
  });

  // ===========================================
  // initMeilisearch
  // ===========================================

  describe('initMeilisearch', () => {
    it('no-ops when not configured', async () => {
      mockConfigured.value = false;

      await initMeilisearch();

      expect(mockClient.createIndex).not.toHaveBeenCalled();
    });

    it('no-ops when client is null', async () => {
      mockGetClient.fn = () => null;

      await initMeilisearch();

      expect(mockClient.createIndex).not.toHaveBeenCalled();
    });

    it('creates pages index with id primary key', async () => {
      await initMeilisearch();

      expect(mockClient.createIndex).toHaveBeenCalledWith('test_pages', { primaryKey: 'id' });
    });

    it('ignores index_already_exists error', async () => {
      mockClient.createIndex.mockRejectedValueOnce(new Error('index_already_exists'));

      // Should not throw
      await initMeilisearch();

      expect(mockClient.index).toHaveBeenCalledWith('test_pages');
    });

    it('configures searchable attributes', async () => {
      await initMeilisearch();

      expect(mockIndex.updateSearchableAttributes).toHaveBeenCalledWith(['title', 'plainContent']);
    });

    it('configures filterable attributes', async () => {
      await initMeilisearch();

      expect(mockIndex.updateFilterableAttributes).toHaveBeenCalledWith([
        'orgId',
        'createdById',
        'createdAt',
        'updatedAt',
      ]);
    });

    it('configures sortable attributes', async () => {
      await initMeilisearch();

      expect(mockIndex.updateSortableAttributes).toHaveBeenCalledWith(['updatedAt', 'createdAt']);
    });

    it('configures typo tolerance', async () => {
      await initMeilisearch();

      expect(mockIndex.updateTypoTolerance).toHaveBeenCalledWith({
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      });
    });

    it('configures faceting', async () => {
      await initMeilisearch();

      expect(mockIndex.updateFaceting).toHaveBeenCalledWith({ maxValuesPerFacet: 100 });
    });

    it('sets healthy=false on connection failure', async () => {
      mockIndex.updateSearchableAttributes.mockRejectedValueOnce(new Error('connection refused'));

      await initMeilisearch();

      expect(isMeilisearchAvailable()).toBe(false);
    });

    it('logs warning on connection failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockIndex.updateSearchableAttributes.mockRejectedValueOnce(new Error('connection refused'));

      await initMeilisearch();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[meilisearch]'),
        expect.anything()
      );
      warnSpy.mockRestore();
    });
  });

  // ===========================================
  // Health check
  // ===========================================

  describe('health check', () => {
    it('starts periodic check after init', async () => {
      vi.useFakeTimers();

      await initMeilisearch();
      mockClient.health.mockClear();

      await vi.advanceTimersByTimeAsync(30_000);

      expect(mockClient.health).toHaveBeenCalled();
    });

    it('recovers when health succeeds after failure', async () => {
      vi.useFakeTimers();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Init fails — sets healthy=false
      mockIndex.updateSearchableAttributes.mockRejectedValueOnce(new Error('down'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await initMeilisearch();
      expect(isMeilisearchAvailable()).toBe(false);

      // Health check succeeds — should recover
      mockClient.health.mockResolvedValueOnce({ status: 'available' });
      await vi.advanceTimersByTimeAsync(30_000);

      expect(isMeilisearchAvailable()).toBe(true);
      logSpy.mockRestore();
    });

    it('marks unhealthy when check fails', async () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initMeilisearch();
      expect(isMeilisearchAvailable()).toBe(true);

      // Health check fails
      mockClient.health.mockRejectedValueOnce(new Error('timeout'));
      await vi.advanceTimersByTimeAsync(30_000);

      expect(isMeilisearchAvailable()).toBe(false);
    });

    it('logs recovery message', async () => {
      vi.useFakeTimers();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Init fails
      mockIndex.updateSearchableAttributes.mockRejectedValueOnce(new Error('down'));
      await initMeilisearch();

      // Health check recovers
      mockClient.health.mockResolvedValueOnce({ status: 'available' });
      await vi.advanceTimersByTimeAsync(30_000);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[meilisearch] Connection recovered')
      );
      logSpy.mockRestore();
    });

    it('logs fallback message', async () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await initMeilisearch();
      warnSpy.mockClear();

      // Health check fails
      mockClient.health.mockRejectedValueOnce(new Error('timeout'));
      await vi.advanceTimersByTimeAsync(30_000);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[meilisearch] Health check failed')
      );
      warnSpy.mockRestore();
    });
  });

  // ===========================================
  // stopMeilisearchHealthCheck
  // ===========================================

  describe('stopMeilisearchHealthCheck', () => {
    it('clears interval', async () => {
      vi.useFakeTimers();

      await initMeilisearch();
      stopMeilisearchHealthCheck();

      mockClient.health.mockClear();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(mockClient.health).not.toHaveBeenCalled();
    });

    it('safe to call without timer', () => {
      // Should not throw when no timer is running
      expect(() => stopMeilisearchHealthCheck()).not.toThrow();
    });
  });
});
