<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
  }>(),
  {
    closeOnBackdrop: true,
    closeOnEscape: true,
  }
);

const emit = defineEmits<{
  close: [];
}>();

const modalRef = ref<HTMLElement>();
const previousActiveElement = ref<HTMLElement | null>(null);

// Focus trap - get all focusable elements
function getFocusableElements(): HTMLElement[] {
  if (!modalRef.value) return [];
  return Array.from(
    modalRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled'));
}

function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements();
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement?.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape) {
    emit('close');
  }
  trapFocus(event);
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget && props.closeOnBackdrop) {
    emit('close');
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previousActiveElement.value = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      await nextTick();
      const focusableElements = getFocusableElements();
      focusableElements[0]?.focus();
    } else {
      document.body.style.overflow = '';
      previousActiveElement.value?.focus();
    }
  }
);

onMounted(() => {
  if (props.open) {
    document.body.style.overflow = 'hidden';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
      >
        <div ref="modalRef" class="modal-container">
          <div class="modal-content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(22, 25, 23, 0.6);
  backdrop-filter: blur(4px);
}

.modal-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  max-height: calc(100vh - var(--space-8));
  overflow: auto;
}

.modal-content {
  position: relative;
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(107, 143, 113, 0.05);
}

/* Subtle paper texture effect */
.modal-content::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
}

/* Animation */
.modal-enter-active {
  transition: opacity 0.2s ease-out;
}

.modal-leave-active {
  transition: opacity 0.15s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-content {
  animation: modal-out 0.15s ease-in forwards;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.98) translateY(4px);
  }
}

/* Dark mode adjustments */
[data-theme='dark'] .modal-backdrop {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme='dark'] .modal-content::before {
  opacity: 0.03;
}
</style>
