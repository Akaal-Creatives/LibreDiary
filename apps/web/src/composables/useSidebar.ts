import { ref, onMounted, onUnmounted } from 'vue';

const isOpen = ref(true);
const isOverlay = ref(false);
const isMobile = ref(false);

let mediaQueryMobile: MediaQueryList | null = null;
let mediaQueryTablet: MediaQueryList | null = null;
let initialised = false;

function handleBreakpointChange() {
  if (!mediaQueryMobile || !mediaQueryTablet) return;

  const mobile = mediaQueryMobile.matches; // < 768px
  const tablet = mediaQueryTablet.matches; // 768px - 1023px

  isMobile.value = mobile;
  isOverlay.value = mobile || tablet;

  // Auto-collapse on mobile/tablet
  if (mobile || tablet) {
    isOpen.value = false;
  } else {
    isOpen.value = true;
  }
}

function initMediaQueries() {
  if (initialised || typeof window === 'undefined') return;

  mediaQueryMobile = window.matchMedia('(max-width: 767px)');
  mediaQueryTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

  handleBreakpointChange();

  mediaQueryMobile.addEventListener('change', handleBreakpointChange);
  mediaQueryTablet.addEventListener('change', handleBreakpointChange);
  initialised = true;
}

function destroyMediaQueries() {
  if (!initialised) return;

  mediaQueryMobile?.removeEventListener('change', handleBreakpointChange);
  mediaQueryTablet?.removeEventListener('change', handleBreakpointChange);
  mediaQueryMobile = null;
  mediaQueryTablet = null;
  initialised = false;
}

export function useSidebar() {
  onMounted(() => {
    initMediaQueries();
  });

  onUnmounted(() => {
    // Only destroy if truly unmounting the layout
    // In practice, the layout persists so this is a safety net
  });

  function toggle(): void {
    isOpen.value = !isOpen.value;
  }

  function open(): void {
    isOpen.value = true;
  }

  function close(): void {
    isOpen.value = false;
  }

  return {
    isOpen,
    isOverlay,
    isMobile,
    toggle,
    open,
    close,
  };
}

// Allow cleanup for tests
export function _resetSidebar() {
  isOpen.value = true;
  isOverlay.value = false;
  isMobile.value = false;
  destroyMediaQueries();
}
