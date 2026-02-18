import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const mockApiTokensStore = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: [] as any[],
  loading: false,
  creating: false,
  error: null as string | null,
  fetchTokens: vi.fn(),
  createToken: vi.fn(),
  deleteToken: vi.fn(),
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

vi.mock('@/stores/api-tokens', () => ({
  useApiTokensStore: () => mockApiTokensStore,
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

import ApiTokensPage from '../ApiTokensPage.vue';

const sampleToken = {
  id: 'tok-1',
  name: 'CI Pipeline',
  tokenPrefix: 'ld_abc123',
  lastUsedAt: '2025-06-15T10:30:00Z',
  expiresAt: null,
  createdAt: '2025-01-10T08:00:00Z',
};

const expiredToken = {
  id: 'tok-2',
  name: 'Expired Token',
  tokenPrefix: 'ld_xyz789',
  lastUsedAt: null,
  expiresAt: '2024-01-01T00:00:00Z',
  createdAt: '2023-12-01T00:00:00Z',
};

function mountPage() {
  return mount(ApiTokensPage, {
    global: {
      stubs: {
        Teleport: true,
      },
    },
  });
}

describe('ApiTokensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockApiTokensStore.tokens = [];
    mockApiTokensStore.loading = false;
    mockApiTokensStore.creating = false;
    mockApiTokensStore.error = null;
    mockApiTokensStore.fetchTokens.mockResolvedValue(undefined);
    mockApiTokensStore.createToken.mockReset();
    mockApiTokensStore.deleteToken.mockReset();
  });

  // ---- Page Header ----

  it('shows page title', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-title').text()).toBe('API Tokens');
  });

  it('shows page description', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-description').text()).toContain('programmatic access');
  });

  it('shows create token button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const btn = wrapper.find('.btn-primary');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('Create Token');
  });

  // ---- Loading State ----

  it('shows skeleton loading rows initially', () => {
    mockApiTokensStore.fetchTokens.mockReturnValue(new Promise(() => {}));

    const wrapper = mountPage();

    expect(wrapper.findAll('.skeleton-row').length).toBe(3);
  });

  // ---- Store Calls on Mount ----

  it('calls fetchTokens on mount', async () => {
    mountPage();
    await flushPromises();

    expect(mockApiTokensStore.fetchTokens).toHaveBeenCalledOnce();
  });

  // ---- Empty State ----

  it('shows empty state when no tokens exist', async () => {
    mockApiTokensStore.tokens = [];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No API tokens yet');
  });

  // ---- Token Display ----

  it('shows token name in the table', async () => {
    mockApiTokensStore.tokens = [sampleToken];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.token-name').text()).toBe('CI Pipeline');
  });

  it('shows token prefix with ellipsis', async () => {
    mockApiTokensStore.tokens = [sampleToken];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.token-prefix').text()).toBe('ld_abc123...');
  });

  it('shows "Never" for tokens with no last used date', async () => {
    mockApiTokensStore.tokens = [{ ...sampleToken, lastUsedAt: null }];

    const wrapper = mountPage();
    await flushPromises();

    const dateTexts = wrapper.findAll('.date-text');
    const neverText = dateTexts.find((el) => el.text() === 'Never');
    expect(neverText).toBeDefined();
  });

  it('shows "Never" for tokens that do not expire', async () => {
    mockApiTokensStore.tokens = [sampleToken];

    const wrapper = mountPage();
    await flushPromises();

    const dateTexts = wrapper.findAll('.date-text');
    const neverText = dateTexts.find((el) => el.text() === 'Never');
    expect(neverText).toBeDefined();
  });

  it('shows "Expired" badge for expired tokens', async () => {
    mockApiTokensStore.tokens = [expiredToken];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.badge-error').exists()).toBe(true);
    expect(wrapper.find('.badge-error').text()).toBe('Expired');
  });

  // ---- Table Headers ----

  it('shows correct table column headers', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const headers = wrapper.findAll('th');
    const headerTexts = headers.map((h) => h.text());
    expect(headerTexts).toContain('Name');
    expect(headerTexts).toContain('Token');
    expect(headerTexts).toContain('Last Used');
    expect(headerTexts).toContain('Expires');
    expect(headerTexts).toContain('Created');
    expect(headerTexts).toContain('Actions');
  });

  // ---- Delete Button ----

  it('shows delete button for each token', async () => {
    mockApiTokensStore.tokens = [sampleToken];

    const wrapper = mountPage();
    await flushPromises();

    const deleteBtn = wrapper.find('.action-btn.danger');
    expect(deleteBtn.exists()).toBe(true);
    expect(deleteBtn.attributes('title')).toBe('Delete token');
  });

  // ---- Create Button State ----

  it('disables create button while creating', async () => {
    mockApiTokensStore.creating = true;

    const wrapper = mountPage();
    await flushPromises();

    const btn = wrapper.find('.btn-primary');
    expect(btn.attributes('disabled')).toBeDefined();
    expect(btn.text()).toContain('Creating...');
  });

  // ---- Multiple Tokens ----

  it('renders multiple tokens', async () => {
    mockApiTokensStore.tokens = [sampleToken, expiredToken];

    const wrapper = mountPage();
    await flushPromises();

    const tokenNames = wrapper.findAll('.token-name');
    expect(tokenNames.length).toBe(2);
    expect(tokenNames[0]!.text()).toBe('CI Pipeline');
    expect(tokenNames[1]!.text()).toBe('Expired Token');
  });
});
