<script setup lang="ts">
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
</script>

<template>
  <div class="dashboard-skeleton" role="status" :aria-label="$t('skeleton.loading')">
    <div class="skeleton-grid">
      <div v-for="i in 9" :key="i" class="skeleton-stat-card">
        <SkeletonBlock variant="rect" width="48px" height="48px" border-radius="var(--radius-lg)" />
        <div class="skeleton-stat-content">
          <SkeletonBlock
            variant="rect"
            width="60px"
            height="28px"
            border-radius="var(--radius-sm)"
          />
          <SkeletonBlock variant="line" width="100px" height="14px" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
}

.skeleton-stat-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.skeleton-stat-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
