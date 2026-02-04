<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppSidebar from '@/components/AppSidebar.vue';
import AppHeader from '@/components/AppHeader.vue';
</script>

<template>
  <div class="app-layout">
    <AppSidebar class="app-sidebar" />
    <div class="app-main">
      <AppHeader class="app-header" />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background: var(--va-background-secondary);
}

.app-sidebar {
  flex-shrink: 0;
  width: 260px;
  height: 100%;
  border-right: 1px solid var(--va-surface-variant);
  background: var(--va-background-primary);
}

.app-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.app-header {
  flex-shrink: 0;
  height: 48px;
  border-bottom: 1px solid var(--va-surface-variant);
  background: var(--va-background-primary);
}

.app-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
</style>
