import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEncryptionService = vi.hoisted(() => ({
  encryptionService: {
    getStatus: vi.fn(),
    getData: vi.fn(),
  },
}));

vi.mock('../../services/encryption.service', () => mockEncryptionService);

import { useClientSearch } from '../useClientSearch';

describe('useClientSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('indexing', () => {
    it('should add documents to the index', () => {
      const { addDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Meeting Notes',
        plainContent: 'Discussed the quarterly roadmap with the team',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      const results = search('roadmap');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('page-1');
      expect(results[0].title).toBe('Meeting Notes');
    });

    it('should add multiple documents via addDocuments', () => {
      const { addDocuments, search } = useClientSearch();

      addDocuments([
        {
          id: 'page-1',
          title: 'Meeting Notes',
          plainContent: 'Quarterly roadmap discussion',
          icon: null,
          createdById: 'user-1',
          createdByName: 'Alice',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'page-2',
          title: 'Design Document',
          plainContent: 'Architecture overview for the new service',
          icon: null,
          createdById: 'user-2',
          createdByName: 'Bob',
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
      ]);

      const results = search('architecture');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('page-2');
    });

    it('should update existing documents via updateDocument', () => {
      const { addDocument, updateDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Old Title',
        plainContent: 'Old content about cats',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      updateDocument({
        id: 'page-1',
        title: 'New Title',
        plainContent: 'Updated content about dogs',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      });

      const catResults = search('cats');
      expect(catResults.length).toBe(0);

      const dogResults = search('dogs');
      expect(dogResults.length).toBe(1);
      expect(dogResults[0].title).toBe('New Title');
    });

    it('should remove documents from the index', () => {
      const { addDocument, removeDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Meeting Notes',
        plainContent: 'Important meeting notes',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      expect(search('meeting').length).toBe(1);

      removeDocument('page-1');
      expect(search('meeting').length).toBe(0);
    });
  });

  describe('search', () => {
    it('should return empty array for empty query', () => {
      const { search } = useClientSearch();
      expect(search('')).toEqual([]);
    });

    it('should search by title', () => {
      const { addDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Project Roadmap 2026',
        plainContent: 'Some content here',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      const results = search('roadmap');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Project Roadmap 2026');
    });

    it('should search by content', () => {
      const { addDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'General Notes',
        plainContent: 'The encryption algorithm uses AES-256-GCM',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      const results = search('encryption');
      expect(results.length).toBe(1);
    });

    it('should return results with SearchResult-compatible shape', () => {
      const { addDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Meeting Notes',
        plainContent: 'Discussed the quarterly roadmap',
        icon: '📝',
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      });

      const results = search('roadmap');
      expect(results.length).toBe(1);

      const result = results[0];
      expect(result).toHaveProperty('id', 'page-1');
      expect(result).toHaveProperty('title', 'Meeting Notes');
      expect(result).toHaveProperty('icon', '📝');
      expect(result).toHaveProperty('createdById', 'user-1');
      expect(result).toHaveProperty('createdByName', 'Alice');
      expect(result).toHaveProperty('createdAt', '2026-01-01T00:00:00Z');
      expect(result).toHaveProperty('updatedAt', '2026-01-02T00:00:00Z');
      expect(result).toHaveProperty('rank');
      expect(result).toHaveProperty('titleHighlight');
      expect(result).toHaveProperty('contentHighlight');
    });

    it('should support fuzzy matching', () => {
      const { addDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Architecture Document',
        plainContent: 'System architecture overview',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      // Typo: "architectur" (missing last letter)
      const results = search('architectur');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support prefix matching', () => {
      const { addDocument, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Development Guide',
        plainContent: 'Developer onboarding notes',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      const results = search('dev');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit option', () => {
      const { addDocuments, search } = useClientSearch();

      const docs = Array.from({ length: 20 }, (_, i) => ({
        id: `page-${i}`,
        title: `Meeting Notes ${i}`,
        plainContent: `Important discussion about project plans session ${i}`,
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }));

      addDocuments(docs);

      const results = search('meeting', { limit: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('clearIndex', () => {
    it('should remove all documents from the index', () => {
      const { addDocument, clearIndex, search } = useClientSearch();

      addDocument({
        id: 'page-1',
        title: 'Meeting Notes',
        plainContent: 'Important meeting',
        icon: null,
        createdById: 'user-1',
        createdByName: 'Alice',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      expect(search('meeting').length).toBe(1);

      clearIndex();
      expect(search('meeting').length).toBe(0);
    });
  });

  describe('indexSize', () => {
    it('should report the number of indexed documents', () => {
      const { addDocuments, indexSize } = useClientSearch();

      expect(indexSize.value).toBe(0);

      addDocuments([
        {
          id: 'page-1',
          title: 'Page 1',
          plainContent: 'Content 1',
          icon: null,
          createdById: 'user-1',
          createdByName: 'Alice',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'page-2',
          title: 'Page 2',
          plainContent: 'Content 2',
          icon: null,
          createdById: 'user-2',
          createdByName: 'Bob',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);

      expect(indexSize.value).toBe(2);
    });
  });
});
