import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    webhook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };

  function resetMocks() {
    for (const model of Object.values(mockPrisma)) {
      for (const method of Object.values(model)) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  generateSignature,
  triggerWebhooks,
  executeDelivery,
  retryFailedDeliveries,
  listDeliveries,
  testWebhook,
} from '../webhook-delivery.service.js';

describe('Webhook Delivery Service', () => {
  beforeEach(() => {
    resetMocks();
    mockFetch.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  // ===========================================
  // SIGNATURE
  // ===========================================

  describe('generateSignature', () => {
    it('should generate HMAC-SHA256 signature prefixed with sha256=', () => {
      const sig = generateSignature('{"test":true}', 'secret123');

      expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    });

    it('should produce consistent signatures for same input', () => {
      const sig1 = generateSignature('payload', 'secret');
      const sig2 = generateSignature('payload', 'secret');

      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = generateSignature('payload', 'secret1');
      const sig2 = generateSignature('payload', 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  // ===========================================
  // TRIGGER WEBHOOKS
  // ===========================================

  describe('triggerWebhooks', () => {
    it('should create delivery records for matching webhooks', async () => {
      const webhooks = [
        { id: 'wh-1', events: ['page.created'], isActive: true },
        { id: 'wh-2', events: ['page.created'], isActive: true },
      ];
      mockPrisma.webhook.findMany.mockResolvedValue(webhooks);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'del-1' });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);

      await triggerWebhooks('org-1', 'page.created', { pageId: 'page-1' });

      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isActive: true,
          events: { has: 'page.created' },
        },
      });
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when no webhooks match', async () => {
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      await triggerWebhooks('org-1', 'page.deleted', {});

      expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // EXECUTE DELIVERY
  // ===========================================

  describe('executeDelivery', () => {
    it('should POST to webhook URL with signature and mark success', async () => {
      const delivery = {
        id: 'del-1',
        webhookId: 'wh-1',
        event: 'page.created',
        payload: { event: 'page.created', data: {} },
        attempts: 0,
        webhook: {
          id: 'wh-1',
          url: 'https://example.com/hook',
          secret: 'whsec_testsecret',
        },
      };
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await executeDelivery('del-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-LibreDiary-Signature': expect.stringMatching(/^sha256=/),
            'X-LibreDiary-Event': 'page.created',
            'X-LibreDiary-Delivery': 'del-1',
          }),
        })
      );

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          statusCode: 200,
          attempts: 1,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should schedule retry on failure when attempts < MAX', async () => {
      const delivery = {
        id: 'del-1',
        webhookId: 'wh-1',
        event: 'page.created',
        payload: { event: 'page.created', data: {} },
        attempts: 0,
        webhook: {
          id: 'wh-1',
          url: 'https://example.com/hook',
          secret: 'whsec_testsecret',
        },
      };
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await executeDelivery('del-1');

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          status: 'PENDING',
          statusCode: 500,
          attempts: 1,
          nextRetryAt: expect.any(Date),
        }),
      });
    });

    it('should mark as FAILED when max attempts reached', async () => {
      const delivery = {
        id: 'del-1',
        webhookId: 'wh-1',
        event: 'page.created',
        payload: { event: 'page.created', data: {} },
        attempts: 2,
        webhook: {
          id: 'wh-1',
          url: 'https://example.com/hook',
          secret: 'whsec_testsecret',
        },
      };
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      });

      await executeDelivery('del-1');

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          attempts: 3,
          completedAt: expect.any(Date),
          nextRetryAt: null,
        }),
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const delivery = {
        id: 'del-1',
        webhookId: 'wh-1',
        event: 'page.created',
        payload: { event: 'page.created', data: {} },
        attempts: 0,
        webhook: {
          id: 'wh-1',
          url: 'https://example.com/hook',
          secret: 'whsec_testsecret',
        },
      };
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockFetch.mockRejectedValue(new Error('Network error'));

      await executeDelivery('del-1');

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          status: 'PENDING',
          statusCode: null,
          responseBody: 'Network error',
          attempts: 1,
        }),
      });
    });

    it('should do nothing for non-existent delivery', async () => {
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);

      await executeDelivery('del-nonexistent');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // RETRY FAILED DELIVERIES
  // ===========================================

  describe('retryFailedDeliveries', () => {
    it('should re-execute pending retries', async () => {
      const pending = [
        { id: 'del-1', attempts: 1, nextRetryAt: new Date(Date.now() - 1000) },
        { id: 'del-2', attempts: 2, nextRetryAt: new Date(Date.now() - 1000) },
      ];
      mockPrisma.webhookDelivery.findMany.mockResolvedValue(pending);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);

      const count = await retryFailedDeliveries();

      expect(count).toBe(2);
      expect(mockPrisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          nextRetryAt: { lte: expect.any(Date) },
          attempts: { gt: 0 },
        },
      });
    });

    it('should return 0 when no pending retries', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([]);

      const count = await retryFailedDeliveries();

      expect(count).toBe(0);
    });
  });

  // ===========================================
  // LIST DELIVERIES
  // ===========================================

  describe('listDeliveries', () => {
    it('should return deliveries with pagination', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({ id: 'wh-1' });
      const deliveries = [
        { id: 'del-1', event: 'page.created', status: 'SUCCESS' },
        { id: 'del-2', event: 'page.updated', status: 'FAILED' },
      ];
      mockPrisma.webhookDelivery.findMany.mockResolvedValue(deliveries);
      mockPrisma.webhookDelivery.count.mockResolvedValue(2);

      const result = await listDeliveries('wh-1', 'org-1', 50, 0);

      expect(result.deliveries).toEqual(deliveries);
      expect(result.total).toBe(2);
    });

    it('should throw when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(listDeliveries('wh-999', 'org-1')).rejects.toThrow('Webhook not found');
    });
  });

  // ===========================================
  // TEST WEBHOOK
  // ===========================================

  describe('testWebhook', () => {
    it('should create a test delivery and execute it', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'wh-1',
        organizationId: 'org-1',
        url: 'https://example.com/hook',
        secret: 'whsec_test',
      });
      const delivery = {
        id: 'del-test',
        webhookId: 'wh-1',
        event: 'webhook.test',
        status: 'PENDING',
      };
      mockPrisma.webhookDelivery.create.mockResolvedValue(delivery);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValueOnce({
        ...delivery,
        webhook: {
          id: 'wh-1',
          url: 'https://example.com/hook',
          secret: 'whsec_test',
        },
        attempts: 0,
        payload: { event: 'webhook.test', data: {} },
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.webhookDelivery.findUnique.mockResolvedValueOnce({
        ...delivery,
        status: 'SUCCESS',
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const result = await testWebhook('wh-1', 'org-1');

      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookId: 'wh-1',
          event: 'webhook.test',
          status: 'PENDING',
        }),
      });
      expect(result?.status).toBe('SUCCESS');
    });

    it('should throw when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(testWebhook('wh-999', 'org-1')).rejects.toThrow('Webhook not found');
    });
  });
});
