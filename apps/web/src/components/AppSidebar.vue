<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, usePagesStore } from '@/stores';
import { useTheme } from '@/composables';

const router = useRouter();
const authStore = useAuthStore();
const pagesStore = usePagesStore();
const { theme, toggleTheme } = useTheme();

const searchQuery = ref('');

function navigateToPage(pageId: string) {
  router.push({ name: 'page', params: { pageId } });
}

function navigateToDashboard() {
  router.push({ name: 'dashboard' });
}

function createNewPage() {
  // TODO: Implement page creation
}
</script>

<template>
  <aside class="sidebar">
    <!-- Workspace Header -->
    <div class="sidebar-header">
      <button class="workspace-switcher">
        <span class="workspace-icon">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <rect
              x="4"
              y="3"
              width="16"
              height="22"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M8 8H16M8 12H16M8 16H12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M20 7V23C20 24.1046 20.8954 25 22 25H22C23.1046 25 24 24.1046 24 23V7"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <span class="workspace-name">{{
          authStore.currentOrganization?.name ?? 'LibreDiary'
        }}</span>
        <span class="workspace-chevron">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>

    <!-- Search -->
    <div class="sidebar-search">
      <div class="search-wrapper">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M14 14L10.5 10.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search..." class="search-input" />
        <span class="search-shortcut">⌘K</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- Quick Actions -->
      <div class="nav-section">
        <button class="nav-item" @click="navigateToDashboard">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2.25 9.75L9 3L15.75 9.75"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M4.5 8.25V14.25C4.5 14.6642 4.83579 15 5.25 15H7.5V11.25H10.5V15H12.75C13.1642 15 13.5 14.6642 13.5 14.25V8.25"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span>Home</span>
        </button>
        <button class="nav-item create-btn" @click="createNewPage">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 3.75V14.25"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3.75 9H14.25"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span>New Page</span>
        </button>
      </div>

      <!-- Pages Section -->
      <div class="nav-section">
        <div class="nav-section-header">
          <span class="nav-section-title">Pages</span>
          <button class="section-action" title="Add page" @click="createNewPage">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2.5V11.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M2.5 7H11.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div v-if="pagesStore.rootPages.length === 0" class="empty-state">
          <span class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4H14L20 10V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V5C4 4.44772 4.44772 4 5 4Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 4V10H20"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9 14H15M9 17H13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="empty-text">No pages yet</span>
        </div>
        <button
          v-for="page in pagesStore.rootPages"
          :key="page.id"
          class="nav-item page-item"
          :class="{ active: pagesStore.currentPageId === page.id }"
          @click="navigateToPage(page.id)"
        >
          <span class="page-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 3H12L16 7V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V4C4 3.44772 4.44772 3 5 3Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12 3V7H16"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="page-title">{{ page.title }}</span>
        </button>
      </div>
    </nav>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="user-section">
        <div class="user-avatar">
          {{ authStore.user?.name?.charAt(0).toUpperCase() ?? '?' }}
        </div>
        <div class="user-info">
          <span class="user-name">{{ authStore.user?.name ?? 'User' }}</span>
          <span class="user-email">{{ authStore.user?.email ?? '' }}</span>
        </div>
      </div>
      <button class="theme-toggle" :title="`Theme: ${theme}`" @click="toggleTheme">
        <span v-if="theme === 'light'">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3.75" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M9 2.25V3.75M9 14.25V15.75M2.25 9H3.75M14.25 9H15.75M4.22 4.22L5.28 5.28M12.72 12.72L13.78 13.78M4.22 13.78L5.28 12.72M12.72 5.28L13.78 4.22"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <span v-else-if="theme === 'dark'">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M15.75 10.5C14.9177 11.3323 13.8066 11.8033 12.6376 11.8219C11.4686 11.8405 10.3434 11.4054 9.48398 10.5977C8.62457 9.79007 8.1 8.67504 8.02109 7.50718C7.94219 6.33932 8.31431 5.19788 9.06 4.305C8.08574 4.58581 7.20454 5.12154 6.50739 6.85749C5.81024 7.59343 5.3252 8.50045 5.10251 9.48675C4.87982 10.473 4.92807 11.5017 5.24204 12.4636C5.55601 13.4255 6.12385 14.2846 6.88457 14.9526C7.64529 15.6205 8.57062 16.0721 9.56612 16.258C10.5616 16.4439 11.5894 16.357 12.5395 16.0065C13.4895 15.656 14.3263 15.0552 14.9651 14.2682C15.6038 13.4813 16.0205 12.5372 16.1715 11.534"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span v-else>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect
              x="2.25"
              y="3.75"
              width="13.5"
              height="9.75"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path d="M6 15.75H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M9 13.5V15.75" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </span>
      </button>
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

/* Header */
.sidebar-header {
  padding: var(--space-4);
}

.workspace-switcher {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.workspace-switcher:hover {
  background: var(--color-hover);
}

.workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.workspace-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-chevron {
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
}

/* Search */
.sidebar-search {
  padding: 0 var(--space-4) var(--space-3);
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-9);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-input:focus {
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.search-shortcut {
  position: absolute;
  right: var(--space-3);
  padding: 2px 6px;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  overflow-y: auto;
}

.nav-section {
  margin-bottom: var(--space-4);
}

.nav-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-2);
  margin-bottom: var(--space-1);
}

.nav-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.nav-section-header:hover .section-action {
  opacity: 1;
}

.section-action:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.nav-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.nav-item.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.nav-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: currentColor;
}

.create-btn {
  color: var(--color-accent);
}

.create-btn:hover {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.page-item {
  padding-left: var(--space-2);
}

.page-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.nav-item.active .page-icon {
  color: var(--color-accent);
}

.page-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-tertiary);
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}

.empty-text {
  font-size: var(--text-sm);
}

/* Footer */
.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.user-section {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  min-width: 0;
}

.user-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

/* Scrollbar */
.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}
</style>
