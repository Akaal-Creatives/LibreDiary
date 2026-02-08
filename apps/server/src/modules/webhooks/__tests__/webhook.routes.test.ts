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

// Mock services
const { mockWebhookService, mockDeliveryService, resetMocks } = vi.hoisted(() => {
  const mockWebhookService = {
    createWebhook: vi.fn(),
    listWebhooks: vi.fn(),
    getWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
  };

  const mockDeliveryService = {
    testWebhook: vi.fn(),
    listDeliveries: vi.fn(),
    triggerWebhooks: vi.fn(),
    executeDelivery: vi.fn(),
    retryFailedDeliveries: vi.fn(),
    generateSignature: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockWebhookService).forEach((m) => m.mockReset());
    Object.values(mockDeliveryService).forEach((m) => m.mockReset());
  }

  return { mockWebhookService, mockDeliveryService, resetMocks };
});

vi.mock('../webhook.service.js', () => mockWebhookService);
vi.mock('../webhook-delivery.service.js', () => mockDeliveryService);

import Fastify from 'fastify';
import { webhookRoutes } from '../webhook.routes.js';

describe('Webhook Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(webhookRoutes, { prefix: '/organizations/:orgId/webhooks' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // GET / — List webhooks
  // ===========================================

  describe('GET /organizations/:orgId/webhooks', () => {
    it('should return list of webhooks', async () => {
      const webhooks = [
        { id: 'wh-1', name: 'Hook 1' },
        { id: 'wh-2', name: 'Hook 2' },
      ];
      mockWebhookService.listWebhooks.mockResolvedValue(webhooks);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/webhooks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.webhooks).toEqual(webhooks);
    });
  });

  // ===========================================
  // POST / — Create webhook
  // ===========================================

  describe('POST /organizations/:orgId/webhooks', () => {
    it('should create a webhook and return 201', async () => {
      const mockWebhook = { id: 'wh-1', name: 'My Hook' };
      mockWebhookService.createWebhook.mockResolvedValue(mockWebhook);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/webhooks',
        payload: {
          name: 'My Hook',
          url: 'https://example.com/hook',
          events: ['page.created'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.webhook.name).toBe('My Hook');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/webhooks',
        payload: { name: 'Hook' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/webhooks',
        payload: {
          name: 'Hook',
          url: 'not-a-url',
          events: ['page.created'],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for empty events array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/webhooks',
        payload: {
          name: 'Hook',
          url: 'https://example.com/hook',
          events: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // GET /:webhookId — Get webhook
  // ===========================================

  describe('GET /organizations/:orgId/webhooks/:webhookId', () => {
    it('should return a webhook', async () => {
      mockWebhookService.getWebhook.mockResolvedValue({ id: 'wh-1', name: 'Hook' });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/webhooks/wh-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.webhook.id).toBe('wh-1');
    });

    it('should return 404 when not found', async () => {
      mockWebhookService.getWebhook.mockRejectedValue(new Error('Webhook not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/webhooks/wh-999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // PUT /:webhookId — Update webhook
  // ===========================================

  describe('PUT /organizations/:orgId/webhooks/:webhookId', () => {
    it('should update a webhook', async () => {
      mockWebhookService.updateWebhook.mockResolvedValue({
        id: 'wh-1',
        name: 'Updated',
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/organizations/org-123/webhooks/wh-1',
        payload: { name: 'Updated', isActive: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.webhook.name).toBe('Updated');
    });

    it('should return 404 when not found', async () => {
      mockWebhookService.updateWebhook.mockRejectedValue(new Error('Webhook not found'));

      const response = await app.inject({
        method: 'PUT',
        url: '/organizations/org-123/webhooks/wh-999',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // DELETE /:webhookId — Delete webhook
  // ===========================================

  describe('DELETE /organizations/:orgId/webhooks/:webhookId', () => {
    it('should delete a webhook', async () => {
      mockWebhookService.deleteWebhook.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/webhooks/wh-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 when not found', async () => {
      mockWebhookService.deleteWebhook.mockRejectedValue(new Error('Webhook not found'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/webhooks/wh-999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // POST /:webhookId/test — Test webhook
  // ===========================================

  describe('POST /organizations/:orgId/webhooks/:webhookId/test', () => {
    it('should send a test delivery', async () => {
      mockDeliveryService.testWebhook.mockResolvedValue({
        id: 'del-1',
        status: 'SUCCESS',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/webhooks/wh-1/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.delivery.status).toBe('SUCCESS');
    });

    it('should return 404 when webhook not found', async () => {
      mockDeliveryService.testWebhook.mockRejectedValue(new Error('Webhook not found'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/webhooks/wh-999/test',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // GET /:webhookId/deliveries — List deliveries
  // ===========================================

  describe('GET /organizations/:orgId/webhooks/:webhookId/deliveries', () => {
    it('should return delivery log with pagination', async () => {
      mockDeliveryService.listDeliveries.mockResolvedValue({
        deliveries: [{ id: 'del-1', status: 'SUCCESS' }],
        total: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/webhooks/wh-1/deliveries?limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deliveries).toHaveLength(1);
      expect(body.data.total).toBe(1);
    });

    it('should return 404 when webhook not found', async () => {
      mockDeliveryService.listDeliveries.mockRejectedValue(new Error('Webhook not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/webhooks/wh-999/deliveries',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
