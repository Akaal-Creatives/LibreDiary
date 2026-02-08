import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  Webhook,
  WebhookDelivery,
  CreateWebhookInput,
  UpdateWebhookInput,
} from '@librediary/shared';
import { webhooksService } from '@/services/webhooks.service';
import { useAuthStore } from './auth';

export const useWebhooksStore = defineStore('webhooks', () => {
  const webhooks = ref<Webhook[]>([]);
  const deliveries = ref<WebhookDelivery[]>([]);
  const deliveriesTotal = ref(0);
  const loading = ref(false);
  const creating = ref(false);
  const error = ref<string | null>(null);

  function getOrgId(): string {
    const authStore = useAuthStore();
    if (!authStore.currentOrganizationId) {
      throw new Error('No organisation selected');
    }
    return authStore.currentOrganizationId;
  }

  async function fetchWebhooks(): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    error.value = null;

    try {
      const data = await webhooksService.listWebhooks(orgId);
      webhooks.value = data.webhooks;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load webhooks';
    } finally {
      loading.value = false;
    }
  }

  async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    const orgId = getOrgId();
    creating.value = true;
    error.value = null;

    try {
      const data = await webhooksService.createWebhook(orgId, input);
      webhooks.value.unshift(data.webhook);
      return data.webhook;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create webhook';
      throw err;
    } finally {
      creating.value = false;
    }
  }

  async function updateWebhook(webhookId: string, input: UpdateWebhookInput): Promise<Webhook> {
    const orgId = getOrgId();
    error.value = null;

    try {
      const data = await webhooksService.updateWebhook(orgId, webhookId, input);
      const idx = webhooks.value.findIndex((w) => w.id === webhookId);
      if (idx !== -1) {
        webhooks.value[idx] = data.webhook;
      }
      return data.webhook;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update webhook';
      throw err;
    }
  }

  async function deleteWebhook(webhookId: string): Promise<void> {
    const orgId = getOrgId();
    error.value = null;

    try {
      await webhooksService.deleteWebhook(orgId, webhookId);
      webhooks.value = webhooks.value.filter((w) => w.id !== webhookId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete webhook';
      throw err;
    }
  }

  async function testWebhook(webhookId: string): Promise<WebhookDelivery> {
    const orgId = getOrgId();
    error.value = null;

    try {
      const data = await webhooksService.testWebhook(orgId, webhookId);
      return data.delivery;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to test webhook';
      throw err;
    }
  }

  async function fetchDeliveries(webhookId: string, limit = 50, offset = 0): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    error.value = null;

    try {
      const data = await webhooksService.listDeliveries(orgId, webhookId, limit, offset);
      deliveries.value = data.deliveries;
      deliveriesTotal.value = data.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load deliveries';
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    webhooks.value = [];
    deliveries.value = [];
    deliveriesTotal.value = 0;
    loading.value = false;
    creating.value = false;
    error.value = null;
  }

  return {
    webhooks,
    deliveries,
    deliveriesTotal,
    loading,
    creating,
    error,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchDeliveries,
    reset,
  };
});
