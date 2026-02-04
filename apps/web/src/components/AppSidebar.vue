<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, usePagesStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();
const pagesStore = usePagesStore();

const searchQuery = ref('');

function navigateToPage(pageId: string) {
  router.push({ name: 'page', params: { pageId } });
}

function createNewPage() {
  // TODO: Implement page creation
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="workspace-switcher">
        <span class="workspace-name">{{
          authStore.currentOrganization?.name ?? 'Select Workspace'
        }}</span>
      </div>
    </div>

    <div class="sidebar-search">
      <VaInput v-model="searchQuery" placeholder="Search..." size="small" class="search-input">
        <template #prependInner>
          <VaIcon name="search" size="small" />
        </template>
      </VaInput>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <button class="nav-item" @click="createNewPage">
          <VaIcon name="add" size="small" />
          <span>New Page</span>
        </button>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Pages</div>
        <div v-if="pagesStore.rootPages.length === 0" class="empty-state">No pages yet</div>
        <button
          v-for="page in pagesStore.rootPages"
          :key="page.id"
          class="nav-item"
          :class="{ active: pagesStore.currentPageId === page.id }"
          @click="navigateToPage(page.id)"
        >
          <span class="page-icon">{{ page.icon ?? '📄' }}</span>
          <span class="page-title">{{ page.title }}</span>
        </button>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <VaAvatar size="small" color="primary">
          {{ authStore.user?.name?.charAt(0) ?? '?' }}
        </VaAvatar>
        <span class="user-name">{{ authStore.user?.name ?? 'User' }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--va-surface-variant);
}

.workspace-switcher {
  padding: 8px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.workspace-switcher:hover {
  background: var(--va-surface-variant);
}

.sidebar-search {
  padding: 12px 16px;
}

.search-input {
  width: 100%;
}

.sidebar-nav {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 16px;
}

.nav-section-title {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--va-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 6px;
  transition: background 0.15s;
}

.nav-item:hover {
  background: var(--va-surface-variant);
}

.nav-item.active {
  background: var(--va-primary);
  color: white;
}

.page-icon {
  font-size: 16px;
}

.page-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 8px;
  font-size: 13px;
  color: var(--va-secondary);
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--va-surface-variant);
}

.user-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}
</style>
