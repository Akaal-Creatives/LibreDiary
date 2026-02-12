<script setup lang="ts">
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
import SkeletonText from '@/components/ui/SkeletonText.vue';
</script>

<template>
  <div class="editor-skeleton" role="status" :aria-label="$t('skeleton.loading')">
    <!-- Title -->
    <SkeletonBlock variant="rect" width="60%" height="2.5rem" border-radius="var(--radius-md)" />

    <!-- Meta line -->
    <div class="skeleton-meta">
      <SkeletonBlock variant="rect" width="120px" height="14px" />
    </div>

    <!-- Paragraph blocks -->
    <div class="skeleton-paragraphs">
      <SkeletonText :lines="4" line-height="14px" gap="0.75em" />
      <div class="skeleton-spacer" />
      <SkeletonText :lines="3" line-height="14px" gap="0.75em" />
      <div class="skeleton-spacer" />
      <SkeletonText :lines="2" line-height="14px" gap="0.75em" />
    </div>
  </div>
</template>

<style scoped>
.editor-skeleton {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4) 0;
}

.skeleton-meta {
  margin-top: var(--space-4);
  margin-bottom: var(--space-8);
}

.skeleton-paragraphs {
  display: flex;
  flex-direction: column;
}

.skeleton-spacer {
  height: var(--space-6);
}
</style>
