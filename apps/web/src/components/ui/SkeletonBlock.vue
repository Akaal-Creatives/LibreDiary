<script setup lang="ts">
defineProps<{
  width?: string;
  height?: string;
  borderRadius?: string;
  variant?: 'rect' | 'circle' | 'line';
}>();
</script>

<template>
  <div
    class="skeleton-block"
    :class="[`skeleton-${variant ?? 'rect'}`]"
    role="status"
    :aria-label="$t('skeleton.loading')"
    :style="{
      width: variant === 'circle' ? (width ?? height ?? '40px') : (width ?? '100%'),
      height: variant === 'line' ? (height ?? '0.8em') : (height ?? '1em'),
      borderRadius: variant === 'circle' ? '50%' : (borderRadius ?? undefined),
    }"
  />
</template>

<style scoped>
.skeleton-block {
  background: linear-gradient(
    90deg,
    var(--color-surface-sunken) 25%,
    var(--color-border-subtle) 50%,
    var(--color-surface-sunken) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-line {
  border-radius: var(--radius-full);
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
