import { api } from './api';
import type {
  Webhook,
  WebhookDelivery,
  CreateWebhookInput,
  UpdateWebhookInput,
} from '@librediary/shared';

export const webhooksService = {
  async listWebhooks(orgId: string): Promise<{ webhooks: Webhook[] }> {
    return api.get<{ webhooks: Webhook[] }>(`/organizations/${orgId}/webhooks`);
  },

  async createWebhook(orgId: string, input: CreateWebhookInput): Promise<{ webhook: Webhook }> {
    return api.post<{ webhook: Webhook }>(`/organizations/${orgId}/webhooks`, input);
  },

  async getWebhook(orgId: string, webhookId: string): Promise<{ webhook: Webhook }> {
    return api.get<{ webhook: Webhook }>(`/organizations/${orgId}/webhooks/${webhookId}`);
  },

  async updateWebhook(
    orgId: string,
    webhookId: string,
    input: UpdateWebhookInput
  ): Promise<{ webhook: Webhook }> {
    return api.put<{ webhook: Webhook }>(`/organizations/${orgId}/webhooks/${webhookId}`, input);
  },

  async deleteWebhook(orgId: string, webhookId: string): Promise<void> {
    return api.delete(`/organizations/${orgId}/webhooks/${webhookId}`);
  },

  async testWebhook(orgId: string, webhookId: string): Promise<{ delivery: WebhookDelivery }> {
    return api.post<{ delivery: WebhookDelivery }>(
      `/organizations/${orgId}/webhooks/${webhookId}/test`
    );
  },

  async listDeliveries(
    orgId: string,
    webhookId: string,
    limit = 50,
    offset = 0
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    return api.get<{ deliveries: WebhookDelivery[]; total: number }>(
      `/organizations/${orgId}/webhooks/${webhookId}/deliveries?limit=${limit}&offset=${offset}`
    );
  },
};
