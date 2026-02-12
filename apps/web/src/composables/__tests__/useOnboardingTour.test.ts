import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useOnboardingTour } from '../useOnboardingTour';

function withSetup<T>(composableFn: () => T): { result: T; unmount: () => void } {
  let result!: T;

  const TestComponent = defineComponent({
    setup() {
      result = composableFn();
      return () => h('div');
    },
  });

  const wrapper = mount(TestComponent);

  return {
    result,
    unmount: () => wrapper.unmount(),
  };
}

describe('useOnboardingTour', () => {
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
    const { result, unmount } = withSetup(() => useOnboardingTour());
    result.resetTour();
    result.isActive.value = false;
    unmount();
    vi.restoreAllMocks();
  });

  describe('returned API', () => {
    it('should return isActive, currentStep, totalSteps, start, next, previous, skip, complete, hasCompleted, resetTour', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('currentStep');
      expect(result).toHaveProperty('totalSteps');
      expect(result).toHaveProperty('currentStepData');
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('next');
      expect(result).toHaveProperty('previous');
      expect(result).toHaveProperty('skip');
      expect(result).toHaveProperty('complete');
      expect(result).toHaveProperty('hasCompleted');
      expect(result).toHaveProperty('resetTour');

      unmount();
    });
  });

  describe('start', () => {
    it('should activate the tour at step 0', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();

      expect(result.isActive.value).toBe(true);
      expect(result.currentStep.value).toBe(0);

      unmount();
    });
  });

  describe('next and previous', () => {
    it('should advance to the next step', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.next();

      expect(result.currentStep.value).toBe(1);

      unmount();
    });

    it('should go back to the previous step', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.next();
      result.next();
      result.previous();

      expect(result.currentStep.value).toBe(1);

      unmount();
    });

    it('should not go below step 0', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.previous();

      expect(result.currentStep.value).toBe(0);

      unmount();
    });

    it('should complete when advancing past the last step', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      const total = result.totalSteps.value;
      for (let i = 0; i < total; i++) {
        result.next();
      }

      expect(result.isActive.value).toBe(false);
      expect(result.hasCompleted.value).toBe(true);

      unmount();
    });
  });

  describe('skip', () => {
    it('should deactivate the tour and mark as completed', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.skip();

      expect(result.isActive.value).toBe(false);
      expect(result.hasCompleted.value).toBe(true);

      unmount();
    });

    it('should save completion to localStorage', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.skip();

      expect(localStorage.setItem).toHaveBeenCalledWith('librediary-tour-completed', 'true');

      unmount();
    });
  });

  describe('complete', () => {
    it('should deactivate the tour and mark as completed', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.complete();

      expect(result.isActive.value).toBe(false);
      expect(result.hasCompleted.value).toBe(true);

      unmount();
    });
  });

  describe('localStorage persistence', () => {
    it('should load completion state on mount', async () => {
      localStorageMock['librediary-tour-completed'] = 'true';

      const { result, unmount } = withSetup(() => useOnboardingTour());
      await nextTick();

      expect(result.hasCompleted.value).toBe(true);

      unmount();
    });
  });

  describe('resetTour', () => {
    it('should reset the completion state', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.complete();
      expect(result.hasCompleted.value).toBe(true);

      result.resetTour();
      expect(result.hasCompleted.value).toBe(false);
      expect(result.currentStep.value).toBe(0);

      unmount();
    });

    it('should remove the localStorage key', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();
      result.complete();
      result.resetTour();

      expect(localStorage.removeItem).toHaveBeenCalledWith('librediary-tour-completed');

      unmount();
    });
  });

  describe('currentStepData', () => {
    it('should return null when tour is not active', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      expect(result.currentStepData.value).toBeNull();

      unmount();
    });

    it('should return the current step data when active', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      result.start();

      expect(result.currentStepData.value).not.toBeNull();
      expect(result.currentStepData.value?.id).toBe('sidebar-nav');

      unmount();
    });
  });

  describe('totalSteps', () => {
    it('should return 5 steps', () => {
      const { result, unmount } = withSetup(() => useOnboardingTour());

      expect(result.totalSteps.value).toBe(5);

      unmount();
    });
  });
});
