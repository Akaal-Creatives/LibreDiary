import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import OnboardingTour from '../OnboardingTour.vue';
import { useOnboardingTour } from '@/composables/useOnboardingTour';
import { i18n } from '@/i18n';

function mountTour() {
  const TestWrapper = defineComponent({
    components: { OnboardingTour },
    setup() {
      const tour = useOnboardingTour();
      return { tour };
    },
    render() {
      return h(OnboardingTour);
    },
  });

  return mount(TestWrapper, {
    global: {
      plugins: [i18n],
    },
    attachTo: document.body,
  });
}

describe('OnboardingTour', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    // Reset tour state
    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useOnboardingTour>;
      const comp = defineComponent({
        setup() {
          result = useOnboardingTour();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();
    result.isActive.value = false;
    result.resetTour();
    unmount();
    vi.restoreAllMocks();
  });

  it('should not render when tour is not active', () => {
    const wrapper = mountTour();

    expect(document.querySelector('.tour-overlay')).toBeNull();

    wrapper.unmount();
  });

  it('should render when tour is active', async () => {
    const wrapper = mountTour();

    // Start the tour
    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useOnboardingTour>;
      const comp = defineComponent({
        setup() {
          result = useOnboardingTour();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();

    result.start();
    await nextTick();

    expect(document.querySelector('.tour-overlay')).not.toBeNull();
    expect(document.querySelector('.tour-tooltip')).not.toBeNull();

    unmount();
    wrapper.unmount();
  });

  it('should render step content', async () => {
    const wrapper = mountTour();

    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useOnboardingTour>;
      const comp = defineComponent({
        setup() {
          result = useOnboardingTour();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();

    result.start();
    await nextTick();

    const title = document.querySelector('.tooltip-title');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBeTruthy();

    const description = document.querySelector('.tooltip-description');
    expect(description).not.toBeNull();
    expect(description?.textContent).toBeTruthy();

    unmount();
    wrapper.unmount();
  });

  it('should show step indicator', async () => {
    const wrapper = mountTour();

    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useOnboardingTour>;
      const comp = defineComponent({
        setup() {
          result = useOnboardingTour();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();

    result.start();
    await nextTick();

    const indicator = document.querySelector('.step-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain('1');
    expect(indicator?.textContent).toContain('5');

    unmount();
    wrapper.unmount();
  });
});
