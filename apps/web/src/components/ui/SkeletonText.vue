<script setup lang="ts">
import { computed } from 'vue';
import SkeletonBlock from './SkeletonBlock.vue';

const props = withDefaults(
  defineProps<{
    lines?: number;
    lineHeight?: string;
    gap?: string;
  }>(),
  {
    lines: 3,
    lineHeight: '0.8em',
    gap: '0.6em',
  }
);

const lineWidths = computed(() => {
  const widths: string[] = [];
  for (let i = 0; i < props.lines; i++) {
    if (i === props.lines - 1) {
      // Last line is shorter
      widths.push(`${40 + Math.floor(Math.random() * 25)}%`);
    } else {
      widths.push(`${75 + Math.floor(Math.random() * 25)}%`);
    }
  }
  return widths;
});
</script>

<template>
  <div class="skeleton-text" :style="{ gap }" role="status" :aria-label="$t('skeleton.loading')">
    <SkeletonBlock
      v-for="(width, index) in lineWidths"
      :key="index"
      variant="line"
      :width="width"
      :height="lineHeight"
    />
  </div>
</template>

<style scoped>
.skeleton-text {
  display: flex;
  flex-direction: column;
}
</style>
