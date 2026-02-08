import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    webhook: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  function resetMocks() {
    for (const method of Object.values(mockPrisma.webhook)) {
      (method as ReturnType<typeof vi.fn>).mockReset();
    }
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
} from '../webhook.service.js';

describe('Webhook Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // CREATE
  // ===========================================

  describe('createWebhook', () => {
    it('should create a webhook with generated secret', async () => {
      const mockWebhook = {
        id: 'wh-1',
        organizationId: 'org-1',
        name: 'CI Notifications',
        url: 'https://example.com/webhooks',
        events: ['page.created', 'page.updated'],
        secret: 'whsec_something',
        isActive: true,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.webhook.create.mockResolvedValue(mockWebhook);

      const result = await createWebhook('org-1', 'user-1', {
        name: 'CI Notifications',
        url: 'https://example.com/webhooks',
        events: ['page.created', 'page.updated'],
      });

      expect(result).toEqual(mockWebhook);
      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          createdById: 'user-1',
          name: 'CI Notifications',
          url: 'https://example.com/webhooks',
          events: ['page.created', 'page.updated'],
          secret: expect.stringMatching(/^whsec_/),
        },
      });
    });
  });

  // ===========================================
  // LIST
  // ===========================================

  describe('listWebhooks', () => {
    it('should return webhooks with masked secrets', async () => {
      const webhooks = [
        {
          id: 'wh-1',
          name: 'Hook 1',
          secret: 'whsec_abcdefghijklmnop',
          organizationId: 'org-1',
        },
        {
          id: 'wh-2',
          name: 'Hook 2',
          secret: 'whsec_zyxwvutsrqponmlk',
          organizationId: 'org-1',
        },
      ];
      mockPrisma.webhook.findMany.mockResolvedValue(webhooks);

      const result = await listWebhooks('org-1');

      expect(result).toHaveLength(2);
      // Secrets should be masked
      expect(result[0].secret).not.toBe('whsec_abcdefghijklmnop');
      expect(result[0].secret).toContain('****');
      expect(result[1].secret).toContain('****');
    });
  });

  // ===========================================
  // GET
  // ===========================================

  describe('getWebhook', () => {
    it('should return a webhook with masked secret', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'wh-1',
        name: 'Hook 1',
        secret: 'whsec_abcdefghijklmnop',
        organizationId: 'org-1',
      });

      const result = await getWebhook('wh-1', 'org-1');

      expect(result.id).toBe('wh-1');
      expect(result.secret).toContain('****');
    });

    it('should throw when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(getWebhook('wh-999', 'org-1')).rejects.toThrow('Webhook not found');
    });
  });

  // ===========================================
  // UPDATE
  // ===========================================

  describe('updateWebhook', () => {
    it('should update webhook fields', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'wh-1',
        organizationId: 'org-1',
      });
      mockPrisma.webhook.update.mockResolvedValue({
        id: 'wh-1',
        name: 'Updated',
        isActive: false,
      });

      const result = await updateWebhook('wh-1', 'org-1', {
        name: 'Updated',
        isActive: false,
      });

      expect(result.name).toBe('Updated');
      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { name: 'Updated', isActive: false },
      });
    });

    it('should throw when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(updateWebhook('wh-999', 'org-1', { name: 'Updated' })).rejects.toThrow(
        'Webhook not found'
      );
    });
  });

  // ===========================================
  // DELETE
  // ===========================================

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: 'wh-1',
        organizationId: 'org-1',
      });
      mockPrisma.webhook.delete.mockResolvedValue({});

      await deleteWebhook('wh-1', 'org-1');

      expect(mockPrisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
      });
    });

    it('should throw when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      await expect(deleteWebhook('wh-999', 'org-1')).rejects.toThrow('Webhook not found');
    });
  });
});
