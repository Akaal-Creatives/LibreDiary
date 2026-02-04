<script setup lang="ts">
import { useAuthStore, usePagesStore } from '@/stores';

const authStore = useAuthStore();
const pagesStore = usePagesStore();
</script>

<template>
  <div class="dashboard-page">
    <div class="welcome-section">
      <h1>Welcome{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }}</h1>
      <p>Get started by creating your first page or exploring templates.</p>
    </div>

    <div class="quick-actions">
      <VaCard class="action-card">
        <VaCardContent>
          <div class="action-icon">📝</div>
          <h3>New Page</h3>
          <p>Create a blank page to start writing</p>
          <VaButton color="primary" size="small"> Create Page </VaButton>
        </VaCardContent>
      </VaCard>

      <VaCard class="action-card">
        <VaCardContent>
          <div class="action-icon">📋</div>
          <h3>From Template</h3>
          <p>Start with a pre-built template</p>
          <VaButton preset="secondary" size="small"> Browse Templates </VaButton>
        </VaCardContent>
      </VaCard>

      <VaCard class="action-card">
        <VaCardContent>
          <div class="action-icon">📥</div>
          <h3>Import</h3>
          <p>Import from Notion or Markdown</p>
          <VaButton preset="secondary" size="small"> Import </VaButton>
        </VaCardContent>
      </VaCard>
    </div>

    <div v-if="pagesStore.rootPages.length > 0" class="recent-pages">
      <h2>Recent Pages</h2>
      <div class="pages-grid">
        <VaCard v-for="page in pagesStore.rootPages.slice(0, 6)" :key="page.id" class="page-card">
          <VaCardContent>
            <div class="page-icon">{{ page.icon ?? '📄' }}</div>
            <div class="page-title">{{ page.title }}</div>
          </VaCardContent>
        </VaCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  max-width: 900px;
  margin: 0 auto;
}

.welcome-section {
  margin-bottom: 40px;
}

.welcome-section h1 {
  margin: 0 0 8px;
  font-size: 32px;
}

.welcome-section p {
  margin: 0;
  color: var(--va-secondary);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.action-card {
  text-align: center;
}

.action-icon {
  margin-bottom: 12px;
  font-size: 32px;
}

.action-card h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.action-card p {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--va-secondary);
}

.recent-pages h2 {
  margin: 0 0 16px;
  font-size: 20px;
}

.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.page-card {
  cursor: pointer;
  transition: transform 0.15s;
}

.page-card:hover {
  transform: translateY(-2px);
}

.page-icon {
  margin-bottom: 8px;
  font-size: 24px;
}

.page-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
