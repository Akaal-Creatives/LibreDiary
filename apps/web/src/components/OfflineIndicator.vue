<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isOffline = ref(!navigator.onLine);

function handleOnline() {
  isOffline.value = false;
}

function handleOffline() {
  isOffline.value = true;
}

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});
</script>

<template>
  <Transition name="offline-slide">
    <div v-if="isOffline" class="offline-indicator" role="alert" aria-live="assertive">
      <span class="offline-indicator__icon" aria-hidden="true">&#9888;</span>
      <span class="offline-indicator__text">
        You are currently offline. Some features may be unavailable.
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.offline-indicator {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-warning-text, #7a5a00);
  background: var(--color-warning-bg, #fff3cd);
  border-bottom: 1px solid var(--color-warning-border, #ffc107);
}

.offline-indicator__icon {
  flex-shrink: 0;
  font-size: var(--text-base);
}

.offline-indicator__text {
  line-height: 1.4;
}

.offline-slide-enter-active,
.offline-slide-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.offline-slide-enter-from,
.offline-slide-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
