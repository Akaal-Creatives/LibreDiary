<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppSidebar from '@/components/AppSidebar.vue';
import AppHeader from '@/components/AppHeader.vue';
import { useTheme } from '@/composables';

// Initialize theme on app load
useTheme();
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
  background: var(--color-background);
}

.app-sidebar {
  flex-shrink: 0;
  width: 260px;
  height: 100%;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.app-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  background: var(--color-background);
}

.app-header {
  flex-shrink: 0;
  height: 52px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-content {
  flex: 1;
  padding: var(--space-8);
  overflow: auto;
}

/* Smooth scrolling */
.app-content::-webkit-scrollbar {
  width: 8px;
}

.app-content::-webkit-scrollbar-track {
  background: transparent;
}

.app-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.app-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}
</style>
