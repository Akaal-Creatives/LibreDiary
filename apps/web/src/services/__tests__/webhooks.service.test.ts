import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { webhooksService } from '../webhooks.service';

describe('Webhooks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWebhooks', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ webhooks: [] });

      await webhooksService.listWebhooks('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/webhooks');
    });
  });

  describe('createWebhook', () => {
    it('should POST to correct endpoint', async () => {
      const input = { name: 'Hook', url: 'https://example.com', events: ['page.created'] };
      mockApi.post.mockResolvedValue({ webhook: { id: 'wh-1' } });

      await webhooksService.createWebhook('org-1', input);

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/webhooks', input);
    });
  });

  describe('getWebhook', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ webhook: { id: 'wh-1' } });

      await webhooksService.getWebhook('org-1', 'wh-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/webhooks/wh-1');
    });
  });

  describe('updateWebhook', () => {
    it('should PUT to correct endpoint', async () => {
      mockApi.put.mockResolvedValue({ webhook: { id: 'wh-1' } });

      await webhooksService.updateWebhook('org-1', 'wh-1', { name: 'Updated' });

      expect(mockApi.put).toHaveBeenCalledWith('/organizations/org-1/webhooks/wh-1', {
        name: 'Updated',
      });
    });
  });

  describe('deleteWebhook', () => {
    it('should DELETE from correct endpoint', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await webhooksService.deleteWebhook('org-1', 'wh-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/webhooks/wh-1');
    });
  });

  describe('testWebhook', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ delivery: { id: 'del-1' } });

      await webhooksService.testWebhook('org-1', 'wh-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/webhooks/wh-1/test');
    });
  });

  describe('listDeliveries', () => {
    it('should GET from correct endpoint with pagination', async () => {
      mockApi.get.mockResolvedValue({ deliveries: [], total: 0 });

      await webhooksService.listDeliveries('org-1', 'wh-1', 25, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/organizations/org-1/webhooks/wh-1/deliveries?limit=25&offset=10'
      );
    });

    it('should use default pagination values', async () => {
      mockApi.get.mockResolvedValue({ deliveries: [], total: 0 });

      await webhooksService.listDeliveries('org-1', 'wh-1');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/organizations/org-1/webhooks/wh-1/deliveries?limit=50&offset=0'
      );
    });
  });
});
