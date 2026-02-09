import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTemplatesStore } from '../templates';
import { templatesService } from '@/services/templates.service';

vi.mock('@/services/templates.service', () => ({
  templatesService: {
    getTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    createTemplateFromPage: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    createPageFromTemplate: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock auth store
vi.mock('../auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

const mockedService = vi.mocked(templatesService);

describe('useTemplatesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ===========================================
  // FETCH TEMPLATES
  // ===========================================

  describe('fetchTemplates', () => {
    it('should populate templates list', async () => {
      const mockTemplates = [
        {
          id: 'tpl-1',
          organizationId: 'org-1',
          name: 'Meeting Notes',
          description: 'For meetings',
          icon: null,
          category: 'Meeting',
          isBuiltIn: true,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'tpl-2',
          organizationId: 'org-1',
          name: 'Project Plan',
          description: null,
          icon: null,
          category: 'Project',
          isBuiltIn: false,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
      ];

      mockedService.getTemplates.mockResolvedValue({ templates: mockTemplates });

      const store = useTemplatesStore();
      await store.fetchTemplates();

      expect(store.templates).toHaveLength(2);
      expect(store.templates[0]?.name).toBe('Meeting Notes');
    });

    it('should set loading state', async () => {
      mockedService.getTemplates.mockResolvedValue({ templates: [] });

      const store = useTemplatesStore();
      const promise = store.fetchTemplates();

      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });
  });

  // ===========================================
  // CREATE TEMPLATE
  // ===========================================

  describe('createTemplate', () => {
    it('should add template to list', async () => {
      const newTemplate = {
        id: 'tpl-new',
        organizationId: 'org-1',
        name: 'New Template',
        description: null,
        icon: null,
        category: null,
        isBuiltIn: false,
        createdById: 'user-1',
        createdAt: '',
        updatedAt: '',
      };

      mockedService.createTemplate.mockResolvedValue({ template: newTemplate });

      const store = useTemplatesStore();
      const result = await store.createTemplate({ name: 'New Template' });

      expect(result).toEqual(newTemplate);
      expect(store.templates).toContainEqual(newTemplate);
    });
  });

  // ===========================================
  // CREATE FROM PAGE
  // ===========================================

  describe('createTemplateFromPage', () => {
    it('should create template from page and add to list', async () => {
      const newTemplate = {
        id: 'tpl-from-page',
        organizationId: 'org-1',
        name: 'Page Template',
        description: null,
        icon: '📝',
        category: null,
        isBuiltIn: false,
        createdById: 'user-1',
        createdAt: '',
        updatedAt: '',
      };

      mockedService.createTemplateFromPage.mockResolvedValue({ template: newTemplate });

      const store = useTemplatesStore();
      const result = await store.createTemplateFromPage({
        pageId: 'page-1',
        name: 'Page Template',
      });

      expect(result).toEqual(newTemplate);
      expect(store.templates).toContainEqual(newTemplate);
    });
  });

  // ===========================================
  // UPDATE TEMPLATE
  // ===========================================

  describe('updateTemplate', () => {
    it('should update template in list', async () => {
      const original = {
        id: 'tpl-1',
        organizationId: 'org-1',
        name: 'Old Name',
        description: null,
        icon: null,
        category: null,
        isBuiltIn: false,
        createdById: 'user-1',
        createdAt: '',
        updatedAt: '',
      };

      const updated = { ...original, name: 'New Name' };

      mockedService.getTemplates.mockResolvedValue({ templates: [original] });
      mockedService.updateTemplate.mockResolvedValue({ template: updated });

      const store = useTemplatesStore();
      await store.fetchTemplates();
      await store.updateTemplate('tpl-1', { name: 'New Name' });

      expect(store.templates[0]?.name).toBe('New Name');
    });
  });

  // ===========================================
  // DELETE TEMPLATE
  // ===========================================

  describe('deleteTemplate', () => {
    it('should remove template from list', async () => {
      const template = {
        id: 'tpl-1',
        organizationId: 'org-1',
        name: 'To Delete',
        description: null,
        icon: null,
        category: null,
        isBuiltIn: false,
        createdById: 'user-1',
        createdAt: '',
        updatedAt: '',
      };

      mockedService.getTemplates.mockResolvedValue({ templates: [template] });
      mockedService.deleteTemplate.mockResolvedValue({ message: 'deleted' });

      const store = useTemplatesStore();
      await store.fetchTemplates();
      expect(store.templates).toHaveLength(1);

      await store.deleteTemplate('tpl-1');
      expect(store.templates).toHaveLength(0);
    });
  });

  // ===========================================
  // CREATE PAGE FROM TEMPLATE
  // ===========================================

  describe('createPageFromTemplate', () => {
    it('should call service and return page', async () => {
      const mockPage = {
        id: 'page-new',
        organizationId: 'org-1',
        parentId: null,
        position: 0,
        title: 'Meeting Notes',
        icon: '📝',
        coverUrl: null,
        htmlContent: null,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdById: 'user-1',
        updatedById: null,
        createdAt: '',
        updatedAt: '',
      };

      mockedService.createPageFromTemplate.mockResolvedValue({ page: mockPage });

      const store = useTemplatesStore();
      const result = await store.createPageFromTemplate('tpl-1');

      expect(result).toEqual(mockPage);
      expect(mockedService.createPageFromTemplate).toHaveBeenCalledWith(
        'org-1',
        'tpl-1',
        undefined
      );
    });
  });

  // ===========================================
  // FILTERED TEMPLATES
  // ===========================================

  describe('filteredTemplates', () => {
    it('should filter by category', async () => {
      const templates = [
        {
          id: 'tpl-1',
          organizationId: 'org-1',
          name: 'Meeting Notes',
          description: null,
          icon: null,
          category: 'Meeting',
          isBuiltIn: true,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'tpl-2',
          organizationId: 'org-1',
          name: 'Project Plan',
          description: null,
          icon: null,
          category: 'Project',
          isBuiltIn: false,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
      ];

      mockedService.getTemplates.mockResolvedValue({ templates });

      const store = useTemplatesStore();
      await store.fetchTemplates();

      store.categoryFilter = 'Meeting';
      expect(store.filteredTemplates).toHaveLength(1);
      expect(store.filteredTemplates[0]?.name).toBe('Meeting Notes');
    });

    it('should filter by search query', async () => {
      const templates = [
        {
          id: 'tpl-1',
          organizationId: 'org-1',
          name: 'Meeting Notes',
          description: 'For team meetings',
          icon: null,
          category: 'Meeting',
          isBuiltIn: true,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'tpl-2',
          organizationId: 'org-1',
          name: 'Project Plan',
          description: null,
          icon: null,
          category: 'Project',
          isBuiltIn: false,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
      ];

      mockedService.getTemplates.mockResolvedValue({ templates });

      const store = useTemplatesStore();
      await store.fetchTemplates();

      store.searchQuery = 'meeting';
      expect(store.filteredTemplates).toHaveLength(1);
      expect(store.filteredTemplates[0]?.name).toBe('Meeting Notes');
    });
  });

  // ===========================================
  // RESET
  // ===========================================

  describe('reset', () => {
    it('should clear all state', async () => {
      const templates = [
        {
          id: 'tpl-1',
          organizationId: 'org-1',
          name: 'Test',
          description: null,
          icon: null,
          category: 'Meeting',
          isBuiltIn: false,
          createdById: 'user-1',
          createdAt: '',
          updatedAt: '',
        },
      ];

      mockedService.getTemplates.mockResolvedValue({ templates });

      const store = useTemplatesStore();
      await store.fetchTemplates();
      store.categoryFilter = 'Meeting';
      store.searchQuery = 'test';

      store.reset();

      expect(store.templates).toHaveLength(0);
      expect(store.categoryFilter).toBeNull();
      expect(store.searchQuery).toBe('');
      expect(store.loading).toBe(false);
    });
  });
});
