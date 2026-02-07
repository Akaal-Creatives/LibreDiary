import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { templatesService } from '../templates.service';

describe('Templates Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ templates: [] });

      await templatesService.getTemplates('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/templates');
    });

    it('should pass query params for category and search', async () => {
      mockApi.get.mockResolvedValue({ templates: [] });

      await templatesService.getTemplates('org-1', { category: 'Meeting', search: 'notes' });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/organizations/org-1/templates?category=Meeting&search=notes'
      );
    });
  });

  describe('getTemplate', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ template: { id: 'tpl-1' } });

      await templatesService.getTemplate('org-1', 'tpl-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/templates/tpl-1');
    });
  });

  describe('createTemplate', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ template: { id: 'tpl-1' } });

      await templatesService.createTemplate('org-1', { name: 'Meeting Notes' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/templates', {
        name: 'Meeting Notes',
      });
    });
  });

  describe('createTemplateFromPage', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ template: { id: 'tpl-1' } });

      await templatesService.createTemplateFromPage('org-1', {
        pageId: 'page-1',
        name: 'My Template',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/templates/from-page', {
        pageId: 'page-1',
        name: 'My Template',
      });
    });
  });

  describe('updateTemplate', () => {
    it('should PATCH to correct endpoint', async () => {
      mockApi.patch.mockResolvedValue({ template: { id: 'tpl-1', name: 'Updated' } });

      await templatesService.updateTemplate('org-1', 'tpl-1', { name: 'Updated' });

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/templates/tpl-1', {
        name: 'Updated',
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await templatesService.deleteTemplate('org-1', 'tpl-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/templates/tpl-1');
    });
  });

  describe('createPageFromTemplate', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ page: { id: 'page-1' } });

      await templatesService.createPageFromTemplate('org-1', 'tpl-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/templates/tpl-1/use', {});
    });

    it('should pass optional title and parentId', async () => {
      mockApi.post.mockResolvedValue({ page: { id: 'page-1' } });

      await templatesService.createPageFromTemplate('org-1', 'tpl-1', {
        title: 'Custom Title',
        parentId: 'parent-1',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/templates/tpl-1/use', {
        title: 'Custom Title',
        parentId: 'parent-1',
      });
    });
  });
});
