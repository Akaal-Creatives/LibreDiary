import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

// Mock BubbleMenu to render its default slot directly
vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: {
    name: 'BubbleMenu',
    props: ['editor', 'tippyOptions'],
    template: '<div class="bubble-menu-mock"><slot /></div>',
  },
}));

// Mock translation service
const { mockTranslateText } = vi.hoisted(() => ({
  mockTranslateText: vi.fn(),
}));

vi.mock('@/services/translation.service', () => ({
  translateText: mockTranslateText,
  SUPPORTED_LANGUAGES: [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Dutch',
    'Russian',
    'Chinese (Simplified)',
    'Chinese (Traditional)',
    'Japanese',
    'Korean',
    'Arabic',
    'Hindi',
    'Turkish',
    'Polish',
    'Swedish',
    'Danish',
    'Norwegian',
    'Finnish',
    'Czech',
    'Greek',
    'Romanian',
    'Hungarian',
    'Thai',
    'Vietnamese',
    'Indonesian',
    'Malay',
    'Filipino',
    'Ukrainian',
    'Punjabi',
  ] as const,
}));

// Mock toast composable
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

import TranslateBubbleMenu from '../TranslateBubbleMenu.vue';

function createMockEditor(selectedText = 'Hello') {
  return {
    state: {
      selection: {
        from: 0,
        to: selectedText.length,
        empty: selectedText.length === 0,
      },
      doc: {
        textBetween: vi.fn().mockReturnValue(selectedText),
      },
    },
    chain: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnValue({
        insertContentAt: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      }),
    }),
  };
}

function setupAuthStore(aiEnabled = true, orgId = 'org-123') {
  const store = useAuthStore();
  store.currentOrganizationId = orgId;
  store.organizations = [
    {
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      aiEnabled,
      isEncrypted: false,
      allowedDomains: [],
      logoUrl: null,
      accentColor: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];
}

function mountComponent(
  overrides: {
    editor?: ReturnType<typeof createMockEditor>;
    aiEnabled?: boolean;
    orgId?: string;
  } = {}
) {
  setupAuthStore(overrides.aiEnabled ?? true, overrides.orgId ?? 'org-123');

  return mount(TranslateBubbleMenu, {
    props: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor: (overrides.editor ?? createMockEditor()) as any,
    },
  });
}

describe('TranslateBubbleMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('renders the Translate button', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.translate-trigger').exists()).toBe(true);
    expect(wrapper.text()).toContain('Translate');

    wrapper.unmount();
  });

  it('shows language submenu when Translate button is clicked', async () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.translate-languages').exists()).toBe(false);

    await wrapper.find('.translate-trigger').trigger('click');

    expect(wrapper.find('.translate-languages').exists()).toBe(true);

    wrapper.unmount();
  });

  it('hides submenu on Escape key', async () => {
    const wrapper = mountComponent();

    await wrapper.find('.translate-trigger').trigger('click');
    expect(wrapper.find('.translate-languages').exists()).toBe(true);

    await wrapper.find('.translate-languages').trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('.translate-languages').exists()).toBe(false);

    wrapper.unmount();
  });

  it('calls translateText with selected text and chosen language', async () => {
    const editor = createMockEditor('Hello, world!');
    mockTranslateText.mockResolvedValue({ translatedText: 'Hola, mundo!' });

    const wrapper = mountComponent({ editor });

    await wrapper.find('.translate-trigger').trigger('click');

    const languageButtons = wrapper.findAll('.language-item');
    const spanishBtn = languageButtons.find((btn) => btn.text() === 'Spanish');
    expect(spanishBtn).toBeDefined();

    await spanishBtn!.trigger('click');
    await flushPromises();

    expect(mockTranslateText).toHaveBeenCalledWith('org-123', 'Hello, world!', 'Spanish');

    wrapper.unmount();
  });

  it('shows loading state while translating', async () => {
    const editor = createMockEditor('Hello');
    let resolveTranslation!: (value: { translatedText: string }) => void;
    mockTranslateText.mockReturnValue(
      new Promise((resolve) => {
        resolveTranslation = resolve;
      })
    );

    const wrapper = mountComponent({ editor });

    await wrapper.find('.translate-trigger').trigger('click');
    const spanishBtn = wrapper.findAll('.language-item').find((btn) => btn.text() === 'Spanish');
    await spanishBtn!.trigger('click');

    expect(wrapper.find('.translate-loading').exists()).toBe(true);

    resolveTranslation({ translatedText: 'Hola' });
    await flushPromises();

    expect(wrapper.find('.translate-loading').exists()).toBe(false);

    wrapper.unmount();
  });

  it('hides when aiEnabled is false on the org', () => {
    const wrapper = mountComponent({ aiEnabled: false });

    expect(wrapper.find('.translate-trigger').exists()).toBe(false);

    wrapper.unmount();
  });

  it('displays all supported languages in submenu', async () => {
    const wrapper = mountComponent();

    await wrapper.find('.translate-trigger').trigger('click');

    const languageItems = wrapper.findAll('.language-item');
    expect(languageItems.length).toBe(31);

    wrapper.unmount();
  });

  it('replaces editor selection with translated text', async () => {
    const editor = createMockEditor('Hello, world!');
    mockTranslateText.mockResolvedValue({ translatedText: 'Hola, mundo!' });

    const wrapper = mountComponent({ editor });

    await wrapper.find('.translate-trigger').trigger('click');
    const spanishBtn = wrapper.findAll('.language-item').find((btn) => btn.text() === 'Spanish');
    await spanishBtn!.trigger('click');
    await flushPromises();

    expect(editor.chain).toHaveBeenCalled();
    const chainResult = editor.chain();
    const focusResult = chainResult.focus();
    expect(focusResult.insertContentAt).toHaveBeenCalledWith({ from: 0, to: 13 }, 'Hola, mundo!');

    wrapper.unmount();
  });

  it('shows success toast after translation', async () => {
    const editor = createMockEditor('Hello');
    mockTranslateText.mockResolvedValue({ translatedText: 'Hola' });

    const wrapper = mountComponent({ editor });

    await wrapper.find('.translate-trigger').trigger('click');
    const spanishBtn = wrapper.findAll('.language-item').find((btn) => btn.text() === 'Spanish');
    await spanishBtn!.trigger('click');
    await flushPromises();

    expect(mockToastSuccess).toHaveBeenCalledWith('Translated to Spanish');

    wrapper.unmount();
  });

  it('shows error toast on translation failure', async () => {
    const editor = createMockEditor('Hello');
    mockTranslateText.mockRejectedValue(new Error('TRANSLATION_FAILED'));

    const wrapper = mountComponent({ editor });

    await wrapper.find('.translate-trigger').trigger('click');
    const spanishBtn = wrapper.findAll('.language-item').find((btn) => btn.text() === 'Spanish');
    await spanishBtn!.trigger('click');
    await flushPromises();

    expect(mockToastError).toHaveBeenCalledWith('Translation failed. Please try again.');

    wrapper.unmount();
  });

  it('closes language dropdown after successful translation', async () => {
    const editor = createMockEditor('Hello');
    mockTranslateText.mockResolvedValue({ translatedText: 'Hola' });

    const wrapper = mountComponent({ editor });

    await wrapper.find('.translate-trigger').trigger('click');
    expect(wrapper.find('.translate-languages').exists()).toBe(true);

    const spanishBtn = wrapper.findAll('.language-item').find((btn) => btn.text() === 'Spanish');
    await spanishBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('.translate-languages').exists()).toBe(false);

    wrapper.unmount();
  });

  it('toggles language dropdown closed when Translate button clicked again', async () => {
    const wrapper = mountComponent();

    await wrapper.find('.translate-trigger').trigger('click');
    expect(wrapper.find('.translate-languages').exists()).toBe(true);

    await wrapper.find('.translate-trigger').trigger('click');
    expect(wrapper.find('.translate-languages').exists()).toBe(false);

    wrapper.unmount();
  });
});
