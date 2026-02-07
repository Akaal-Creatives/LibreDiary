import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-123';
  }),
}));

// Mock service
const { mockService, resetMocks } = vi.hoisted(() => {
  const mockService = {
    createTemplate: vi.fn(),
    createTemplateFromPage: vi.fn(),
    getTemplates: vi.fn(),
    getTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    createPageFromTemplate: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockService).forEach((mock) => mock.mockReset());
  }

  return { mockService, resetMocks };
});

vi.mock('../templates.service.js', () => mockService);

import Fastify from 'fastify';
import { templatesRoutes } from '../templates.routes.js';

describe('Templates Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(templatesRoutes, { prefix: '/organizations/:orgId/templates' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // POST / — Create template
  // ===========================================

  describe('POST /organizations/:orgId/templates', () => {
    it('should create a template and return 201', async () => {
      const mockTemplate = { id: 'tpl-1', name: 'Meeting Notes', category: 'Meeting' };
      mockService.createTemplate.mockResolvedValue(mockTemplate);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates',
        payload: { name: 'Meeting Notes', category: 'Meeting' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.template.name).toBe('Meeting Notes');
    });

    it('should return 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ===========================================
  // POST /from-page — Create template from page
  // ===========================================

  describe('POST /organizations/:orgId/templates/from-page', () => {
    it('should create a template from a page and return 201', async () => {
      const mockTemplate = { id: 'tpl-1', name: 'My Page Template' };
      mockService.createTemplateFromPage.mockResolvedValue(mockTemplate);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates/from-page',
        payload: { pageId: 'page-1', name: 'My Page Template' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.template.name).toBe('My Page Template');
    });

    it('should return 400 for missing pageId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates/from-page',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when page not found', async () => {
      mockService.createTemplateFromPage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates/from-page',
        payload: { pageId: 'page-999' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // GET / — List templates
  // ===========================================

  describe('GET /organizations/:orgId/templates', () => {
    it('should list templates', async () => {
      mockService.getTemplates.mockResolvedValue([{ id: 'tpl-1' }, { id: 'tpl-2' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/templates',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.templates).toHaveLength(2);
    });

    it('should pass category filter to service', async () => {
      mockService.getTemplates.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/organizations/org-123/templates?category=Meeting',
      });

      expect(mockService.getTemplates).toHaveBeenCalledWith('org-123', {
        category: 'Meeting',
        search: undefined,
      });
    });

    it('should pass search filter to service', async () => {
      mockService.getTemplates.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/organizations/org-123/templates?search=meeting',
      });

      expect(mockService.getTemplates).toHaveBeenCalledWith('org-123', {
        category: undefined,
        search: 'meeting',
      });
    });
  });

  // ===========================================
  // GET /:templateId — Get single template
  // ===========================================

  describe('GET /organizations/:orgId/templates/:templateId', () => {
    it('should return a template', async () => {
      mockService.getTemplate.mockResolvedValue({ id: 'tpl-1', name: 'Meeting Notes' });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/templates/tpl-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.template.id).toBe('tpl-1');
    });

    it('should return 404 when template not found', async () => {
      mockService.getTemplate.mockRejectedValue(new Error('TEMPLATE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/templates/tpl-999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // PATCH /:templateId — Update template
  // ===========================================

  describe('PATCH /organizations/:orgId/templates/:templateId', () => {
    it('should update a template', async () => {
      mockService.updateTemplate.mockResolvedValue({ id: 'tpl-1', name: 'Updated' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/templates/tpl-1',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.template.name).toBe('Updated');
    });

    it('should return 404 when template not found', async () => {
      mockService.updateTemplate.mockRejectedValue(new Error('TEMPLATE_NOT_FOUND'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/templates/tpl-999',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // DELETE /:templateId — Delete template
  // ===========================================

  describe('DELETE /organizations/:orgId/templates/:templateId', () => {
    it('should delete a template', async () => {
      mockService.deleteTemplate.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/templates/tpl-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 when trying to delete built-in', async () => {
      mockService.deleteTemplate.mockRejectedValue(new Error('CANNOT_DELETE_BUILTIN'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/templates/tpl-1',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // POST /:templateId/use — Create page from template
  // ===========================================

  describe('POST /organizations/:orgId/templates/:templateId/use', () => {
    it('should create a page from template and return 201', async () => {
      const mockPage = { id: 'page-1', title: 'Meeting Notes' };
      mockService.createPageFromTemplate.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates/tpl-1/use',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.page.title).toBe('Meeting Notes');
    });

    it('should return 404 when template not found', async () => {
      mockService.createPageFromTemplate.mockRejectedValue(new Error('TEMPLATE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/templates/tpl-999/use',
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
