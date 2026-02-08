import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { CreateWebhookInput, WebhookEvent } from '@librediary/shared';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    getWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    testWebhook: vi.fn(),
    listDeliveries: vi.fn(),
  },
}));

const { mockAuthStore } = vi.hoisted(() => ({
  mockAuthStore: { currentOrganizationId: 'org-1' as string | null },
}));

vi.mock('@/services/webhooks.service', () => ({
  webhooksService: mockService,
}));

vi.mock('../auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

import { useWebhooksStore } from '../webhooks';

describe('Webhooks Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.currentOrganizationId = 'org-1';
    setActivePinia(createPinia());
  });

  describe('fetchWebhooks', () => {
    it('should load webhooks and set loading state', async () => {
      const webhooks = [
        { id: 'wh-1', name: 'Hook 1', url: 'https://example.com/1' },
        { id: 'wh-2', name: 'Hook 2', url: 'https://example.com/2' },
      ];
      mockService.listWebhooks.mockResolvedValue({ webhooks });

      const store = useWebhooksStore();
      await store.fetchWebhooks();

      expect(store.webhooks).toEqual(webhooks);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(mockService.listWebhooks).toHaveBeenCalledWith('org-1');
    });

    it('should set error on failure', async () => {
      mockService.listWebhooks.mockRejectedValue(new Error('Network error'));

      const store = useWebhooksStore();
      await store.fetchWebhooks();

      expect(store.webhooks).toEqual([]);
      expect(store.error).toBe('Network error');
      expect(store.loading).toBe(false);
    });

    it('should throw when no organisation selected', async () => {
      mockAuthStore.currentOrganizationId = null;

      const store = useWebhooksStore();

      await expect(store.fetchWebhooks()).rejects.toThrow('No organisation selected');
    });
  });

  describe('createWebhook', () => {
    it('should create webhook and prepend to list', async () => {
      const newWebhook = { id: 'wh-1', name: 'Hook', url: 'https://example.com' };
      mockService.createWebhook.mockResolvedValue({ webhook: newWebhook });

      const store = useWebhooksStore();
      const input: CreateWebhookInput = {
        name: 'Hook',
        url: 'https://example.com',
        events: ['page.created'],
      };
      const result = await store.createWebhook(input);

      expect(result).toEqual(newWebhook);
      expect(store.webhooks[0]).toEqual(newWebhook);
      expect(store.creating).toBe(false);
      expect(mockService.createWebhook).toHaveBeenCalledWith('org-1', input);
    });

    it('should set error on failure', async () => {
      mockService.createWebhook.mockRejectedValue(new Error('Failed'));

      const store = useWebhooksStore();

      await expect(
        store.createWebhook({
          name: 'Hook',
          url: 'https://example.com',
          events: [] as WebhookEvent[],
        })
      ).rejects.toThrow('Failed');
      expect(store.error).toBe('Failed');
      expect(store.creating).toBe(false);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook in list', async () => {
      const updated = { id: 'wh-1', name: 'Updated', url: 'https://example.com' };
      mockService.listWebhooks.mockResolvedValue({
        webhooks: [{ id: 'wh-1', name: 'Original', url: 'https://example.com' }],
      });
      mockService.updateWebhook.mockResolvedValue({ webhook: updated });

      const store = useWebhooksStore();
      await store.fetchWebhooks();
      const result = await store.updateWebhook('wh-1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(store.webhooks[0]!.name).toBe('Updated');
      expect(mockService.updateWebhook).toHaveBeenCalledWith('org-1', 'wh-1', { name: 'Updated' });
    });

    it('should set error on failure', async () => {
      mockService.updateWebhook.mockRejectedValue(new Error('Update failed'));

      const store = useWebhooksStore();

      await expect(store.updateWebhook('wh-1', { name: 'X' })).rejects.toThrow('Update failed');
      expect(store.error).toBe('Update failed');
    });
  });

  describe('deleteWebhook', () => {
    it('should remove webhook from list', async () => {
      mockService.listWebhooks.mockResolvedValue({
        webhooks: [
          { id: 'wh-1', name: 'Hook 1' },
          { id: 'wh-2', name: 'Hook 2' },
        ],
      });
      mockService.deleteWebhook.mockResolvedValue(undefined);

      const store = useWebhooksStore();
      await store.fetchWebhooks();
      await store.deleteWebhook('wh-1');

      expect(store.webhooks).toHaveLength(1);
      expect(store.webhooks[0]!.id).toBe('wh-2');
    });

    it('should set error on failure', async () => {
      mockService.deleteWebhook.mockRejectedValue(new Error('Not found'));

      const store = useWebhooksStore();

      await expect(store.deleteWebhook('wh-1')).rejects.toThrow('Not found');
      expect(store.error).toBe('Not found');
    });
  });

  describe('testWebhook', () => {
    it('should test webhook and return delivery', async () => {
      const delivery = { id: 'del-1', status: 'SUCCESS' };
      mockService.testWebhook.mockResolvedValue({ delivery });

      const store = useWebhooksStore();
      const result = await store.testWebhook('wh-1');

      expect(result).toEqual(delivery);
      expect(mockService.testWebhook).toHaveBeenCalledWith('org-1', 'wh-1');
    });

    it('should set error on failure', async () => {
      mockService.testWebhook.mockRejectedValue(new Error('Test failed'));

      const store = useWebhooksStore();

      await expect(store.testWebhook('wh-1')).rejects.toThrow('Test failed');
      expect(store.error).toBe('Test failed');
    });
  });

  describe('fetchDeliveries', () => {
    it('should load deliveries with pagination', async () => {
      const deliveries = [{ id: 'del-1' }, { id: 'del-2' }];
      mockService.listDeliveries.mockResolvedValue({ deliveries, total: 10 });

      const store = useWebhooksStore();
      await store.fetchDeliveries('wh-1', 25, 5);

      expect(store.deliveries).toEqual(deliveries);
      expect(store.deliveriesTotal).toBe(10);
      expect(store.loading).toBe(false);
      expect(mockService.listDeliveries).toHaveBeenCalledWith('org-1', 'wh-1', 25, 5);
    });

    it('should set error on failure', async () => {
      mockService.listDeliveries.mockRejectedValue(new Error('Load failed'));

      const store = useWebhooksStore();
      await store.fetchDeliveries('wh-1');

      expect(store.error).toBe('Load failed');
      expect(store.loading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockService.listWebhooks.mockResolvedValue({
        webhooks: [{ id: 'wh-1' }],
      });

      const store = useWebhooksStore();
      await store.fetchWebhooks();
      store.reset();

      expect(store.webhooks).toEqual([]);
      expect(store.deliveries).toEqual([]);
      expect(store.deliveriesTotal).toBe(0);
      expect(store.loading).toBe(false);
      expect(store.creating).toBe(false);
      expect(store.error).toBeNull();
    });
  });
});
