<script setup lang="ts">
defineProps<{
  text?: string;
}>();
</script>

<template>
  <div class="auth-divider" role="separator">
    <span class="auth-divider__text">{{ text || 'or' }}</span>
  </div>
</template>

<style scoped>
.auth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-5) 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.auth-divider::before,
.auth-divider::after {
  flex: 1;
  height: 1px;
  content: '';
  background: var(--color-border);
}

.auth-divider__text {
  padding: 0 var(--space-1);
  font-weight: 500;
}
</style>
