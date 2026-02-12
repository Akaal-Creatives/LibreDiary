<script setup lang="ts">
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
</script>

<template>
  <div class="settings-list-skeleton" role="status" :aria-label="$t('skeleton.loading')">
    <!-- Section header -->
    <SkeletonBlock variant="rect" width="140px" height="16px" border-radius="var(--radius-sm)" />

    <!-- Member rows -->
    <div class="skeleton-rows">
      <div v-for="i in 4" :key="i" class="skeleton-row">
        <SkeletonBlock variant="circle" width="40px" height="40px" />
        <div class="skeleton-row-content">
          <SkeletonBlock
            variant="line"
            :width="`${100 + Math.floor(Math.random() * 80)}px`"
            height="14px"
          />
          <SkeletonBlock variant="line" width="160px" height="12px" />
        </div>
        <SkeletonBlock
          variant="rect"
          width="60px"
          height="24px"
          border-radius="var(--radius-full)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-list-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.skeleton-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.skeleton-row-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
