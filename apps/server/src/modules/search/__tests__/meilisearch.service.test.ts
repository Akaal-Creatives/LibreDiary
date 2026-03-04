import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}));
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock meilisearch client
const mockAddDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
const mockDeleteDocument = vi.fn().mockResolvedValue({ taskUid: 2 });
const mockIndex = vi.fn(() => ({
  addDocuments: mockAddDocuments,
  deleteDocument: mockDeleteDocument,
}));

const { mockAvailable, resetMeilisearchMocks } = vi.hoisted(() => {
  const state = { available: true };
  return {
    mockAvailable: state,
    resetMeilisearchMocks: () => {
      state.available = true;
    },
  };
});

vi.mock('../../../lib/meilisearch.js', () => ({
  getMeilisearchClient: () => ({
    index: mockIndex,
  }),
  PAGES_INDEX: 'test_pages',
}));

vi.mock('../meilisearch.init.js', () => ({
  isMeilisearchAvailable: () => mockAvailable.available,
}));

import {
  indexPage,
  removePage,
  bulkIndex,
  type MeiliPageDocument,
} from '../meilisearch.service.js';

const testDoc: MeiliPageDocument = {
  id: 'page-1',
  title: 'Test Page',
  plainContent: 'Hello world',
  orgId: 'org-1',
  createdById: 'user-1',
  createdAt: 1700000000,
  updatedAt: 1700000000,
};

describe('meilisearch.service', () => {
  beforeEach(() => {
    resetMeilisearchMocks();
    mockAddDocuments.mockClear();
    mockDeleteDocument.mockClear();
    mockIndex.mockClear();
    mockLoggerError.mockClear();
  });

  describe('indexPage', () => {
    it('adds a document to the index', async () => {
      await indexPage(testDoc);
      expect(mockIndex).toHaveBeenCalledWith('test_pages');
      expect(mockAddDocuments).toHaveBeenCalledWith([testDoc]);
    });

    it('does nothing when Meilisearch is not available', async () => {
      mockAvailable.available = false;
      await indexPage(testDoc);
      expect(mockAddDocuments).not.toHaveBeenCalled();
    });

    it('catches and logs errors without throwing', async () => {
      mockAddDocuments.mockRejectedValueOnce(new Error('connection refused'));
      await indexPage(testDoc); // Should not throw
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('removePage', () => {
    it('removes a document from the index', async () => {
      await removePage('page-1');
      expect(mockIndex).toHaveBeenCalledWith('test_pages');
      expect(mockDeleteDocument).toHaveBeenCalledWith('page-1');
    });

    it('does nothing when Meilisearch is not available', async () => {
      mockAvailable.available = false;
      await removePage('page-1');
      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });

    it('catches and logs errors without throwing', async () => {
      mockDeleteDocument.mockRejectedValueOnce(new Error('not found'));
      await removePage('page-1'); // Should not throw
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('bulkIndex', () => {
    it('adds multiple documents', async () => {
      const docs = [testDoc, { ...testDoc, id: 'page-2' }];
      await bulkIndex(docs);
      expect(mockAddDocuments).toHaveBeenCalledWith(docs);
    });

    it('does nothing for empty array', async () => {
      await bulkIndex([]);
      expect(mockAddDocuments).not.toHaveBeenCalled();
    });

    it('does nothing when Meilisearch is not available', async () => {
      mockAvailable.available = false;
      await bulkIndex([testDoc]);
      expect(mockAddDocuments).not.toHaveBeenCalled();
    });
  });
});
