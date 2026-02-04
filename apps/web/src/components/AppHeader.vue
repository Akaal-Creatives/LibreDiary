<script setup lang="ts">
import { usePagesStore } from '@/stores';

const pagesStore = usePagesStore();
</script>

<template>
  <header class="header">
    <div class="header-left">
      <nav v-if="pagesStore.currentPage" class="breadcrumbs">
        <span class="breadcrumb-item">
          {{ pagesStore.currentPage.icon ?? '📄' }}
          {{ pagesStore.currentPage.title }}
        </span>
      </nav>
    </div>

    <div class="header-right">
      <VaButton preset="secondary" size="small"> Share </VaButton>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
}

.breadcrumbs {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
}

.breadcrumb-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
