<script setup lang="ts">
defineProps<{
  size?: 'default' | 'large';
  color?: 'default' | 'inverse';
}>();
</script>

<template>
  <div
    class="auth-brand"
    :class="[`auth-brand--${size ?? 'default'}`, `auth-brand--${color ?? 'default'}`]"
  >
    <svg class="auth-brand__icon" width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="3" width="16" height="22" rx="2" stroke="currentColor" stroke-width="1.5" />
      <path
        d="M8 8H16M8 12H16M8 16H12"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        d="M20 7V23C20 24.1046 20.8954 25 22 25H22C23.1046 25 24 24.1046 24 23V7"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <span class="auth-brand__name">LibreDiary</span>
  </div>
</template>

<style scoped>
.auth-brand {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-family: inherit;
  font-weight: 600;
}

.auth-brand--default {
  font-size: var(--text-xl);
}

.auth-brand--large {
  font-size: var(--text-2xl);
}

.auth-brand--default .auth-brand__icon {
  color: var(--color-accent);
}

.auth-brand--default .auth-brand__name {
  color: var(--color-text-primary);
}

.auth-brand--inverse .auth-brand__icon,
.auth-brand--inverse .auth-brand__name {
  color: #ffffff;
}

.auth-brand--large .auth-brand__icon {
  width: 40px;
  height: 40px;
}
</style>
