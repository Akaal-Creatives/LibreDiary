<script setup lang="ts">
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
</script>

<template>
  <div class="sidebar-skeleton" role="status" :aria-label="$t('skeleton.loading')">
    <div v-for="i in 5" :key="i" class="skeleton-nav-item">
      <SkeletonBlock variant="rect" width="18px" height="18px" border-radius="var(--radius-sm)" />
      <SkeletonBlock
        variant="line"
        :width="`${50 + Math.floor(Math.random() * 40)}%`"
        height="14px"
      />
    </div>
  </div>
</template>

<style scoped>
.sidebar-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) 0;
}

.skeleton-nav-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
}
</style>
