import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const mockWebhooksStore = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webhooks: [] as any[],
  loading: false,
  creating: false,
  error: null as string | null,
  fetchWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  testWebhook: vi.fn(),
  reset: vi.fn(),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ params: {} }),
}));

vi.mock('@/stores/webhooks', () => ({
  useWebhooksStore: () => mockWebhooksStore,
}));

vi.mock('@/composables', () => ({
  useToast: () => mockToast,
}));

vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    template: '<div class="stub-confirm-dialog" />',
    props: ['open', 'title', 'message', 'confirmText', 'variant'],
    emits: ['confirm', 'close'],
  },
}));

vi.mock('@/components/ui/BaseModal.vue', () => ({
  default: {
    name: 'BaseModal',
    template: '<div class="stub-base-modal"><slot v-if="open" /></div>',
    props: ['open'],
    emits: ['close'],
  },
}));

import WebhooksPage from '../WebhooksPage.vue';

const sampleWebhook = {
  id: 'wh-1',
  name: 'Slack Notifications',
  url: 'https://example.com/webhooks/slack-notifications',
  events: ['page.created', 'page.updated'],
  isActive: true,
  createdAt: '2025-01-10T08:00:00Z',
  updatedAt: '2025-01-10T08:00:00Z',
};

const inactiveWebhook = {
  id: 'wh-2',
  name: 'Discord Bot',
  url: 'https://discord.com/api/webhooks/123456',
  events: ['comment.created'],
  isActive: false,
  createdAt: '2025-02-15T12:00:00Z',
  updatedAt: '2025-02-15T12:00:00Z',
};

function mountPage() {
  return mount(WebhooksPage, {
    global: {
      stubs: {
        Teleport: true,
      },
    },
  });
}

describe('WebhooksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockWebhooksStore.webhooks = [];
    mockWebhooksStore.loading = false;
    mockWebhooksStore.creating = false;
    mockWebhooksStore.error = null;
    mockWebhooksStore.fetchWebhooks.mockResolvedValue(undefined);
    mockWebhooksStore.createWebhook.mockReset();
    mockWebhooksStore.updateWebhook.mockReset();
    mockWebhooksStore.deleteWebhook.mockReset();
    mockWebhooksStore.testWebhook.mockReset();
  });

  // ---- Page Header ----

  it('shows page title', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-title').text()).toBe('Webhooks');
  });

  it('shows page description', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-description').text()).toContain('real-time notifications');
  });

  it('shows create webhook button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const btn = wrapper.find('.btn-primary');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('Create Webhook');
  });

  // ---- Loading State ----

  it('shows skeleton loading rows initially', () => {
    mockWebhooksStore.fetchWebhooks.mockReturnValue(new Promise(() => {}));

    const wrapper = mountPage();

    expect(wrapper.findAll('.skeleton-row').length).toBe(3);
  });

  // ---- Store Calls on Mount ----

  it('calls fetchWebhooks on mount', async () => {
    mountPage();
    await flushPromises();

    expect(mockWebhooksStore.fetchWebhooks).toHaveBeenCalledOnce();
  });

  // ---- Empty State ----

  it('shows empty state when no webhooks exist', async () => {
    mockWebhooksStore.webhooks = [];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No webhooks yet');
  });

  // ---- Webhook Display ----

  it('shows webhook name in the table', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.webhook-name').text()).toBe('Slack Notifications');
  });

  it('shows truncated webhook URL', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook];

    const wrapper = mountPage();
    await flushPromises();

    const urlEl = wrapper.find('.webhook-url');
    expect(urlEl.exists()).toBe(true);
    // URL is longer than 40 chars, so should be truncated
    expect(urlEl.text()).toContain('...');
  });

  it('shows event count for a webhook', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.events-count').text()).toBe('2 events');
  });

  it('shows singular event text for single-event webhook', async () => {
    mockWebhooksStore.webhooks = [inactiveWebhook];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.events-count').text()).toBe('1 event');
  });

  it('shows "Active" badge for active webhooks', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook];

    const wrapper = mountPage();
    await flushPromises();

    const badge = wrapper.find('.badge-success');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('Active');
  });

  it('shows "Inactive" badge for inactive webhooks', async () => {
    mockWebhooksStore.webhooks = [inactiveWebhook];

    const wrapper = mountPage();
    await flushPromises();

    const badge = wrapper.find('.badge-inactive');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('Inactive');
  });

  // ---- Table Headers ----

  it('shows correct table column headers', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const headers = wrapper.findAll('th');
    const headerTexts = headers.map((h) => h.text());
    expect(headerTexts).toContain('Name');
    expect(headerTexts).toContain('URL');
    expect(headerTexts).toContain('Events');
    expect(headerTexts).toContain('Status');
    expect(headerTexts).toContain('Created');
    expect(headerTexts).toContain('Actions');
  });

  // ---- Action Buttons ----

  it('shows test, edit, and delete buttons for each webhook', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook];

    const wrapper = mountPage();
    await flushPromises();

    const actionBtns = wrapper.findAll('.action-btn');
    expect(actionBtns.length).toBe(3);

    const testBtn = actionBtns.find((btn) => btn.attributes('title') === 'Send test event');
    expect(testBtn).toBeDefined();

    const editBtn = actionBtns.find((btn) => btn.attributes('title') === 'Edit webhook');
    expect(editBtn).toBeDefined();

    const deleteBtn = actionBtns.find((btn) => btn.attributes('title') === 'Delete webhook');
    expect(deleteBtn).toBeDefined();
  });

  // ---- Create Button State ----

  it('disables create button while creating', async () => {
    mockWebhooksStore.creating = true;

    const wrapper = mountPage();
    await flushPromises();

    const btn = wrapper.find('.btn-primary');
    expect(btn.attributes('disabled')).toBeDefined();
    expect(btn.text()).toContain('Creating...');
  });

  // ---- Multiple Webhooks ----

  it('renders multiple webhooks', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook, inactiveWebhook];

    const wrapper = mountPage();
    await flushPromises();

    const webhookNames = wrapper.findAll('.webhook-name');
    expect(webhookNames.length).toBe(2);
    expect(webhookNames[0]!.text()).toBe('Slack Notifications');
    expect(webhookNames[1]!.text()).toBe('Discord Bot');
  });

  // ---- Date Formatting ----

  it('shows formatted creation date', async () => {
    mockWebhooksStore.webhooks = [sampleWebhook];

    const wrapper = mountPage();
    await flushPromises();

    const dateText = wrapper.find('.date-text');
    expect(dateText.exists()).toBe(true);
    // en-GB format: "10 Jan 2025"
    expect(dateText.text()).toBe('10 Jan 2025');
  });
});
