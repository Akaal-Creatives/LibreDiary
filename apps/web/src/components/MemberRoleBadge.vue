<script setup lang="ts">
import { computed } from 'vue';
import type { OrgRole } from '@librediary/shared';

const props = defineProps<{
  role: OrgRole;
  size?: 'sm' | 'md';
}>();

const roleConfig = computed(() => {
  const configs: Record<OrgRole, { label: string; color: string }> = {
    OWNER: { label: 'Owner', color: 'var(--color-warning)' },
    ADMIN: { label: 'Admin', color: 'var(--color-accent)' },
    MEMBER: { label: 'Member', color: 'var(--color-text-tertiary)' },
  };
  return configs[props.role];
});
</script>

<template>
  <span class="role-badge" :class="[size ?? 'md']" :style="{ '--badge-color': roleConfig.color }">
    {{ roleConfig.label }}
  </span>
</template>

<style scoped>
.role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1) var(--space-2);
  font-weight: 500;
  color: var(--badge-color);
  background: color-mix(in srgb, var(--badge-color) 15%, transparent);
  border-radius: var(--radius-full);
}

.role-badge.sm {
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
}

.role-badge.md {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
}
</style>
