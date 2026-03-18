import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';

export type ScrollDirection = 'up' | 'down' | 'idle';

const SCROLL_THRESHOLD = 8; // px — ignore micro-scrolls

/**
 * Detects scroll direction on a given element or window.
 * Used to auto-hide the bottom navigation on scroll down.
 */
export function useScrollDirection(elementRef?: Ref<HTMLElement | null | undefined>) {
  const direction = ref<ScrollDirection>('idle');
  const isScrollingDown = computed(() => direction.value === 'down');

  let lastScrollY = 0;
  let ticking = false;

  function handleScroll() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      const target = elementRef?.value ?? document.documentElement;
      const currentScrollY = target.scrollTop;
      const delta = currentScrollY - lastScrollY;

      if (Math.abs(delta) > SCROLL_THRESHOLD) {
        direction.value = delta > 0 ? 'down' : 'up';
      }

      lastScrollY = currentScrollY;
      ticking = false;
    });
  }

  function getTarget(): HTMLElement | Window {
    return elementRef?.value ?? window;
  }

  onMounted(() => {
    const target = getTarget();
    target.addEventListener('scroll', handleScroll, { passive: true });
  });

  onUnmounted(() => {
    const target = getTarget();
    target.removeEventListener('scroll', handleScroll);
  });

  return {
    direction,
    isScrollingDown,
  };
}
